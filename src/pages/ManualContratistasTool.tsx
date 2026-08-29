import React, { useState } from 'react';
import { UploadCloud, BookOpen, Download, Trash2, CheckCircle2 } from 'lucide-react';

export default function ManualContratistasTool() {
  const [file, setFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Simulacion de carga a Supabase Storage
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    const uploadedFile = e.target.files[0];

    // Aqui iria la logica real: supabase.storage.from('sst_documents').upload(...)
    setTimeout(() => {
      setFile({ 
        name: uploadedFile.name, 
        date: new Date().toLocaleDateString('es-CO') 
      });
      setIsUploading(false);
    }, 1500);
  };

  const handleReset = () => {
    // Aqui iria la logica para eliminar de Supabase Storage si es necesario
    setFile(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Encabezado Principal */}
      <div className="bg-[#0B1727] p-6 rounded-xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-lg">
            <BookOpen className="w-8 h-8 text-[#20c997]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">4. Manual de Contratistas</h1>
            <p className="text-slate-300 text-sm mt-1">Carga el documento vinculante para empresas de vigilancia, aseo y mantenimiento.</p>
          </div>
        </div>
      </div>

      <div className="w-full bg-[#fdfdfd] rounded-xl shadow-sm border border-slate-200 p-6">
        {!file ? (
          // Estado A: Zona de carga (Drag & Drop)
          <div className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-[#20c997] rounded-lg bg-white hover:bg-[#20c997]/5 transition-colors group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-12 h-12 text-[#0B1727] mb-4 group-hover:scale-110 transition-transform" />
              <p className="mb-2 text-sm text-[#0B1727]">
                <span className="font-semibold text-[#20c997]">Haz clic para subir</span> o arrastra el documento
              </p>
              <p className="text-xs text-slate-500">Formato PDF o Word (MAX. 10MB)</p>
            </div>
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-lg">
                <div className="w-8 h-8 border-4 border-[#20c997] border-t-transparent rounded-full animate-spin mb-2"></div>
                <span className="text-[#0B1727] font-bold text-sm">Guardando en la nube...</span>
              </div>
            )}
          </div>
        ) : (
          // Estado B: Documento Cargado
          <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white border border-[#20c997]/40 rounded-lg shadow-sm">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="p-3 bg-[#20c997]/10 rounded-full">
                <BookOpen className="w-8 h-8 text-[#20c997]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-[#0B1727]">{file.name}</p>
                  <CheckCircle2 className="w-5 h-5 text-[#20c997]" />
                </div>
                <p className="text-sm text-slate-500 mt-1">Cargado el {file.date}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-[#0B1727] font-medium rounded-lg hover:bg-slate-200 transition-colors" title="Descargar Documento">
                <Download className="w-4 h-4" />
                Descargar
              </button>
              <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors" 
                title="Eliminar y Reemplazar"
              >
                <Trash2 className="w-4 h-4" />
                Reemplazar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
