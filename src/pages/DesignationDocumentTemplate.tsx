import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Printer, ArrowLeft } from 'lucide-react';

export default function DesignationDocumentTemplate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [property, setProperty] = useState<any>(null);
  const [manager, setManager] = useState<any>(null);
  const [classificationType, setClassificationType] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function loadDocumentData() {
      if (!user) return;
      try {
        // 1. Cargar copropiedad
        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (propError) throw propError;
        
        // 2. Cargar responsable
        const { data: managerData, error: managerError } = await supabase
          .from('sst_managers')
          .select('*')
          .eq('property_id', propData.id)
          .maybeSingle();

        if (managerError) throw managerError;
        if (!managerData) throw new Error("No hay un responsable designado. Por favor configure uno primero.");

        // 3. Cargar clasificacion normativa
        const { data: classData, error: classError } = await supabase
          .from('classifications')
          .select('normative_type')
          .eq('property_id', propData.id)
          .maybeSingle();
          
        if (classError) throw classError;

        if (isMounted) {
          setProperty(propData);
          setManager(managerData);
          if (classData) setClassificationType(classData.normative_type);
        }

      } catch (err: any) {
        console.error(err);
        if (isMounted) setError(err.message || 'Error al cargar el documento.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDocumentData();
    return () => { isMounted = false; };
  }, [user]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
        Generando documento legal...
      </div>
    );
  }

  if (error || !property || !manager) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center pt-20">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-200 max-w-lg text-center">
          <p className="text-red-600 font-bold mb-4">{error}</p>
          <button 
            onClick={() => navigate('/manager-designation')}
            className="px-6 py-2 bg-slate-900 text-white rounded-md font-bold shadow-md hover:bg-slate-800"
          >
            Volver a Gestion de Responsables
          </button>
        </div>
      </div>
    );
  }

  // Generar fecha actual formateada
  const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const currentDate = new Date().toLocaleDateString('es-CO', dateOptions);

  // Determinar responsabilidades segun clasificacion
  let responsibilitiesText = "";
  if (classificationType === 1) {
    responsibilitiesText = "el control estricto de contratistas, verificacion de afiliaciones a seguridad social, prevencion de la responsabilidad solidaria y la aplicacion de politicas de prevencion de riesgos basicos.";
  } else if (classificationType === 2) {
    responsibilitiesText = "la ejecucion y mantenimiento de los 7 estandares minimos del SG-SST, identificacion de peligros, evaluacion de riesgos y desarrollo de planes de accion preventivos segun la normativa vigente.";
  } else if (classificationType === 3) {
    responsibilitiesText = "la implementacion del ciclo PHVA integral, diseno y ejecucion del plan de emergencias, medicion de indicadores de gestion y cumplimiento absoluto de todos los estandares aplicables al nivel de riesgo.";
  } else {
    responsibilitiesText = "la ejecucion de las actividades propias del Sistema de Gestion de Seguridad y Salud en el Trabajo aplicables a la entidad.";
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white pb-20">
      
      {/* Barra de herramientas (Oculta al imprimir) */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md print:hidden sticky top-0 z-10">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-slate-300 hover:text-white transition-colors text-sm font-bold"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver al Dashboard
        </button>
        <div className="flex items-center space-x-4">
          <button 
            onClick={handlePrint}
            className="flex items-center bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded shadow-md font-bold transition-colors"
          >
            <Printer className="w-5 h-5 mr-2" />
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* Contenedor del documento simulando hoja A4 */}
      <div className="mt-8 mx-auto bg-white shadow-2xl print:shadow-none print:mt-0 max-w-[210mm] min-h-[297mm] p-[25.4mm] text-slate-800 text-justify relative">
        
        {/* Cabecera del documento */}
        <div className="text-right mb-12 text-sm">
          <p>{property.city}, {currentDate}</p>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-lg font-bold uppercase underline">ACTA DE DESIGNACION DEL RESPONSABLE DEL SG-SST</h1>
        </div>

        {/* Cuerpo del documento */}
        <div className="space-y-6 text-base leading-relaxed">
          <p>
            En cumplimiento de lo establecido en el Decreto 1072 de 2015 y la Resolucion 0312 de 2019 expedidos por el Ministerio del Trabajo de Colombia, y demas normas concordantes, yo, <strong>{property.legal_rep_name.toUpperCase()}</strong>, actuando en calidad de Representante Legal de la entidad <strong>{property.name.toUpperCase()}</strong>, manifiesto a traves de este documento la designacion formal del Responsable del Sistema de Gestion de Seguridad y Salud en el Trabajo (SG-SST).
          </p>

          <p>
            Mediante la presente acta, se designa a <strong>{manager.full_name.toUpperCase()}</strong>, identificado(a) con documento de identidad numero <strong>{manager.document_id}</strong>, con nivel de estudios <strong>{manager.education_level.toUpperCase()}</strong>, y portador(a) de la Licencia en Seguridad y Salud en el Trabajo numero <strong>{manager.license_number}</strong>, como la persona encargada de liderar y ejecutar el SG-SST de nuestra entidad.
          </p>

          <p>
            El/La designado(a) tendra bajo su responsabilidad {responsibilitiesText} Asimismo, debera mantener informada a la representacion legal sobre el avance, necesidades y resultados de la gestion en SST, promoviendo espacios seguros para todos los involucrados en las instalaciones de la entidad.
          </p>

          <p>
            Para efectos de notificaciones y seguimiento, se registra el correo electronico de contacto: <strong>{manager.email}</strong>.
          </p>

          <p>
            Esta designacion entra en vigencia a partir de la fecha de firma de este documento y se mantendra vigente mientras las partes asi lo determinen o hasta que las obligaciones contractuales y/o normativas exijan su actualizacion.
          </p>
        </div>

        {/* Firmas */}
        <div className="mt-32 grid grid-cols-2 gap-16">
          <div className="border-t border-slate-800 pt-2 text-center">
            <p className="font-bold">{property.legal_rep_name.toUpperCase()}</p>
            <p className="text-sm">Representante Legal</p>
            <p className="text-sm">{property.name.toUpperCase()}</p>
          </div>
          
          <div className="border-t border-slate-800 pt-2 text-center">
            <p className="font-bold">{manager.full_name.toUpperCase()}</p>
            <p className="text-sm">Responsable SG-SST</p>
            <p className="text-sm">Licencia: {manager.license_number}</p>
          </div>
        </div>

        {/* Pie de pagina formal */}
        <div className="absolute bottom-[20mm] left-[25.4mm] right-[25.4mm] text-center text-xs text-slate-500 border-t border-slate-200 pt-4">
          Documento generado por SSTask - Sistema de Gestion RegTech<br/>
          Identificador de la copropiedad: {property.id}
        </div>

      </div>
    </div>
  );
}
