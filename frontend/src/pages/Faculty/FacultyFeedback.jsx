import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Star, User, Calendar, Loader2, AlertCircle, X, Mail, Phone, BookOpen, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import FacultyLayout from './FacultyLayout';

export default function FacultyFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await api.get('/attendance/faculty/feedbacks');
        setFeedbacks(res.data);
      } catch (err) {
        console.error("Failed to fetch feedbacks", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, []);

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < rating ? "fill-amber-400 text-amber-400" : "fill-slate-700 text-slate-700"}
          />
        ))}
      </div>
    );
  };

  return (
    <FacultyLayout title="Session Feedbacks">
      <div className="space-y-6 relative z-10 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-amber-400" /> Student Feedback
          </h2>
          <p className="text-slate-400 text-sm mt-1">Review structured feedback submitted by students across all your sessions.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {loading ? (
            <div className="p-12 flex justify-center items-center text-slate-400 gap-3 glass-panel">
              <Loader2 className="animate-spin" size={24} /> Loading feedbacks...
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-4 glass-panel">
              <AlertCircle size={48} className="opacity-30" />
              <p className="text-lg font-medium">No feedback received yet.</p>
              <p className="text-sm">Students will be prompted to leave feedback after checking in.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatePresence>
                {feedbacks.map((fb, i) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    key={i}
                    onClick={() => setSelectedFeedback(fb)}
                    className="glass-panel p-6 flex flex-col h-full bg-slate-800/30 hover:bg-slate-800/50 transition-all cursor-pointer group hover:border-slate-600"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-200">{fb.student_name}</p>
                          <p className="text-xs text-slate-500 font-mono">{fb.campus_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">Overall:</span>
                        {renderStars(fb.overall_satisfaction)}
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50 line-clamp-2 text-sm italic text-slate-300">
                        <span className="text-slate-500 text-xs font-semibold uppercase not-italic block mb-1">Key Takeaway</span>
                        "{fb.key_takeaway}"
                      </div>
                    </div>
                    
                    <div className="mt-5 pt-4 border-t border-slate-700/50 flex flex-wrap justify-between items-center text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-300">Session:</span> {fb.subject_id}
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-400 font-medium group-hover:text-blue-300 transition-colors">
                        View Full Details <ChevronRight size={14} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      {/* Student Details & Full Feedback Modal */}
      <AnimatePresence>
        {selectedFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedFeedback(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageSquare className="text-blue-400" size={20} /> Feedback Details
                </h3>
                <button 
                  onClick={() => setSelectedFeedback(null)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                {/* Student Details Section */}
                <section>
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Student Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Name / ID</p>
                        <p className="font-semibold text-slate-200">{selectedFeedback.student_name} <span className="text-slate-500 text-sm font-normal font-mono">({selectedFeedback.campus_id})</span></p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                        <Mail size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Email</p>
                        <p className="font-medium text-slate-200">{selectedFeedback.email || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                        <Phone size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Phone</p>
                        <p className="font-medium text-slate-200">{selectedFeedback.phone || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Course & Specialisation</p>
                        <p className="font-medium text-slate-200">{selectedFeedback.course || 'N/A'} - {selectedFeedback.specialisation || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Feedback Responses Section */}
                <section>
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Feedback Responses</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-xl border border-slate-800">
                      <span className="text-slate-300 font-medium text-sm">Interactive and engaging</span>
                      {renderStars(selectedFeedback.interactive_rating)}
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-xl border border-slate-800">
                      <span className="text-slate-300 font-medium text-sm">Relevant and useful</span>
                      {renderStars(selectedFeedback.relevant_rating)}
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-xl border border-slate-800">
                      <span className="text-slate-300 font-medium text-sm">Overall satisfaction</span>
                      {renderStars(selectedFeedback.overall_satisfaction)}
                    </div>
                    
                    <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 mt-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">What new thing did you learn today?</p>
                      <p className="text-slate-300 italic text-sm">"{selectedFeedback.learned_today}"</p>
                    </div>

                    <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 mt-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Key Takeaway</p>
                      <p className="text-slate-300 italic text-sm">"{selectedFeedback.key_takeaway}"</p>
                    </div>
                  </div>
                </section>
                
                <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2 pt-4 border-t border-slate-800">
                  <Calendar size={14} /> 
                  Submitted on: {selectedFeedback.submitted_time ? new Date(selectedFeedback.submitted_time).toLocaleString() : 'Unknown'}
                  <span className="mx-2">•</span>
                  Session: {selectedFeedback.subject_id}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FacultyLayout>
  );
}
