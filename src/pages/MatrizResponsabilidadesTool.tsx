import React, { useState, useEffect } from 'react';
import { Send, Plus, Trash2, Link, User, ClipboardList, CheckSquare, Square, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function MatrizResponsabilidadesTool() {
  const { user } = useAuth();
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const [responsabilidades, setResponsabilidades] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [asignaciones, setAsignaciones] = useState<string[]>([]);
  
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState<any>(null);
  const [nuevaResp, setNuevaResp] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 1. CARGAR DATOS REALES DE LA BASE DE DATOS
  useEffect(() => {
    if (user) {
      loadContext();
    }
  }, [user]);

  const loadContext = async () => {
    try {
      setIsLoading(true);
      const { data: managers, error: managerError } = await supabase
        .from('sst_managers')
        .select('property_id')
        .eq('account_id', user!.id)
        .limit(1);
        
      if (managerError) throw managerError;
      if (!managers || managers.length === 0) throw new Error("No esta asignado a ninguna entidad.");
      
      const currentPropertyId = managers[0].property_id;
      setPropertyId(currentPropertyId);
      
      await cargarDatos(currentPropertyId);
    } catch (error) {
      console.error("Error cargando contexto:", error);
      setIsLoading(false);
    }
  };

  const cargarDatos = async (propId: string) => {
    try {
      // Traer la poblacion registrada en el modulo anterior
      const { data: pobData, error: pobError } = await supabase
        .from('sst_colaboradores')
        .select('*')
        .eq('property_id', propId)
        .order('nombre_completo', { ascending: true });
        
      if (pobError) throw pobError;
      setColaboradores(pobData || []);
      
      if (pobData && pobData.length > 0) {
        setColaboradorSeleccionado(pobData[0]);
        cargarAsignaciones(pobData[0].id); // <--- ANADE ESTA LINEA
      }

      // Traer el catalogo de responsabilidades
      const { data: respData, error: respError } = await supabase
        .from('sst_responsabilidades')
        .select('*')
        .eq('property_id', propId)
        .order('created_at', { ascending: true });
        
      // Si la tabla no existe o hay error, inicializamos vacio pero no rompemos
      if (respError) {
        console.warn("Tabla sst_responsabilidades podria no existir todavia:", respError);
        setResponsabilidades([]);
      } else {
        setResponsabilidades(respData || []);
      }
      
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cargarAsignaciones = async (colaboradorId: string) => {
    try {
      const { data, error } = await supabase
        .from('sst_asignaciones')
        .select('responsabilidad_id')
        .eq('colaborador_id', colaboradorId);

      if (error) throw error;

      if (data) {
        setAsignaciones(data.map(item => item.responsabilidad_id));
      } else {
        setAsignaciones([]);
      }
    } catch (error) {
      console.error("Error cargando asignaciones:", error);
    }
  };

  // 2. LOGICA DE INTERFAZ (AGREGAR / ELIMINAR / ASIGNAR)
  const agregarResponsabilidad = async () => {
    if (!nuevaResp.trim() || !propertyId) return;
    
    // Insercion real en Supabase
    const { data, error } = await supabase
      .from('sst_responsabilidades')
      .insert([{ 
        property_id: propertyId,
        descripcion: nuevaResp 
      }])
      .select();

    if (!error && data) {
      setResponsabilidades([...responsabilidades, data[0]]);
      setNuevaResp('');
    } else {
      console.error("Error al agregar responsabilidad:", error);
      alert("Asegurate de ejecutar el script SQL para crear la tabla sst_responsabilidades.");
    }
  };

  const eliminarResponsabilidad = async (id: string) => {
    const { error } = await supabase.from('sst_responsabilidades').delete().eq('id', id);
    if (!error) {
      setResponsabilidades(responsabilidades.filter(r => r.id !== id));
      setAsignaciones(asignaciones.filter(a => a !== id));
    }
  };

  const toggleAsignacion = async (responsabilidadId: string) => {
    if (!colaboradorSeleccionado) return;

    const isAssigned = asignaciones.includes(responsabilidadId);

    // 1. Actualizacion optimista en la interfaz (se siente super rapido)
    if (isAssigned) {
      setAsignaciones(asignaciones.filter(a => a !== responsabilidadId));
    } else {
      setAsignaciones([...asignaciones, responsabilidadId]);
    }

    // 2. Guardar en Supabase
    try {
      if (isAssigned) {
        const { error } = await supabase
          .from('sst_asignaciones')
          .delete()
          .match({
            responsabilidad_id: responsabilidadId,
            colaborador_id: colaboradorSeleccionado.id
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sst_asignaciones')
          .insert([{
            responsabilidad_id: responsabilidadId,
            colaborador_id: colaboradorSeleccionado.id
          }]);
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error al actualizar asignacion:", error);
      alert("Hubo un error al guardar la asignacion en la base de datos.");
      
      // Revertir el cambio visual si hubo error
      if (isAssigned) {
        setAsignaciones([...asignaciones, responsabilidadId]);
      } else {
        setAsignaciones(asignaciones.filter(a => a !== responsabilidadId));
      }
    }
  };

  // 3. GENERAR ENLACE MAGICO
  const generarLink = () => {
    if (!colaboradorSeleccionado || !colaboradorSeleccionado.id) {
      alert("Este colaborador no tiene un identificador valido.");
      return;
    }
    // Usamos el ID del registro como token de acceso publico
    const magicLink = `${window.location.origin}/portal/${colaboradorSeleccionado.id}`;
    navigator.clipboard.writeText(magicLink);
    alert(`Enlace copiado para ${colaboradorSeleccionado.nombre_completo}:\n${magicLink}`);
  };

  // 4. EXPORTAR SOPORTE A EXCEL (Para Auditorias)
  const exportarSoporte = () => {
    if (colaboradores.length === 0 || responsabilidades.length === 0) {
      alert("No hay datos suficientes para exportar.");
      return;
    }

    // Estructura para el Excel: Filas=Responsabilidades, Columnas=Colaboradores
    const cabeceras = ['Descripcion de la Responsabilidad', ...colaboradores.map(c => c.nombre_completo)];
    
    const filas = responsabilidades.map(resp => {
      const fila = [resp.descripcion];
      colaboradores.forEach(colab => {
        // Para este MVP, si esta seleccionado actualmente, pone una X. 
        // (En la proxima version esto vendra de la base de datos sst_asignaciones)
        const tieneAsignacion = colab.id === colaboradorSeleccionado?.id && asignaciones.includes(resp.id);
        fila.push(tieneAsignacion ? 'X' : '');
      });
      return fila;
    });

    const datosFinales = [cabeceras, ...filas];
    const hoja = XLSX.utils.aoa_to_sheet(datosFinales);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Matriz_Soporte');
    
    XLSX.writeFile(libro, 'Soporte_Matriz_Responsabilidades_SGSST.xlsx');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-8 h-8 text-[#20c997] animate-spin mb-4" />
        <p>Cargando matriz de responsabilidades...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Encabezado Principal con Boton de Descarga */}
      <div className="bg-[#0B1727] p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-lg">
            <ClipboardList className="w-8 h-8 text-[#20c997]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">2. Matriz de Responsabilidades</h1>
            <p className="text-slate-300 text-sm mt-1">Asigna deberes y notifica a la poblacion registrada.</p>
          </div>
        </div>
        
        {/* Boton: Descargar Soporte */}
        <button 
          onClick={exportarSoporte}
          className="flex items-center gap-2 px-4 py-2 bg-white text-[#0B1727] font-bold rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Exportar Soporte (Excel)
        </button>
      </div>

      <div className="flex flex-col lg:flex-row min-h-[500px] bg-[#fdfdfd] rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* PANEL IZQUIERDO: Catalogo */}
        <div className="w-full lg:w-1/2 p-6 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col">
          <h3 className="text-lg font-bold text-[#0B1727] mb-4">1. Catalogo de Responsabilidades</h3>
          
          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              placeholder="Ej. Reportar actos inseguros..." 
              value={nuevaResp}
              onChange={(e) => setNuevaResp(e.target.value)}
              className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-[#20c997] focus:border-[#20c997] outline-none text-sm"
              onKeyPress={(e) => e.key === 'Enter' && agregarResponsabilidad()}
            />
            <button 
              onClick={agregarResponsabilidad}
              className="px-4 py-2 bg-[#0B1727] text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-2">
            {responsabilidades.map((resp) => (
              <div key={resp.id} className="flex items-start justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg group">
                <p className="text-sm text-slate-700 pr-4">{resp.descripcion}</p>
                <button 
                  onClick={() => eliminarResponsabilidad(resp.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Eliminar responsabilidad"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {responsabilidades.length === 0 && (
              <div className="text-sm text-slate-500 flex flex-col items-center justify-center h-full py-8 text-center">
                <ClipboardList className="w-8 h-8 text-slate-300 mb-2" />
                <p>Agrega responsabilidades al catalogo<br/>para empezar a asignar.</p>
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: Asignacion a Poblacion Real */}
        <div className="w-full lg:w-1/2 p-6 bg-slate-50 flex flex-col">
          <h3 className="text-lg font-bold text-[#0B1727] mb-4">2. Asignar y Notificar</h3>
          
          {/* Selector conectado a la Base de Datos */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-600 mb-2">Selecciona un colaborador del Registro:</label>
            <div className="relative">
              <select 
                className="w-full p-3 pl-10 border border-slate-300 rounded-lg focus:ring-[#20c997] focus:border-[#20c997] outline-none appearance-none bg-white text-[#0B1727] font-medium"
                value={colaboradorSeleccionado?.id || ''}
                onChange={(e) => {
                  const colab = colaboradores.find(c => c.id === e.target.value);
                  setColaboradorSeleccionado(colab);
                  if (colab) {
                    cargarAsignaciones(colab.id);
                  } else {
                    setAsignaciones([]);
                  }
                }}
              >
                {colaboradores.length === 0 && <option value="">No hay personal registrado...</option>}
                {colaboradores.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_completo} - {c.tipo_vinculacion}
                  </option>
                ))}
              </select>
              <User className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Checklist interactivo */}
          {colaboradorSeleccionado ? (
            <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 flex-1 flex flex-col min-h-0">
              <p className="text-sm font-semibold text-[#0B1727] mb-3 border-b border-slate-100 pb-2">
                Responsabilidades para {colaboradorSeleccionado.nombre_completo}:
              </p>
              <div className="space-y-1 flex-1 overflow-y-auto">
                {responsabilidades.length === 0 && (
                  <p className="text-xs text-slate-500 italic">No hay responsabilidades en el catalogo.</p>
                )}
                {responsabilidades.map(resp => {
                  const isChecked = asignaciones.includes(resp.id);
                  return (
                    <button 
                      key={resp.id}
                      onClick={() => toggleAsignacion(resp.id)}
                      className="w-full flex items-start gap-3 p-2 hover:bg-slate-50 rounded-md transition-colors text-left"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-[#20c997] shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm ${isChecked ? 'text-[#0B1727] font-medium' : 'text-slate-600'}`}>
                        {resp.descripcion}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 border border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50/50 mb-6">
              <p className="text-slate-400 text-sm text-center">Selecciona un colaborador<br/>para gestionar sus responsabilidades.</p>
            </div>
          )}

          {/* Accion Final */}
          <button 
            onClick={generarLink}
            disabled={!colaboradorSeleccionado || asignaciones.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#20c997] text-white font-bold rounded-lg hover:bg-[#1ba87e] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Link className="w-5 h-5" />
            Generar Enlace Magico
          </button>
        </div>
      </div>
    </div>
  );
}

