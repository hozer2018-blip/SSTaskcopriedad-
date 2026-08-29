import React, { useState, useEffect } from 'react';
import { Activity, UploadCloud, MessageSquare, CheckCircle2, Save, Loader2, AlertTriangle, FileCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AuditoriaExamenesTool() {
  const { user } = useAuth();
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [examenesBD, setExamenesBD] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. CARGAR DATOS REALES AL INICIAR
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
      
      await cargarDatos(currentPropertyId);
    } catch (error) {
      console.error("Error cargando contexto:", error);
      setIsLoading(false);
    }
  };

  const cargarDatos = async (propId: string) => {
    setIsLoading(true);
    try {
      // Traer colaboradores
      const { data: pobData, error: pobError } = await supabase
        .from('sst_colaboradores')
        .select('*')
        .eq('property_id', propId)
        .order('nombre_completo', { ascending: true });
        
      if (pobError) throw pobError;
      setColaboradores(pobData || []);

      // Traer auditoria de examenes
      const { data: exmData, error: exmError } = await supabase
        .from('sst_auditoria_examenes')
        .select('*')
        .eq('property_id', propId);
        
      if (exmError) {
        console.warn("Tabla sst_auditoria_examenes podria no existir:", exmError);
        setExamenesBD([]);
      } else {
        setExamenesBD(exmData || []);
      }

    } catch (error) {
      console.error('Error cargando examenes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. OBTENER Y ACTUALIZAR FILAS EN TIEMPO REAL
  const obtenerFilaExamen = (colaboradorId: string) => {
    const exmGuardado = examenesBD.find(e => e.colaborador_id === colaboradorId);
    return exmGuardado || {
      colaborador_id: colaboradorId,
      tipo_examen: 'Ingreso',
      fecha_examen: '',
      concepto_aptitud: 'Pendiente',
      recomendaciones: '',
      soporte_url: null
    };
  };

  const handleCambioFila = (colaboradorId: string, campo: string, valor: string) => {
    setExamenesBD(prev => {
      const existe = prev.find(e => e.colaborador_id === colaboradorId);
      if (existe) {
        return prev.map(e => e.colaborador_id === colaboradorId ? { ...e, [campo]: valor } : e);
      } else {
        return [...prev, {
          colaborador_id: colaboradorId,
          tipo_examen: 'Ingreso',
          fecha_examen: '',
          concepto_aptitud: 'Pendiente',
          recomendaciones: '',
          soporte_url: null,
          [campo]: valor
        }];
      }
    });
  };

  // 3. GUARDAR EN SUPABASE
  const guardarExamenes = async () => {
    if (!propertyId) return;
    setIsSaving(true);
    try {
      const filasAGuardar = examenesBD.map(exm => ({
        colaborador_id: exm.colaborador_id,
        property_id: propertyId,
        tipo_examen: exm.tipo_examen,
        fecha_examen: exm.fecha_examen || null,
        concepto_aptitud: exm.concepto_aptitud,
        recomendaciones: exm.recomendaciones
      }));

      if (filasAGuardar.length === 0) {
        setIsSaving(false);
        return;
      }

      // Upsert basado en el colaborador_id
      const { error } = await supabase
        .from('sst_auditoria_examenes')
        .upsert(filasAGuardar, { onConflict: 'colaborador_id' });

      if (error) throw error;
      alert(`Matriz de Examenes Medicos actualizada con exito.`);
      
    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error al guardar la auditoria de examenes. Asegurate de ejecutar el script SQL para crear la tabla.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper para colores del concepto de aptitud
  const getColorConcepto = (concepto: string) => {
    switch(concepto) {
      case 'Apto': return 'bg-[#20c997]/20 text-[#1ba87e] border-[#20c997]/30';
      case 'Apto con Restricciones': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'No Apto': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Encabezado */}
      <div className="bg-[#0B1727] p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-lg">
            <Activity className="w-8 h-8 text-[#20c997]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">6. Auditoria de Examenes Medicos</h1>
            <p className="text-slate-300 text-sm mt-1">Control de aptitud y recomendaciones sociodemograficas.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-blue-900/40 p-3 rounded-lg border border-blue-500/30">
          <AlertTriangle className="w-5 h-5 text-blue-300 flex-shrink-0" />
          <span className="text-sm text-blue-200">Solo ingrese Conceptos de Aptitud. No historias clinicas.</span>
        </div>
      </div>

      <div className="w-full bg-[#fdfdfd] rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 text-[#20c997] animate-spin mb-4" />
            <p>Cargando datos de examenes medicos...</p>
          </div>
        ) : colaboradores.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <FileCheck className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 mb-2 font-medium">No hay colaboradores registrados en la plataforma.</p>
            <p className="text-sm text-slate-400">Ve al modulo "1. Registro de Poblacion" para agregar personal.</p>
          </div>
        ) : (
          <>
            {/* Matriz */}
            <div className="overflow-x-auto border-b border-slate-200">
              <table className="w-full text-left border-collapse min-w-[1050px]">
                <thead>
                  <tr className="bg-slate-50 text-[#0B1727] text-sm border-b border-slate-200">
                    <th className="p-4 font-semibold w-1/5">Colaborador / Empresa</th>
                    <th className="p-4 font-semibold text-center">Tipo de Examen</th>
                    <th className="p-4 font-semibold text-center">Fecha Examen</th>
                    <th className="p-4 font-semibold text-center">Concepto de Aptitud</th>
                    <th className="p-4 font-semibold text-center">Certificado</th>
                    <th className="p-4 font-semibold w-1/4">Recomendaciones / Restricciones</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradores.map((colab) => {
                    const filaData = obtenerFilaExamen(colab.id);
                    
                    return (
                      <tr key={colab.id} className="border-b border-slate-100 hover:bg-[#20c997]/5 transition-colors bg-white">
                        <td className="p-4">
                          <p className="text-sm font-bold text-[#0B1727]">{colab.nombre_completo}</p>
                          <p className="text-xs text-slate-500">{colab.tipo_vinculacion === 'Contratista' ? colab.empresa_contratante : colab.tipo_vinculacion}</p>
                        </td>
                        
                        <td className="p-4 text-center">
                          <select 
                            className="text-xs font-medium p-2 rounded-md border border-slate-200 outline-none w-full focus:border-[#20c997]"
                            value={filaData.tipo_examen}
                            onChange={(e) => handleCambioFila(colab.id, 'tipo_examen', e.target.value)}
                          >
                            <option value="Ingreso">Ingreso</option>
                            <option value="Periodico">Periodico</option>
                            <option value="Retiro">Retiro</option>
                            <option value="Post-Incapacidad">Post-Incapacidad</option>
                          </select>
                        </td>

                        <td className="p-4 text-center">
                          <input 
                            type="date" 
                            value={filaData.fecha_examen}
                            onChange={(e) => handleCambioFila(colab.id, 'fecha_examen', e.target.value)}
                            className="text-xs p-2 border border-slate-200 rounded-md outline-none focus:border-[#20c997] w-full max-w-[130px]"
                          />
                        </td>

                        <td className="p-4 text-center">
                          <select 
                            className={`text-xs font-bold p-2 rounded-md border outline-none cursor-pointer w-full ${getColorConcepto(filaData.concepto_aptitud)}`}
                            value={filaData.concepto_aptitud}
                            onChange={(e) => handleCambioFila(colab.id, 'concepto_aptitud', e.target.value)}
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Apto">Apto</option>
                            <option value="Apto con Restricciones">Apto con Restricciones</option>
                            <option value="No Apto">No Apto</option>
                          </select>
                        </td>

                        <td className="p-4 text-center">
                          {filaData.soporte_url ? (
                            <button className="flex items-center justify-center gap-1 mx-auto text-xs font-bold text-[#20c997] hover:text-[#1ba87e] bg-[#20c997]/10 px-2 py-2 rounded-md">
                              <CheckCircle2 className="w-4 h-4" /> Ver PDF
                            </button>
                          ) : (
                            <button className="flex items-center justify-center gap-1 mx-auto text-xs font-bold text-slate-500 hover:text-[#0B1727] bg-slate-100 hover:bg-slate-200 px-2 py-2 rounded-md transition-colors">
                              <UploadCloud className="w-4 h-4" /> Subir
                            </button>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="relative">
                            <MessageSquare className="w-4 h-4 text-slate-400 absolute left-2 top-2.5" />
                            <textarea 
                              placeholder="Ej: Uso de lentes, pausas activas visuales..."
                              value={filaData.recomendaciones}
                              onChange={(e) => handleCambioFila(colab.id, 'recomendaciones', e.target.value)}
                              rows={1}
                              className="w-full pl-8 p-2 border border-slate-200 rounded-md text-sm outline-none focus:border-[#20c997] resize-y min-h-[40px] text-slate-700"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 flex justify-end">
              <button 
                onClick={guardarExamenes}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#20c997] text-white font-bold rounded-lg hover:bg-[#1ba87e] transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Guardando...' : 'Guardar Estado de Examenes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
