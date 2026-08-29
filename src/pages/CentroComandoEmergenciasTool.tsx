import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Users, FileText, Activity, AlertTriangle, Save, 
  PlaySquare, CheckCircle2, Plus, Trash2, Download, 
  Flame, Shield, AlertOctagon, UserCheck, UploadCloud, FileCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function CentroComandoEmergenciasTool() {
  const { user } = useAuth();
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'diamante' | 'brigada' | 'pons' | 'simulacros'>('diamante');
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // =========================================================================
  // TAB 1: ESTADOS DIAMANTE DE RIESGOS (EN BLANCO PARA LLENAR)
  // =========================================================================
  const [amenaza, setAmenaza] = useState('');
  const [colorAmenaza, setColorAmenaza] = useState<'Rojo' | 'Amarillo' | 'Verde'>('Rojo');
  const [puntajePersonas, setPuntajePersonas] = useState(0.0);
  const [puntajeRecursos, setPuntajeRecursos] = useState(0.0);
  const [puntajeSistemas, setPuntajeSistemas] = useState(0.0);

  const evaluarVulnerabilidad = (puntaje: number) => {
    if (puntaje <= 1.1) return { color: 'Rojo', label: 'ALTA', clase: 'bg-red-500 text-white' };
    if (puntaje <= 2.0) return { color: 'Amarillo', label: 'MEDIA', clase: 'bg-yellow-400 text-[#0B1727]' };
    return { color: 'Verde', label: 'BAJA', clase: 'bg-[#20c997] text-white' };
  };

  const cPersonas = evaluarVulnerabilidad(puntajePersonas);
  const cRecursos = evaluarVulnerabilidad(puntajeRecursos);
  const cSistemas = evaluarVulnerabilidad(puntajeSistemas);
  const cAmenazaClase = colorAmenaza === 'Rojo' ? 'bg-red-500 text-white' : colorAmenaza === 'Amarillo' ? 'bg-yellow-400 text-[#0B1727]' : 'bg-[#20c997] text-white';

  const calcularRiesgoGlobal = () => {
    const colores = [cPersonas.color, cRecursos.color, cSistemas.color, colorAmenaza];
    const rojas = colores.filter(c => c === 'Rojo').length;
    const amarillas = colores.filter(c => c === 'Amarillo').length;

    if (rojas >= 3) return { nivel: 'RIESGO ALTO', desc: 'Situacion critica. Requiere intervencion inmediata.', clase: 'bg-red-500 text-white' };
    if (rojas >= 1 || amarillas >= 3) return { nivel: 'RIESGO MEDIO', desc: 'Peligro moderado con controles parciales.', clase: 'bg-yellow-400 text-[#0B1727]' };
    return { nivel: 'RIESGO BAJO', desc: 'Vulnerabilidad y amenaza controladas.', clase: 'bg-[#20c997] text-white' };
  };

  const riesgoGlobal = calcularRiesgoGlobal();

  // =========================================================================
  // TAB 2: ESTADOS GESTION DE BRIGADISTAS & SCI (VACIO)
  // =========================================================================
  const [brigadistas, setBrigadistas] = useState<any[]>([]);
  const [nuevoBrigadista, setNuevoBrigadista] = useState({ colabId: '', rol: 'Comandante del Incidente (SCI)' });

  // =========================================================================
  // TAB 3: ESTADOS PROTOCOLOS (PON's)
  // =========================================================================
  const [ponSeleccionado, setPonSeleccionado] = useState('sismo');
  const protocolosPons: Record<string, any> = {
    sismo: {
      titulo: "PON - Sismo / Terremoto",
      icon: Activity,
      color: "text-amber-500",
      antes: ["Identificar zonas de menor riesgo y puntos de autoproteccion.", "Inspeccionar rutas de evacuacion libres de obstaculos."],
      durante: ["Suspender actividades de inmediato.", "Protegerse junto a columnas seguras o cajoneras. NO evacuar durante el sismo."],
      despues: ["Esperar orden oficial del Lider de Brigada.", "Evacuar hacia el punto de encuentro."]
    },
    incendio: {
      titulo: "PON - Conatos e Incendios",
      icon: Flame,
      color: "text-red-500",
      antes: ["Revision periodica de carga y senalizacion de extintores.", "Inspeccion de instalaciones electricas."],
      durante: ["Atacar con extintor si es conato y es seguro.", "Activar alarma de emergencia y evacuar si se sale de control."],
      despues: ["Apoyar labor de bomberos y no reingresar hasta autorizacion."]
    },
    derrame: {
      titulo: "PON - Derrames Quimicos (SGA)",
      icon: AlertOctagon,
      color: "text-purple-500",
      antes: ["Disponer de FDS y kit antiderrame en sitio.", "Uso de EPP de proteccion."],
      durante: ["Confinar el derrame con material absorbente.", "Evitar el paso hacia desagues."],
      despues: ["Disponer residuos en bolsa roja y rotular."]
    },
    hurto: {
      titulo: "PON - Hurto / Riesgo Publico",
      icon: Shield,
      color: "text-blue-500",
      antes: ["Mantener control estricto de acceso y visitantes.", "Verificar camaras de seguridad."],
      durante: ["Conservar la calma. No poner resistencia fisica.", "Memorizar rasgos de los agresores."],
      despues: ["Avisar a la Policia Nacional (123).", "Aislar la escena."]
    }
  };

  // =========================================================================
  // TAB 4: ESTADOS BITACORA DE SIMULACROS (CON EVIDENCIA)
  // =========================================================================
  const [simulacros, setSimulacros] = useState<any[]>([]);
  const [nuevoSimulacro, setNuevoSimulacro] = useState({
    fecha: '',
    tipo: 'Avisado',
    tiempo_min: '',
    tiempo_seg: '',
    evacuados: '',
    observaciones: '',
    archivo: null as File | null
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
      
      await cargarPersonal(currentPropertyId);
    } catch (error) {
      console.error("Error cargando contexto:", error);
      setIsLoading(false);
    }
  };

  const cargarPersonal = async (propId: string) => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('sst_colaboradores')
        .select('id, nombre_completo, tipo_vinculacion, empresa_contratante')
        .eq('property_id', propId);
      if (data) setColaboradores(data);
    } catch (err) {
      console.log('Error cargando personal', err);
    } finally {
      setIsLoading(false);
    }
  };

  const agregarBrigadista = () => {
    if (!nuevoBrigadista.colabId) return;
    const colab = colaboradores.find(c => c.id === nuevoBrigadista.colabId);
    if (!colab) return;
    setBrigadistas([...brigadistas, {
      id: Date.now().toString(),
      nombre: colab.nombre_completo,
      cargo: nuevoBrigadista.rol,
      capacitacion: 'Asignado'
    }]);
    setNuevoBrigadista({ colabId: '', rol: 'Comandante del Incidente (SCI)' });
  };

  const agregarSimulacro = (e: React.FormEvent) => {
    e.preventDefault();
    setSimulacros([
      {
        id: Date.now().toString(),
        fecha: nuevoSimulacro.fecha,
        tipo: `Simulacro ${nuevoSimulacro.tipo}`,
        tiempo_evac: `${nuevoSimulacro.tiempo_min} min ${nuevoSimulacro.tiempo_seg} seg`,
        evacuados: parseInt(nuevoSimulacro.evacuados) || 0,
        observaciones: nuevoSimulacro.observaciones,
        evidencia: nuevoSimulacro.archivo ? nuevoSimulacro.archivo.name : 'Sin archivo'
      },
      ...simulacros
    ]);
    setNuevoSimulacro({ fecha: '', tipo: 'Avisado', tiempo_min: '', tiempo_seg: '', evacuados: '', observaciones: '', archivo: null });
    alert("Simulacro registrado con exito en la bitacora.");
  };

  const exportarPlanEmergenciasPDF = () => {
    alert("Generando documento consolidado del Plan de Prevencion y Preparacion ante Emergencias...");
  };

  return (
    <div className="w-full bg-[#fdfdfd] rounded-xl shadow-sm border border-slate-200 min-h-[650px] flex flex-col">
      
      {/* CABECERA PRINCIPAL */}
      <div className="bg-[#0B1727] p-6 rounded-t-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#20c997]/20 rounded-lg">
              <ShieldAlert className="w-7 h-7 text-[#20c997]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Centro de Comando de Emergencias</h2>
              <p className="text-slate-300 text-xs mt-0.5">Plan de Prevencion, Preparacion y Respuesta (IDIGER)</p>
            </div>
          </div>

          {/* BOTON MAESTRO DE DESCARGA DE TODO EL PLAN */}
          <button 
            onClick={exportarPlanEmergenciasPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#20c997] text-white font-bold text-xs rounded-lg hover:bg-[#1ba87e] transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Generar Documento Consolidado
          </button>
        </div>

        {/* NAVEGACION TABS */}
        <div className="flex overflow-x-auto gap-2 border-b border-slate-700/50">
          <button onClick={() => setActiveTab('diamante')} className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold text-sm transition-colors ${activeTab === 'diamante' ? 'bg-white text-[#0B1727]' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
            <Activity className="w-4 h-4 text-[#20c997]" /> 1. Diamante de Riesgos
          </button>
          <button onClick={() => setActiveTab('brigada')} className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold text-sm transition-colors ${activeTab === 'brigada' ? 'bg-white text-[#0B1727]' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
            <Users className="w-4 h-4 text-[#20c997]" /> 2. Brigada & SCI
          </button>
          <button onClick={() => setActiveTab('pons')} className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold text-sm transition-colors ${activeTab === 'pons' ? 'bg-white text-[#0B1727]' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
            <FileText className="w-4 h-4 text-[#20c997]" /> 3. Protocolos (PONs)
          </button>
          <button onClick={() => setActiveTab('simulacros')} className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold text-sm transition-colors ${activeTab === 'simulacros' ? 'bg-white text-[#0B1727]' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
            <PlaySquare className="w-4 h-4 text-[#20c997]" /> 4. Bitacora de Simulacros
          </button>
        </div>
      </div>

      {/* AREA DE CONTENIDO */}
      <div className="p-6 flex-1 bg-white">
        
        {/* ================= TAB 1 ================= */}
        {activeTab === 'diamante' && (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-1/2 space-y-5">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="font-bold text-[#0B1727] text-base mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" /> Registrar Amenaza
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre de la Amenaza</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Sismo / Incendio..." 
                      value={amenaza} 
                      onChange={(e) => setAmenaza(e.target.value)} 
                      className="w-full p-2 border rounded-lg text-xs font-semibold text-[#0B1727] bg-white outline-none focus:border-[#20c997]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Calificacion</label>
                    <select 
                      value={colorAmenaza} 
                      onChange={(e) => setColorAmenaza(e.target.value as any)} 
                      className="w-full p-2 border rounded-lg text-xs font-semibold text-[#0B1727] bg-white outline-none focus:border-[#20c997]"
                    >
                      <option value="Rojo">Inminente (Rojo)</option>
                      <option value="Amarillo">Probable (Amarillo)</option>
                      <option value="Verde">Posible (Verde)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="font-bold text-[#0B1727] text-base mb-4">Vulnerabilidad por Elemento (0.0 - 3.0)</h3>
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span>1. Personas:</span>
                      <span className="font-bold text-[#0B1727]">{puntajePersonas} ({cPersonas.label})</span>
                    </div>
                    <input type="range" min="0" max="3" step="0.1" value={puntajePersonas} onChange={(e) => setPuntajePersonas(parseFloat(e.target.value))} className="w-full accent-[#20c997]" />
                  </div>
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span>2. Recursos:</span>
                      <span className="font-bold text-[#0B1727]">{puntajeRecursos} ({cRecursos.label})</span>
                    </div>
                    <input type="range" min="0" max="3" step="0.1" value={puntajeRecursos} onChange={(e) => setPuntajeRecursos(parseFloat(e.target.value))} className="w-full accent-[#20c997]" />
                  </div>
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span>3. Sistemas y Procesos:</span>
                      <span className="font-bold text-[#0B1727]">{puntajeSistemas} ({cSistemas.label})</span>
                    </div>
                    <input type="range" min="0" max="3" step="0.1" value={puntajeSistemas} onChange={(e) => setPuntajeSistemas(parseFloat(e.target.value))} className="w-full accent-[#20c997]" />
                  </div>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 py-3 bg-[#0B1727] text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                <Save className="w-4 h-4" /> Guardar Calificacion en Matriz
              </button>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 text-center">
                Diamante Metodologico IDIGER
              </h4>
              
              <div className="relative w-56 h-56 rotate-45 transform-gpu shadow-lg mb-8 border-4 border-[#0B1727]">
                <div className={`absolute top-0 left-0 w-28 h-28 flex items-center justify-center border-r-2 border-b-2 border-[#0B1727] ${cPersonas.clase}`}>
                  <span className="-rotate-45 font-black text-xs tracking-wider">PERSONAS</span>
                </div>
                <div className={`absolute bottom-0 left-0 w-28 h-28 flex items-center justify-center border-r-2 border-[#0B1727] ${cRecursos.clase}`}>
                  <span className="-rotate-45 font-black text-xs tracking-wider">RECURSOS</span>
                </div>
                <div className={`absolute top-0 right-0 w-28 h-28 flex items-center justify-center border-b-2 border-[#0B1727] ${cSistemas.clase}`}>
                  <span className="-rotate-45 font-black text-xs tracking-wider">SISTEMAS</span>
                </div>
                <div className={`absolute bottom-0 right-0 w-28 h-28 flex items-center justify-center ${cAmenazaClase}`}>
                  <span className="-rotate-45 font-black text-xs tracking-wider">AMENAZA</span>
                </div>
              </div>

              <div className="text-center bg-white p-4 rounded-xl border border-slate-200 w-full max-w-sm shadow-sm">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black inline-block mb-2 ${riesgoGlobal.clase}`}>
                  {riesgoGlobal.nivel}
                </span>
                <p className="text-xs text-slate-600 font-medium">{riesgoGlobal.desc}</p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2 ================= */}
        {activeTab === 'brigada' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Seleccionar Colaborador</label>
                <select 
                  value={nuevoBrigadista.colabId} 
                  onChange={(e) => setNuevoBrigadista({...nuevoBrigadista, colabId: e.target.value})}
                  className="w-full p-2.5 border rounded-lg text-xs bg-white focus:border-[#20c997] outline-none"
                >
                  <option value="">Seleccione personal...</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre_completo} ({c.tipo_vinculacion || 'General'})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Rol / Estructura SCI</label>
                <select 
                  value={nuevoBrigadista.rol} 
                  onChange={(e) => setNuevoBrigadista({...nuevoBrigadista, rol: e.target.value})}
                  className="w-full p-2.5 border rounded-lg text-xs bg-white focus:border-[#20c997] outline-none font-semibold"
                >
                  <option value="Comandante del Incidente (SCI)">Comandante del Incidente (SCI)</option>
                  <option value="Oficial de Seguridad">Oficial de Seguridad</option>
                  <option value="Oficial de Comunicaciones">Oficial de Comunicaciones</option>
                  <option value="Lider de Brigada de Emergencias">Lider de Brigada de Emergencias</option>
                  <option value="Brigadista Integral (Evacuacion)">Brigadista Integral (Evacuacion)</option>
                  <option value="Brigadista Integral (Primeros Auxilios)">Brigadista Integral (Primeros Auxilios)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={agregarBrigadista} 
                  className="w-full py-2.5 bg-[#20c997] text-white font-bold text-xs rounded-lg hover:bg-[#1ba87e] transition-colors flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" /> Designar Responsable
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[#0B1727] border-b border-slate-200">
                    <th className="p-3.5 font-bold">Nombre del Colaborador</th>
                    <th className="p-3.5 font-bold">Rol Asignado</th>
                    <th className="p-3.5 font-bold text-right">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {brigadistas.length === 0 ? (
                    <tr><td colSpan={3} className="p-6 text-center text-slate-400">No hay brigadistas o mandos SCI asignados todavia.</td></tr>
                  ) : (
                    brigadistas.map((b) => (
                      <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 bg-white">
                        <td className="p-3.5 font-bold text-[#0B1727]">{b.nombre}</td>
                        <td className="p-3.5">
                          <span className="bg-[#0B1727]/5 text-[#0B1727] px-2.5 py-1 rounded font-semibold border border-[#0B1727]/10">
                            {b.cargo}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button onClick={() => setBrigadistas(brigadistas.filter(item => item.id !== b.id))} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4 ml-auto" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3 ================= */}
        {activeTab === 'pons' && (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Protocolos Obligatorios</p>
              {Object.keys(protocolosPons).map((key) => {
                const IconComponent = protocolosPons[key].icon;
                return (
                  <button
                    key={key}
                    onClick={() => setPonSeleccionado(key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border ${
                      ponSeleccionado === key 
                        ? 'bg-[#0B1727] text-white border-[#0B1727] shadow-sm' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 ${ponSeleccionado === key ? 'text-[#20c997]' : protocolosPons[key].color}`} />
                    <span className="text-xs font-bold">{protocolosPons[key].titulo}</span>
                  </button>
                );
              })}
            </div>

            <div className="w-full md:w-2/3 bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h3 className="text-base font-bold text-[#0B1727] mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#20c997]" />
                {protocolosPons[ponSeleccionado].titulo}
              </h3>

              <div className="space-y-5 text-xs">
                <div>
                  <h4 className="font-bold text-blue-900 bg-blue-100/60 px-3 py-1.5 rounded-md mb-2">ANTES</h4>
                  <ul className="space-y-1.5 pl-2 text-slate-700">
                    {protocolosPons[ponSeleccionado].antes.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#20c997] shrink-0 mt-0.5" /><span>{item}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-orange-900 bg-orange-100/60 px-3 py-1.5 rounded-md mb-2">DURANTE</h4>
                  <ul className="space-y-1.5 pl-2 text-slate-700">
                    {protocolosPons[ponSeleccionado].durante.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" /><span>{item}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-green-900 bg-green-100/60 px-3 py-1.5 rounded-md mb-2">DESPUES</h4>
                  <ul className="space-y-1.5 pl-2 text-slate-700">
                    {protocolosPons[ponSeleccionado].despues.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" /><span>{item}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4 ================= */}
        {activeTab === 'simulacros' && (
          <div className="space-y-6">
            <form onSubmit={agregarSimulacro} className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h3 className="font-bold text-[#0B1727] text-sm mb-4 flex items-center gap-2">
                <PlaySquare className="w-4 h-4 text-[#20c997]" /> Registrar Nuevo Simulacro y Cargar Evidencias
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs mb-4">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Fecha</label>
                  <input type="date" required value={nuevoSimulacro.fecha} onChange={e => setNuevoSimulacro({...nuevoSimulacro, fecha: e.target.value})} className="w-full p-2 border rounded-lg bg-white outline-none focus:border-[#20c997]" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Modalidad</label>
                  <select value={nuevoSimulacro.tipo} onChange={e => setNuevoSimulacro({...nuevoSimulacro, tipo: e.target.value})} className="w-full p-2 border rounded-lg bg-white outline-none focus:border-[#20c997]">
                    <option value="Avisado">Avisado</option>
                    <option value="Sorpresivo">Sorpresivo</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Tiempo (Min / Seg)</label>
                  <div className="flex gap-1">
                    <input type="number" placeholder="Min" required value={nuevoSimulacro.tiempo_min} onChange={e => setNuevoSimulacro({...nuevoSimulacro, tiempo_min: e.target.value})} className="w-1/2 p-2 border rounded-lg bg-white outline-none" />
                    <input type="number" placeholder="Seg" required value={nuevoSimulacro.tiempo_seg} onChange={e => setNuevoSimulacro({...nuevoSimulacro, tiempo_seg: e.target.value})} className="w-1/2 p-2 border rounded-lg bg-white outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Aforo Evacuado</label>
                  <input type="number" placeholder="Total personas" required value={nuevoSimulacro.evacuados} onChange={e => setNuevoSimulacro({...nuevoSimulacro, evacuados: e.target.value})} className="w-full p-2 border rounded-lg bg-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-4">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Observaciones / Hallazgos</label>
                  <input type="text" placeholder="Ej: Tiempo excelente, buena cultura..." value={nuevoSimulacro.observaciones} onChange={e => setNuevoSimulacro({...nuevoSimulacro, observaciones: e.target.value})} className="w-full p-2 border rounded-lg bg-white outline-none" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Cargar Evidencia (Foto o PDF Acta)</label>
                  <input type="file" accept=".pdf,image/*" onChange={e => setNuevoSimulacro({...nuevoSimulacro, archivo: e.target.files?.[0] || null})} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#20c997]/10 file:text-[#1ba87e] hover:file:bg-[#20c997]/20" />
                </div>
              </div>

              <button type="submit" className="px-5 py-2.5 bg-[#0B1727] text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2">
                <Save className="w-4 h-4" /> Guardar en Bitacora
              </button>
            </form>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[#0B1727] border-b border-slate-200">
                    <th className="p-3.5 font-bold">Fecha</th>
                    <th className="p-3.5 font-bold">Modalidad</th>
                    <th className="p-3.5 font-bold">Tiempo</th>
                    <th className="p-3.5 font-bold">Aforo</th>
                    <th className="p-3.5 font-bold">Observaciones</th>
                    <th className="p-3.5 font-bold text-center">Evidencia</th>
                  </tr>
                </thead>
                <tbody>
                  {simulacros.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-slate-400">No hay simulacros registrados en la bitacora.</td></tr>
                  ) : (
                    simulacros.map(s => (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 bg-white">
                        <td className="p-3.5 font-bold text-[#0B1727]">{s.fecha}</td>
                        <td className="p-3.5 font-semibold text-slate-700">{s.tipo}</td>
                        <td className="p-3.5 text-[#20c997] font-bold">{s.tiempo_evac}</td>
                        <td className="p-3.5 font-medium">{s.evacuados} personas</td>
                        <td className="p-3.5 text-slate-600">{s.observaciones}</td>
                        <td className="p-3.5 text-center font-semibold text-blue-600">{s.evidencia}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
