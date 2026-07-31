import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Users, Clock, FileText, 
  Settings, LogOut, ShieldCheck, PieChart,
  CalendarCheck, X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const Sidebar = ({ role = 'faculty', isOpen, setIsOpen }) => {
  const { logout } = useAuthStore();
  const location = useLocation();
  
  // Close sidebar on route change on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  }, [location.pathname, setIsOpen]);
  
  const facultyLinks = [
    { name: 'Dashboard', path: '/faculty/dashboard', icon: LayoutDashboard },
    { name: 'Attendance', path: '/faculty/attendance', icon: CalendarCheck },
    { name: 'Students', path: '/faculty/students', icon: Users },
    { name: 'Feedback', path: '/faculty/feedbacks', icon: PieChart },
    { name: 'Profile', path: '/faculty/profile', icon: Settings },
  ];

  const studentLinks = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Scan QR', path: '/scanner', icon: ShieldCheck },
    { name: 'Profile', path: '/student/profile', icon: Settings },
  ];

  const links = role === 'faculty' ? facultyLinks : studentLinks;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside 
        className={`w-64 h-screen bg-sidebar border-r border-white/5 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center cursor-pointer" onClick={() => setIsOpen(false)}>
            <ShieldCheck className="text-primary mr-3" size={24} />
            <span className="text-xl font-bold tracking-tight text-white">Sentinal</span>
          </div>
          <button className="md:hidden text-text-secondary hover:text-white p-1 rounded-lg hover:bg-white/5" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2 custom-scrollbar">
          <p className="px-2 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Main Menu</p>
        {links.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-primary/10 text-primary-light font-medium' 
                  : 'text-text-secondary hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <link.icon size={18} />
            {link.name}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-white/5">
        <button 
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-xl text-text-secondary hover:bg-status-danger/10 hover:text-status-danger transition-colors duration-200"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
};
