import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, AlertTriangle, Camera, CheckCircle2, 
  XCircle, Clock, Save, Search, Target, ShieldAlert,
  BarChart3, Plus, Filter, Loader2, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Listas de chequeo predefinidas para el sistema
const CHECKLISTS: Record<string, string[]> = {
  'Extintores': [
    'El extintor se encuentra en su lugar asignado y visible?',
    'El manometro indica presion en la zona verde?',
    'El pin de seguridad y el sello estan intactos?',
    'La manguera y boquilla estan libres de obstrucciones o grietas?',
    'La fecha de recarga esta vigente?'
  ],
  'Botiquines': [
    'El botiquin esta senalizado y de facil acceso?',
    'Los insumos estan dentro de la fecha de vencimiento?',
    'Cuenta con los elementos basicos (gasas, isodine, guantes, tijeras)?',
    'El contenedor esta limpio y en buen estado?'
  ],
  'Locativas': [
    'Las rutas de evacuacion estan libres de obstaculos?',
    'La iluminacion es adecuada y no hay luminarias fundidas?',
    'Los pisos estan secos, limpios y sin desniveles peligrosos?',
    'Las escaleras cuentan con cintas antideslizantes y pasamanos firmes?'
  ]
};

export default function InspeccionesTool() {
  const { user } = useAuth();
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'nueva' | 'hallazgos'>('dashboard');
  
  // Estados de BD
  const [inspecciones, setInspecciones] = useState<any[]>([]);
  const [hallazgos, setHallazgos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados Formulario Nueva Inspeccion
  const [tipoInspeccion, setTipoInspeccion] = useState('Extintores');
  const [respuestas, setRespuestas] = useState<Record<number, { cumple: boolean | null, hallazgo: string, riesgo: string }>>({});
  const [inspector, setInspector] = useState('');

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
      
      await Promise.all([cargarInspecciones(currentPropertyId), cargarHallazgos(currentPropertyId)]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const cargarInspecciones = async (propId: string) => {
    const { data } = await supabase.from('sst_inspecciones').select('*').eq('property_id', propId).order('fecha_inspeccion', { ascending: false });
    if (data) setInspecciones(data);
  };

  const cargarHallazgos = async (propId: string) => {
    const { data } = await supabase.from('sst_hallazgos').select('*, sst_inspecciones(tipo_inspeccion)').eq('property_id', propId).order('created_at', { ascending: false });
    if (data) setHallazgos(data);
  };

  // Logica de Checklist Dinamico
  const handleRespuesta = (index: number, cumple: boolean) => {
    setRespuestas(prev => ({
      ...prev,
      [index]: { ...prev[index], cumple, hallazgo: prev[index]?.hallazgo || '', riesgo: prev[index]?.riesgo || 'Medio' }
    }));
  };

  const handleHallazgoDetalle = (index: number, campo: 'hallazgo' | 'riesgo', valor: string) => {
    setRespuestas(prev => ({
      ...prev,
      [index]: { ...prev[index], [campo]: valor }
    }));
  };

  const guardarInspeccion = async () => {
    const preguntas = CHECKLISTS[tipoInspeccion];
    // Validar que todo se respondio
    for (let i = 0; i < preguntas.length; i++) {
      if (respuestas[i]?.cumple === undefined || respuestas[i]?.cumple === null) {
        alert("Debes calificar todos los items de la inspeccion.");
        return;
      }
      if (respuestas[i]?.cumple === false && !respuestas[i]?.hallazgo) {
        alert(`Debes describir el hallazgo para la pregunta: "${preguntas[i]}"`);
        return;
      }
    }

    setIsLoading(true);
    
    // Calcular porcentaje de cumplimiento
    const total = preguntas.length;
    const cumplidos = Object.values(respuestas).filter(r => r.cumple).length;
    const porcentaje = Math.round((cumplidos / total) * 100);

    // 1. Guardar Inspeccion
    const { data: inspData, error: insError } = await supabase.from('sst_inspecciones').insert([{
      property_id: propertyId,
      tipo_inspeccion: tipoInspeccion,
      fecha_inspeccion: new Date().toISOString(),
      inspector: inspector || 'Inspector SG-SST',
      porcentaje_cumplimiento: porcentaje
    }]).select();

    if (!insError && inspData) {
      const inspeccionId = inspData[0].id;
      const hallazgosAInsertar = [];

      // 2. Extraer Hallazgos (Los "No Cumple")
      for (let i = 0; i < preguntas.length; i++) {
        if (respuestas[i].cumple === false) {
          hallazgosAInsertar.push({
            property_id: propertyId,
            inspeccion_id: inspeccionId,
            descripcion_hallazgo: `Falla en: ${preguntas[i]} - Detalle: ${respuestas[i].hallazgo}`,
            nivel_riesgo: respuestas[i].riesgo
          });
        }
      }

      if (hallazgosAInsertar.length > 0) {
        await supabase.from('sst_hallazgos').insert(hallazgosAInsertar);
      }

      alert("Inspeccion guardada y hallazgos registrados con exito.");
      setRespuestas({});
      setActiveTab('dashboard');
      await Promise.all([cargarInspecciones(propertyId!), cargarHallazgos(propertyId!)]);
    } else {
      alert("Error al guardar inspeccion.");
    }
    setIsLoading(false);
  };

  const cerrarHallazgo = async (hallazgoId: string) => {
    const plan = prompt("Describe el plan de accion ejecutado para cerrar este hallazgo:");
    if (!plan) return;

    setIsLoading(true);
    await supabase.from('sst_hallazgos').update({
      estado: 'Cerrado',
      plan_accion: plan,
      fecha_cierre: new Date().toISOString()
    }).eq('id', hallazgoId);
    
    await cargarHallazgos(propertyId!);
    setIsLoading(false);
  };

  const getRiesgoBadge = (riesgo: string) => {
    if (riesgo === 'Alto') return 'bg-red-100 text-red-700 border-red-200';
    if (riesgo === 'Medio') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-[#20c997]/20 text-[#1ba87e] border-[#20c997]/30';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Cabecera */}
      <div className="bg-[#0B1727] p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#20c997]/20 rounded-lg">
            <Target className="w-8 h-8 text-[#20c997]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Inspecciones de Seguridad</h1>
            <p className="text-slate-300 text-sm mt-1">Verificacion en terreno y gestion de hallazgos / planes de accion.</p>
          </div>
        </div>
        <button onClick={() => setActiveTab('nueva')} className="flex items-center gap-2 px-5 py-2.5 bg-[#20c997] text-[#0B1727] font-bold rounded-lg hover:bg-teal-500 transition-all shadow-md transform hover:scale-105">
          <Plus className="w-5 h-5" /> Nueva Inspeccion
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200">
        <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors ${activeTab === 'dashboard' ? 'border-b-2 border-[#20c997] text-[#0B1727]' : 'text-slate-500 hover:bg-slate-50'}`}>
          <BarChart3 className="w-4 h-4" /> Dashboard Analitico
        </button>
        <button onClick={() => setActiveTab('nueva')} className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors ${activeTab === 'nueva' ? 'border-b-2 border-[#20c997] text-[#0B1727]' : 'text-slate-500 hover:bg-slate-50'}`}>
          <ClipboardCheck className="w-4 h-4" /> Ejecutar Checklist
        </button>
        <button onClick={() => setActiveTab('hallazgos')} className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors ${activeTab === 'hallazgos' ? 'border-b-2 border-[#20c997] text-[#0B1727]' : 'text-slate-500 hover:bg-slate-50'}`}>
          <ShieldAlert className="w-4 h-4" /> Gestor de Hallazgos
          {hallazgos.filter(h => h.estado === 'Abierto').length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">
              {hallazgos.filter(h => h.estado === 'Abierto').length}
            </span>
          )}
        </button>
      </div>

      <div className="w-full bg-[#fdfdfd] rounded-xl shadow-sm border border-slate-200 min-h-[500px] p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 h-full">
            <Loader2 className="w-8 h-8 text-[#20c997] animate-spin mb-4" />
            <p>Cargando modulo de inspecciones...</p>
          </div>
        ) : (
          <>
            {/* ================= TAB 1: DASHBOARD ================= */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Inspecciones Totales</p>
                      <p className="text-3xl font-black text-[#0B1727] mt-1">{inspecciones.length}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg"><ClipboardCheck className="w-6 h-6 text-blue-600" /></div>
                  </div>
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Hallazgos Abiertos</p>
                      <p className="text-3xl font-black text-red-600 mt-1">{hallazgos.filter(h => h.estado === 'Abierto').length}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
                  </div>
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Hallazgos Cerrados</p>
                      <p className="text-3xl font-black text-[#20c997] mt-1">{hallazgos.filter(h => h.estado === 'Cerrado').length}</p>
                    </div>
                    <div className="bg-[#20c997]/10 p-3 rounded-lg"><CheckCircle2 className="w-6 h-6 text-[#20c997]" /></div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-bold text-[#0B1727] mb-4">Ultimas Inspecciones Realizadas</h3>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-4 font-bold">Fecha</th>
                          <th className="p-4 font-bold">Tipo de Inspeccion</th>
                          <th className="p-4 font-bold">Inspector</th>
                          <th className="p-4 font-bold">Cumplimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspecciones.length === 0 ? (
                          <tr><td colSpan={4} className="p-6 text-center text-slate-400">No hay inspecciones registradas.</td></tr>
                        ) : (
                          inspecciones.slice(0, 5).map(insp => (
                            <tr key={insp.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-4 font-medium text-slate-700">{new Date(insp.fecha_inspeccion).toLocaleDateString('es-CO')}</td>
                              <td className="p-4 font-bold text-[#0B1727]">{insp.tipo_inspeccion}</td>
                              <td className="p-4 text-slate-600">{insp.inspector}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-full bg-slate-200 rounded-full h-2.5 max-w-[100px]">
                                    <div className={`h-2.5 rounded-full ${insp.porcentaje_cumplimiento >= 80 ? 'bg-[#20c997]' : insp.porcentaje_cumplimiento >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`} style={{ width: `${insp.porcentaje_cumplimiento}%` }}></div>
                                  </div>
                                  <span className="font-bold text-xs">{insp.porcentaje_cumplimiento}%</span>
                                </div>
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

            {/* ================= TAB 2: EJECUTAR CHECKLIST ================= */}
            {activeTab === 'nueva' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Checklist</label>
                    <select 
                      value={tipoInspeccion} 
                      onChange={e => { setTipoInspeccion(e.target.value); setRespuestas({}); }}
                      className="w-full p-2.5 border rounded-lg outline-none focus:border-[#20c997] font-bold text-[#0B1727] bg-white shadow-sm"
                    >
                      {Object.keys(CHECKLISTS).map(k => <option key={k} value={k}>Inspeccion de {k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Inspector</label>
                    <input 
                      type="text" 
                      value={inspector} 
                      onChange={e => setInspector(e.target.value)} 
                      placeholder="Ej. Coordinador SST"
                      className="w-full p-2.5 border rounded-lg outline-none focus:border-[#20c997] text-sm text-[#0B1727] bg-white shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {CHECKLISTS[tipoInspeccion].map((pregunta, index) => {
                    const res = respuestas[index];
                    const isFail = res?.cumple === false;

                    return (
                      <div key={index} className={`p-5 rounded-xl border transition-all ${isFail ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <p className="font-bold text-[#0B1727] text-sm flex-1"><span className="text-slate-400 mr-2">{index + 1}.</span> {pregunta}</p>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              onClick={() => handleRespuesta(index, true)}
                              className={`flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-xs transition-colors ${res?.cumple === true ? 'bg-[#20c997] text-[#0B1727] border border-[#1ba87e]' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}`}
                            >
                              <CheckCircle2 className="w-4 h-4" /> CUMPLE
                            </button>
                            <button 
                              onClick={() => handleRespuesta(index, false)}
                              className={`flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-xs transition-colors ${isFail ? 'bg-red-600 text-white border border-red-700' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600'}`}
                            >
                              <XCircle className="w-4 h-4" /> NO CUMPLE
                            </button>
                          </div>
                        </div>

                        {/* Despliegue Dinamico de Hallazgo si Falla */}
                        {isFail && (
                          <div className="mt-4 pt-4 border-t border-red-200 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-red-900 mb-1">Descripcion del Hallazgo / Anomalia *</label>
                              <textarea 
                                rows={2} 
                                value={res.hallazgo} 
                                onChange={(e) => handleHallazgoDetalle(index, 'hallazgo', e.target.value)}
                                placeholder="Describa el problema encontrado..." 
                                className="w-full p-2 border border-red-200 rounded-md outline-none focus:border-red-500 text-sm"
                              />
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-bold text-red-900 mb-1">Nivel de Riesgo</label>
                                <select 
                                  value={res.riesgo} 
                                  onChange={(e) => handleHallazgoDetalle(index, 'riesgo', e.target.value)}
                                  className="w-full p-2 border border-red-200 rounded-md outline-none text-sm font-semibold"
                                >
                                  <option value="Bajo">Bajo</option>
                                  <option value="Medio">Medio</option>
                                  <option value="Alto">Alto (Critico)</option>
                                </select>
                              </div>
                              <button className="w-full flex items-center justify-center gap-2 py-2 border border-red-300 bg-white text-red-700 font-bold text-xs rounded-md hover:bg-red-100">
                                <Camera className="w-4 h-4" /> Adjuntar Foto
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={guardarInspeccion}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-[#0B1727] text-white font-black text-lg rounded-xl hover:bg-slate-800 transition-all shadow-lg transform hover:scale-[1.01]"
                >
                  <Save className="w-5 h-5" /> Finalizar Inspeccion
                </button>
              </div>
            )}

            {/* ================= TAB 3: GESTOR DE HALLAZGOS ================= */}
            {activeTab === 'hallazgos' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-bold text-[#0B1727]">Seguimiento de Hallazgos</h3>
                  <div className="flex gap-2">
                    <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"><Filter className="w-4 h-4" /></button>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input type="text" placeholder="Buscar..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#20c997] w-48 md:w-64" />
                    </div>
                  </div>
                </div>

                {hallazgos.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p>Felicidades. No tienes hallazgos de seguridad abiertos.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {hallazgos.map(h => (
                      <div key={h.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col ${h.estado === 'Cerrado' ? 'border-slate-200 opacity-70' : 'border-slate-300'}`}>
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                              Origen: Inspeccion {h.sst_inspecciones?.tipo_inspeccion}
                            </span>
                            <h4 className="font-bold text-[#0B1727] text-sm mt-1 leading-snug">{h.descripcion_hallazgo}</h4>
                          </div>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getRiesgoBadge(h.nivel_riesgo)}`}>
                            Riesgo {h.nivel_riesgo}
                          </span>
                        </div>
                        
                        <div className="p-4 flex-1">
                          {h.estado === 'Cerrado' ? (
                            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg">
                              <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Plan de Accion Ejecutado:</p>
                              <p className="text-xs text-emerald-700">{h.plan_accion}</p>
                              <p className="text-[10px] text-emerald-600 mt-2 font-semibold">Cerrado el: {new Date(h.fecha_cierre).toLocaleDateString('es-CO')}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-orange-400" /> Esperando plan de accion y correccion.
                            </p>
                          )}
                        </div>

                        {h.estado !== 'Cerrado' && (
                          <div className="p-3 bg-slate-50 border-t border-slate-100">
                            <button onClick={() => cerrarHallazgo(h.id)} className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-300 text-[#0B1727] font-bold text-sm rounded-lg hover:bg-slate-100 hover:border-slate-400 transition-colors">
                              Registrar Solucion y Cerrar Hallazgo <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
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
