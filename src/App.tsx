/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import ManagerDesignationTool from './pages/ManagerDesignationTool';
import DesignationDocumentTemplate from './pages/DesignationDocumentTemplate';
import PersonnelRegistryTool from './pages/PersonnelRegistryTool';
import EmergenciesTool from './pages/EmergenciesTool';
import PlaceholderTool from './pages/PlaceholderTool';
import ManualSSTTool from './pages/ManualSSTTool';
import ManualContratistasTool from './pages/ManualContratistasTool';
import AuditoriaPlanillasTool from './pages/AuditoriaPlanillasTool';
import AuditoriaExamenesTool from './pages/AuditoriaExamenesTool';
import GestionAtsTool from './pages/GestionAtsTool';
import CentroComandoEmergenciasTool from './pages/CentroComandoEmergenciasTool';
import ProteccionCaidasTool from './pages/ProteccionCaidasTool';
import MatrizResponsabilidadesTool from './pages/MatrizResponsabilidadesTool';
import MatrizIpevrTool from './pages/MatrizIpevrTool';
import ProtocolosRetieLotoTool from './pages/ProtocolosRetieLotoTool';
import GestionFdsTool from './pages/GestionFdsTool';
import InspeccionesTool from './pages/InspeccionesTool';

import PortalColaborador from './pages/PortalColaborador';

const ProtectedRoute = ({ children, requireProperty }: { children: React.ReactNode, requireProperty?: boolean }) => {
  const { user, profile, loading } = useAuth();
  const [hasProperty, setHasProperty] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (user && profile?.role !== 'Responsable') {
      supabase.from('properties').select('id').eq('user_id', user.id).then(({ data }) => {
        if (isMounted) {
          setHasProperty(data && data.length > 0);
          setChecking(false);
        }
      });
    } else {
      if (isMounted) {
        // Responsable skip this check
        setHasProperty(true); 
        setChecking(false);
      }
    }
    return () => { isMounted = false; };
  }, [user, profile]);

  if (loading || checking) {
    return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Cargando aplicacion...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireProperty === true && hasProperty === false && profile?.role !== 'Responsable') {
    return <Navigate to="/onboarding" replace />;
  }

  if (requireProperty === false && hasProperty === true && profile?.role !== 'Responsable') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute requireProperty={false}>
                <Onboarding />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute requireProperty={true}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="manager-designation" element={<ManagerDesignationTool />} />
            <Route path="tools/personnel" element={<PersonnelRegistryTool />} />
            <Route path="tools/emergencies" element={<EmergenciesTool />} />
            
            {/* Rutas en construccion */}
            <Route path="tools/manual-sst" element={<ManualSSTTool />} />
            <Route path="tools/matriz-responsabilidades" element={<MatrizResponsabilidadesTool />} />
            <Route path="tools/matriz-ipevr" element={<MatrizIpevrTool />} />
            <Route path="tools/manual-contratistas" element={<ManualContratistasTool />} />
            <Route path="tools/auditoria-planillas" element={<AuditoriaPlanillasTool />} />
            <Route path="tools/auditoria-examenes" element={<AuditoriaExamenesTool />} />
            <Route path="tools/gestion-ats" element={<GestionAtsTool />} />
            <Route path="tools/centro-comando" element={<CentroComandoEmergenciasTool />} />
            <Route path="tools/proteccion-caidas" element={<ProteccionCaidasTool />} />
            <Route path="tools/protocolos-retie-loto" element={<ProtocolosRetieLotoTool />} />
            <Route path="tools/gestion-fds" element={<GestionFdsTool />} />
            <Route path="tools/inspecciones" element={<InspeccionesTool />} />
          </Route>
          <Route 
            path="/designation-document" 
            element={
              <ProtectedRoute requireProperty={true}>
                <DesignationDocumentTemplate />
              </ProtectedRoute>
            } 
          />
          <Route path="/portal/:token" element={<PortalColaborador />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
