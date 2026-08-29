import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertCircle, FileSignature, Fingerprint } from 'lucide-react';

export default function PortalColaborador() {
  const { token } = useParams();
  const [isSigned, setIsSigned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaDatos, setAceptaDatos] = useState(false);

  // Datos simulados (Se cargarian de Supabase buscando el token)
  const colaboradorInfo = { nombre: "Juan Perez", rol: "Personal Operativo", empresa: "Contratista / Directo" };

  const handleFirmar = () => {
    if (!aceptaTerminos || !aceptaDatos) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSigned(true);
    }, 1500);
  };

  if (isSigned) {
    return (
      <div className="min-h-screen bg-[#fdfdfd] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-[#20c997]/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-[#20c997]" />
        </div>
        <h1 className="text-2xl font-bold text-[#0B1727] mb-2">!Validacion Legal Exitosa!</h1>
        <p className="text-slate-500 max-w-sm">
          Gracias {colaboradorInfo.nombre}. Tu firma electronica y consentimiento han sido registrados inmodificablemente en el SG-SST.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 md:bg-gray-100 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-xl relative pb-40">
        <div className="bg-[#0B1727] p-6 rounded-b-3xl shadow-md">
          <div className="flex items-center gap-2 text-white mb-6">
            <ShieldCheck className="w-6 h-6 text-[#20c997]" />
            <span className="font-bold text-xl tracking-wide">SSTask</span>
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">Hola,<br/>{colaboradorInfo.nombre}</h1>
          <p className="text-slate-300 mt-2 text-sm">{colaboradorInfo.empresa} | {colaboradorInfo.rol}</p>
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
            disabled={!aceptaTerminos || !aceptaDatos || isLoading}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all shadow-md ${(!aceptaTerminos || !aceptaDatos) ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-[#20c997] hover:bg-[#1ba87e]'}`}
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <>Firmar Acuerdos Legalmente</>}
          </button>
        </div>
      </div>
    </div>
  );
}
