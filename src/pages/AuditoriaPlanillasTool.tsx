import React, { useState, useEffect } from 'react';
import { FileCheck, UploadCloud, MessageSquare, CheckCircle2, Save, Loader2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AuditoriaPlanillasTool() {
  const { user } = useAuth();
  const [propertyId, setPropertyId] = useState<string | null>(null);

  // Estado para el selector de periodo
  const [mesSeleccionado, setMesSeleccionado] = useState('08');
  const [anioSeleccionado, setAnioSeleccionado] = useState('2026');
  const periodoActual = `${anioSeleccionado}-${mesSeleccionado}`; // Formato: YYYY-MM

  // Estado de los datos de la base de datos
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [auditoriasBD, setAuditoriasBD] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. CARGAR DATOS REALES AL INICIAR O CAMBIAR DE MES
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
      
      await cargarDatos(currentPropertyId, periodoActual);
    } catch (error) {
      console.error("Error cargando contexto:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) {
      cargarDatos(propertyId, periodoActual);
    }
  }, [periodoActual, propertyId]);

  const cargarDatos = async (propId: string, periodo: string) => {
    setIsLoading(true);
    try {
      // Traer todos los colaboradores registrados en el sistema
      const { data: pobData, error: pobError } = await supabase
        .from('sst_colaboradores')
        .select('*')
        .eq('property_id', propId)
        .order('nombre_completo', { ascending: true });
        
      if (pobError) throw pobError;
      setColaboradores(pobData || []);

      // Traer las auditorias YA GUARDADAS para el mes seleccionado
      const { data: audData, error: audError } = await supabase
        .from('sst_auditoria_planillas')
        .select('*')
        .eq('property_id', propId)
        .eq('periodo', periodo);
        
      if (audError) {
        console.warn("Tabla sst_auditoria_planillas podria no existir:", audError);
        setAuditoriasBD([]);
      } else {
        setAuditoriasBD(audData || []);
      }

    } catch (error) {
      console.error('Error cargando auditoria:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. FUNCION PARA ACTUALIZAR EL ESTADO LOCAL ANTES DE GUARDAR
  const obtenerFilaAuditoria = (colaboradorId: string) => {
    const audGuardada = auditoriasBD.find(a => a.colaborador_id === colaboradorId);
    return audGuardada || {
      colaborador_id: colaboradorId,
      estado_arl: 'Pendiente',
      estado_eps: 'Pendiente',
      estado_afp: 'Pendiente',
      numero_planilla: '',
      notas: '',
      soporte_url: null
    };
  };

  const handleCambioFila = (colaboradorId: string, campo: string, valor: string) => {
    setAuditoriasBD(prev => {
      const existe = prev.find(a => a.colaborador_id === colaboradorId);
      if (existe) {
        return prev.map(a => a.colaborador_id === colaboradorId ? { ...a, [campo]: valor } : a);
      } else {
        return [...prev, {
          colaborador_id: colaboradorId,
          periodo: periodoActual,
          estado_arl: 'Pendiente',
          estado_eps: 'Pendiente',
          estado_afp: 'Pendiente',
          numero_planilla: '',
          notas: '',
          soporte_url: null,
          [campo]: valor
        }];
      }
    });
  };

  // 3. GUARDAR TODO EN SUPABASE
  const guardarAuditoria = async () => {
    if (!propertyId) return;
    setIsSaving(true);
    try {
      const filasAGuardar = auditoriasBD.map(aud => {
        return {
          colaborador_id: aud.colaborador_id,
          periodo: periodoActual,
          property_id: propertyId,
          estado_arl: aud.estado_arl,
          estado_eps: aud.estado_eps,
          estado_afp: aud.estado_afp,
          numero_planilla: aud.numero_planilla,
          notas: aud.notas
        };
      });

      if (filasAGuardar.length === 0) {
        alert("No hay cambios para guardar.");
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('sst_auditoria_planillas')
        .upsert(filasAGuardar, { onConflict: 'colaborador_id, periodo' });

      if (error) throw error;
      alert(`Auditoria del periodo ${mesSeleccionado}/${anioSeleccionado} guardada con exito.`);
      
    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error al guardar la auditoria. Asegurate de ejecutar el script SQL para crear la tabla.');
    } finally {
      setIsSaving(false);
    }
  };

  const getColorEstado = (estado: string) => {
    switch(estado) {
      case 'Al Dia': return 'bg-[#20c997]/20 text-[#1ba87e] border-[#20c997]/30';
      case 'Inconsistencia': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const meses = [
    { val: '01', nom: 'Enero' }, { val: '02', nom: 'Febrero' }, { val: '03', nom: 'Marzo' },
    { val: '04', nom: 'Abril' }, { val: '05', nom: 'Mayo' }, { val: '06', nom: 'Junio' },
    { val: '07', nom: 'Julio' }, { val: '08', nom: 'Agosto' }, { val: '09', nom: 'Septiembre' },
    { val: '10', nom: 'Octubre' }, { val: '11', nom: 'Noviembre' }, { val: '12', nom: 'Diciembre' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Encabezado y Selector Dinamico de Mes/Ano */}
      <div className="bg-[#0B1727] p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-lg">
            <FileCheck className="w-8 h-8 text-[#20c997]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">5. Auditoria de Planillas</h1>
            <p className="text-slate-300 text-sm mt-1">Validacion mensual (PILA) de tu personal registrado.</p>
          </div>
        </div>
        
        {/* Selector Real de Periodo */}
        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg">
          <Calendar className="w-5 h-5 text-[#20c997] ml-2" />
          <select 
            className="bg-transparent text-white font-bold outline-none cursor-pointer border-none"
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
          >
            {meses.map(m => <option key={m.val} value={m.val} className="text-black">{m.nom}</option>)}
          </select>
          <span className="text-white">/</span>
          <select 
            className="bg-transparent text-white font-bold outline-none cursor-pointer border-none mr-2"
            value={anioSeleccionado}
            onChange={(e) => setAnioSeleccionado(e.target.value)}
          >
            <option value="2025" className="text-black">2025</option>
            <option value="2026" className="text-black">2026</option>
          </select>
        </div>
      </div>

      <div className="w-full bg-[#fdfdfd] rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 text-[#20c997] animate-spin mb-4" />
            <p>Cargando datos de auditoria...</p>
          </div>
        ) : colaboradores.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <FileCheck className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 mb-2 font-medium">No hay colaboradores registrados en la plataforma.</p>
            <p className="text-sm text-slate-400">Ve al modulo "1. Registro de Poblacion" para agregar personal.</p>
          </div>
        ) : (
          <>
            {/* Matriz de Auditoria Conectada */}
            <div className="overflow-x-auto border-b border-slate-200">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 text-[#0B1727] text-sm border-b border-slate-200">
                    <th className="p-4 font-semibold">Colaborador / Empresa</th>
                    <th className="p-4 font-semibold text-center">ARL</th>
                    <th className="p-4 font-semibold text-center">EPS</th>
                    <th className="p-4 font-semibold text-center">AFP</th>
                    <th className="p-4 font-semibold">Nro Planilla (PIN)</th>
                    <th className="p-4 font-semibold text-center">Soporte PDF</th>
                    <th className="p-4 font-semibold w-1/4">Notas de Auditoria</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradores.map((colab) => {
                    const filaData = obtenerFilaAuditoria(colab.id);
                    
                    return (
                      <tr key={colab.id} className="border-b border-slate-100 hover:bg-[#20c997]/5 transition-colors bg-white">
                        <td className="p-4">
                          <p className="text-sm font-bold text-[#0B1727]">{colab.nombre_completo}</p>
                          <p className="text-xs text-slate-500">{colab.tipo_vinculacion === 'Contratista' ? colab.empresa_contratante : colab.tipo_vinculacion}</p>
                        </td>
                        
                        {/* Selectores de Estado */}
                        {['estado_arl', 'estado_eps', 'estado_afp'].map((subsistema) => (
                          <td key={subsistema} className="p-4 text-center">
                            <select 
                              className={`text-xs font-bold p-1.5 rounded-md border outline-none cursor-pointer w-full max-w-[120px] ${getColorEstado(filaData[subsistema as keyof typeof filaData])}`}
                              value={filaData[subsistema as keyof typeof filaData]}
                              onChange={(e) => handleCambioFila(colab.id, subsistema, e.target.value)}
                            >
                              <option value="Pendiente">Pendiente</option>
                              <option value="Al Dia">Al Dia</option>
                              <option value="Inconsistencia">Inconsistencia</option>
                            </select>
                          </td>
                        ))}

                        <td className="p-4">
                          <input 
                            type="text" 
                            placeholder="Ej. 88392011"
                            value={filaData.numero_planilla}
                            onChange={(e) => handleCambioFila(colab.id, 'numero_planilla', e.target.value)}
                            className="w-full max-w-[120px] p-2 border border-slate-200 rounded-md text-sm outline-none focus:border-[#20c997]"
                          />
                        </td>

                        <td className="p-4 text-center">
                          {filaData.soporte_url ? (
                            <button className="flex items-center gap-1 mx-auto text-xs font-bold text-[#20c997] hover:text-[#1ba87e] bg-[#20c997]/10 px-2 py-1.5 rounded-md">
                              <CheckCircle2 className="w-4 h-4" /> Ver PDF
                            </button>
                          ) : (
                            <button className="flex items-center gap-1 mx-auto text-xs font-bold text-slate-500 hover:text-[#0B1727] bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-md transition-colors">
                              <UploadCloud className="w-4 h-4" /> Subir
                            </button>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="relative">
                            <MessageSquare className="w-4 h-4 text-slate-400 absolute left-2 top-2.5" />
                            <textarea 
                              placeholder="Observaciones de riesgo, etc..."
                              value={filaData.notas}
                              onChange={(e) => handleCambioFila(colab.id, 'notas', e.target.value)}
                              rows={1}
                              className="w-full pl-8 p-2 border border-slate-200 rounded-md text-sm outline-none focus:border-[#20c997] resize-y min-h-[40px] text-slate-700"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 flex justify-end">
              <button 
                onClick={guardarAuditoria}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#20c997] text-white font-bold rounded-lg hover:bg-[#1ba87e] transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Guardando...' : `Guardar Auditoria de ${meses.find(m=>m.val===mesSeleccionado)?.nom}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
