import React, { useState } from 'react';
import { Bell, Search, User, CheckCircle, Info, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../../store/toastStore';

export const TopNav = ({ title, onMenuClick }) => {
  const { user } = useAuthStore();
  const userName = user?.name || 'User';
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (user?.role === 'faculty') {
        navigate('/faculty/students');
      }
      toast.info(`Searching for "${searchQuery}"...`);
      setSearchQuery('');
    }
  };

  return (
    <header className="h-16 bg-background/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 md:ml-64 md:w-[calc(100%-16rem)] w-full transition-all">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden text-text-secondary hover:text-white p-1 rounded-lg hover:bg-white/5">
          <Menu size={22} />
        </button>
        <h1 className="text-xl font-semibold text-white truncate">{title || 'Dashboard'}</h1>
      </div>
      
      <div className="flex items-center gap-4 sm:gap-6">
        <form onSubmit={handleSearch} className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anything..." 
            className="bg-surface border border-white/5 rounded-full pl-10 pr-4 py-1.5 text-sm w-64 focus:outline-none focus:border-primary/50 text-white placeholder:text-text-muted transition-all focus:w-72"
          />
        </form>

        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-text-secondary hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
          </button>
          
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-80 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                  <h3 className="font-semibold text-white">Notifications</h3>
                  <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">2 New</span>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  <div className="p-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 flex gap-3">
                    <div className="mt-1 w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={16} className="text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">System Update Completed</p>
                      <p className="text-xs text-text-muted mt-1">All features are now fully operational. You can explore the new capabilities.</p>
                      <p className="text-[10px] text-text-muted mt-2">Just now</p>
                    </div>
                  </div>
                  <div className="p-4 hover:bg-white/5 transition-colors cursor-pointer flex gap-3">
                    <div className="mt-1 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Info size={16} className="text-primary-light" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">Welcome to Sentinel V2</p>
                      <p className="text-xs text-text-muted mt-1">Experience the new premium interface and enhanced performance.</p>
                      <p className="text-[10px] text-text-muted mt-2">1 hour ago</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-white/5 text-center bg-white/[0.02]">
                  <button className="text-xs text-primary hover:text-primary-light font-medium transition-colors">Mark all as read</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Link to={`/${user?.role}/profile`} className="flex items-center gap-3 pl-6 border-l border-white/10 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-light font-medium">
            {userName.charAt(0)}
          </div>
          <span className="text-sm font-medium text-white hidden sm:block">{userName}</span>
        </Link>
      </div>
    </header>
  );
};
