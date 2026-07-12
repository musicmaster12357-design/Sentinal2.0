import React, { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ScanLine, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../services/api';

export default function QRScanner() {
  const [scanResult, setScanResult] = useState(null); // null | 'processing' | 'success' | 'error'
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let html5Qrcode = null;
    let stopped = false;

    const startScanner = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API is blocked. Please ensure you are using a secure connection (HTTPS with a valid certificate) and that your browser supports camera access.");
        }
        html5Qrcode = new Html5Qrcode('reader');
      } catch (err) {
        console.error("Initialization error:", err);
        setError(err.message || 'Failed to initialize camera.');
        return;
      }

      try {
        await html5Qrcode.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 250, height: 250 } },
          handleSuccess,
          () => {} // ignore frame-level errors
        );
        if (stopped) {
          try { await html5Qrcode.stop(); } catch (e) {}
          return;
        }
      } catch (err1) {
        // If back camera fails, try front camera
        try {
          await html5Qrcode.start(
            { facingMode: 'user' },
            { fps: 15, qrbox: { width: 250, height: 250 } },
            handleSuccess,
            () => {}
          );
          if (stopped) {
            try { await html5Qrcode.stop(); } catch (e) {}
            return;
          }
        } catch (err2) {
          if (!stopped) {
            const msg = err1.name === 'NotAllowedError' ? 'Permission blocked by browser. Please go to Site Settings and allow Camera.' : err1.message;
            setError(`Camera blocked: ${msg}`);
          }
        }
      }
    };

    const handleSuccess = async (result) => {
      if (stopped) return;
      stopped = true;

      try {
        await html5Qrcode.stop();
      } catch {}

      setScanResult('processing');

      try {
        let qrData;
        if (result.includes('/student/verify-attendance/')) {
          const token = result.split('/student/verify-attendance/')[1];
          const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
          );
          qrData = JSON.parse(jsonPayload);
        } else {
          qrData = JSON.parse(result);
        }

        if (!qrData.signature || !qrData.session_id) throw new Error('Invalid format');

        const res = await api.post('/attendance/scan', qrData);
        setScanResult('success');
        setTimeout(() => {
          navigate(`/student/feedback/${res.data.session_id}`, { state: { session: res.data } });
        }, 1200);
      } catch (err) {
        setError(err.response?.data?.detail || 'Invalid or Expired QR Code');
        setScanResult('error');
      }
    };

    startScanner();

    return () => {
      stopped = true;
      if (html5Qrcode) {
        try {
          if (html5Qrcode.isScanning) {
            html5Qrcode.stop().catch(() => {});
          } else {
            html5Qrcode.stop().catch(() => {});
          }
        } catch (err) {}
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-panel p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => navigate('/student/dashboard')} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-full">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ScanLine className="text-blue-400" /> Scan QR
            </h1>
            <div className="w-9" />
          </div>

          {error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex flex-col items-center gap-3"
            >
              <AlertCircle size={36} className="text-rose-400" />
              <p className="text-rose-400 font-semibold">Verification Failed</p>
              <p className="text-sm text-slate-300">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-3 px-5 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 rounded-xl text-sm font-medium transition-colors"
              >
                Scan Again
              </button>
            </motion.div>
          ) : scanResult === 'processing' ? (
            <div className="text-center p-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-blue-400 font-semibold">Verifying...</p>
              <p className="text-sm text-slate-300">Marking your attendance</p>
            </div>
          ) : scanResult === 'success' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col items-center gap-3"
            >
              <CheckCircle2 size={36} className="text-emerald-400" />
              <p className="text-emerald-400 font-semibold">Attendance Marked!</p>
              <p className="text-sm text-slate-300">Redirecting to dashboard...</p>
            </motion.div>
          ) : (
            <div className="relative">
              <div className="w-full bg-black/60 rounded-2xl overflow-hidden border border-white/10 relative z-10">
                <div id="reader" className="w-full [&_video]:rounded-xl [&_img]:hidden [&_select]:hidden [&_button]:hidden [&_p]:hidden [&_br]:hidden" />
              </div>
              <p className="text-center text-slate-400 text-sm mt-4 flex items-center justify-center gap-1.5">
                <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Point camera at the QR code
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
