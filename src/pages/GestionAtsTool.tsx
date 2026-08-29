import React, { useState, useEffect } from 'react';
import { Shield, UploadCloud, CheckCircle2, XCircle, Clock, FileText, Plus, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function GestionAtsTool() {
  const { user } = useAuth();
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const [atsList, setAtsList] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para las vistas
  const [vistaActual, setVistaActual] = useState<'lista' | 'nuevo' | 'evaluar'>('lista');
  const [atsSeleccionado, setAtsSeleccionado] = useState<any>(null);

  // Formulario Nuevo ATS
  const [nuevoAts, setNuevoAts] = useState({
    colaborador_id: '',
    actividad: '',
    fecha: '',
    archivo: null as File | null
  });

  // Formulario Evaluacion (Visto Bueno)
  const [evaluacion, setEvaluacion] = useState({
    estado: 'Pendiente',
    observaciones: ''
  });

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
    setIsLoading(true);
    try {
      // 1. Cargar Poblacion
      const { data: colabData } = await supabase
        .from('sst_colaboradores')
        .select('id, nombre_completo, empresa_contratante, tipo_vinculacion')
        .eq('property_id', propId);
      setColaboradores(colabData || []);

      // 2. Cargar ATS (Aqui idealmente harias un JOIN, pero lo simulamos cruzando en JS por simplicidad)
      const { data: atsData, error: atsError } = await supabase
        .from('sst_gestion_ats')
        .select('*')
        .eq('property_id', propId)
        .order('created_at', { ascending: false });
      
      if (atsError) {
        console.warn("Tabla sst_gestion_ats podria no existir:", atsError);
        setAtsList([]);
      } else {
        setAtsList(atsData || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubirAts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return;

    // 1. Subir archivo a Storage (Simulado aqui)
    // const fileExt = nuevoAts.archivo.name.split('.').pop();
    // const filePath = `ats/${Date.now()}.${fileExt}`;
    // await supabase.storage.from('sst_documents').upload(filePath, nuevoAts.archivo);

    // 2. Insertar registro en Base de datos
    const { data, error } = await supabase
      .from('sst_gestion_ats')
      .insert([{
        property_id: propertyId,
        colaborador_id: nuevoAts.colaborador_id,
        actividad_descripcion: nuevoAts.actividad,
        fecha_ejecucion: nuevoAts.fecha,
        estado_aprobacion: 'Pendiente',
        archivo_url: 'ruta_simulada.pdf' // Cambiar por filePath real
      }])
      .select();

    if (!error && data) {
      setAtsList([data[0], ...atsList]);
      setVistaActual('lista');
      setNuevoAts({ colaborador_id: '', actividad: '', fecha: '', archivo: null });
      alert("ATS cargado exitosamente. Pendiente de visto bueno.");
    } else {
      console.error("Error al subir ATS:", error);
      alert("Error al cargar ATS. Asegurate de crear la tabla SQL.");
    }
  };

  const handleGuardarEvaluacion = async () => {
    if (!atsSeleccionado) return;
    
    const { error } = await supabase
      .from('sst_gestion_ats')
      .update({
        estado_aprobacion: evaluacion.estado,
        observaciones_seguimiento: evaluacion.observaciones
      })
      .eq('id', atsSeleccionado.id);

    if (!error) {
      // Actualizar estado local
      setAtsList(atsList.map(a => a.id === atsSeleccionado.id ? {
        ...a, 
        estado_aprobacion: evaluacion.estado, 
        observaciones_seguimiento: evaluacion.observaciones
      } : a));
      setVistaActual('lista');
      alert("Seguimiento y Visto Bueno guardado.");
    } else {
      console.error("Error al guardar evaluacion:", error);
      alert("Hubo un problema al guardar la evaluacion.");
    }
  };

  const getBadgeEstado = (estado: string) => {
    switch (estado) {
      case 'Aprobado': return <span className="flex items-center gap-1 px-3 py-1 bg-[#20c997]/20 text-[#1ba87e] rounded-full text-xs font-bold"><CheckCircle2 className="w-3 h-3"/> Aprobado</span>;
      case 'Rechazado': return <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold"><XCircle className="w-3 h-3"/> Rechazado</span>;
      default: return <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-bold"><Clock className="w-3 h-3"/> Pendiente</span>;
    }
  };

  const getNombreColaborador = (id: string) => {
    const colab = colaboradores.find(c => c.id === id);
    return colab ? colab.nombre_completo : 'Desconocido';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Encabezado Principal */}
      <div className="bg-[#0B1727] p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-lg">
            <Shield className="w-8 h-8 text-[#20c997]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">7. Gestion de ATS</h1>
            <p className="text-slate-300 text-sm mt-1">Control, seguimiento y visto bueno de tareas de alto riesgo.</p>
          </div>
        </div>
        
        {vistaActual === 'lista' && (
          <button 
            onClick={() => setVistaActual('nuevo')}
            className="flex items-center gap-2 px-4 py-2 bg-[#20c997] text-white font-bold rounded-lg hover:bg-[#1ba87e] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Cargar Nuevo ATS
          </button>
        )}
      </div>

      <div className="w-full bg-[#fdfdfd] rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 h-full">
            <Loader2 className="w-8 h-8 text-[#20c997] animate-spin mb-4" />
            <p>Cargando informacion de ATS...</p>
          </div>
        ) : (
          <div className="p-6">
            {/* VISTA 1: LISTADO DE ATS */}
            {vistaActual === 'lista' && (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[#0B1727] text-sm border-b border-slate-200">
                      <th className="p-4 font-semibold">Fecha Ejecucion</th>
                      <th className="p-4 font-semibold">Responsable / Contratista</th>
                      <th className="p-4 font-semibold">Actividad (Tarea Critica)</th>
                      <th className="p-4 font-semibold">Estado (Visto Bueno)</th>
                      <th className="p-4 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atsList.length === 0 ? (
                      <tr><td colSpan={5} className="p-12 text-center text-slate-500">No hay documentos ATS registrados.</td></tr>
                    ) : (
                      atsList.map((ats) => (
                        <tr key={ats.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-4 text-sm font-medium text-slate-700">{ats.fecha_ejecucion}</td>
                          <td className="p-4 text-sm text-[#0B1727] font-semibold">{getNombreColaborador(ats.colaborador_id)}</td>
                          <td className="p-4 text-sm text-slate-600">{ats.actividad_descripcion}</td>
                          <td className="p-4">{getBadgeEstado(ats.estado_aprobacion)}</td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => {
                                setAtsSeleccionado(ats);
                                setEvaluacion({ estado: ats.estado_aprobacion, observaciones: ats.observaciones_seguimiento || '' });
                                setVistaActual('evaluar');
                              }}
                              className="px-3 py-1.5 bg-[#0B1727] text-white text-xs font-bold rounded hover:bg-slate-800 transition-colors"
                            >
                              Evaluar / Seguimiento
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* VISTA 2: CARGAR NUEVO ATS */}
            {vistaActual === 'nuevo' && (
              <div className="max-w-2xl mx-auto py-4">
                <button onClick={() => setVistaActual('lista')} className="text-sm font-medium text-slate-500 hover:text-[#0B1727] mb-6 flex items-center gap-1">
                  ← Volver al listado
                </button>
                <h3 className="text-xl font-bold text-[#0B1727] mb-6">Cargar Analisis de Trabajo Seguro (ATS)</h3>
                
                <form onSubmit={handleSubirAts} className="space-y-5 bg-white p-6 border border-slate-200 rounded-lg shadow-sm">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Colaborador / Contratista responsable</label>
                    <select 
                      required
                      value={nuevoAts.colaborador_id}
                      onChange={e => setNuevoAts({...nuevoAts, colaborador_id: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-[#20c997] focus:border-[#20c997] outline-none bg-white"
                    >
                      <option value="">Seleccione una opcion...</option>
                      {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Descripcion de la Actividad a realizar</label>
                    <input 
                      type="text" required placeholder="Ej: Trabajo en alturas - Limpieza de vidrios"
                      value={nuevoAts.actividad}
                      onChange={e => setNuevoAts({...nuevoAts, actividad: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-[#20c997] focus:border-[#20c997] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Fecha programada de ejecucion</label>
                    <input 
                      type="date" required
                      value={nuevoAts.fecha}
                      onChange={e => setNuevoAts({...nuevoAts, fecha: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-[#20c997] focus:border-[#20c997] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Documento ATS (PDF, escaneado y firmado)</label>
                    <div className="flex items-center justify-center w-full mt-1">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-[#20c997]/5 transition-colors group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-[#20c997] mb-2 transition-colors" />
                          <p className="text-sm text-slate-500"><span className="font-semibold text-[#20c997]">Haz clic para subir</span> el PDF</p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf" onChange={e => setNuevoAts({...nuevoAts, archivo: e.target.files?.[0] || null})} />
                      </label>
                    </div>
                    {nuevoAts.archivo && <p className="text-sm text-[#1ba87e] font-medium mt-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Archivo seleccionado: {nuevoAts.archivo.name}</p>}
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <button type="submit" className="w-full py-3 bg-[#0B1727] text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                      Registrar ATS
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* VISTA 3: EVALUAR (VISTO BUENO Y SEGUIMIENTO) */}
            {vistaActual === 'evaluar' && atsSeleccionado && (
              <div className="max-w-3xl mx-auto py-4">
                <button onClick={() => setVistaActual('lista')} className="text-sm font-medium text-slate-500 hover:text-[#0B1727] mb-6 flex items-center gap-1">
                  ← Volver al listado
                </button>
                
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 p-6 border-b border-slate-200">
                    <h3 className="text-xl font-bold text-[#0B1727] mb-1">Evaluacion de Trabajo Seguro</h3>
                    <p className="text-sm text-slate-600 mb-5">Responsable: <span className="font-semibold">{getNombreColaborador(atsSeleccionado.colaborador_id)}</span></p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                      <div>
                        <p className="text-slate-500 mb-1">Actividad a realizar:</p>
                        <p className="font-semibold text-[#0B1727]">{atsSeleccionado.actividad_descripcion}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Fecha de ejecucion:</p>
                        <p className="font-semibold text-[#0B1727]">{atsSeleccionado.fecha_ejecucion}</p>
                      </div>
                    </div>

                    <button className="mt-5 flex items-center gap-2 text-sm font-bold text-[#20c997] hover:text-[#1ba87e] bg-white px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      <FileText className="w-4 h-4" /> Ver documento PDF adjunto
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-[#0B1727] mb-3">1. Visto Bueno (Estado)</label>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <label className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${evaluacion.estado === 'Aprobado' ? 'border-[#20c997] bg-[#20c997]/10' : 'border-slate-200 hover:bg-slate-50'}`}>
                          <input type="radio" name="estado" value="Aprobado" checked={evaluacion.estado === 'Aprobado'} onChange={e => setEvaluacion({...evaluacion, estado: e.target.value})} className="hidden" />
                          <CheckCircle2 className={`w-5 h-5 ${evaluacion.estado === 'Aprobado' ? 'text-[#20c997]' : 'text-slate-400'}`} />
                          <span className={`font-semibold ${evaluacion.estado === 'Aprobado' ? 'text-[#1ba87e]' : 'text-slate-600'}`}>Aprobado</span>
                        </label>
                        <label className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${evaluacion.estado === 'Rechazado' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                          <input type="radio" name="estado" value="Rechazado" checked={evaluacion.estado === 'Rechazado'} onChange={e => setEvaluacion({...evaluacion, estado: e.target.value})} className="hidden" />
                          <XCircle className={`w-5 h-5 ${evaluacion.estado === 'Rechazado' ? 'text-red-500' : 'text-slate-400'}`} />
                          <span className={`font-semibold ${evaluacion.estado === 'Rechazado' ? 'text-red-600' : 'text-slate-600'}`}>Rechazado (Requiere cambios)</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#0B1727] mb-2">2. Observaciones y Seguimiento</label>
                      <p className="text-xs text-slate-500 mb-2">Registra aqui las verificaciones en sitio (Ej: "A las 9:00 AM se verifico el permiso de alturas y estado del arnes").</p>
                      <textarea 
                        rows={4}
                        value={evaluacion.observaciones}
                        onChange={e => setEvaluacion({...evaluacion, observaciones: e.target.value})}
                        placeholder="Escribe las notas de seguimiento o razones de rechazo..."
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-[#20c997] focus:border-[#20c997] outline-none text-sm text-slate-700"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <button 
                        onClick={handleGuardarEvaluacion}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-[#20c997] text-white font-bold rounded-lg hover:bg-[#1ba87e] transition-colors shadow-sm"
                      >
                        <Save className="w-5 h-5" /> Guardar Visto Bueno y Seguimiento
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
