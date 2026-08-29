import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Circle, Clock, Building2, AlertTriangle, ShieldCheck, Download } from 'lucide-react';
import { TOOLS_LIST } from '../lib/toolsList';
import * as XLSX from 'xlsx';

interface PropertyData {
  id: string;
  name: string;
  property_class: string;
}

interface ClassificationData {
  normative_type: number;
  deliverables: string[];
}

interface Task {
  id: string;
  deliverable_name: string;
  status: string;
}

export default function ResponsableDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [classification, setClassification] = useState<ClassificationData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const exportarInformeMensualConsolidado = async () => {
    if (!property) return;
    try {
      // 1. Matriz IPEVR
      const { data: ipevrData } = await supabase.from('matriz_ipevr').select('*').eq('property_id', property.id);
      const wsIpevr = XLSX.utils.json_to_sheet(ipevrData || []);

      // 2. Gestion de ATS
      const { data: atsData } = await supabase.from('sst_gestion_ats').select('*').eq('property_id', property.id);
      const wsAts = XLSX.utils.json_to_sheet(atsData || []);

      // 3. Auditoria de Planillas
      const { data: planillasData } = await supabase.from('sst_auditoria_planillas').select('*').eq('property_id', property.id);
      const wsPlanillas = XLSX.utils.json_to_sheet(planillasData || []);

      // 4. Auditoria de Examenes Medicos
      const { data: examenesData } = await supabase.from('sst_auditoria_examenes').select('*').eq('property_id', property.id);
      const wsExamenes = XLSX.utils.json_to_sheet(examenesData || []);

      // Construir el Libro Excel (Workbook)
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsIpevr, "1. Matriz IPEVR");
      XLSX.utils.book_append_sheet(wb, wsAts, "2. Permisos ATS");
      XLSX.utils.book_append_sheet(wb, wsPlanillas, "3. Auditoria SS (PILA)");
      XLSX.utils.book_append_sheet(wb, wsExamenes, "4. Examenes Medicos");

      // Descargar Informe
      const nombreArchivo = `Consolidado_SGSST_${property.name}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);

    } catch (error) {
      console.error("Error generando reporte:", error);
      alert("Hubo un error al compilar el informe mensual.");
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    async function fetchDashboardData() {
      if (!user) return;
      try {
        // 1. Encontrar la copropiedad asignada al responsable
        const { data: managers, error: managerError } = await supabase
          .from('sst_managers')
          .select('property_id')
          .eq('account_id', user.id)
          .limit(1);
          
        if (managerError) throw managerError;
        if (!managers || managers.length === 0) throw new Error("No esta asignado a ninguna entidad actualmente.");
        const managerData = managers[0];

        // 2. Traer info de la copropiedad
        const { data: properties, error: propError } = await supabase
          .from('properties')
          .select('id, name, property_class')
          .eq('id', managerData.property_id)
          .limit(1);
          
        if (propError) throw propError;
        const propData = properties[0];

        // 3. Traer clasificacion (entregables obligatorios)
        const { data: classifications, error: classError } = await supabase
          .from('classifications')
          .select('normative_type, deliverables')
          .eq('property_id', managerData.property_id)
          .limit(1);
          
        if (classError) throw classError;
        const classData = classifications[0];

        // 4. Traer seguimiento de entregables
        const { data: trackingData, error: trackingError } = await supabase
          .from('deliverable_tracking')
          .select('id, deliverable_name, status')
          .eq('property_id', managerData.property_id);
          
        if (trackingError) throw trackingError;

        // Mapear el estado (combinar entregables de la lista general con la BD de tracking)
        const combinedTasks = TOOLS_LIST.map(tool => {
          const tracked = trackingData?.find(t => t.deliverable_name === tool.title);
          return {
            id: tracked?.id || `temp-${tool.title}`,
            deliverable_name: tool.title,
            status: tracked?.status || 'Pendiente'
          };
        });

        if (isMounted) {
          setProperty(propData);
          setClassification(classData);
          setTasks(combinedTasks);
        }

      } catch (err: any) {
        console.error(err);
        if (isMounted) setError(err.message || 'Error al cargar el tablero.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDashboardData();
    return () => { isMounted = false; };
  }, [user]);

  const updateTaskStatus = async (task: Task, newStatus: string) => {
    if (!property) return;

    // Optimistic UI Update
    setTasks(prev => prev.map(t => t.deliverable_name === task.deliverable_name ? { ...t, status: newStatus } : t));

    try {
      const isTemp = task.id.startsWith('temp-');
      if (isTemp) {
        // Insert
        const { data, error } = await supabase
          .from('deliverable_tracking')
          .insert({
            property_id: property.id,
            deliverable_name: task.deliverable_name,
            status: newStatus
          })
          .select('id')
          .single();
          
        if (error) throw error;
        
        // Actualizar con ID real
        setTasks(prev => prev.map(t => t.deliverable_name === task.deliverable_name ? { ...t, id: data.id } : t));
      } else {
        // Update
        const { error } = await supabase
          .from('deliverable_tracking')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', task.id);
          
        if (error) throw error;
      }
    } catch (err: any) {
      console.error(err);
      // Revert if error
      setTasks(prev => prev.map(t => t.deliverable_name === task.deliverable_name ? { ...t, status: task.status } : t));
      alert('Hubo un error al actualizar la tarea.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-slate-500 font-medium">Cargando tablero SG-SST...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <p className="text-sm text-red-700 font-medium">{error || 'No se encontro informacion.'}</p>
      </div>
    );
  }

  // Resumen de estado
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completada').length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-6">
      
      {/* Encabezado Corporativo */}
      <div className="bg-slate-900 rounded-xl shadow-lg p-8 flex flex-col md:flex-row items-center justify-between text-white border border-slate-800">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <div className="bg-slate-800 p-3 rounded-full">
            <ShieldCheck className="w-10 h-10 text-teal-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">Hola, Responsable</h2>
            <p className="text-slate-400 font-medium">Asignado a: {property.name}</p>
          </div>
        </div>
        
        <button 
          onClick={exportarInformeMensualConsolidado}
          className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-[#20c997] hover:bg-[#1ba87e] text-[#0B1727] font-bold rounded-lg transition-colors shadow-md"
        >
          <Download className="w-5 h-5" /> Generar Informe Mensual Consolidado
        </button>

        <div className="flex space-x-6 text-sm text-center">
          <div className="bg-slate-800 px-6 py-3 rounded-lg border border-slate-700">
            <p className="text-slate-400 font-bold mb-1">Tipo Normativo</p>
            <p className="text-teal-400 font-extrabold text-xl">TIPO {classification?.normative_type}</p>
          </div>
          <div className="bg-slate-800 px-6 py-3 rounded-lg border border-slate-700">
            <p className="text-slate-400 font-bold mb-1">Avance Global</p>
            <p className="text-white font-extrabold text-xl">{progressPercent}%</p>
          </div>
        </div>
      </div>

      {/* Panel Kanban/Checklist */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">
          Entregables Obligatorios
        </h3>

        <div className="space-y-4">
          {tasks.map((task) => {
            const isCompleted = task.status === 'Completada';
            const inProgress = task.status === 'En proceso';
            
            return (
              <div 
                key={task.deliverable_name} 
                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                  isCompleted 
                    ? 'bg-teal-50 border-teal-200' 
                    : inProgress 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-teal-500 flex-shrink-0" />
                  ) : inProgress ? (
                    <Clock className="w-6 h-6 text-blue-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-300 flex-shrink-0" />
                  )}
                  
                  <span className={`font-bold ${isCompleted ? 'text-teal-800 line-through' : 'text-slate-800'}`}>
                    {task.deliverable_name}
                  </span>
                </div>

                <div className="flex space-x-2">
                  <button 
                    onClick={() => updateTaskStatus(task, 'Pendiente')}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                      task.status === 'Pendiente' ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Pendiente
                  </button>
                  <button 
                    onClick={() => updateTaskStatus(task, 'En proceso')}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                      task.status === 'En proceso' ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 border border-slate-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                    }`}
                  >
                    En proceso
                  </button>
                  <button 
                    onClick={() => updateTaskStatus(task, 'Completada')}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                      task.status === 'Completada' ? 'bg-teal-500 text-white' : 'bg-white text-slate-500 border border-slate-300 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-300'
                    }`}
                  >
                    Completada
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
