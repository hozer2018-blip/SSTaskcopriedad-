import React, { useState, useEffect } from 'react';
import { 
  HardHat, AlertTriangle, CheckCircle2, Users, 
  ClipboardList, Download, Plus, Search, Trash2, 
  Edit2, Save, XCircle, Loader2 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

export default function ProteccionCaidasTool() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'contratistas' | 'permisos'>('contratistas');
  
  // Estados de Base de Datos
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [permisos, setPermisos] = useState<any[]>([]);
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados Edicion Contratistas
  const [editandoColabId, setEditandoColabId] = useState<string | null>(null);
  const [fechasEdit, setFechasEdit] = useState({ curso: '', medico: '' });

  // Estado Formulario Permiso
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ ubicacion_exacta: '', descripcion_tarea: '', fecha_inicio: '', hora_inicio: '' });

  useEffect(() => {
    if (user) loadContext();
  }, [user]);

  const loadContext = async () => {
    try {
      setIsLoading(true);
      const { data: managers } = await supabase.from('sst_managers').select('property_id').eq('account_id', user!.id).limit(1);
      if (!managers || managers.length === 0) return;
      
      const currentPropertyId = managers[0].property_id;
      setPropertyId(currentPropertyId);
      
      await Promise.all([cargarPermisos(currentPropertyId), cargarTrabajadores(currentPropertyId)]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const cargarPermisos = async (propId: string) => {
    const { data } = await supabase.from('sst_alturas_permisos').select('*').eq('property_id', propId).order('created_at', { ascending: false });
    if (data) setPermisos(data);
  };

  const cargarTrabajadores = async (propId: string) => {
    const { data: colabs } = await supabase.from('sst_colaboradores').select('*').eq('property_id', propId);
    const { data: certificados } = await supabase.from('sst_alturas_trabajadores').select('*').eq('property_id', propId);

    if (colabs) {
      const personalMapeado = colabs.map(colab => {
        const cert = certificados?.find(c => c.colaborador_id === colab.id);
        return { ...colab, certificacion: cert || null };
      });
      setTrabajadores(personalMapeado);
    }
  };

  // --- LOGICA 100% EDITABLE: CONTRATISTAS ---
  const habilitarEdicion = (trabajador: any) => {
    setEditandoColabId(trabajador.id);
    setFechasEdit({
      curso: trabajador.certificacion?.fecha_vencimiento_curso || '',
      medico: trabajador.certificacion?.fecha_vencimiento_medico || ''
    });
  };

  const guardarFechasCertificado = async (colabId: string) => {
    if (!fechasEdit.curso || !fechasEdit.medico) {
      alert("Debes ingresar ambas fechas para habilitar al trabajador.");
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.from('sst_alturas_trabajadores').upsert({
      colaborador_id: colabId,
      property_id: propertyId,
      fecha_vencimiento_curso: fechasEdit.curso,
      fecha_vencimiento_medico: fechasEdit.medico,
      estado_arl: true
    }, { onConflict: 'colaborador_id' });

    if (!error) {
      await cargarTrabajadores(propertyId!);
      setEditandoColabId(null);
    } else alert("Error al guardar certificados.");
    setIsLoading(false);
  };

  // --- LOGICA 100% EDITABLE: PERMISOS ---
  const guardarPermiso = async () => {
    if (!formData.ubicacion_exacta || !formData.fecha_inicio) return alert("Completa ubicacion y fecha.");
    setIsLoading(true);
    const { error } = await supabase.from('sst_alturas_permisos').insert([{
      property_id: propertyId,
      consecutivo: `PTA-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
      ubicacion_exacta: formData.ubicacion_exacta,
      descripcion_tarea: formData.descripcion_tarea,
      fecha_inicio: formData.fecha_inicio,
      hora_inicio: formData.hora_inicio,
      estado: 'Borrador'
    }]);

    if (!error) {
      setFormData({ ubicacion_exacta: '', descripcion_tarea: '', fecha_inicio: '', hora_inicio: '' });
      setIsFormOpen(false);
      await cargarPermisos(propertyId!);
    }
    setIsLoading(false);
  };

  const cambiarEstadoPermiso = async (id: string, nuevoEstado: string) => {
    setIsLoading(true);
    const { error } = await supabase.from('sst_alturas_permisos').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) await cargarPermisos(propertyId!);
    setIsLoading(false);
  };

  const eliminarPermiso = async (id: string) => {
    if (!window.confirm("Seguro que deseas eliminar este permiso?")) return;
    setIsLoading(true);
    const { error } = await supabase.from('sst_alturas_permisos').delete().eq('id', id);
    if (!error) await cargarPermisos(propertyId!);
    setIsLoading(false);
  };

  // --- UI HELPERS ---
  const evaluarEstado = (fechaVencimiento: string | null) => {
    if (!fechaVencimiento) return { texto: 'Sin Certificado', color: 'text-slate-400', badge: 'bg-slate-100 text-slate-600', icono: AlertTriangle };
    const diasRestantes = Math.ceil((new Date(fechaVencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes < 0) return { texto: 'Vencido', color: 'text-red-600', badge: 'bg-red-100 text-red-700', icono: XCircle };
    if (diasRestantes <= 30) return { texto: `Vence en ${diasRestantes} dias`, color: 'text-orange-600', badge: 'bg-orange-100 text-orange-700', icono: AlertTriangle };
    return { texto: `Vence: ${fechaVencimiento}`, color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', icono: CheckCircle2 };
  };

  const exportarAuditoria = () => { /* ... misma logica excel ... */ };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* HEADER SIMPLIFICADO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0B1727] p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500/20 p-3 rounded-xl">
            <HardHat className="w-8 h-8 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Gestion de Tareas en Altura</h1>
            <p className="text-slate-300 text-sm">Control Operativo y Documental (Res. 4272 de 2021)</p>
          </div>
        </div>
        <button onClick={exportarAuditoria} className="flex items-center gap-2 px-4 py-2 bg-[#20c997] text-[#0B1727] font-bold rounded-lg hover:bg-teal-500 transition-colors shadow-sm">
          <Download className="w-4 h-4" /> Exportar Auditoria
        </button>
      </div>

      {/* TABS SIMPLIFICADAS */}
      <div className="flex border-b border-slate-200">
        <button onClick={() => setActiveTab('contratistas')} className={`py-4 px-6 text-sm font-bold flex items-center transition-colors ${activeTab === 'contratistas' ? 'border-b-2 border-orange-500 text-[#0B1727]' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Users className="w-4 h-4 mr-2" /> 1. Control de Certificados
        </button>
        <button onClick={() => setActiveTab('permisos')} className={`py-4 px-6 text-sm font-bold flex items-center transition-colors ${activeTab === 'permisos' ? 'border-b-2 border-orange-500 text-[#0B1727]' : 'text-slate-500 hover:bg-slate-50'}`}>
          <ClipboardList className="w-4 h-4 mr-2" /> 2. Gestion de Permisos (PTA)
        </button>
      </div>

      <div className="w-full bg-[#fdfdfd] rounded-xl shadow-sm border border-slate-200 min-h-[500px] p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
            <p>Procesando datos...</p>
          </div>
        ) : (
          <>
            {/* ================= TAB 1: CONTRATISTAS (EDITABLE) ================= */}
            {activeTab === 'contratistas' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-800">Actualizacion de Certificados</h2>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input type="text" placeholder="Buscar trabajador..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-orange-500 w-64 bg-white" />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                        <th className="p-4">Trabajador / Empresa</th>
                        <th className="p-4">Vencimiento Alturas</th>
                        <th className="p-4">Vencimiento Medico</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {trabajadores.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-500">No hay trabajadores registrados.</td></tr>
                      ) : (
                        trabajadores.map(t => {
                          const isEditing = editandoColabId === t.id;
                          const eCurso = evaluarEstado(t.certificacion?.fecha_vencimiento_curso);
                          const eMedico = evaluarEstado(t.certificacion?.fecha_vencimiento_medico);

                          return (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4">
                                <p className="font-bold text-slate-900">{t.nombre_completo}</p>
                                <p className="text-xs text-slate-500">{t.empresa_contratante || 'Personal Directo'}</p>
                              </td>
                              
                              {/* VISTA MODO EDICION VS MODO LECTURA */}
                              {isEditing ? (
                                <>
                                  <td className="p-4"><input type="date" value={fechasEdit.curso} onChange={e => setFechasEdit({...fechasEdit, curso: e.target.value})} className="p-1.5 border rounded outline-none text-xs w-full max-w-[130px]" /></td>
                                  <td className="p-4"><input type="date" value={fechasEdit.medico} onChange={e => setFechasEdit({...fechasEdit, medico: e.target.value})} className="p-1.5 border rounded outline-none text-xs w-full max-w-[130px]" /></td>
                                  <td className="p-4 text-right space-x-2">
                                    <button onClick={() => guardarFechasCertificado(t.id)} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 font-bold text-xs rounded hover:bg-emerald-200">Guardar</button>
                                    <button onClick={() => setEditandoColabId(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 font-bold text-xs rounded hover:bg-slate-200">Cancelar</button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-4"><span className={`${eCurso.color} flex items-center gap-1 text-xs font-semibold`}><eCurso.icono className="w-3.5 h-3.5"/>{eCurso.texto}</span></td>
                                  <td className="p-4"><span className={`${eMedico.color} flex items-center gap-1 text-xs font-semibold`}><eMedico.icono className="w-3.5 h-3.5"/>{eMedico.texto}</span></td>
                                  <td className="p-4 text-right">
                                    <button onClick={() => habilitarEdicion(t)} className="flex items-center gap-1 ml-auto px-3 py-1.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-md hover:bg-slate-200 transition-colors">
                                      <Edit2 className="w-3 h-3" /> Actualizar Fechas
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ================= TAB 2: PERMISOS (EDITABLE) ================= */}
            {activeTab === 'permisos' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-800">Permisos de Trabajo en Alturas (PTA)</h2>
                  <button onClick={() => setIsFormOpen(!isFormOpen)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 shadow-sm transition-colors">
                    {isFormOpen ? 'Ver Lista' : <><Plus className="w-4 h-4" /> Crear Permiso</>}
                  </button>
                </div>

                {isFormOpen ? (
                  <div className="max-w-2xl mx-auto bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-[#0B1727] mb-4">Nuevo Permiso de Trabajo</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Ubicacion Exacta *</label>
                        <input type="text" value={formData.ubicacion_exacta} onChange={e => setFormData({...formData, ubicacion_exacta: e.target.value})} className="w-full p-2 border rounded-md text-sm outline-none" placeholder="Ej: Cubierta Principal" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Descripcion Tarea</label>
                        <textarea value={formData.descripcion_tarea} onChange={e => setFormData({...formData, descripcion_tarea: e.target.value})} rows={2} className="w-full p-2 border rounded-md text-sm outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Fecha *</label>
                          <input type="date" value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} className="w-full p-2 border rounded-md text-sm outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Hora Inicio</label>
                          <input type="time" value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} className="w-full p-2 border rounded-md text-sm outline-none" />
                        </div>
                      </div>
                      <button onClick={guardarPermiso} className="w-full py-3 bg-[#0B1727] text-white font-bold rounded-lg hover:bg-slate-800">
                        Generar Permiso
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-medium">
                        <tr>
                          <th className="px-4 py-3">Consecutivo</th>
                          <th className="px-4 py-3">Ubicacion y Tarea</th>
                          <th className="px-4 py-3 text-center">Estado</th>
                          <th className="px-4 py-3 text-right">Gestion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {permisos.length === 0 ? (
                          <tr><td colSpan={4} className="p-6 text-center text-slate-500">No hay permisos registrados.</td></tr>
                        ) : (
                          permisos.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-bold text-slate-900">{p.consecutivo}</td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-800">{p.ubicacion_exacta}</p>
                                <p className="text-xs text-slate-500 truncate max-w-xs">{p.descripcion_tarea}</p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${p.estado === 'En Ejecucion' ? 'bg-emerald-100 text-emerald-700' : p.estado === 'Cerrado' ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-700'}`}>
                                  {p.estado}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                  {p.estado === 'Borrador' && (
                                    <button onClick={() => cambiarEstadoPermiso(p.id, 'En Ejecucion')} className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-xs font-bold transition-colors">Aprobar</button>
                                  )}
                                  {p.estado === 'En Ejecucion' && (
                                    <button onClick={() => cambiarEstadoPermiso(p.id, 'Cerrado')} className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-xs font-bold transition-colors">Cerrar Tarea</button>
                                  )}
                                  <button onClick={() => eliminarPermiso(p.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Eliminar Permiso">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
