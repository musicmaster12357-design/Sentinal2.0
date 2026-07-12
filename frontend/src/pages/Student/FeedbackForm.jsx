import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Star, Send, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function FeedbackForm() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const sessionInfo = location.state?.session || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  React.useEffect(() => {
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', location.pathname);
      navigate('/student/login');
    }
  }, [user, navigate, location.pathname]);
  
  const [interactiveRating, setInteractiveRating] = useState(0);
  const [relevantRating, setRelevantRating] = useState(0);
  const [learnedToday, setLearnedToday] = useState('');
  const [keyTakeaway, setKeyTakeaway] = useState('');
  const [overallSatisfaction, setOverallSatisfaction] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (interactiveRating === 0 || relevantRating === 0 || overallSatisfaction === 0) {
      setError('Please provide a rating for all questions.');
      return;
    }
    if (!learnedToday.trim() || !keyTakeaway.trim()) {
      setError('Please fill out all text fields.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/attendance/feedback', {
        session_id: parseInt(sessionId),
        interactive_rating: interactiveRating,
        relevant_rating: relevantRating,
        learned_today: learnedToday,
        key_takeaway: keyTakeaway,
        overall_satisfaction: overallSatisfaction
      });
      navigate('/student/dashboard', { state: { attendanceSuccess: true } });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit feedback");
      setLoading(false);
    }
  };

  const StarRating = ({ label, value, onChange }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">{label} <span className="text-rose-500">*</span></label>
      <div className="flex gap-2 p-3 bg-slate-900/50 rounded-xl justify-center border border-slate-800">
        {[1, 2, 3, 4, 5].map(star => (
          <button 
            key={star} 
            type="button" 
            onClick={() => onChange(star)}
            className="p-1 transition-transform hover:scale-110 active:scale-95"
          >
            <Star 
                size={28} 
                fill={value >= star ? '#eab308' : 'transparent'} 
                className={value >= star ? 'text-yellow-500' : 'text-slate-600'} 
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-y-auto py-12 custom-scrollbar">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-lg mx-4 my-8">
        <div className="glass-panel p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Attendance Marked!</h2>
            <p className="text-slate-400 text-sm">Please complete the mandatory feedback to help us improve.</p>
          </div>
          
          <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">Student</span>
                <span className="text-sm font-medium text-white">{user?.name}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Subject</span>
                <span className="text-sm font-medium text-blue-400">{sessionInfo.subject_id || 'Session'}</span>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <StarRating 
              label="The session was interactive and engaging." 
              value={interactiveRating} 
              onChange={setInteractiveRating} 
            />
            
            <StarRating 
              label="The session was relevant and useful for me." 
              value={relevantRating} 
              onChange={setRelevantRating} 
            />
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">What new thing did you learn today? <span className="text-rose-500">*</span></label>
              <textarea 
                value={learnedToday} 
                onChange={e => setLearnedToday(e.target.value)}
                className="input-field h-20 resize-none text-sm" 
                placeholder="Briefly describe what you learned..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">What was your key takeaway from this session? <span className="text-rose-500">*</span></label>
              <textarea 
                value={keyTakeaway} 
                onChange={e => setKeyTakeaway(e.target.value)}
                className="input-field h-20 resize-none text-sm" 
                placeholder="What is the most important takeaway?"
              />
            </div>
            
            <StarRating 
              label="Overall, I am satisfied with this session." 
              value={overallSatisfaction} 
              onChange={setOverallSatisfaction} 
            />

            <button 
                type="submit" 
                disabled={loading}
                className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (
                <>Submit Feedback <Send size={18} /></>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
