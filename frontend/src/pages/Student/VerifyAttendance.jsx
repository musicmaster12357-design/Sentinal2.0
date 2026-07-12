import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function VerifyAttendance() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');
  const hasFired = useRef(false);

  useEffect(() => {
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', location.pathname);
      navigate('/student/login');
      return;
    }

    if (hasFired.current) return;
    hasFired.current = true;

    const verifyToken = async () => {
      try {
        // Decode base64 URL safe token
        const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
        const jsonString = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const qrData = JSON.parse(jsonString);
        
        if (!qrData.signature || !qrData.session_id) {
          throw new Error("Invalid QR Code Format");
        }

        const res = await api.post('/attendance/scan', qrData);
        
        setStatus('success');
        
        // Redirect to feedback form after a brief delay
        setTimeout(() => {
          navigate(`/student/feedback/${res.data.session_id}`, { state: { session: res.data } });
        }, 1500);

      } catch (err) {
        setStatus('error');
        setError(err.response?.data?.detail || err.message || "Invalid or Expired QR Code");
      }
    };

    verifyToken();
  }, [token, user, navigate, location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f172a]">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-sm mx-4">
        <div className="glass-panel p-8 text-center flex flex-col items-center">
          
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
                <Loader2 size={32} className="text-blue-400 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Verifying Attendance</h2>
              <p className="text-slate-400 text-sm">Please wait while we confirm your scan...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">Success!</h2>
              <p className="text-slate-300 text-sm">Your attendance has been marked.</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
                <AlertCircle size={32} className="text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-rose-400 mb-2">Verification Failed</h2>
              <p className="text-rose-300/80 text-sm mb-6">{error}</p>
              <button onClick={() => navigate('/student/dashboard')} className="btn-secondary w-full">
                Return to Dashboard
              </button>
            </>
          )}

        </div>
      </motion.div>
    </div>
  );
}
