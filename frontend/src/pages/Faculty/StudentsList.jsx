import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, AlertCircle, User, Loader2, X } from 'lucide-react';
import api from '../../services/api';
import FacultyLayout from './FacultyLayout';

export default function StudentsList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get('/attendance/students');
        setStudents(res.data);
      } catch (err) {
        console.error("Failed to fetch students", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(s => {
    return s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
           s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.specialisation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.campus_id?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <FacultyLayout title="Registered Students">
      <div className="space-y-6 relative z-10 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="text-blue-400" /> Student Directory
            </h2>
            <p className="text-slate-400 text-sm mt-1">View all registered students in the system.</p>
          </div>
          
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-500" />
            </div>
              <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field pl-10 w-full" 
              placeholder="Search by name, email, department..." 
            />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center items-center text-slate-400 gap-3">
              <Loader2 className="animate-spin" size={24} /> Loading students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-4">
              <AlertCircle size={48} className="opacity-30" />
              <p className="text-lg font-medium">No students found.</p>
              <p className="text-sm">Try adjusting your search or wait for registrations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-slate-400 uppercase font-medium">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-xl">Campus ID</th>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Specialisation</th>
                    <th className="px-6 py-4">Semester</th>
                    <th className="px-6 py-4 rounded-tr-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  <AnimatePresence>
                    {filteredStudents.map((student, i) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        key={student.id} 
                        onClick={() => setSelectedStudent(student)}
                        className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 font-mono font-medium text-blue-400">
                          {student.campus_id || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                              <User size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-200">{student.name}</p>
                              <p className="text-xs text-slate-500">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-300">{student.department || '-'}</td>
                        <td className="px-6 py-4 font-medium text-slate-300">{student.course || '-'}</td>
                        <td className="px-6 py-4 font-medium text-slate-300">{student.specialisation || '-'}</td>
                        <td className="px-6 py-4 font-medium text-slate-300">{student.semester || '-'}</td>
                        <td className="px-6 py-4">
                          <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-500/20">
                            {student.status || 'Active'}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Student Details Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setSelectedStudent(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#1e293b] border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-700/50 bg-slate-800/30">
                <h2 className="text-xl font-bold text-white">Student Details</h2>
                <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedStudent.name}</h3>
                    <p className="text-slate-400">{selectedStudent.email}</p>
                  </div>
                </div>

                <div className="bg-[#0f172a] rounded-xl border border-slate-700/50 p-5 mb-6">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Academic Profile</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Course</p>
                      <p className="text-sm font-semibold text-slate-200">{selectedStudent.course || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Specialisation</p>
                      <p className="text-sm font-semibold text-slate-200">{selectedStudent.specialisation || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Department</p>
                      <p className="text-sm font-semibold text-slate-200">{selectedStudent.department || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Semester</p>
                      <p className="text-sm font-semibold text-slate-200">{selectedStudent.semester || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Campus ID</p>
                      <p className="text-sm font-semibold text-slate-200">{selectedStudent.campus_id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Phone Number</p>
                      <p className="text-sm font-semibold text-slate-200">{selectedStudent.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FacultyLayout>
  );
}
