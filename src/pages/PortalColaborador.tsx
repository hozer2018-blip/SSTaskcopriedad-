import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertCircle, FileSignature, Fingerprint, ClipboardList, Loader2, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PortalColaborador() {
  const { token } = useParams();
  const [isSigned, setIsSigned] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [viendoResponsabilidades, setViendoResponsabilidades] = useState(false);
  
  // Datos reales de Supabase
  const [colaboradorInfo, setColaboradorInfo] = useState<any>(null);
  const [responsabilidades, setResponsabilidades] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      cargarDatos(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const cargarDatos = async (id: string) => {
    try {
      // 1. Cargar datos del trabajador
      const { data: empData, error: empError } = await supabase
        .from('sst_colaboradores')
        .select('*')
        .eq('id', id)
        .single();
        
      if (empError) throw empError;
      setColaboradorInfo(empData);

      // 2. Cargar las responsabilidades asignadas
      const { data: asigData, error: asigError } = await supabase
        .from('sst_asignaciones')
        .select('sst_responsabilidades(descripcion)')
        .eq('colaborador_id', id);

      if (!asigError && asigData) {
        // En supabase si cruzas tablas en un select, te devuelve un objeto con el nombre de la tabla relacionada
        setResponsabilidades(asigData.map((a: any) => a.sst_responsabilidades));
      }
    } catch (error) {
      console.error("Error al cargar portal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirmar = async () => {
    if (!aceptaTerminos || !aceptaDatos || !token) return;
    
    setIsSigning(true);
    
    try {
      // Guardar en base de datos la aceptacion y la fecha/hora
      const { error } = await supabase
        .from('sst_colaboradores')
        .update({
          firma_electronica: true,
          habeas_data: true,
          fecha_firma: new Date().toISOString()
        })
        .eq('id', token);

      if (error) throw error;
      
      setIsSigned(true);
    } catch (error) {
      console.error("Error al guardar firma:", error);
      alert("Hubo un error al registrar tu firma. Intentalo de nuevo.");
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-[#20c997] animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Autenticando colaborador...</p>
      </div>
    );
  }

  if (!colaboradorInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Enlace Invalido</h2>
          <p className="text-slate-500 text-sm">Este enlace ya no es valido o el trabajador fue eliminado del sistema.</p>
        </div>
      </div>
    );
  }

  // VISTA 3: RESPONSABILIDADES
  if (viendoResponsabilidades) {
    return (
      <div className="min-h-screen bg-slate-50 md:bg-gray-100 flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen shadow-xl relative pb-10">
          
          <div className="bg-[#0B1727] p-6 rounded-b-3xl shadow-md">
            <div className="flex items-center gap-2 text-[#20c997] mb-2">
              <ClipboardList className="w-6 h-6" />
              <span className="font-bold">Matriz de Responsabilidades</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mt-2">
              Las siguientes obligaciones de SST han sido asignadas a tu cargo y respaldadas con tu firma electronica previa.
            </p>
          </div>

          <div className="p-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex justify-between items-center">
               <div>
                 <p className="text-xs text-slate-500 font-bold uppercase mb-1">Trabajador</p>
                 <p className="font-bold text-slate-800 text-sm">{colaboradorInfo.nombre_completo}</p>
               </div>
               <div className="text-right">
                 <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total</p>
                 <p className="font-black text-[#20c997] text-xl">{responsabilidades.length}</p>
               </div>
            </div>

            {responsabilidades.length === 0 ? (
              <div className="text-center py-10">
                <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No tienes responsabilidades especificas asignadas en este momento.</p>
              </div>
            ) : (
              <ul className="space-y-3 mb-8">
                {responsabilidades.map((resp, index) => (
                  <li key={index} className="flex gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                    <div className="mt-0.5 shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-[#20c997]" />
                    </div>
                    <p className="text-slate-700 text-sm font-medium leading-relaxed">
                      {resp.descripcion}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 pt-6 border-t border-slate-200">
              <button 
                onClick={() => {
                  alert("Has aceptado tus responsabilidades exitosamente. Ya puedes cerrar esta ventana.");
                  // Redirigir a la web principal de SSTask
                  window.location.href = "https://sstask-laing.vercel.app/#beneficios";
                }}
                className="w-full bg-[#0B1727] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md mb-3"
              >
                <CheckCircle2 className="w-5 h-5" />
                He leido y acepto mis responsabilidades
              </button>
              
              <button 
                onClick={() => setViendoResponsabilidades(false)}
                className="w-full bg-white border border-slate-300 text-slate-700 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Volver atras
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VISTA 2: FIRMA EXITOSA
  if (isSigned) {
    return (
      <div className="min-h-screen bg-[#fdfdfd] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-[#20c997]/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-[#20c997]" />
        </div>
        <h1 className="text-2xl font-bold text-[#0B1727] mb-2">!Validacion Legal Exitosa!</h1>
        <p className="text-slate-500 max-w-sm mb-8 text-sm">
          Gracias {colaboradorInfo.nombre_completo}. Tu firma electronica y consentimiento han sido registrados inmodificablemente en el SG-SST.
        </p>
        
        <button 
          className="bg-[#0B1727] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg"
          onClick={() => setViendoResponsabilidades(true)}
        >
          <ClipboardList className="w-5 h-5" />
          Ver mis Responsabilidades Asignadas
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    );
  }

  // VISTA 1: FORMULARIO LEGAL
  return (
    <div className="min-h-screen bg-slate-50 md:bg-gray-100 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-xl relative pb-40">
        <div className="bg-[#0B1727] p-6 rounded-b-3xl shadow-md">
          <div className="flex items-center gap-2 text-white mb-6">
            <ShieldCheck className="w-6 h-6 text-[#20c997]" />
            <span className="font-bold text-xl tracking-wide">SSTask</span>
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">Hola,<br/>{colaboradorInfo.nombre_completo}</h1>
          <p className="text-slate-300 mt-2 text-sm">{colaboradorInfo.empresa_contratante || 'Personal Directo'} | {colaboradorInfo.cargo || 'Operativo'}</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900 leading-relaxed font-medium">
              Requisito legal: Debes aceptar las politicas de firma electronica y tratamiento de datos para operar en el SG-SST.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-[#0B1727] text-sm flex items-center gap-2 mb-2">
              <FileSignature className="w-4 h-4 text-[#20c997]" /> Ley 527 de 1999 (Firma Electronica)
            </h3>
            <p className="text-xs text-slate-600 text-justify mb-3 leading-relaxed">
              Comprendo que mi Cedula y PIN constituyen mi Firma Electronica. Toda accion realizada en mi sesion (actas, autoreportes, permisos) tendra plena validez juridica y fuerza probatoria ante el Ministerio del Trabajo, asimilandose a mi firma manuscrita.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 w-4 h-4 text-[#20c997] rounded" checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)} />
              <span className="text-xs font-bold text-slate-700">Acepto la validez de mi firma electronica.</span>
            </label>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-[#0B1727] text-sm flex items-center gap-2 mb-2">
              <Fingerprint className="w-4 h-4 text-[#20c997]" /> Ley 1581 de 2012 (Habeas Data)
            </h3>
            <p className="text-xs text-slate-600 text-justify mb-3 leading-relaxed">
              Autorizo el tratamiento de mis datos personales y sensibles (estado de salud, datos biometricos). Entiendo que permaneceran en una boveda cifrada aislada para fines exclusivos de salud ocupacional y vigilancia epidemiologica.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 w-4 h-4 text-[#20c997] rounded" checked={aceptaDatos} onChange={(e) => setAceptaDatos(e.target.checked)} />
              <span className="text-xs font-bold text-slate-700">Autorizo el tratamiento de datos sensibles.</span>
            </label>
          </div>
        </div>

        <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
          <button 
            onClick={handleFirmar} 
            disabled={!aceptaTerminos || !aceptaDatos || isSigning}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all shadow-md ${(!aceptaTerminos || !aceptaDatos) ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-[#20c997] hover:bg-[#1ba87e]'}`}
          >
            {isSigning ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <>Firmar Acuerdos Legalmente</>}
          </button>
        </div>
      </div>
    </div>
  );
}
