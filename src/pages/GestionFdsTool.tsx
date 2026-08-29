import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, UploadCloud, AlertTriangle, FileText, 
  Trash2, Save, Plus, Search, ShieldAlert, CheckCircle2, Loader2 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const PICTOGRAMAS_SGA = [
  'Explosivo', 'Inflamable', 'Comburente', 'Gas a Presion', 
  'Corrosivo', 'Toxicidad Aguda', 'Irritacion', 'Peligro para la Salud', 'Peligro Medio Ambiente'
];

export default function GestionFdsTool() {
  const { user } = useAuth();
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [quimicos, setQuimicos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    nombre_producto: '',
    fabricante: '',
    palabra_advertencia: 'Atencion',
    pictogramas: [] as string[],
    archivo: null as File | null
  });

  useEffect(() => {
    if (user) loadContext();
  }, [user]);

  const loadContext = async () => {
    try {
      setIsLoading(true);
      const { data: managers } = await supabase
        .from('sst_managers')
        .select('property_id')
        .eq('account_id', user!.id)
        .limit(1);
      
      if (!managers || managers.length === 0) return;
      
      const currentPropertyId = managers[0].property_id;
      setPropertyId(currentPropertyId);
      
      await cargarQuimicos(currentPropertyId);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const cargarQuimicos = async (propId: string) => {
    const { data, error } = await supabase
      .from('sst_sga_quimicos')
      .select('*')
      .eq('property_id', propId)
      .order('created_at', { ascending: false });
    
    if (!error && data) setQuimicos(data);
  };

  const togglePictograma = (pic: string) => {
    setFormData(prev => ({
      ...prev,
      pictogramas: prev.pictogramas.includes(pic)
        ? prev.pictogramas.filter(p => p !== pic)
        : [...prev.pictogramas, pic]
    }));
  };

  const guardarQuimico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !formData.nombre_producto) return;

    setIsLoading(true);

    const { error } = await supabase
      .from('sst_sga_quimicos')
      .insert([{
        property_id: propertyId,
        nombre_producto: formData.nombre_producto,
        fabricante: formData.fabricante,
        palabra_advertencia: formData.palabra_advertencia,
        pictogramas: formData.pictogramas,
        fds_url: formData.archivo ? formData.archivo.name : null
      }]);

    setIsLoading(false);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setFormData({ nombre_producto: '', fabricante: '', palabra_advertencia: 'Atencion', pictogramas: [], archivo: null });
      setIsFormOpen(false);
      cargarQuimicos(propertyId);
    }
  };

  const eliminarQuimico = async (id: string) => {
    if(!window.confirm("Seguro que deseas eliminar este producto?")) return;
    const { error } = await supabase.from('sst_sga_quimicos').delete().eq('id', id);
    if (!error) {
      setQuimicos(quimicos.filter(q => q.id !== id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="bg-[#0B1727] p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#20c997]/20 rounded-lg">
            <FlaskConical className="w-8 h-8 text-[#20c997]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">11. Gestion de FDS (SGA)</h1>
            <p className="text-slate-300 text-sm mt-1">Inventario de sustancias quimicas y Fichas de Datos de Seguridad.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-[#20c997] text-[#0B1727] font-bold rounded-lg hover:bg-teal-500 transition-colors shadow-sm"
        >
          {isFormOpen ? 'Ver Inventario' : <><Plus className="w-4 h-4" /> Agregar Sustancia</>}
        </button>
      </div>

      <div className="w-full bg-[#fdfdfd] rounded-xl shadow-sm border border-slate-200 min-h-[500px] p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 h-full">
            <Loader2 className="w-8 h-8 text-[#20c997] animate-spin mb-4" />
            <p>Cargando inventario quimico...</p>
          </div>
        ) : isFormOpen ? (
          /* FORMULARIO DE NUEVO QUIMICO */
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-[#0B1727] mb-6 border-b border-slate-100 pb-3">Registrar Nuevo Producto Quimico</h2>
            <form onSubmit={guardarQuimico} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Producto *</label>
                  <input required type="text" value={formData.nombre_producto} onChange={e => setFormData({...formData, nombre_producto: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md focus:border-[#20c997] outline-none" placeholder="Ej: Hipoclorito de Sodio" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fabricante / Proveedor</label>
                  <input type="text" value={formData.fabricante} onChange={e => setFormData({...formData, fabricante: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md focus:border-[#20c997] outline-none" placeholder="Ej: Quimicos XYZ S.A.S" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Palabra de Advertencia (SGA)</label>
                <div className="flex gap-4">
                  {['Peligro', 'Atencion', 'N/A'].map(palabra => (
                    <label key={palabra} className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${formData.palabra_advertencia === palabra ? 'border-[#20c997] bg-[#20c997]/10 text-[#0B1727] font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                      <input type="radio" name="advertencia" value={palabra} checked={formData.palabra_advertencia === palabra} onChange={e => setFormData({...formData, palabra_advertencia: e.target.value})} className="hidden" />
                      {palabra}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Pictogramas de Peligro (Seleccion Multiple)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PICTOGRAMAS_SGA.map(pic => {
                    const isSelected = formData.pictogramas.includes(pic);
                    return (
                      <button type="button" key={pic} onClick={() => togglePictograma(pic)} className={`text-xs font-bold p-2 border rounded-md transition-all flex items-center justify-between ${isSelected ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                        {pic} {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Ficha de Datos de Seguridad (FDS)</label>
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-[#20c997]/5 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                    <p className="text-sm text-slate-500">{formData.archivo ? formData.archivo.name : 'Haz clic para subir el PDF'}</p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf" onChange={e => setFormData({...formData, archivo: e.target.files?.[0] || null})} />
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button type="submit" className="px-6 py-2.5 bg-[#0B1727] text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2">
                  <Save className="w-4 h-4" /> Guardar Producto
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* CATALOGO (GRILLA DE TARJETAS) */
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800">Inventario Quimico</h2>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input type="text" placeholder="Buscar producto..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#20c997] w-64 bg-white" />
              </div>
            </div>

            {quimicos.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p>No hay productos quimicos registrados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {quimicos.map(q => (
                  <div key={q.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:border-[#20c997] transition-colors flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                      <div>
                        <h3 className="font-bold text-[#0B1727]">{q.nombre_producto}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{q.fabricante || 'Fabricante no especificado'}</p>
                      </div>
                      <button onClick={() => eliminarQuimico(q.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4 flex-1">
                      <div className="mb-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-sm ${q.palabra_advertencia === 'Peligro' ? 'bg-red-100 text-red-700' : q.palabra_advertencia === 'Atencion' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                          SGA: {q.palabra_advertencia}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {q.pictogramas && q.pictogramas.map((pic: string, idx: number) => (
                          <span key={idx} className="text-[10px] font-bold border border-red-200 text-red-600 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {pic}
                          </span>
                        ))}
                        {(!q.pictogramas || q.pictogramas.length === 0) && (
                          <span className="text-xs text-slate-400">Sin pictogramas asignados</span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border-t border-slate-100">
                      <button className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-100 transition-colors">
                        <FileText className="w-4 h-4 text-[#20c997]" /> 
                        {q.fds_url ? 'Ver Ficha (FDS)' : 'Sin Ficha Adjunta'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
