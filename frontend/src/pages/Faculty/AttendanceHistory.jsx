import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Loader2, Download, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { DashboardLayout } from '../../components/layout/DashboardLayout';

export default function AttendanceHistory() {
  const [sessions, setSessions] = useState([]);
  const [uniqueDates, setUniqueDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  
  const [matrixData, setMatrixData] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get('/attendance/faculty/sessions');
        setSessions(res.data);
        
        // Extract unique dates
        const dates = new Set();
        res.data.forEach(s => {
          if (s.start_time) {
            dates.add(s.start_time.split('T')[0]);
          }
        });
        
        const sortedDates = Array.from(dates).sort((a, b) => new Date(b) - new Date(a));
        setUniqueDates(sortedDates);
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      } finally {
        setLoadingSessions(false);
      }
    };
    fetchSessions();
  }, []);

  const handleSelectDate = async (dateStr) => {
    setSelectedDate(dateStr);
    setLoadingMatrix(true);
    setMatrixData(null);
    try {
      const res = await api.get(`/attendance/faculty/matrix?date=${dateStr}`);
      setMatrixData(res.data);
    } catch (err) {
      console.error("Failed to fetch matrix", err);
    } finally {
      setLoadingMatrix(false);
    }
  };

  const [exportOption, setExportOption] = useState('all');

  const handleDownloadExcel = async () => {
    if (!selectedDate) return;
    setDownloading(true);
    try {
      const res = await api.get(`/attendance/faculty/export/excel?date=${selectedDate}&group_by=${exportOption}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Attendance_${selectedDate}_${exportOption}.xlsx`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.remove();
      }, 200);
    } catch (err) {
      console.error("Failed to download excel", err);
      alert("Failed to download excel sheet.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadConsolidatedExcel = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/attendance/faculty/export/consolidated/excel?group_by=${exportOption}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Consolidated_Daily_Attendance_${exportOption}.xlsx`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.remove();
      }, 200);
    } catch (err) {
      console.error("Failed to download consolidated excel", err);
      alert("Failed to download consolidated excel sheet.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to delete this session and all its attendance records? This cannot be undone.")) return;
    try {
      await api.delete(`/session/${sessionId}`);
      // Refresh the matrix
      handleSelectDate(selectedDate);
    } catch (err) {
      console.error("Failed to delete session", err);
      alert("Failed to delete session");
    }
  };

  const handleDeleteDate = async (dateStr) => {
    if (!window.confirm(`Are you sure you want to delete ALL sessions for ${dateStr}? This cannot be undone.`)) return;
    try {
      // Find all sessions for this date from the local state
      const res = await api.get(`/attendance/faculty/matrix?date=${dateStr}`);
      const sessionsToDelete = res.data.sessions || [];
      for (const s of sessionsToDelete) {
        await api.delete(`/session/${s.id}`);
      }
      setSelectedDate(null);
      setMatrixData(null);
      // Refresh dates list
      const updatedDates = uniqueDates.filter(d => d !== dateStr);
      setUniqueDates(updatedDates);
    } catch (err) {
      console.error("Failed to delete date", err);
      alert("Failed to delete all sessions for this date");
    }
  };

  return (
    <DashboardLayout title="Attendance Matrix" role="faculty">
      <div className="flex flex-col lg:flex-row gap-6 relative z-10 max-w-7xl mx-auto h-[calc(100vh-120px)]">
        
        {/* Left Pane: Dates List */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-1/4 glass-panel flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-slate-700/50 bg-slate-900/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="text-purple-400" /> Day-by-Day
            </h2>
            <p className="text-slate-400 text-sm mt-1 mb-4">Select a date to view matrix</p>
            
            <button
               onClick={handleDownloadConsolidatedExcel}
               disabled={downloading}
               className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50"
               title="Download an Excel sheet with all recorded days as columns"
            >
               {downloading ? <Loader2 className="animate-spin" size={16}/> : <Download size={16} />}
               Export Full Daily Attendance
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {loadingSessions ? (
              <div className="flex justify-center items-center h-32 text-slate-400">
                <Loader2 className="animate-spin mr-2" size={20} /> Loading...
              </div>
            ) : uniqueDates.length === 0 ? (
              <div className="text-center p-6 text-slate-500 text-sm">
                No past sessions found.
              </div>
            ) : (
              uniqueDates.map(date => (
                <div 
                  key={date} 
                  onClick={() => handleSelectDate(date)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all flex justify-between items-center ${selectedDate === date ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-900/20 text-purple-300' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/60 text-slate-300'}`}
                >
                  <h3 className="font-semibold text-slate-200">{new Date(date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteDate(date); }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                    title="Delete all sessions on this date"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Right Pane: Matrix */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-3/4 glass-panel flex flex-col h-full overflow-hidden">
          {!selectedDate ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <Users size={64} className="opacity-20 mb-4" />
              <p className="text-xl font-medium text-slate-400">Select a Date</p>
              <p>Choose a date from the left to view the attendance matrix</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-slate-700/50 bg-slate-900/50 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {matrixData?.sessions?.length || 0} session(s) on this date
                  </p>
                </div>
                {matrixData?.sessions?.length > 0 && (
                  <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
                    <select 
                      value={exportOption} 
                      onChange={e => setExportOption(e.target.value)}
                      className="bg-transparent text-slate-300 text-sm font-medium focus:outline-none pl-2 pr-1 cursor-pointer"
                    >
                      <option value="all">All Together</option>
                      <option value="course">Course & Specialisation-wise</option>
                    </select>
                    <button 
                      onClick={handleDownloadExcel} 
                      disabled={downloading}
                      className="btn-primary flex items-center gap-2 text-sm py-2 px-4 whitespace-nowrap"
                    >
                      {downloading ? <Loader2 className="animate-spin" size={16}/> : <Download size={16} />}
                      Export
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loadingMatrix ? (
                  <div className="flex justify-center items-center h-32 text-slate-400">
                    <Loader2 className="animate-spin mr-2" size={20} /> Fetching matrix...
                  </div>
                ) : !matrixData || matrixData.sessions.length === 0 ? (
                  <div className="text-center p-12 text-slate-500">
                    No matrix data available.
                  </div>
                ) : (
                  <div className="space-y-10">
                    {Object.entries(matrixData.grouped_students).map(([groupName, students]) => (
                      <div key={groupName} className="bg-slate-800/40 rounded-xl overflow-hidden border border-slate-700/50">
                        <div className="bg-slate-800 p-4 border-b border-slate-700/50">
                          <h3 className="text-lg font-bold text-slate-200">{groupName}</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-800/50 text-slate-400 font-medium border-b border-slate-700/50">
                              <tr className="bg-slate-800/80">
                                <th colSpan="5" className="border border-slate-700/50"></th>
                                <th 
                                  colSpan={matrixData.sessions.length} 
                                  className="p-3 text-center border border-slate-700/50 bg-blue-600/20 text-blue-400 font-bold"
                                >
                                  Day {matrixData.day_number || "?"}
                                </th>
                              </tr>
                              <tr>
                                <th className="px-6 py-4">#</th>
                                <th className="px-6 py-4">Campus ID</th>
                                <th className="px-6 py-4 whitespace-nowrap">Name</th>
                                <th className="px-6 py-4 whitespace-nowrap">Email</th>
                                <th className="px-6 py-4 whitespace-nowrap">Phone Number</th>
                                {matrixData.sessions.map((s, idx) => (
                                  <th key={s.id} className="px-6 py-4 text-center whitespace-nowrap group">
                                    <div className="flex items-center justify-center gap-2">
                                      <span>Session {idx + 1}</span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={async () => {
                                            try {
                                              const res = await api.get(`/attendance/faculty/export/feedback/excel/${s.id}`, {
                                                responseType: 'blob',
                                              });
                                              const url = window.URL.createObjectURL(new Blob([res.data]));
                                              const link = document.createElement('a');
                                              link.href = url;
                                              const timeStr = s.time_slot ? s.time_slot.replace(/:/g, '-') : s.id;
                                              link.download = `Feedback_Session_${timeStr}.xlsx`;
                                              document.body.appendChild(link);
                                              link.click();
                                              setTimeout(() => {
                                                window.URL.revokeObjectURL(url);
                                                link.remove();
                                              }, 200);
                                            } catch (err) {
                                              console.error("Failed to download feedback", err);
                                              alert("Failed to download feedback excel.");
                                            }
                                          }}
                                          className="p-1 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                                          title="Download Session Feedback"
                                        >
                                          <Download size={14} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSession(s.id)}
                                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                                          title="Delete Session"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="text-xs font-normal text-slate-500">{s.start_time}</div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                              {students.map((student, idx) => (
                                <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="px-6 py-3 font-mono text-slate-500">{idx + 1}</td>
                                  <td className="px-6 py-3 font-mono text-blue-400">{student.campus_id}</td>
                                  <td className="px-6 py-3 font-medium text-slate-200">{student.name}</td>
                                  <td className="px-6 py-3 text-slate-400">{student.email}</td>
                                  <td className="px-6 py-3 text-slate-400">{student.phone || '-'}</td>
                                  {matrixData.sessions.map(s => {
                                    const present = student.attendance[s.id];
                                    return (
                                      <td key={s.id} className="px-6 py-3 text-center">
                                        {present ? (
                                          <div className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full text-sm font-bold border border-emerald-500/20">
                                            ✅ 
                                          </div>
                                        ) : (
                                          <div className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 px-2 py-1 rounded-full text-sm font-bold border border-rose-500/20">
                                            ❌ 
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
    </DashboardLayout>
  );
}
