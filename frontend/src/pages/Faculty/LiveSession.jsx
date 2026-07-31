import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, StopCircle, CheckCircle2, AlertCircle, Clock, Timer, X } from 'lucide-react';
import api from '../../services/api';

// Timing component
function SessionTimings({ startTime, endTime }) {
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const utcStr = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formattedStart = formatTime(startTime);
  const formattedEnd = formatTime(endTime);

  return (
    <div className="flex flex-col items-center gap-1 mt-4 px-5 py-3 rounded-xl font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
      <div className="flex items-center gap-2 text-lg font-bold">
        <Timer size={20} />
        <span>Active Session</span>
      </div>
      <div className="text-sm font-medium opacity-80 flex items-center gap-1">
        <Clock size={14} /> Allotted: {formattedStart} - {formattedEnd}
      </div>
    </div>
  );
}

export default function LiveSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qrToken, setQrToken] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [manualCampusId, setManualCampusId] = useState('');
  const wsRef = useRef(null);

  // Build the QR string from the static token
  const qrString = qrToken
    ? `${window.location.origin}/student/verify-attendance/${qrToken}`
    : null;

  // Dynamically load QRCodeSVG to keep initial render fast
  const [QRCodeSVG, setQRCodeSVG] = useState(null);
  useEffect(() => {
    import('qrcode.react').then(m => setQRCodeSVG(() => m.QRCodeSVG));
  }, []);

  const pollState = useCallback(async () => {
    try {
      const response = await api.get(`/attendance/session/${id}/state`);
      if (response.data.qr_token) setQrToken(response.data.qr_token);
      if (response.data.start_time) setStartTime(response.data.start_time);
      if (response.data.end_time) setEndTime(response.data.end_time);
      if (response.data.attendees) setAttendees(response.data.attendees);

      const infoRes = await api.get(`/session/${id}/info`);
      setSessionInfo(infoRes.data);
    } catch (err) {
      console.error("Polling failed", err);
      if (err.response && err.response.status === 404) {
        navigate('/faculty/dashboard');
      }
    }
  }, [id, navigate]);

  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let pollInterval = null;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/attendance/${id}`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'attendance_update') {
          if (msg.data.status === 'removed') {
            setAttendees(prev => prev.filter(a => a.student_id !== msg.data.student_id));
          } else {
            setAttendees(prev => {
              if (prev.find(a => a.student_id === msg.data.student_id)) return prev;
              return [msg.data, ...prev];
            });
          }
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 2000);
      };
    };

    connect();
    pollInterval = setInterval(pollState, 5000);
    pollState(); // initial load

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [id, pollState]);

  const endSession = async () => {
    try {
      await api.post(`/session/${id}/close`);
      navigate('/faculty/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      alert(`Failed to end session: ${msg}`);
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative overflow-hidden bg-[#0f172a]">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* ── QR Panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="badge badge-active mb-4 inline-block">Active Session: {sessionInfo?.subject_id}</div>
          {sessionInfo?.title && (
             <h2 className="text-4xl font-bold text-white mb-2">{sessionInfo.title}</h2>
          )}
          {!sessionInfo?.title && (
             <h2 className="text-4xl font-bold text-white mb-2">Scan to join</h2>
          )}
          {sessionInfo?.speaker && (
             <p className="text-blue-400 text-lg font-medium mb-2">Speaker: {sessionInfo.speaker}</p>
          )}
          <p className="text-slate-400 text-sm">QR is valid for the entire session duration.</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <div className="glass-panel p-6 sm:p-10 bg-white/5 backdrop-blur-xl border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.15)] rounded-2xl relative z-10 flex flex-col items-center gap-4">
            {qrString && QRCodeSVG ? (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-lg">
                  <QRCodeSVG 
                    value={qrString}
                    size={260}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="L"
                  />
                </div>
                <div className="flex flex-col items-center gap-2 w-full max-w-[260px]">
                  <span className="text-xs text-slate-400 font-medium">Or join via link:</span>
                  <div className="flex items-center w-full bg-black/40 rounded-lg border border-white/10 overflow-hidden">
                    <input 
                      type="text" 
                      readOnly 
                      value={qrString} 
                      className="bg-transparent text-xs text-slate-300 w-full px-3 py-2 outline-none"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(qrString);
                        alert("Link copied to clipboard!");
                      }}
                      className="p-2 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Copy link"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-[300px] h-[300px] flex items-center justify-center border-2 border-dashed border-slate-600 rounded-xl bg-slate-800/30">
                <span className="text-slate-400">Loading QR...</span>
              </div>
            )}
            
            <SessionTimings startTime={startTime} endTime={endTime} />

            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <CheckCircle2 size={16} /> Secure session active
            </div>
            
            {/* Manual Check-in */}
            <div className="mt-4 w-full border-t border-slate-700 pt-4 flex flex-col gap-2">
              <span className="text-xs text-slate-400 font-medium text-center">Manual Check-in</span>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!manualCampusId.trim()) return;
                  try {
                    await api.post(`/attendance/session/${id}/manual`, { campus_id: manualCampusId.trim().toUpperCase() });
                    setManualCampusId('');
                    // No need to alert, websocket handles updates!
                  } catch (err) {
                    alert(err.response?.data?.detail || "Failed to mark attendance manually");
                  }
                }}
                className="flex items-center w-full gap-2"
              >
                <input 
                  type="text" 
                  placeholder="Enter Campus ID" 
                  value={manualCampusId}
                  onChange={(e) => setManualCampusId(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg text-sm text-white px-3 py-2 flex-1 outline-none focus:border-blue-500/50"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                  Add
                </button>
              </form>
            </div>
          </div>
        </motion.div>

        <button
          onClick={endSession}
          className="mt-10 py-3 px-8 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-semibold transition-all flex items-center gap-2"
        >
          <StopCircle size={20} /> End Session
        </button>
      </div>

      {/* ── Live Attendees Sidebar ── */}
      <div className="w-full md:w-96 glass-panel rounded-none border-y-0 border-r-0 border-l border-white/10 flex flex-col h-screen relative z-10 bg-[#0f172a]/80">
        <div className="p-6 border-b border-white/5 bg-black/20">
          <h3 className="text-xl font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-purple-400" />
              <span>Live Attendees</span>
            </div>
            <span className="bg-blue-500/20 text-blue-400 py-1 px-3 rounded-full text-sm">
              {attendees.length}
            </span>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          <AnimatePresence>
            {attendees.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center text-slate-500 mt-10 flex flex-col items-center gap-3"
              >
                <AlertCircle size={32} className="opacity-50" />
                <p>Waiting for students to scan...</p>
              </motion.div>
            ) : (
              attendees.map((a, i) => (
                <motion.div
                  key={`${a.campus_id}-${i}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/5 border border-white/10 p-4 rounded-xl shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-200">{a.name || a.email}</h4>
                      <p className="text-xs text-slate-400">
                        {a.campus_id} {a.course ? `• ${a.course}` : ''}
                      </p>
                      {a.specialisation && (
                        <p className="text-xs text-blue-400/70 mt-0.5">{a.specialisation}</p>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-xs bg-black/30 px-2 py-1 rounded text-slate-300 block">
                        {a.time ? new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-emerald-400">✅ Present</span>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`Are you sure you want to remove ${a.name || a.campus_id} from this session?`)) return;
                            try {
                              await api.delete(`/attendance/session/${id}/student/${a.student_id}`);
                              // Frontend update handled by websocket
                            } catch (err) {
                              alert(err.response?.data?.detail || "Failed to remove student");
                            }
                          }}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 p-1 rounded transition-colors"
                          title="Remove student"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
