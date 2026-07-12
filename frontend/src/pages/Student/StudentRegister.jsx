import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, User, Lock, Loader2, Building, BookOpen, Layers, Phone } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function StudentRegister() {
  const [formData, setFormData] = useState({
    campus_id: '',
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    department: 'Computer Science',
    course: 'BCA',
    specialisation: '',
    semester: 'I',
    phone: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const { confirm_password, ...apiData } = formData;
      const res = await api.post('/auth/register/student', apiData);
      setToken(res.data.access_token);
      
      const profileRes = await api.get('/auth/profile/me');
      setUser(profileRes.data);
      
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/student/dashboard';
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectUrl);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-y-auto py-12 custom-scrollbar">
      <div className="absolute inset-0 bg-[#0f172a]" />
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-2xl relative z-10 px-4 my-8"
      >
        <div className="glass-panel p-8 sm:p-10 shadow-2xl shadow-blue-900/20">
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 transform -rotate-12"
            >
              <UserPlus size={32} className="text-white rotate-12" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-slate-400">Join the Sentinel Classroom platform</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6 text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* ROW 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Campus ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen size={18} className="text-slate-500" />
                  </div>
                  <input 
                    type="text" name="campus_id" value={formData.campus_id} onChange={handleChange}
                    className="input-field pl-10 bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50" 
                    placeholder="e.g. 51234" required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-slate-500" />
                  </div>
                  <input 
                    type="text" name="name" value={formData.name} onChange={handleChange}
                    className="input-field pl-10 bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50" 
                    placeholder="John Doe" required
                  />
                </div>
              </div>
            </div>

            {/* ROW 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-slate-500" />
                  </div>
                  <input 
                    type="email" name="email" value={formData.email} onChange={handleChange}
                    className="input-field pl-10 bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50" 
                    placeholder="student@university.edu" required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={18} className="text-slate-500" />
                  </div>
                  <input 
                    type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    className="input-field pl-10 bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50" 
                    placeholder="e.g. 9876543210" required
                  />
                </div>
              </div>
            </div>

            {/* ROW 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-slate-500" />
                  </div>
                  <input 
                    type="password" name="password" value={formData.password} onChange={handleChange}
                    className="input-field pl-10 bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50" 
                    placeholder="••••••••" required minLength="8"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-slate-500" />
                  </div>
                  <input 
                    type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange}
                    className="input-field pl-10 bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50" 
                    placeholder="••••••••" required minLength="8"
                  />
                </div>
              </div>
            </div>

            {/* ROW 4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Department</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building size={18} className="text-slate-500" />
                  </div>
                  <select 
                    name="department" value={formData.department} onChange={handleChange}
                    className="input-field pl-10 bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50" required
                  >
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Course</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen size={18} className="text-slate-500" />
                  </div>
                  <select
                    name="course" value={formData.course} onChange={handleChange}
                    className="input-field pl-10 bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50" required
                  >
                    <option value="BCA">BCA</option>
                    <option value="BSc">BSc</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ROW 5 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Specialisation</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen size={18} className="text-slate-500" />
                  </div>
                  <select 
                    name="specialisation" value={formData.specialisation} onChange={handleChange}
                    className="input-field pl-10 bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50" required
                  >
                    <option value="" disabled>Select Specialisation</option>
                    <option value="BCA Data Science, Artificial Intelligence and Machine Learning - Microsoft">BCA Data Science, Artificial Intelligence and Machine Learning - Microsoft</option>
                    <option value="BCA Artificial Intelligence, Machine Learning and Cloud Computing - Microsoft">BCA Artificial Intelligence, Machine Learning and Cloud Computing - Microsoft</option>
                    <option value="BCA Artificial Intelligence and Machine Learning with minor in Robotics - Microsoft">BCA Artificial Intelligence and Machine Learning with minor in Robotics - Microsoft</option>
                    <option value="BCA Cybersecurity and Ethical Hacking with minor in Digital Forensics - IBM">BCA Cybersecurity and Ethical Hacking with minor in Digital Forensics - IBM</option>
                    <option value="BCA Artificial Intelligence and Cloud Computing with minor in DevOps - IBM">BCA Artificial Intelligence and Cloud Computing with minor in DevOps - IBM</option>
                    <option value="BCA Data Science and Artificial Intelligence with minor in Big Data Analytics - Microsoft">BCA Data Science and Artificial Intelligence with minor in Big Data Analytics - Microsoft</option>
                    <option value="BCA Cloud Computing and Cybersecurity with minor in Ethical Hacking - IBM">BCA Cloud Computing and Cybersecurity with minor in Ethical Hacking - IBM</option>
                    <option value="BCA Cybersecurity, Ethical Hacking and Data Analytics - Microsoft">BCA Cybersecurity, Ethical Hacking and Data Analytics - Microsoft</option>
                    <option value="BCA Cloud Computing Cyber Security & digital Forensic -Microsoft">BCA Cloud Computing Cyber Security & digital Forensic -Microsoft</option>
                    <option value="BCA Artifical Inteligence, DevOps and Full Stack Development - Microsoft">BCA Artifical Inteligence, DevOps and Full Stack Development - Microsoft</option>
                    <option value="BCA Artificial Intelligence, Robotics and Internet of Things - Microsoft">BCA Artificial Intelligence, Robotics and Internet of Things - Microsoft</option>
                    <option value="BCA Data Science, Big Data Analytics and Full Stack Development - Microsoft">BCA Data Science, Big Data Analytics and Full Stack Development - Microsoft</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Semester</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Layers size={18} className="text-slate-500" />
                  </div>
                  <select 
                    name="semester" value={formData.semester} onChange={handleChange}
                    className="input-field pl-10 bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50" required
                  >
                    <option value="" disabled>Select Sem</option>
                    {['I'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 group mt-8"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  Complete Registration 
                  <UserPlus size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <Link to="/student/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
