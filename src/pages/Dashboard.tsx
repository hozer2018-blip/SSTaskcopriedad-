import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Building2, CheckCircle2, FileText, AlertCircle, CalendarClock, Download, FileSpreadsheet, Eye } from 'lucide-react';
import ResponsableDashboard from './ResponsableDashboard';

interface CopropiedadData {
  id: string;
  name: string;
  property_class: string;
  city: string;
  diagnostics: {
    arl_risk_level: number;
    has_payroll: boolean;
    direct_workers: number;
  }[];
  classifications: {
    normative_type: number;
    deliverables: string[];
  }[];
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [properties, setProperties] = useState<CopropiedadData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros Admin
  const [filterType, setFilterType] = useState('Todos');

  useEffect(() => {
    if (profile?.role === 'Responsable') {
      setLoading(false);
      return;
    }

    if (user && profile) {
      fetchData();
    }
  }, [user, profile]);

  const fetchData = async () => {
    try {
      let query = supabase.from('properties').select('id, name, property_class, city, diagnostics(arl_risk_level, has_payroll, direct_workers), classifications(normative_type, deliverables)');
      
      if (profile?.role === 'Dependiente') {
        query = query.eq('user_id', user!.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setProperties(data as any);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(prop => {
    if (filterType === 'Todos') return true;
    if (filterType === 'Tipo 1' && prop.classifications[0]?.normative_type === 1) return true;
    if (filterType === 'Tipo 2' && prop.classifications[0]?.normative_type === 2) return true;
    if (filterType === 'Tipo 3' && prop.classifications[0]?.normative_type === 3) return true;
    return false;
  });

  if (profile?.role === 'Responsable') {
    return <ResponsableDashboard />;
  }

  if (loading) {
    return <div className="animate-pulse flex space-x-4 p-8">Cargando panel...</div>;
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
        <Building2 className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-2 text-sm font-medium text-slate-900">No hay copropiedades registradas</h3>
        <p className="mt-1 text-sm text-slate-500">Comienza registrando una nueva copropiedad para generar su diagnostico.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vista de Administrador: Tabla Resumen */}
      {profile?.role === 'Administrador' && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Vision Global - Panel de Gestion</h3>
              <p className="text-sm text-slate-500">Administra y genera entregables para las entidades registradas.</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
              <label className="text-sm font-medium text-slate-700">Filtro Normativo:</label>
              <select 
                value={filterType} 
                onChange={e => setFilterType(e.target.value)}
                className="rounded-md border-slate-300 border py-1.5 px-3 text-sm focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="Todos">Todos los Tipos</option>
                <option value="Tipo 1">Tipo 1 (Tercerizada)</option>
                <option value="Tipo 2">Tipo 2 (Mixta/Pequena)</option>
                <option value="Tipo 3">Tipo 3 (Alto Riesgo)</option>
              </select>
              <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-1 rounded">
                {filteredProperties.length} Entidades
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Entidad / Ciudad</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Clase & Riesgo</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Normativa (SG-SST)</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones Rapidas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredProperties.map((prop) => {
                  const diag = prop.diagnostics[0];
                  const cls = prop.classifications[0];
                  
                  return (
                    <tr key={prop.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">{prop.name}</div>
                        <div className="text-sm text-slate-500">{prop.city}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900 font-medium">{prop.property_class}</div>
                        <div className="text-xs text-slate-500">Riesgo ARL: Nivel {diag?.arl_risk_level || '?'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-teal-400">
                          TIPO {cls?.normative_type || '?'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button title="Generar Propuesta" className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-teal-500 hover:bg-teal-600 focus:outline-none">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button title="Visualizar IPEVR" className="inline-flex items-center p-1.5 border border-slate-300 rounded-full shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none">
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <button title="Plan de Emergencias" className="inline-flex items-center p-1.5 border border-slate-300 rounded-full shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none">
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vista Detallada de Tarjetas (Ideal para Dependientes) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {properties.map((prop) => {
          const classData = prop.classifications[0];
          return (
            <div key={prop.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-50">{prop.name}</h3>
                  <p className="text-teal-400 text-sm mt-1">{prop.property_class} - {prop.city}</p>
                </div>
                <div className="bg-white/10 px-3 py-1 rounded border border-white/20 text-center">
                  <span className="block text-xs uppercase tracking-wider text-slate-300">Normativa</span>
                  <span className="block text-lg font-bold text-teal-400">TIPO {classData?.normative_type || '?'}</span>
                </div>
              </div>
              
              <div className="p-6 flex-1 bg-slate-50">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-teal-500" />
                  Entregables Digitales SG-SST
                </h4>
                
                {classData ? (
                  <ul className="space-y-3">
                    {classData.deliverables.map((item, index) => (
                      <li key={index} className="flex items-start bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                        <CheckCircle2 className="w-5 h-5 text-teal-500 mr-3 shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700 font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center text-amber-600 text-sm">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    No se ha generado el diagnostico.
                  </div>
                )}
              </div>
              
              <div className="bg-white px-6 py-4 border-t border-slate-200 flex justify-between items-center">
                <span className="text-xs text-slate-500 flex items-center"><CalendarClock className="w-4 h-4 mr-1"/> En implementacion</span>
                <button className="text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center">
                  Ver Dashboard Completo <Eye className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
