import React, { useState } from 'react';
import { UploadCloud, FileText, Download, Trash2, CheckCircle2, Book } from 'lucide-react';

export default function ManualSSTTool() {
  const [file, setFile] = useState<{ name: string; date: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Simulador de carga
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsUploading(true);
    // Aqui iria la logica real de Supabase Storage
    setTimeout(() => {
      setFile({ name: 'SST-D-00 Manual del SG-SST V1.pdf', date: '26/08/2026' });
      setIsUploading(false);
    }, 1500);
  };

  const handleReset = () => setFile(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 rounded-xl p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/20 rounded-lg">
            <Book className="w-8 h-8 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Manual SST</h1>
            <p className="text-slate-400 mt-1">
              Documento central del Sistema de Gestion
            </p>
          </div>
        </div>
      </div>

      <div className="w-full bg-[#fdfdfd] p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#0B1727]">1. Manual SG-SST</h2>
          <p className="text-slate-500 mt-1">
            Carga el documento principal del Sistema de Gestion de Seguridad y Salud en el Trabajo.
          </p>
        </div>

        {!file ? (
          // Estado A: Zona de carga (Drag & Drop)
          <div className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-[#20c997] rounded-lg bg-white hover:bg-[#20c997]/5 transition-colors group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-12 h-12 text-[#0B1727] mb-4 group-hover:scale-110 transition-transform" />
              <p className="mb-2 text-sm text-[#0B1727]">
                <span className="font-semibold text-[#20c997]">Haz clic para subir</span> o arrastra y suelta
              </p>
              <p className="text-xs text-slate-500">PDF o Word (MAX. 10MB)</p>
            </div>
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                <span className="text-[#0B1727] font-medium flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#20c997] border-t-transparent rounded-full animate-spin"></div>
                  Cargando documento...
                </span>
              </div>
            )}
          </div>
        ) : (
          // Estado B: Documento Cargado
          <div className="flex items-center justify-between p-4 bg-white border border-[#20c997]/30 rounded-lg shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#20c997]/10 rounded-full">
                <FileText className="w-6 h-6 text-[#20c997]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#0B1727]">{file.name}</p>
                  <CheckCircle2 className="w-4 h-4 text-[#20c997]" />
                </div>
                <p className="text-xs text-slate-500">Subido el {file.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-500 hover:text-[#0B1727] hover:bg-slate-100 rounded-md transition-colors" title="Descargar">
                <Download className="w-5 h-5" />
              </button>
              <button 
                onClick={handleReset}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" 
                title="Eliminar / Reemplazar"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
