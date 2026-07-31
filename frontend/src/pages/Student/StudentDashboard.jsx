import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Clock, CheckCircle, AlertCircle, Loader2, ChevronRight, Lock, Book, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { toast } from '../../store/toastStore';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ percentage: 100, todayClasses: [] }); 

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
        toast.error("Failed to load attendance history");
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.warning("New passwords do not match");
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const res = await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword
      });
      toast.success(res.data.message);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <DashboardLayout title="Student Portal" role="student">
      <div className="space-y-8">
        
        {/* Hero Card */}
        <Card className="bg-primary/5 border-primary/20 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[150%] bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="flex-1 z-10 min-w-0 pr-4">
             <Badge variant="primary" className="mb-4 inline-block">Welcome Back</Badge>
             <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 truncate" title={user?.name}>{user?.name}</h1>
             <p className="text-text-secondary text-sm sm:text-lg truncate">{user?.course} • Semester {user?.semester}</p>
          </div>
          
          {loading ? (
             <Skeleton variant="circular" className="w-32 h-32" />
          ) : (
            <div className="bg-surface/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center min-w-[200px] z-10 shadow-lg">
              <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                <svg className="w-full h-full transform -rotate-90 absolute inset-0 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-primary transition-all duration-1000 ease-out"
                    strokeDasharray={`${stats.percentage}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="text-xl font-bold text-white relative z-10">{stats.percentage}%</span>
              </div>
              <p className="font-semibold text-text-primary">Overall Attendance</p>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <section>
          <Button 
            onClick={() => navigate('/scanner')}
            variant="primary"
            className="w-full p-4 sm:p-8 flex items-center justify-between group text-xl overflow-hidden"
          >
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <QrCode size={24} className="text-white sm:w-7 sm:h-7" />
              </div>
              <div className="text-left text-white flex-1 min-w-0 pr-2">
                <h3 className="font-bold text-lg sm:text-xl truncate">Scan QR Code</h3>
                <p className="text-xs sm:text-sm font-normal opacity-80 truncate">Mark your attendance for the current lecture</p>
              </div>
            </div>
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ChevronRight size={20} className="text-white sm:w-6 sm:h-6" />
            </div>
          </Button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* History Section */}
          <Card className="flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock size={20} className="text-secondary" /> Recent Attendance
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="space-y-4">
                   {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-50">
                  <Book size={48} className="text-text-muted mb-4" />
                  <p className="text-text-secondary">No attendance records yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((record) => (
                    <div key={record.session_id} className="p-4 rounded-xl bg-surface/50 border border-white/5 flex justify-between items-center hover:border-white/10 transition-colors">
                      <div>
                        <h4 className="font-medium text-white">{record.subject_id || record.subject}</h4>
                        <p className="text-sm text-text-muted mt-0.5">
                          {new Date(record.date || record.session_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={record.status === 'absent' ? 'error' : 'success'}>
                        {record.status === 'absent' ? 'Absent' : 'Present'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Security Settings */}
          <Card>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Lock size={20} className="text-accent" /> Security Settings
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Current Password</label>
                <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">New Password</label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Confirm New Password</label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />
                </div>
              </div>
              <Button type="submit" variant="secondary" className="w-full mt-4" disabled={isChangingPassword}>
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
}
