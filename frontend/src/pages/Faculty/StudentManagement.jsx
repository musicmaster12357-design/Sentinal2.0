import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Edit2, Trash2, Key, CheckCircle, XCircle, X, Save } from 'lucide-react';
import api from '../../services/api';
import { DashboardLayout } from '../../components/layout/DashboardLayout';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  
  // Edit modal state
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', campus_id: '', email: '', specialisation: '', password: '' });
  
  // Add modal state
  const [addingStudent, setAddingStudent] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', campus_id: '', email: '', specialisation: '', password: '' });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this student?')) return;
    try {
      await api.delete(`/students/${id}`);
      setStudents(students.filter(s => s.id !== id));
      selectedStudents.delete(id);
      setSelectedStudents(new Set(selectedStudents));
      setMessage('Student deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert('Error deleting student');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedStudents.size} selected students?`)) return;
    try {
      for (const id of selectedStudents) {
        await api.delete(`/students/${id}`);
      }
      setStudents(students.filter(s => !selectedStudents.has(s.id)));
      setSelectedStudents(new Set());
      setMessage('Selected students deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert('Error during bulk deletion');
    }
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === filtered.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filtered.map(s => s.id)));
    }
  };

  const toggleSelectStudent = (id) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStudents(newSelected);
  };

  const handleResetPassword = async (id) => {
    if (!window.confirm('Reset this student password to "password123"?')) return;
    try {
      await api.post(`/students/${id}/reset-password`);
      setMessage('Password reset to password123 successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert('Error resetting password');
    }
  };

  const openEditModal = (student) => {
    setEditingStudent(student.id);
    setEditForm({
      name: student.name || '',
      campus_id: student.campus_id || '',
      email: student.email || '',
      specialisation: student.specialisation || '',
      password: ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/students/${editingStudent}`, editForm);
      setStudents(students.map(s => s.id === editingStudent ? { ...s, ...editForm } : s));
      setEditingStudent(null);
      setMessage('Student updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert('Error updating student');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/students', addForm);
      setStudents([...students, res.data.student]);
      setAddingStudent(false);
      setAddForm({ name: '', campus_id: '', email: '', specialisation: '', password: '' });
      setMessage('Student added successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error adding student');
    }
  };

  const filtered = students.filter(s => 
    String(s.name || '').trim().toLowerCase().includes(search.trim().toLowerCase()) || 
    String(s.campus_id || '').trim().toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <DashboardLayout title="Student Registry" role="faculty">
      <div className="p-8 h-full overflow-y-auto custom-scrollbar relative">
        <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Student Management</h1>
          <p className="text-slate-400">View, modify, or reset passwords for all students.</p>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} />
          {message}
        </div>
      )}

      <div className="bg-[#1e293b] border border-slate-700/50 rounded-2xl shadow-xl relative z-10">
        <div className="p-4 border-b border-slate-700/50 flex gap-4 sticky top-0 bg-[#1e293b] z-20 rounded-t-2xl">
          <div className="relative flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Search by Name or Campus ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {filtered.length} / {students.length} found
            </span>
          </div>
          <button
            onClick={() => setAddingStudent(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-medium whitespace-nowrap shadow-lg shadow-blue-500/20"
          >
            <Users size={18} />
            Add Student
          </button>
          {selectedStudents.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-medium"
            >
              <Trash2 size={18} />
              Delete Selected ({selectedStudents.size})
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-b-2xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-800 text-slate-400 border-b border-slate-700/50">
              <tr>
                <th className="px-6 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                    checked={filtered.length > 0 && selectedStudents.size === filtered.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 font-semibold">Campus ID</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Specialisation</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">No students found.</td></tr>
              ) : filtered.map(student => (
                <tr key={student.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="checkbox"
                      className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                      checked={selectedStudents.has(student.id)}
                      onChange={() => toggleSelectStudent(student.id)}
                    />
                  </td>
                  <td className="px-6 py-4 font-mono">{student.campus_id}</td>
                  <td className="px-6 py-4 font-medium text-white">{student.name}</td>
                  <td className="px-6 py-4 text-xs">{student.specialisation}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(student)} title="Edit Student" className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleResetPassword(student.id)} title="Reset Password" className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                        <Key size={18} />
                      </button>
                      <button onClick={() => handleDelete(student.id)} title="Delete Student" className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Edit Student Details</h3>
                <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Campus ID</label>
                  <input 
                    type="text" 
                    value={editForm.campus_id}
                    onChange={e => setEditForm({...editForm, campus_id: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={editForm.email}
                    onChange={e => setEditForm({...editForm, email: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Specialisation</label>
                  <input 
                    type="text" 
                    value={editForm.specialisation}
                    onChange={e => setEditForm({...editForm, specialisation: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">New Password <span className="text-xs text-slate-500 font-normal">(Leave blank to keep current)</span></label>
                  <input 
                    type="password" 
                    value={editForm.password}
                    onChange={e => setEditForm({...editForm, password: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2">
                    <Save size={18} /> Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {addingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Add New Student</h3>
                <button onClick={() => setAddingStudent(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={addForm.name}
                    onChange={e => setAddForm({...addForm, name: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Campus ID</label>
                  <input 
                    type="text" 
                    value={addForm.campus_id}
                    onChange={e => setAddForm({...addForm, campus_id: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={addForm.email}
                    onChange={e => setAddForm({...addForm, email: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Specialisation</label>
                  <input 
                    type="text" 
                    value={addForm.specialisation}
                    onChange={e => setAddForm({...addForm, specialisation: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Password <span className="text-xs text-slate-500 font-normal">(Defaults to 'password123')</span></label>
                  <input 
                    type="password" 
                    value={addForm.password}
                    onChange={e => setAddForm({...addForm, password: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="password123"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button type="button" onClick={() => setAddingStudent(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2">
                    <Save size={18} /> Add Student
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
