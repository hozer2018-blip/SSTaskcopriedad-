import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LayoutDashboard, LogOut, UserCheck, Users, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { TOOLS_LIST } from '../lib/toolsList';

export default function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    {
      name: profile?.role === 'Responsable' ? 'Dashboard Resumen' : 'Panel Principal',
      path: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      show: true
    },
    {
      name: 'Responsable SG-SST',
      path: '/manager-designation',
      icon: <UserCheck className="w-5 h-5" />,
      show: profile?.role !== 'Responsable'
    },
    {
      name: 'Registro de Poblacion',
      path: '/tools/personnel',
      icon: <Users className="w-5 h-5" />,
      show: profile?.role === 'Responsable'
    },
    ...(profile?.role === 'Responsable' ? TOOLS_LIST.map(tool => ({
      name: tool.title,
      path: tool.path,
      icon: React.createElement(tool.icon, { className: "w-5 h-5" }),
      show: true
    })) : [])
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar Azul Marino */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <ShieldCheck className="w-8 h-8 text-teal-400 mr-3" />
          <span className="text-xl font-bold text-slate-50">SSTask</span>
        </div>
        
        <div className="px-6 py-6">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Usuario</p>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/50 flex items-center justify-center text-teal-400 font-bold">
              {profile?.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-50 truncate max-w[120px]">{profile?.email.split('@')[0]}</p>
              <p className="text-xs text-teal-400">{profile?.role}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.filter(item => item.show).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150",
                  isActive 
                    ? "bg-teal-500/10 text-teal-400" 
                    : "hover:bg-slate-800 hover:text-slate-50"
                )}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg hover:bg-slate-800 hover:text-red-400 transition-colors duration-150"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar Sesion
          </button>
        </div>
      </aside>

      {/* Main Content (Blanco Tiza) */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white shadow-sm flex items-center px-8 border-b border-slate-200">
          <h1 className="text-xl font-semibold text-slate-800">
            {menuItems.find(i => i.path === location.pathname)?.name || 'SG-SST'}
          </h1>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
