import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, Save, CheckCircle2, List, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { calcularRiesgoGTC45 } from '../lib/gtc45';

export default function MatrizIpevrTool() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  
  // Lista de riesgos
  const [risks, setRisks] = useState<any[]>([]);
  
  // Form State - Identificacion
  const [proceso, setProceso] = useState('');
  const [actividad, setActividad] = useState('');
  const [esRutinaria, setEsRutinaria] = useState(true);
  const [peligroClasificacion, setPeligroClasificacion] = useState('Fisico');
  const [peligroDescripcion, setPeligroDescripcion] = useState('');
  const [efectosPosibles, setEfectosPosibles] = useState('');
  
  // Form State - Valoracion (GTC-45)
  const [nd, setNd] = useState(2);
  const [ne, setNe] = useState(3);
  const [nc, setNc] = useState(10);

  // Form State - Controles
  const [controlesExistentes, setControlesExistentes] = useState('');
  const [controlesPropuestos, setControlesPropuestos] = useState('');
  
  // UI States
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resultadoGTC45 = calcularRiesgoGTC45(nd, ne, nc);

  useEffect(() => {
    if (user) {
      loadContext();
    }
  }, [user]);

  const loadContext = async () => {
    try {
      setLoading(true);
      const { data: managers, error: managerError } = await supabase
        .from('sst_managers')
        .select('property_id')
        .eq('account_id', user!.id)
        .limit(1);
        
      if (managerError) throw managerError;
      if (!managers || managers.length === 0) throw new Error("No esta asignado a ninguna entidad.");
      
      const currentPropertyId = managers[0].property_id;
      setPropertyId(currentPropertyId);
      
      await loadRisks(currentPropertyId);
    } catch (error) {
      console.error("Error cargando contexto:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRisks = async (propId: string) => {
    try {
      const { data, error } = await supabase
        .from('matriz_ipevr')
        .select('*')
        .eq('property_id', propId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setRisks(data || []);
    } catch (error) {
      console.error("Error al cargar riesgos:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(false);
    setSubmitError(null);
    
    if (!propertyId) return;

    try {
      const { error } = await supabase
        .from('matriz_ipevr')
        .insert({
          property_id: propertyId,
          proceso,
          actividad,
          es_rutinaria: esRutinaria,
          peligro_clasificacion: peligroClasificacion,
          peligro_descripcion: peligroDescripcion,
          efectos_posibles: efectosPosibles,
          nivel_deficiencia: nd,
          nivel_exposicion: ne,
          nivel_consecuencia: nc,
          controles_existentes: controlesExistentes,
          controles_propuestos: controlesPropuestos
        });

      if (error) throw error;
      
      setSubmitSuccess(true);
      
      // Reset Form
      setProceso('');
      setActividad('');
      setEsRutinaria(true);
      setPeligroDescripcion('');
      setEfectosPosibles('');
      setControlesExistentes('');
      setControlesPropuestos('');
      
      // Recargar lista
      await loadRisks(propertyId);
      
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error guardando riesgo:", error);
      setSubmitError(error.message || "Error al guardar el registro en Supabase.");
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500 animate-pulse">Cargando modulo IPEVR...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="bg-[#0B1727] rounded-xl p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-[#20c997]/20 rounded-lg">
            <AlertTriangle className="w-8 h-8 text-[#20c997]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">3. Matriz IPEVR (GTC-45)</h1>
            <p className="text-slate-400 mt-1">
              Identificacion de Peligros, Evaluacion y Valoracion de los Riesgos
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Formulario Principal */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-[#fdfdfd] rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
            <h2 className="text-xl font-bold text-[#0B1727] mb-6 border-b pb-4">Registrar Nuevo Riesgo</h2>
            
            {submitSuccess && (
              <div className="mb-6 p-4 bg-[#20c997]/10 border-l-4 border-[#20c997] text-[#0B1727] text-sm font-bold flex items-center rounded">
                <CheckCircle2 className="w-5 h-5 mr-2 text-[#20c997]" />
                Riesgo registrado y valorado exitosamente.
              </div>
            )}

            {submitError && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold flex items-start rounded">
                <ShieldAlert className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p>Error al guardar:</p>
                  <p className="font-normal text-xs mt-1">{submitError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Seccion 1: Identificacion */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">1. Identificacion del Peligro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#0B1727] mb-1">Proceso</label>
                    <input required type="text" value={proceso} onChange={e => setProceso(e.target.value)} className="w-full rounded-md border-slate-300 border py-2 px-3 bg-white focus:ring-[#20c997] focus:border-[#20c997] sm:text-sm" placeholder="Ej. Mantenimiento" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#0B1727] mb-1">Actividad</label>
                    <input required type="text" value={actividad} onChange={e => setActividad(e.target.value)} className="w-full rounded-md border-slate-300 border py-2 px-3 bg-white focus:ring-[#20c997] focus:border-[#20c997] sm:text-sm" placeholder="Ej. Limpieza de fachada" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#0B1727] mb-1">¿Es rutinaria?</label>
                    <select value={esRutinaria ? 'Si' : 'No'} onChange={e => setEsRutinaria(e.target.value === 'Si')} className="w-full rounded-md border-slate-300 border py-2 px-3 bg-white focus:ring-[#20c997] focus:border-[#20c997] sm:text-sm">
                      <option value="Si">Si</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-[#0B1727] mb-1">Clasificacion del Peligro</label>
                    <select value={peligroClasificacion} onChange={e => setPeligroClasificacion(e.target.value)} className="w-full rounded-md border-slate-300 border py-2 px-3 bg-white focus:ring-[#20c997] focus:border-[#20c997] sm:text-sm">
                      <option>Biologico</option>
                      <option>Fisico</option>
                      <option>Quimico</option>
                      <option>Psicosocial</option>
                      <option>Biomecanico</option>
                      <option>Condiciones de Seguridad</option>
                      <option>Fenomenos Naturales</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#0B1727] mb-1">Descripcion del Peligro</label>
                  <input required type="text" value={peligroDescripcion} onChange={e => setPeligroDescripcion(e.target.value)} className="w-full rounded-md border-slate-300 border py-2 px-3 bg-white focus:ring-[#20c997] focus:border-[#20c997] sm:text-sm" placeholder="Ej. Trabajo en alturas superior a 1.5m" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#0B1727] mb-1">Efectos Posibles</label>
                  <input required type="text" value={efectosPosibles} onChange={e => setEfectosPosibles(e.target.value)} className="w-full rounded-md border-slate-300 border py-2 px-3 bg-white focus:ring-[#20c997] focus:border-[#20c997] sm:text-sm" placeholder="Ej. Fracturas, trauma craneoencefalico, muerte" />
                </div>
              </div>

              {/* Seccion 2: Calculadora GTC-45 (Diseno aportado) */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">2. Valoracion del Riesgo (GTC-45)</h3>
                <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Nivel Deficiencia (ND)</label>
                      <select value={nd} onChange={(e) => setNd(Number(e.target.value))} className="w-full p-2 border rounded-md text-[#0B1727] focus:ring-[#20c997] focus:border-[#20c997] sm:text-sm">
                        <option value="10">10 - Muy Alto</option>
                        <option value="6">6 - Alto</option>
                        <option value="2">2 - Medio</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Nivel Exposicion (NE)</label>
                      <select value={ne} onChange={(e) => setNe(Number(e.target.value))} className="w-full p-2 border rounded-md text-[#0B1727] focus:ring-[#20c997] focus:border-[#20c997] sm:text-sm">
                        <option value="4">4 - Continua</option>
                        <option value="3">3 - Frecuente</option>
                        <option value="2">2 - Ocasional</option>
                        <option value="1">1 - Esporadica</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Nivel Consecuencia (NC)</label>
                      <select value={nc} onChange={(e) => setNc(Number(e.target.value))} className="w-full p-2 border rounded-md text-[#0B1727] focus:ring-[#20c997] focus:border-[#20c997] sm:text-sm">
                        <option value="100">100 - Mortal/Catastrofico</option>
                        <option value="60">60 - Muy Grave (Invalidez)</option>
                        <option value="25">25 - Grave (Incapacidad)</option>
                        <option value="10">10 - Leve</option>
                      </select>
                    </div>
                  </div>

                  {/* Panel de Resultados en Tiempo Real */}
                  {resultadoGTC45 && (
                    <div className="bg-slate-50 p-4 rounded-lg flex flex-col md:flex-row items-center justify-between border border-slate-200">
                      <div className="mb-4 md:mb-0">
                        <p className="text-sm text-slate-500 font-medium">Resultado GTC-45</p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-3xl font-bold text-[#0B1727]">{resultadoGTC45.nr}</span>
                          <span className="text-sm font-medium text-slate-600">(NP: {resultadoGTC45.np})</span>
                        </div>
                      </div>
                      <div className="text-center md:text-right">
                        <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${resultadoGTC45.colorBadge}`}>
                          Nivel {resultadoGTC45.nivelRiesgo}
                        </span>
                        <p className="text-xs font-bold text-[#0B1727] mt-2">
                          {resultadoGTC45.aceptabilidad}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Seccion 3: Controles */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">3. Medidas de Intervencion</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#0B1727] mb-1">Controles Existentes</label>
                    <textarea rows={3} value={controlesExistentes} onChange={e => setControlesExistentes(e.target.value)} className="w-full rounded-md border-slate-300 border py-2 px-3 bg-white focus:ring-[#20c997] focus:border-[#20c997] sm:text-sm" placeholder="Describa los controles actuales (Fuente, Medio, Individuo)" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#0B1727] mb-1">Controles Propuestos</label>
                    <textarea rows={3} value={controlesPropuestos} onChange={e => setControlesPropuestos(e.target.value)} className="w-full rounded-md border-slate-300 border py-2 px-3 bg-white focus:ring-[#20c997] focus:border-[#20c997] sm:text-sm" placeholder="Plan de accion sugerido" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button type="submit" className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-bold text-[#0B1727] bg-[#20c997] hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#20c997] transition-colors">
                  <Save className="w-5 h-5 mr-2" />
                  Guardar Riesgo en Matriz
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* Listado lateral */}
        <div className="bg-[#fdfdfd] rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[800px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center">
            <List className="w-5 h-5 text-slate-500 mr-2" />
            <h3 className="text-sm font-bold text-[#0B1727]">Riesgos Registrados ({risks.length})</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {risks.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No hay riesgos documentados todavia.
              </div>
            ) : (
              risks.map(risk => {
                // Recalculamos visualmente el badge para la lista
                const res = calcularRiesgoGTC45(risk.nivel_deficiencia, risk.nivel_exposicion, risk.nivel_consecuencia);
                
                return (
                  <div key={risk.id} className="p-4 border border-slate-200 rounded-lg hover:border-[#20c997] transition-colors bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs font-bold uppercase text-slate-500">{risk.peligro_clasificacion}</span>
                        <h4 className="font-bold text-[#0B1727] text-sm mt-1">{risk.peligro_descripcion}</h4>
                      </div>
                      {res && (
                        <span className={cn("text-[10px] px-2 py-1 rounded-full font-bold ml-2 shrink-0 shadow-sm", res.colorBadge)}>
                          NR: {res.nr} (Nivel {res.nivelRiesgo})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2"><span className="font-bold">Efectos:</span> {risk.efectos_posibles}</p>
                    <p className="text-xs text-slate-500 mt-1"><span className="font-bold">Proceso:</span> {risk.proceso} - {risk.actividad}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
