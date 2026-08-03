import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, BookOpen, Play, BarChart, Calendar, Clock, Book, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { toast } from '../../store/toastStore';

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('11:00');
  const [subject, setSubject] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [semester, setSemester] = useState('I');

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        toast.error("Failed to load dashboard data");
        setLoading(false);
      });
  }, []);

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!subject) {
      toast.warning("Please enter a subject");
      return;
    }
    try {
      const res = await api.post('/session/start', {
        subject, semester, time_slot: `${startTime}-${endTime}`, session_date: sessionDate
      });
      toast.success("Session Started Successfully");
      navigate(`/faculty/session/${res.data.id}`);
    } catch (err) {
      toast.error("Failed to start session");
    }
  };

  return (
    <DashboardLayout title="Faculty Overview" role="faculty">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Good Morning, {user?.name?.split(' ')[0] || 'Dr.'}</h1>
            <p className="text-text-secondary mt-1">Here is what's happening today.</p>
          </div>
          <div className="flex gap-4 text-sm text-text-muted font-medium bg-surface/50 border border-white/5 rounded-xl px-4 py-2">
            <span className="flex items-center gap-2"><Calendar size={16} className="text-primary-light" /> {new Date().toLocaleDateString(undefined, { weekday: 'long' })}</span>
            <span className="flex items-center gap-2 border-l border-white/10 pl-4"><Clock size={16} className="text-secondary" /> {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {loading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
          ) : (
            <>
              <Card hover className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary-light">
                  <BookOpen size={24} />
                </div>
                <div>
                  <p className="text-text-muted text-sm font-medium">Total Sessions</p>
                  <h3 className="text-2xl font-bold mt-1">{stats?.total_sessions || 0}</h3>
                </div>
              </Card>
              
              <Card hover className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-text-muted text-sm font-medium">Total Attendance</p>
                  <h3 className="text-2xl font-bold mt-1">{stats?.total_attendance || 0}</h3>
                </div>
              </Card>

              <Card hover className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                  <BarChart size={24} />
                </div>
                <div>
                  <p className="text-text-muted text-sm font-medium">Feedback Rating</p>
                  <h3 className="text-2xl font-bold mt-1">{stats?.feedback_rating || "0.0"} <span className="text-sm text-text-muted font-normal">avg</span></h3>
                </div>
              </Card>
              
              <Card hover className="flex items-center gap-4 border-status-success/20">
                <div className="w-12 h-12 rounded-xl bg-status-success/20 flex items-center justify-center text-status-success relative">
                  <span className="absolute top-0 right-0 w-3 h-3 bg-status-success rounded-full animate-ping"></span>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-text-muted text-sm font-medium">System Status</p>
                  <h3 className="text-xl font-bold text-status-success mt-1">Online</h3>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Action Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Create Session Card */}
          <Card className="flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus size={22} className="text-primary-light" /> Start New Session
              </h2>
              <p className="text-text-muted text-sm mt-1">Initialize a dynamic QR attendance session.</p>
            </div>
            
            <form onSubmit={handleStartSession} className="space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Subject / Topic</label>
                  <Input 
                    icon={Book}
                    type="text" 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)} 
                    placeholder="e.g. Advanced Cryptography" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Session Date</label>
                    <Input 
                      icon={Calendar}
                      type="date" 
                      value={sessionDate} 
                      onChange={e => setSessionDate(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Start Time</label>
                      <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">End Time</label>
                      <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                    </div>
                  </div>
                </div>
              </div>
              <Button type="submit" variant="primary" className="w-full mt-6 py-3">
                Generate Live QR Session <Play size={18} />
              </Button>
            </form>
          </Card>

          {/* Active Session OR Placeholder Chart */}
          {stats?.active_session ? (
            <Card className="bg-primary/5 border-primary/30 relative overflow-hidden flex flex-col justify-center items-center text-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none animate-pulse-ring"></div>
              
              <Badge variant="primary" className="mb-6 animate-pulse">Live Session Active</Badge>
              <h2 className="text-3xl font-bold text-white mb-2">Session in Progress</h2>
              <p className="text-text-secondary mb-8 max-w-sm">You have an active lecture currently running. Students are scanning their QR codes.</p>
              
              <Button 
                onClick={() => navigate(`/faculty/session/${stats.active_session}`)}
                variant="primary"
                className="w-full sm:w-auto px-8 py-3"
              >
                <Play size={18} fill="currentColor" /> Resume Session View
              </Button>
            </Card>
          ) : (
            <Card className="flex flex-col justify-center items-center border-dashed border-white/10 bg-surface/30">
               {/* Placeholder for future Area Chart / Heatmap */}
               <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
                 <BarChart size={48} className="text-text-muted mb-4" />
                 <p className="text-text-secondary font-medium">Attendance Analytics</p>
                 <p className="text-text-muted text-sm text-center max-w-xs mt-2">Detailed weekly charts and heatmaps will appear here once more data is collected.</p>
               </div>
            </Card>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}