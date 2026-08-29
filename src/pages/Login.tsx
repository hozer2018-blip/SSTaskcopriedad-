import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let authUser = null;

      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        authUser = data.user;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password 
        });
        if (signUpError) throw signUpError;
        authUser = data.user;
      }

      // Logica de vinculacion para Responsables
      if (authUser) {
        const { data: managerData } = await supabase
          .from('sst_managers')
          .select('id')
          .eq('email', authUser.email)
          .maybeSingle();

        if (managerData) {
          // Vincular cuenta del responsable
          await supabase
            .from('sst_managers')
            .update({ account_id: authUser.id })
            .eq('id', managerData.id);

          // Asegurar perfil como Responsable
          await supabase
            .from('profiles')
            .upsert([
              { id: authUser.id, email: authUser.email, role: 'Responsable' }
            ]);
        }
      }
      
      // La redireccion la maneja el enrutador en App.tsx al cambiar el estado de Auth
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Ocurrio un error en la autenticacion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-slate-900 p-4 rounded-full shadow-lg">
            <ShieldCheck className="w-12 h-12 text-teal-400" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          SSTask
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium">
          Sistema de Gestion de Seguridad y Salud en el Trabajo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-slate-100">
          
          <div className="flex mb-8 border-b border-slate-200">
            <button
              className={`flex-1 pb-3 text-center text-sm font-bold border-b-2 transition-colors ${
                isLogin ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setIsLogin(true)}
              type="button"
            >
              Iniciar Sesion
            </button>
            <button
              className={`flex-1 pb-3 text-center text-sm font-bold border-b-2 transition-colors ${
                !isLogin ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setIsLogin(false)}
              type="button"
            >
              Crear Cuenta
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700">Correo Electronico</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-3 border bg-slate-50"
                  placeholder="usuario@empresa.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700">Contrasena</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-3 border bg-slate-50"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-md text-sm font-bold text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all"
              >
                {loading ? 'Procesando...' : (isLogin ? 'Ingresar a SSTask' : 'Registrarse')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
