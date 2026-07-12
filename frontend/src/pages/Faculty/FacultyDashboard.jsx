import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, BookOpen, LogOut, Play, BarChart } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

import FacultyLayout from './FacultyLayout';

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  
  const [sessionForm, setSessionForm] = useState({
    subject_id: '',
    semester: 'I',
    rotation_interval: 600,
    lecture_hall: ''
  });
  const [duration, setDuration] = useState('30');
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('I');

  useEffect(() => {
    // Fetch stats
    api.get('/analytics/dashboard').then(res => setStats(res.data)).catch(console.error);
  }, []);

  const handleStartSession = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/session/start', {
        subject, semester, duration: parseInt(duration)
      });
      navigate(`/faculty/session/${res.data.id}`);
    } catch (err) {
      alert("Failed to start session");
    }
  };

  return (
    <FacultyLayout title="Dashboard">
      <div className="space-y-8 relative z-10">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Sessions</p>
              <h3 className="text-2xl font-bold">{stats?.total_sessions || 0}</h3>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Users size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Attendance</p>
              <h3 className="text-2xl font-bold">{stats?.total_attendance || 0}</h3>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 flex items-center gap-4 border-emerald-500/20">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 relative">
              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
              <BarChart size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">System Status</p>
              <h3 className="text-xl font-bold text-emerald-400">Online</h3>
            </div>
          </motion.div>
        </div>

        {stats?.active_session ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-8 bg-blue-900/10 border-blue-500/30">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
              <div>
                <div className="badge badge-active mb-3 inline-block">Live Session</div>
                <h2 className="text-2xl font-bold text-white">Session in Progress</h2>
                <p className="text-blue-200 mt-1">You have an active lecture running right now.</p>
              </div>
              <button 
                onClick={() => navigate(`/faculty/session/${stats.active_session}`)}
                className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Play size={18} fill="currentColor" /> Resume Session
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel p-8 max-w-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Plus size={24} className="text-purple-400" /> Start New Session
              </h2>
              <p className="text-slate-400 text-sm mt-1">Initialize a dynamic QR attendance session.</p>
            </div>
            
            <form onSubmit={handleStartSession} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Subject / Topic</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="input-field" placeholder="e.g. Advanced Cryptography" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Semester</label>
                  <select value={semester} onChange={e => setSemester(e.target.value)} className="input-field" required>
                    <option value="" disabled>Select</option>
                    {['I'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Duration (Min)</label>
                  <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="input-field" placeholder="30" required min="1" />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                Generate Live QR Session <Play size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </FacultyLayout>
  );
}