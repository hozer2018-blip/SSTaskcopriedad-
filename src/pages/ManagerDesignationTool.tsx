import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Save, FileText, AlertCircle, Building2 } from 'lucide-react';

export default function ManagerDesignationTool() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [propertyId, setPropertyId] = useState<string>('');
  const [hasManager, setHasManager] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [email, setEmail] = useState('');
  const [educationLevel, setEducationLevel] = useState('Tecnico');
  const [password, setPassword] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    async function loadData() {
      if (!user) return;
      try {
        // 1. Obtener la copropiedad del usuario
        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (propError) throw propError;
        
        if (isMounted) setPropertyId(propData.id);

        // 2. Buscar si ya existe un responsable
        const { data: managerData, error: managerError } = await supabase
          .from('sst_managers')
          .select('*')
          .eq('property_id', propData.id)
          .maybeSingle();
          
        if (managerError) throw managerError;

        if (managerData && isMounted) {
          setHasManager(true);
          setFullName(managerData.full_name);
          setDocumentId(managerData.document_id);
          setLicenseNumber(managerData.license_number);
          setEmail(managerData.email);
          setEducationLevel(managerData.education_level);
        }
      } catch (err: any) {
        console.error(err);
        if (isMounted) setError('No se pudo cargar la informacion de la copropiedad.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/managers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId,
          fullName,
          documentId,
          licenseNumber,
          email,
          educationLevel,
          hasManager,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al comunicarse con el servidor');
      }

      setHasManager(true);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar los datos del responsable.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-slate-500 font-medium">Cargando modulo...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-slate-900 p-3 rounded-lg shadow-md">
            <UserCheck className="w-8 h-8 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Gestion de Responsable SG-SST</h1>
            <p className="text-slate-500 font-medium text-sm">Designe formalmente a la persona encargada del sistema</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-teal-50 border-l-4 border-teal-500 p-4 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-teal-700 font-bold mb-1">¡Responsable asignado exitosamente!</p>
              <p className="text-sm text-teal-600">Puede iniciar sesion con su correo y la contrasena asiganada.</p>
            </div>
            <button 
              onClick={() => navigate('/designation-document')}
              className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded hover:bg-slate-800 transition-colors shadow-sm whitespace-nowrap"
            >
              <FileText className="w-4 h-4 mr-2" />
              Ver Carta Legal
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo del Responsable</label>
              <input 
                required 
                type="text" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors" 
                placeholder="Ej. Juan Perez Gomez" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Documento de Identidad (Cedula)</label>
              <input 
                required 
                type="text" 
                value={documentId} 
                onChange={e => setDocumentId(e.target.value)} 
                className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors" 
                placeholder="Ej. 1020304050" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Numero de Licencia SST</label>
              <input 
                required 
                type="text" 
                value={licenseNumber} 
                onChange={e => setLicenseNumber(e.target.value)} 
                className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors" 
                placeholder="Ej. Resolución 1234 de 2020" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electronico</label>
              <input 
                required 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors" 
                placeholder="responsable@sst.com" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nivel de Estudios</label>
              <select 
                value={educationLevel} 
                onChange={e => setEducationLevel(e.target.value)} 
                className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors"
              >
                <option value="Tecnico">Tecnico</option>
                <option value="Tecnologo">Tecnologo</option>
                <option value="Profesional">Profesional</option>
                <option value="Especialista">Especialista</option>
                <option value="Magister">Magister</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Contrasena de Acceso SG-SST</label>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-md border-slate-300 border py-3 px-3 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors"
                placeholder="Asigne una contrasena (Minimo 6 caracteres)"
                minLength={6}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            {hasManager && !success ? (
              <button 
                type="button"
                onClick={() => navigate('/designation-document')}
                className="inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-slate-700 text-sm font-bold rounded hover:bg-slate-50 transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4 mr-2 text-slate-500" />
                Ver Carta de Designacion
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center items-center py-3 px-6 border border-transparent shadow-md text-sm font-bold rounded-md text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Guardando...' : (hasManager ? 'Actualizar Datos' : 'Guardar Responsable')}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
