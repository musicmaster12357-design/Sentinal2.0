import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { motion } from 'framer-motion';

export const DashboardLayout = ({ children, title, role = 'faculty' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={role} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <TopNav title={title} onMenuClick={() => setSidebarOpen(true)} />
      
      <main className="md:ml-64 p-4 sm:p-8 pt-6 min-h-[calc(100vh-4rem)] relative transition-all overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="max-w-7xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};
