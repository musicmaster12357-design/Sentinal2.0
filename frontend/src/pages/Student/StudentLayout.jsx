import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, QrCode, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function StudentLayout({ children, title }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/student/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
    { name: 'Scan QR', icon: QrCode, path: '/scanner' }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col md:flex-row">
      {/* Desktop Left Navigation */}
      <aside className="hidden md:flex w-64 bg-[#1e293b] border-r border-slate-700/50 flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Sentinel</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Student Portal</p>
          </div>
        </div>
        
        <div className="px-6 pb-6">
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-400">Student</p>
            <p className="font-semibold text-white truncate">{user?.name || 'Student'}</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`
              }
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 h-[100dvh] relative overflow-hidden bg-[#0f172a] flex flex-col pb-16 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-slate-700/50 bg-[#1e293b] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white tracking-wide">Sentinel</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-400 transition-colors rounded-full hover:bg-slate-800">
            <LogOut size={20} />
          </button>
        </header>

        {/* Desktop Top bar for title */}
        {title && (
          <header className="hidden md:flex h-20 border-b border-slate-700/50 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-10 items-center px-8 shrink-0">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </header>
        )}

        <div className="flex-1 overflow-y-auto relative z-0 custom-scrollbar">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#1e293b] border-t border-slate-700/50 flex items-center justify-around h-16 z-50 px-2 pb-safe">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => 
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive 
                  ? 'text-blue-400' 
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <item.icon size={24} />
            <span className="text-[10px] font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
