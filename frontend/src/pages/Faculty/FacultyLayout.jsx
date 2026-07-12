import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, Settings, LogOut, FilePlus, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function FacultyLayout({ children, title }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/faculty/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/faculty/dashboard' },
    // { name: 'Sessions', icon: FilePlus, path: '/faculty/sessions' },
    { name: 'Students', icon: Users, path: '/faculty/students' },
    { name: 'Attendance', icon: BarChart3, path: '/faculty/attendance' },
    { name: 'Feedbacks', icon: MessageSquare, path: '/faculty/feedbacks' },
    // { name: 'Settings', icon: Settings, path: '/faculty/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-[#1e293b] border-r border-slate-700/50 flex-col fixed h-full z-20">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Sentinel</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Classroom Platform</p>
        </div>
        
        <div className="px-6 pb-6">
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-400">Faculty</p>
            <p className="font-semibold text-white truncate">{user?.name || 'Instructor'}</p>
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
      <main className="flex-1 md:ml-64 min-h-screen relative overflow-hidden bg-[#0f172a] pb-20 md:pb-0">
        {/* Top bar for title */}
        <header className="h-16 md:h-20 border-b border-slate-700/50 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-10 flex items-center px-4 md:px-8 justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
          
          <div className="md:hidden flex items-center gap-4">
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 rounded-lg">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 relative z-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-[#1e293b] border-t border-slate-700/50 flex justify-around p-2 z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => 
              `flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                isActive 
                  ? 'text-blue-400' 
                  : 'text-slate-400'
              }`
            }
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
