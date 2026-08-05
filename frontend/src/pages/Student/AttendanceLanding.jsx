import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function AttendanceLanding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');

  const handleVerify = async () => {
    if (!token) {
      setError("No token found in URL.");
      setStatus('error');
      return;
    }
    
    setStatus('verifying');
    try {
      const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      const jsonString = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const qrData = JSON.parse(jsonString);
      if (!qrData.signature || !qrData.session_id) throw new Error("Invalid Format");
      
      const res = await api.post('/attendance/scan', qrData);
      setStatus('success');
      setTimeout(() => {
        navigate(`/student/feedback/${res.data.session_id}`, { state: { session: res.data } });
      }, 1500);
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.detail || err.message || "Invalid or Expired QR Code");
    }
  };

  const hasFired = React.useRef(false);

  useEffect(() => {
    if (user && token && status === 'idle' && !hasFired.current) {
      hasFired.current = true;
      handleVerify();
    }
  }, [user, token, status]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f172a]">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-panel p-8 text-center flex flex-col items-center">
          
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <QrCode size={40} className="text-blue-400" />
          </div>
          
          {status === 'idle' || status === 'verifying' ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-3">
                {status === 'verifying' ? 'Verifying Attendance...' : 'Attendance Session'}
              </h2>
              <p className="text-slate-300 text-sm mb-8 leading-relaxed">
                {status === 'verifying' 
                  ? 'Please wait while we confirm your attendance...'
                  : 'You have scanned an attendance QR code.'}
              </p>
              
              <div className="w-full space-y-4">
                {status === 'verifying' ? (
                  <div className="flex justify-center mb-4">
                    <Loader2 size={32} className="text-blue-400 animate-spin" />
                  </div>
                ) : user ? (
                  <button 
                    onClick={handleVerify} 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                  >
                    Mark Attendance
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search);
                      navigate('/student/login');
                    }} 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                  >
                    Login to Mark Attendance
                  </button>
                )}
                
                <button 
                  onClick={() => navigate('/')} 
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-4 rounded-xl transition-all border border-white/10"
                >
                  Back to Home
                </button>
              </div>
            </>
          ) : status === 'success' ? (
            <>
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)] absolute -top-24">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">Success!</h2>
              <p className="text-slate-300 text-sm">Your attendance has been marked.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20 absolute -top-24">
                <AlertCircle size={32} className="text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-rose-400 mb-2">Verification Failed</h2>
              <p className="text-rose-300/80 text-sm mb-6">{error}</p>
              <button onClick={() => navigate('/student/dashboard')} className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-4 rounded-xl transition-all border border-white/10">
                Return to Dashboard
              </button>
            </>
          )}
          
        </div>
      </motion.div>
    </div>
  );
}
