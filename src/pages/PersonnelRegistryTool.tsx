import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, HardHat, AlertCircle, Save, CheckCircle2, Copy } from 'lucide-react';
import { cn } from '../lib/utils';

export default function PersonnelRegistryTool() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [normativeType, setNormativeType] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'Contratista' | 'Directo'>('Contratista');
  
  // Data list
  const [personnel, setPersonnel] = useState<any[]>([]);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [documentId, setDocumentId] = useState('');
  
  // Contratista specific
  const [companyName, setCompanyName] = useState('');
  const [arlVerified, setArlVerified] = useState(false);
  
  // Directo specific
  const [gender, setGender] = useState('Masculino');
  const [age, setAge] = useState('');
  const [civilStatus, setCivilStatus] = useState('Soltero');
  
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadContext();
    }
  }, [user]);

  const loadContext = async () => {
    try {
      setLoading(true);
      // 1. Get Property ID for manager
      const { data: managers, error: managerError } = await supabase
        .from('sst_managers')
        .select('property_id')
        .eq('account_id', user!.id)
        .limit(1);
        
      if (managerError) throw managerError;
      if (!managers || managers.length === 0) throw new Error("No esta asignado a ninguna entidad actualmente.");
      const currentPropertyId = managers[0].property_id;
      setPropertyId(currentPropertyId);

      // 2. Get Normative Type
      const { data: classifications, error: classError } = await supabase
        .from('classifications')
        .select('normative_type')
        .eq('property_id', currentPropertyId)
        .limit(1);
        
      if (classError) throw classError;
      const type = classifications[0]?.normative_type || 1;
      setNormativeType(type);
      
      if (type !== 1) {
        setActiveTab('Directo'); // Default to Directo if Type 2 or 3
      } else {
        setActiveTab('Contratista'); // Force Contratista for Type 1
      }

      await loadPersonnel(currentPropertyId);

    } catch (error) {
      console.error("Error al cargar contexto:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonnel = async (propId: string) => {
    try {
      const { data, error } = await supabase
        .from('sst_colaboradores')
        .select('*')
        .eq('property_id', propId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.warn("La tabla sst_colaboradores podria no existir:", error);
        setPersonnel([]);
      } else {
        setPersonnel(data || []);
      }
    } catch (error) {
      console.error("Error al cargar personal:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(false);
    setSubmitError(null);
    
    if (!propertyId) return;

    try {
      const socioData = activeTab === 'Directo' ? { gender, age, civilStatus } : {};
      
      const { error } = await supabase
        .from('sst_colaboradores')
        .insert({
          property_id: propertyId,
          tipo_vinculacion: activeTab,
          nombre_completo: fullName,
          numero_documento: documentId,
          empresa_contratante: activeTab === 'Contratista' ? companyName : null,
          seguridad_social_aldia: activeTab === 'Contratista' ? arlVerified : false
        });

      if (error) throw error;
      
      setSubmitSuccess(true);
      // Reset form
      setFullName('');
      setDocumentId('');
      setCompanyName('');
      setArlVerified(false);
      setAge('');
      
      // Reload table
      await loadPersonnel(propertyId);
      
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error guardando personal:", error);
      setSubmitError(error.message || "Error al guardar el registro en Supabase.");
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (personId: string) => {
    const magicLink = `${window.location.origin}/portal/${personId}`;
    navigator.clipboard.writeText(magicLink);
    setCopiedId(personId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return <div className="p-8 text-slate-500 animate-pulse">Cargando modulo de registro...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Cabecera */}
      <div className="bg-slate-900 rounded-xl p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/20 rounded-lg">
            <Users className="w-8 h-8 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Registro de Poblacion</h1>
            <p className="text-slate-400 mt-1">
              Gestion de Empleados y Contratistas (Tipo {normativeType})
            </p>
          </div>
        </div>
      </div>

      {normativeType === 1 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-teal-800">Copropiedad Tipo 1 (Tercerizada)</h3>
            <p className="text-sm text-teal-700 mt-1">
              Por su clasificacion normativa, el enfoque de este modulo es la verificacion y control de empresas de terceros (Contratistas).
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulario (2 Columnas) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => normativeType !== 1 && setActiveTab('Directo')}
                disabled={normativeType === 1}
                className={cn(
                  "flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center transition-colors duration-150",
                  activeTab === 'Directo'
                    ? "border-b-2 border-teal-500 text-teal-600 bg-teal-50/50"
                    : normativeType === 1
                      ? "text-slate-400 cursor-not-allowed bg-slate-50"
                      : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Users className="w-4 h-4 mr-2" />
                Empleados Directos
              </button>
              <button
                onClick={() => setActiveTab('Contratista')}
                className={cn(
                  "flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center transition-colors duration-150",
                  activeTab === 'Contratista'
                    ? "border-b-2 border-teal-500 text-teal-600 bg-teal-50/50"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <HardHat className="w-4 h-4 mr-2" />
                Contratistas / Terceros
              </button>
            </div>

            {/* Form */}
            <div className="p-6">
              {submitSuccess && (
                <div className="mb-6 p-4 bg-teal-50 border-l-4 border-teal-500 text-teal-700 text-sm font-bold flex items-center rounded">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Registro guardado exitosamente
                </div>
              )}

              {submitError && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold flex items-start rounded">
                  <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>Error al guardar:</p>
                    <p className="font-normal text-xs mt-1">{submitError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo</label>
                    <input
                      required
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full rounded-md border-slate-300 border py-2 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                      placeholder="Ej. Juan Perez"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Numero de Documento</label>
                    <input
                      required
                      type="text"
                      value={documentId}
                      onChange={e => setDocumentId(e.target.value)}
                      className="w-full rounded-md border-slate-300 border py-2 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                      placeholder="Ej. 10203040"
                    />
                  </div>
                </div>

                {activeTab === 'Contratista' && (
                  <div className="grid grid-cols-1 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Empresa Contratante / Razon Social</label>
                      <input
                        required
                        type="text"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        className="w-full rounded-md border-slate-300 border py-2 px-3 bg-white focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        placeholder="Ej. Seguridad ABC Ltda"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        id="arl-checkbox"
                        type="checkbox"
                        checked={arlVerified}
                        onChange={e => setArlVerified(e.target.checked)}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                      />
                      <label htmlFor="arl-checkbox" className="ml-2 block text-sm font-medium text-slate-700">
                        Verificado: Seguridad Social y ARL al dia
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'Directo' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Edad</label>
                      <input
                        required
                        type="number"
                        value={age}
                        onChange={e => setAge(e.target.value)}
                        className="w-full rounded-md border-slate-300 border py-2 px-3 bg-white focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        placeholder="Ej. 35"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Genero</label>
                      <select
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                        className="w-full rounded-md border-slate-300 border py-2 px-3 bg-white focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                      >
                        <option>Masculino</option>
                        <option>Femenino</option>
                        <option>Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Estado Civil</label>
                      <select
                        value={civilStatus}
                        onChange={e => setCivilStatus(e.target.value)}
                        className="w-full rounded-md border-slate-300 border py-2 px-3 bg-white focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                      >
                        <option>Soltero</option>
                        <option>Casado</option>
                        <option>Union Libre</option>
                        <option>Divorciado</option>
                        <option>Viudo</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Registrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Listado (1 Columna) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[600px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-800">Personal Registrado ({personnel.length})</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {personnel.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No hay personal registrado.
              </div>
            ) : (
              personnel.map(person => (
                <div key={person.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-slate-800 text-sm">{person.nombre_completo}</p>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-bold",
                      person.tipo_vinculacion === 'Contratista' ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"
                    )}>
                      {person.tipo_vinculacion}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-slate-500">CC: {person.numero_documento}</p>
                    <button 
                      onClick={() => handleCopyLink(person.id)}
                      className="text-xs flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium bg-blue-50 px-2 py-1 rounded"
                      title="Copiar Link de Portal"
                    >
                      {copiedId === person.id ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Copiado</>
                      ) : (
                        <><Copy className="w-3 h-3 mr-1" /> Portal</>
                      )}
                    </button>
                  </div>
                  
                  {person.tipo_vinculacion === 'Contratista' && (
                    <div className="flex items-center mt-2 text-xs">
                      <span className="text-slate-600 truncate mr-2">{person.empresa_contratante}</span>
                      {person.seguridad_social_aldia ? (
                        <span className="text-teal-600 flex items-center font-bold ml-auto"><CheckCircle2 className="w-3 h-3 mr-1"/> ARL Ok</span>
                      ) : (
                        <span className="text-slate-400 flex items-center font-bold ml-auto">Sin ARL</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
