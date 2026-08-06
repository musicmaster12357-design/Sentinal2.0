import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Star, User, Calendar, Loader2, AlertCircle, X, Mail, Phone, BookOpen, ChevronRight, Download } from 'lucide-react';
import api from '../../services/api';
import { DashboardLayout } from '../../components/layout/DashboardLayout';

export default function FacultyFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

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

  // Group by Date
  const groupedByDate = feedbacks.reduce((acc, fb) => {
    const dateStr = fb.session_date ? new Date(fb.session_date).toISOString().split('T')[0] : 'Unknown Date';
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(fb);
    return acc;
  }, {});

  const uniqueDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
  
  useEffect(() => {
    if (uniqueDates.length > 0 && !selectedDate) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates, selectedDate]);

  const handleSelectDate = (date) => {
    setSelectedDate(date);
  };

  const selectedFeedbacks = selectedDate ? groupedByDate[selectedDate] : [];
  
  const groupedBySession = selectedFeedbacks.reduce((acc, fb) => {
    if (!acc[fb.session_id]) acc[fb.session_id] = { session_id: fb.session_id, subject_id: fb.subject_id, session_date: fb.session_date, items: [] };
    acc[fb.session_id].items.push(fb);
    return acc;
  }, {});

  return (
    <DashboardLayout title="Session Feedbacks" role="faculty">
      <div className="flex flex-col lg:flex-row gap-6 relative z-10 max-w-7xl mx-auto h-[calc(100vh-120px)]">
        
        {/* Left Pane: Dates List */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-1/4 glass-panel flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-slate-700/50 bg-slate-900/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="text-amber-400" /> Day-by-Day
            </h2>
            <p className="text-slate-400 text-sm mt-1">Select a date to view feedbacks</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center items-center h-32 text-slate-400">
                <Loader2 className="animate-spin mr-2" size={20} /> Loading...
              </div>
            ) : uniqueDates.length === 0 ? (
              <div className="text-center p-6 text-slate-500 text-sm">
                No feedbacks found.
              </div>
            ) : (
              uniqueDates.map(date => (
                <div 
                  key={date} 
                  onClick={() => handleSelectDate(date)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all flex justify-between items-center ${selectedDate === date ? 'bg-amber-600/20 border-amber-500/50 shadow-lg shadow-amber-900/20 text-amber-300' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/60 text-slate-300'}`}
                >
                  <h3 className="font-semibold text-slate-200">{date === 'Unknown Date' ? date : new Date(date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded-md">{groupedByDate[date].length}</span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Right Pane: Feedbacks */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-3/4 glass-panel flex flex-col h-full overflow-hidden">
          {!selectedDate ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <MessageSquare size={64} className="opacity-20 mb-4" />
              <p className="text-xl font-medium text-slate-400">Select a Date</p>
              <p>Choose a date from the left to view session feedbacks</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-slate-700/50 bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedDate === 'Unknown Date' ? selectedDate : new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {Object.keys(groupedBySession).length} session(s) on this date
                  </p>
                </div>
                
                {selectedDate !== 'Unknown Date' && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.get(`/attendance/faculty/export/feedback/excel/date/${selectedDate}`, { responseType: 'blob' });
                        const url = window.URL.createObjectURL(new Blob([res.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `Feedbacks_${selectedDate}.xlsx`;
                        document.body.appendChild(link);
                        link.click();
                        setTimeout(() => {
                          window.URL.revokeObjectURL(url);
                          link.remove();
                        }, 200);
                      } catch (err) {
                        alert("Failed to download feedback excel.");
                      }
                    }}
                    className="btn-primary flex items-center justify-center gap-2 text-sm py-2 px-4 shadow-lg shadow-amber-600/20"
                  >
                    <Download size={16} />
                    Download All Feedbacks (Excel)
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {Object.keys(groupedBySession).length === 0 ? (
                  <div className="text-center p-12 text-slate-500">
                    No feedbacks available for this date.
                  </div>
                ) : (
                  <div className="space-y-10">
                    {Object.values(groupedBySession).map((group, groupIdx) => (
                      <div key={group.session_id} className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-700/50">
                          <div>
                            <h3 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                              {group.subject_id}
                            </h3>
                            <p className="text-slate-400 text-sm">
                              {group.session_date ? new Date(group.session_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time'} • {group.items.length} Feedback{group.items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          <AnimatePresence>
                            {group.items.map((fb, i) => (
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
                                      <p className="font-bold text-slate-200 truncate max-w-[150px]" title={fb.student_name}>{fb.student_name}</p>
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
                                
                                <div className="mt-5 pt-4 border-t border-slate-700/50 flex justify-end items-center text-xs text-slate-400">
                                  <div className="flex items-center gap-1.5 text-blue-400 font-medium group-hover:text-blue-300 transition-colors">
                                    View Full Details <ChevronRight size={14} />
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
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
    </DashboardLayout>
  );
}
