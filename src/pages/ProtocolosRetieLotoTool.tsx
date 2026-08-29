import React, { useState, useEffect } from 'react';
import { 
  Zap, Lock, Unlock, Plus, Search, ShieldAlert, 
  Settings, User, CheckCircle2, Loader2, Save, MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ProtocolosRetieLotoTool() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'equipos' | 'loto'>('equipos');
  
  // Estados de Base de Datos
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [bloqueos, setBloqueos] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Formularios
  const [nuevoEquipo, setNuevoEquipo] = useState({
    nombre_equipo: '', ubicacion: '', fuente_energia: 'Electrica', nivel_tension: ''
  });
  const [nuevoBloqueo, setNuevoBloqueo] = useState({
    equipo_id: '', colaborador_id: '', motivo: ''
  });

  useEffect(() => {
    if (user) loadContext();
  }, [user]);

  const loadContext = async () => {
    try {
      setIsLoading(true);
      const { data: managers } = await supabase
        .from('sst_managers')
        .select('property_id')
        .eq('account_id', user!.id)
        .limit(1);
      
      if (!managers || managers.length === 0) return;
      
      const currentPropertyId = managers[0].property_id;
      setPropertyId(currentPropertyId);
      
      await Promise.all([
        cargarEquipos(currentPropertyId),
        cargarBloqueos(currentPropertyId),
        cargarColaboradores(currentPropertyId)
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const cargarEquipos = async (propId: string) => {
    const { data } = await supabase.from('sst_loto_equipos').select('*').eq('property_id', propId).order('nombre_equipo');
    if (data) setEquipos(data);
  };

  const cargarBloqueos = async (propId: string) => {
    const { data } = await supabase.from('sst_loto_registros').select(`
      *, sst_loto_equipos(nombre_equipo), sst_colaboradores(nombre_completo)
    `).eq('property_id', propId).order('fecha_bloqueo', { ascending: false });
    if (data) setBloqueos(data);
  };

  const cargarColaboradores = async (propId: string) => {
    const { data } = await supabase.from('sst_colaboradores').select('id, nombre_completo').eq('property_id', propId);
    if (data) setColaboradores(data);
  };

  // Funciones de Guardado
  const guardarEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return;
    setIsLoading(true);
    const { error } = await supabase.from('sst_loto_equipos').insert([{ ...nuevoEquipo, property_id: propertyId }]);
    setIsLoading(false);
    if (!error) {
      setNuevoEquipo({ nombre_equipo: '', ubicacion: '', fuente_energia: 'Electrica', nivel_tension: '' });
      cargarEquipos(propertyId);
      alert("Equipo registrado exitosamente.");
    } else alert("Error al guardar equipo.");
  };

  const aplicarBloqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !nuevoBloqueo.equipo_id || !nuevoBloqueo.colaborador_id) return;
    setIsLoading(true);
    
    // 1. Crear el registro de bloqueo
    const { error: errBloqueo } = await supabase.from('sst_loto_registros').insert([{ ...nuevoBloqueo, property_id: propertyId }]);
    // 2. Actualizar el estado del equipo a 'Bloqueado'
    if (!errBloqueo) {
      await supabase.from('sst_loto_equipos').update({ estado_operativo: 'Bloqueado' }).eq('id', nuevoBloqueo.equipo_id);
      setNuevoBloqueo({ equipo_id: '', colaborador_id: '', motivo: '' });
      await Promise.all([cargarEquipos(propertyId), cargarBloqueos(propertyId)]);
      alert("Candado y Tarjeta (LOTO) aplicados exitosamente.");
    }
    setIsLoading(false);
  };

  const liberarBloqueo = async (bloqueoId: string, equipoId: string) => {
    if (!window.confirm("Confirma que el area esta despejada y es seguro energizar el equipo?")) return;
    setIsLoading(true);
    
    // 1. Marcar el registro como Liberado con fecha actual
    const { error } = await supabase.from('sst_loto_registros')
      .update({ estado: 'Liberado', fecha_desbloqueo: new Date().toISOString() })
      .eq('id', bloqueoId);
      
    // 2. Regresar el equipo a estado 'Activo'
    if (!error) {
      await supabase.from('sst_loto_equipos').update({ estado_operativo: 'Activo' }).eq('id', equipoId);
      await Promise.all([cargarEquipos(propertyId!), cargarBloqueos(propertyId!)]);
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="bg-[#0B1727] p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#20c997]/20 rounded-lg">
            <Zap className="w-8 h-8 text-[#20c997]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">10. Protocolos RETIE / LOTO</h1>
            <p className="text-slate-300 text-sm mt-1">Control de energias peligrosas, etiquetado y bloqueo.</p>
          </div>
        </div>
      </div>

      {/* Navegacion Tabs */}
      <div className="flex border-b border-slate-200">
        <button onClick={() => setActiveTab('equipos')} className={`py-4 px-6 text-sm font-bold flex items-center transition-colors ${activeTab === 'equipos' ? 'border-b-2 border-[#20c997] text-[#0B1727]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
          <Settings className="w-4 h-4 mr-2" /> 1. Inventario de Equipos
        </button>
        <button onClick={() => setActiveTab('loto')} className={`py-4 px-6 text-sm font-bold flex items-center transition-colors ${activeTab === 'loto' ? 'border-b-2 border-[#20c997] text-[#0B1727]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
          <Lock className="w-4 h-4 mr-2" /> 2. Panel de Bloqueo LOTO
        </button>
      </div>

      <div className="w-full bg-[#fdfdfd] rounded-xl shadow-sm border border-slate-200 min-h-[500px] p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 text-[#20c997] animate-spin mb-4" />
            <p>Cargando protocolos de energia...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: INVENTARIO DE EQUIPOS */}
            {activeTab === 'equipos' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Formulario Nuevo Equipo */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-fit">
                  <h3 className="text-lg font-bold text-[#0B1727] mb-4 border-b border-slate-200 pb-2">Registrar Equipo</h3>
                  <form onSubmit={guardarEquipo} className="space-y-4 text-sm">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nombre del Equipo / Tablero</label>
                      <input required type="text" value={nuevoEquipo.nombre_equipo} onChange={e => setNuevoEquipo({...nuevoEquipo, nombre_equipo: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none focus:border-[#20c997]" placeholder="Ej: Tablero Electrico Principal" />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Ubicacion</label>
                      <input required type="text" value={nuevoEquipo.ubicacion} onChange={e => setNuevoEquipo({...nuevoEquipo, ubicacion: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none focus:border-[#20c997]" placeholder="Ej: Cuarto de Maquinas - Sotano 1" />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Fuente de Energia Principal</label>
                      <select value={nuevoEquipo.fuente_energia} onChange={e => setNuevoEquipo({...nuevoEquipo, fuente_energia: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none focus:border-[#20c997] bg-white">
                        <option value="Electrica">Electrica</option>
                        <option value="Mecanica">Mecanica</option>
                        <option value="Neumatica">Neumatica</option>
                        <option value="Hidraulica">Hidraulica</option>
                        <option value="Termica">Termica</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nivel de Tension (Si aplica RETIE)</label>
                      <input type="text" value={nuevoEquipo.nivel_tension} onChange={e => setNuevoEquipo({...nuevoEquipo, nivel_tension: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none focus:border-[#20c997]" placeholder="Ej: 220V / 440V" />
                    </div>
                    <button type="submit" className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0B1727] text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm mt-4">
                      <Save className="w-4 h-4" /> Guardar Equipo
                    </button>
                  </form>
                </div>

                {/* Lista de Equipos */}
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-bold text-[#0B1727] mb-4">Equipos Registrados ({equipos.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {equipos.length === 0 ? (
                      <p className="text-slate-500 col-span-2 text-center py-8">No hay equipos registrados.</p>
                    ) : (
                      equipos.map(eq => (
                        <div key={eq.id} className={`p-4 rounded-xl border ${eq.estado_operativo === 'Bloqueado' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'} shadow-sm`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-[#0B1727]">{eq.nombre_equipo}</h4>
                            {eq.estado_operativo === 'Bloqueado' ? (
                              <Lock className="w-4 h-4 text-red-600" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-[#20c997]" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mb-3"><MapPin className="w-3 h-3 inline mr-1" />{eq.ubicacion}</p>
                          <div className="flex gap-2">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">{eq.fuente_energia}</span>
                            {eq.nivel_tension && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">RETIE: {eq.nivel_tension}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PANEL LOTO */}
            {activeTab === 'loto' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Formulario Aplicar Candado */}
                <div className="bg-red-50 p-6 rounded-xl border border-red-200 h-fit">
                  <h3 className="text-lg font-bold text-red-700 mb-4 border-b border-red-200 pb-2 flex items-center gap-2">
                    <Lock className="w-5 h-5" /> Aplicar Bloqueo (LOTO)
                  </h3>
                  <form onSubmit={aplicarBloqueo} className="space-y-4 text-sm">
                    <div>
                      <label className="block font-bold text-red-900 mb-1">Seleccionar Equipo a Bloquear</label>
                      <select required value={nuevoBloqueo.equipo_id} onChange={e => setNuevoBloqueo({...nuevoBloqueo, equipo_id: e.target.value})} className="w-full p-2.5 border border-red-200 rounded-lg outline-none focus:border-red-500 bg-white">
                        <option value="">-- Elija un equipo Activo --</option>
                        {equipos.filter(e => e.estado_operativo !== 'Bloqueado').map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.nombre_equipo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-red-900 mb-1">Autorizado / Encargado (El dueno del candado)</label>
                      <select required value={nuevoBloqueo.colaborador_id} onChange={e => setNuevoBloqueo({...nuevoBloqueo, colaborador_id: e.target.value})} className="w-full p-2.5 border border-red-200 rounded-lg outline-none focus:border-red-500 bg-white">
                        <option value="">-- Elija al trabajador --</option>
                        {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-red-900 mb-1">Motivo del Bloqueo</label>
                      <textarea required value={nuevoBloqueo.motivo} onChange={e => setNuevoBloqueo({...nuevoBloqueo, motivo: e.target.value})} rows={2} className="w-full p-2.5 border border-red-200 rounded-lg outline-none focus:border-red-500 bg-white" placeholder="Ej: Mantenimiento correctivo de motor..." />
                    </div>
                    <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm mt-4">
                      <Lock className="w-4 h-4" /> Colocar Candado y Tarjeta
                    </button>
                  </form>
                </div>

                {/* Lista de Registros LOTO */}
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-bold text-[#0B1727] mb-4">Bitacora de Bloqueos</h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 text-[#0B1727] border-b border-slate-200">
                        <tr>
                          <th className="p-4 font-semibold">Equipo</th>
                          <th className="p-4 font-semibold">Responsable (Candado)</th>
                          <th className="p-4 font-semibold">Fecha Aplicacion</th>
                          <th className="p-4 font-semibold text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bloqueos.length === 0 ? (
                          <tr><td colSpan={4} className="p-8 text-center text-slate-500">No hay registros de LOTO.</td></tr>
                        ) : (
                          bloqueos.map(b => (
                            <tr key={b.id} className="border-b border-slate-100 bg-white hover:bg-slate-50">
                              <td className="p-4 font-bold text-[#0B1727]">{b.sst_loto_equipos?.nombre_equipo}</td>
                              <td className="p-4 text-slate-600">
                                <span className="flex items-center gap-1"><User className="w-3 h-3"/> {b.sst_colaboradores?.nombre_completo}</span>
                                <span className="text-[10px] text-slate-400 block mt-1">{b.motivo}</span>
                              </td>
                              <td className="p-4 text-slate-600 text-xs">
                                {new Date(b.fecha_bloqueo).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td className="p-4 text-center">
                                {b.estado === 'Bloqueo Activo' ? (
                                  <button onClick={() => liberarBloqueo(b.id, b.equipo_id)} className="flex items-center gap-1 mx-auto px-3 py-1.5 bg-red-100 text-red-700 font-bold rounded-md hover:bg-red-200 transition-colors text-xs" title="Clic para Liberar Energia">
                                    <Lock className="w-3 h-3" /> Activo (Desbloquear)
                                  </button>
                                ) : (
                                  <span className="flex items-center justify-center gap-1 text-xs font-bold text-[#20c997]">
                                    <Unlock className="w-3 h-3" /> Liberado
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
