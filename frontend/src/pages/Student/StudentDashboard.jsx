import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, Clock, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ percentage: 100, todayClasses: [] }); // Stub percentage/today for now
  const location = useLocation();
  const [showSuccessBanner, setShowSuccessBanner] = useState(location.state?.attendanceSuccess || false);

  useEffect(() => {
    if (showSuccessBanner) {
      const timer = setTimeout(() => setShowSuccessBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessBanner]);
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/attendance/history');
        const records = response.data.history || [];
        setHistory(records);
        setStats(prev => ({ ...prev, percentage: response.data.percentage ?? 100 }));
        setLoading(false);
      } catch (err) {
        console.error("Failed to load history", err);
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-0 h-full overflow-y-auto custom-scrollbar">
      <main className="max-w-5xl mx-auto px-4 py-8">
        {showSuccessBanner && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle size={24} />
              </div>
              <div>
                <h3 className="text-emerald-400 font-bold">Attendance Marked!</h3>
                <p className="text-sm text-emerald-200/70">Your attendance has been recorded successfully.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Welcome Section */}
        <section className="mb-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
          >
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋</h1>
              <p className="text-slate-400">{user?.course} • Semester {user?.semester}</p>
            </div>
            
            <div className="bg-[#1e293b] border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 min-w-[200px]">
              <div className="w-14 h-14 rounded-full border-4 border-blue-500 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{stats.percentage}%</span>
              </div>
              <div>
                <p className="text-sm text-slate-400">Overall</p>
                <p className="font-semibold text-slate-200">Attendance</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Action Buttons */}
        <section className="mb-10">
          <motion.button 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate('/scanner')}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 p-6 rounded-2xl flex items-center justify-between shadow-lg shadow-blue-900/20 group transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <QrCode size={32} className="text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-white mb-1">Scan Attendance</h3>
                <p className="text-blue-100/80 text-sm">Join a live session right now</p>
              </div>
            </div>
            <ChevronRight size={24} className="text-white opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </motion.button>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Today's Classes */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock size={20} className="text-blue-400" /> Today's Schedule
            </h3>
            <div className="space-y-3">
              {stats.todayClasses.length === 0 ? (
                <div className="bg-[#1e293b] border border-slate-700/50 p-6 rounded-xl text-center text-slate-400">
                  <p>No upcoming classes today.</p>
                </div>
              ) : (
                stats.todayClasses.map((cls, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + (idx * 0.1) }}
                    key={cls.id} 
                    className="bg-[#1e293b] border border-slate-700/50 p-4 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-slate-200">{cls.subject}</h4>
                      <p className="text-sm text-slate-400">{cls.time}</p>
                    </div>
                    <div>
                      {cls.status === 'Pending' ? (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <AlertCircle size={12} /> Pending
                        </span>
                      ) : (
                        <span className="bg-slate-700/50 text-slate-400 px-3 py-1 rounded-full text-xs font-medium">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* Recent History */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-emerald-400" /> Recent History
            </h3>
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="bg-[#1e293b] border border-slate-700/50 p-6 rounded-xl text-center text-slate-400">
                  <p>No attendance records found.</p>
                </div>
              ) : (
                history.map((record, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + (idx * 0.1) }}
                    key={record.id} 
                    className="bg-[#1e293b] border border-slate-700/50 p-4 rounded-xl flex items-center justify-between flex-wrap gap-4"
                  >
                    <div>
                      <h4 className="font-semibold text-slate-200">{record.subject_id}</h4>
                      <p className="text-sm text-slate-400">
                        {new Date(record.date).toLocaleDateString()} • {record.lecture_hall || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {record.status === 'present' ? (
                        <>
                          {!record.has_feedback && (
                            <button 
                              onClick={() => navigate(`/student/feedback/${record.session_id}`)}
                              className="text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 px-3 py-1 rounded-full font-medium transition-colors"
                            >
                              Give Feedback
                            </button>
                          )}
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-medium">
                            Present
                          </span>
                        </>
                      ) : (
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-medium">
                          Absent
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
