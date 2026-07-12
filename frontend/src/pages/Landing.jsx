import React from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { Shield, ArrowRight, UserCircle, QrCode } from 'lucide-react';

export default function Landing() {
  const [searchParams] = useSearchParams();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      {/* Dynamic Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg z-10"
      >
        <div className="glass-panel p-10 text-center">
          <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ delay: 0.1 }}
            className="mb-8 flex justify-center"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.3)] animate-float">
              <Shield size={48} className="text-white" />
            </div>
          </motion.div>
          
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white">Sentinel</h1>
              <p className="text-slate-400 text-lg mb-10">Intelligent Classroom Verification</p>
          </motion.div>
          
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-4">
            <Link to="/faculty/login" className="btn-primary w-full py-4 text-lg font-semibold flex justify-center items-center gap-3">
              <UserCircle size={24} /> Enter Portal
            </Link>
            <Link to="/student/login" className="btn-secondary w-full py-4 text-lg font-semibold flex justify-center items-center gap-3">
              <QrCode size={24} /> Student Login
            </Link>
          </motion.div>
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-12 pt-8 border-t border-white/10">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                System Operational
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
