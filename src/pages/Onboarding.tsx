import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { calculateClassification, DiagnosticData } from '../lib/classificationEngine';
import { useAuth } from '../context/AuthContext';
import { Building2, Users, AlertTriangle, Zap, Droplet, CheckSquare } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Property State
  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState('Residencial');
  const [legalRepName, setLegalRepName] = useState('');
  const [city, setCity] = useState('');
  const [privateUnits, setPrivateUnits] = useState(0);
  
  // Diagnostic State
  const [hasPayroll, setHasPayroll] = useState(false);
  const [directWorkers, setDirectWorkers] = useState(0);
  const [arlRiskLevel, setArlRiskLevel] = useState(1);
  
  const [outsourcedServices, setOutsourcedServices] = useState<string[]>([]);
  
  const [hasHeightWork, setHasHeightWork] = useState(false);
  const [hasElectricalSubstation, setHasElectricalSubstation] = useState(false);
  const [hasHazardousChemicals, setHasHazardousChemicals] = useState(false);
  const [commonAreasSqm, setCommonAreasSqm] = useState(0);
  const [aceptaB2B, setAceptaB2B] = useState(false);

  const availableServices = [
    "Vigilancia", "Aseo", "Mantenimiento Ascensores", 
    "Bombas", "Piscina", "Jardineria", "Subestacion"
  ];

  const handleServiceChange = (service: string) => {
    setOutsourcedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Usuario no autenticado");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // 0. Determinar Rol
      const tempDiagData: DiagnosticData = {
        has_payroll: hasPayroll,
        direct_workers: directWorkers,
        arl_risk_level: arlRiskLevel,
        outsourced_services: outsourcedServices,
        has_height_work: hasHeightWork,
        has_electrical_substation: hasElectricalSubstation,
        has_hazardous_chemicals: hasHazardousChemicals,
        common_areas_sqm: commonAreasSqm
      };
      
      const classification = calculateClassification(tempDiagData);
      
      let computedRole = 'Dependiente';
      if (propertyType === 'Empresa / Oficina' || (propertyType === 'Mixta' && classification.normative_type === 3)) {
        computedRole = 'Administrador';
      }

      // 1. Crear perfil si no existe
      // supabase 'upsert' can be used if we're not sure
      const { error: profileError } = await supabase.from('profiles').upsert([
        { id: user.id, email: user.email, role: computedRole }
      ]);
      if (profileError) throw profileError;

      // 2. Insert Property
      const { data: propData, error: propError } = await supabase
        .from('properties')
        .insert({
          user_id: user.id,
          name,
          legal_rep_name: legalRepName,
          email: user.email,
          city,
          property_class: propertyType,
          private_units: privateUnits
        })
        .select()
        .single();

      if (propError) throw propError;

      // 3. Insert Diagnostic
      const diagDataToInsert = {
        property_id: propData.id,
        has_payroll: hasPayroll,
        direct_workers: directWorkers,
        arl_risk_level: arlRiskLevel,
        outsourced_services: outsourcedServices,
        has_height_work: hasHeightWork,
        has_electrical_substation: hasElectricalSubstation,
        has_hazardous_chemicals: hasHazardousChemicals,
        common_areas_sqm: commonAreasSqm
      };

      const { error: diagError } = await supabase
        .from('diagnostics')
        .insert(diagDataToInsert);

      if (diagError) throw diagError;

      // 4. Insert Classification Results
      const { error: classError } = await supabase
        .from('classifications')
        .insert({
          property_id: propData.id,
          normative_type: classification.normative_type,
          deliverables: classification.deliverables
        });

      if (classError) throw classError;

      // Success, refresh the page to trigger the router check in App.tsx
      window.location.href = '/dashboard';

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al procesar el diagnostico.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex bg-slate-900 p-4 rounded-full shadow-lg mb-4">
            <Building2 className="h-10 w-10 text-teal-400" />
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
            Diagnostico Inicial SG-SST
          </h2>
          <p className="mt-3 text-sm text-slate-600 font-medium">
            Completa este formulario para determinar la clasificacion normativa de tu entidad (Resolucion 0312).
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200">
          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Seccion 1: Informacion General */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2 mb-6 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-slate-500" />
                1. Informacion General de la Entidad
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de la Entidad / Razon Social</label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors" placeholder="Ej. Edificio Los Robles" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Administrador / Representante Legal</label>
                  <input required type="text" value={legalRepName} onChange={e => setLegalRepName(e.target.value)} className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Ciudad</label>
                  <input required type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Clase</label>
                  <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors">
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Mixta">Mixta</option>
                    <option value="Empresa / Oficina">Empresa / Oficina</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Numero de Unidades Privadas</label>
                  <input type="number" min="0" value={privateUnits} onChange={e => setPrivateUnits(parseInt(e.target.value) || 0)} className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors" />
                </div>
              </div>
            </section>

            {/* Seccion 2: Perfilamiento Laboral */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2 mb-6 flex items-center">
                <Users className="w-5 h-5 mr-2 text-slate-500" />
                2. Perfilamiento Laboral
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">¿Cuenta con trabajadores por nomina?</label>
                  <div className="flex space-x-6">
                    <label className="inline-flex items-center cursor-pointer">
                      <input type="radio" checked={hasPayroll} onChange={() => setHasPayroll(true)} className="h-5 w-5 text-teal-500 focus:ring-teal-500 border-slate-300" />
                      <span className="ml-2 text-sm font-medium text-slate-700">Si, directos</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      <input type="radio" checked={!hasPayroll} onChange={() => { setHasPayroll(false); setDirectWorkers(0); }} className="h-5 w-5 text-teal-500 focus:ring-teal-500 border-slate-300" />
                      <span className="ml-2 text-sm font-medium text-slate-700">No (100% Tercerizado)</span>
                    </label>
                  </div>
                </div>
                
                {hasPayroll && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Numero de trabajadores directos</label>
                    <input type="number" min="1" required={hasPayroll} value={directWorkers} onChange={e => setDirectWorkers(parseInt(e.target.value) || 0)} className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors" />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 text-slate-400" />
                    Nivel de Riesgo ARL (I al V)
                  </label>
                  <select value={arlRiskLevel} onChange={e => setArlRiskLevel(parseInt(e.target.value))} className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors">
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>Nivel {n}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Seccion 3: Servicios Tercerizados */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2 mb-6 flex items-center">
                <CheckSquare className="w-5 h-5 mr-2 text-slate-500" />
                3. Servicios Tercerizados
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {availableServices.map(service => (
                  <label key={service} className="flex items-center p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors bg-white shadow-sm">
                    <input 
                      type="checkbox" 
                      checked={outsourcedServices.includes(service)} 
                      onChange={() => handleServiceChange(service)} 
                      className="h-4 w-4 text-teal-500 focus:ring-teal-500 border-slate-300 rounded" 
                    />
                    <span className="ml-2 text-sm text-slate-700 font-medium">{service}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Seccion 4: Mapeo Critico */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2 mb-6">4. Mapeo Critico Operativo</h3>
              <div className="space-y-4 mb-6">
                <label className="flex items-center p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors bg-white shadow-sm">
                  <input type="checkbox" checked={hasHeightWork} onChange={e => setHasHeightWork(e.target.checked)} className="h-5 w-5 text-teal-500 focus:ring-teal-500 border-slate-300 rounded" />
                  <span className="ml-3 text-sm text-slate-700 font-bold flex-1">¿Labores a mas de 2.0 metros (Trabajo en Alturas)?</span>
                </label>
                <label className="flex items-center p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors bg-white shadow-sm">
                  <input type="checkbox" checked={hasElectricalSubstation} onChange={e => setHasElectricalSubstation(e.target.checked)} className="h-5 w-5 text-teal-500 focus:ring-teal-500 border-slate-300 rounded" />
                  <Zap className="w-5 h-5 ml-3 text-amber-500 mr-2" />
                  <span className="text-sm text-slate-700 font-bold flex-1">¿Cuenta con subestacion electrica?</span>
                </label>
                <label className="flex items-center p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors bg-white shadow-sm">
                  <input type="checkbox" checked={hasHazardousChemicals} onChange={e => setHasHazardousChemicals(e.target.checked)} className="h-5 w-5 text-teal-500 focus:ring-teal-500 border-slate-300 rounded" />
                  <Droplet className="w-5 h-5 ml-3 text-blue-500 mr-2" />
                  <span className="text-sm text-slate-700 font-bold flex-1">¿Manipulacion de sustancias quimicas (SGA)?</span>
                </label>
              </div>
              <div className="w-full md:w-1/2">
                <label className="block text-sm font-bold text-slate-700 mb-1">Area de Zonas Comunes (m² aprox.)</label>
                <input type="number" min="0" value={commonAreasSqm} onChange={e => setCommonAreasSqm(parseInt(e.target.value) || 0)} className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors" />
              </div>
            </section>

            <div className="pt-6 border-t border-slate-200 flex flex-col gap-6">
              <label className="flex items-start gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <input 
                  type="checkbox" 
                  required
                  checked={aceptaB2B} 
                  onChange={(e) => setAceptaB2B(e.target.checked)} 
                  className="mt-1 w-5 h-5 text-teal-500 rounded" 
                />
                <span className="text-sm text-slate-700 leading-relaxed">
                  <strong>Aceptacion de Contrato B2B:</strong> Comprendo que SSTask es una herramienta tecnologica y no exime a mi entidad ni al representante legal de sus responsabilidades legales ante el Ministerio de Trabajo y la ARL.
                </span>
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !aceptaB2B}
                  className="inline-flex justify-center items-center py-3 px-8 border border-transparent shadow-md text-base font-bold rounded-md text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Procesando Diagnostico...' : 'Generar Diagnostico SG-SST'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
