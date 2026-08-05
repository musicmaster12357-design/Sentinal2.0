import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, User, Lock, Loader2, Building, BookOpen, Layers, Phone, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';

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
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();

  React.useEffect(() => {
    api.get('/auth/settings/registration')
      .then(res => {
        setRegistrationOpen(res.data.registration_open);
        setCheckingRegistration(false);
      })
      .catch(err => {
        console.error("Failed to fetch registration settings", err);
        setCheckingRegistration(false);
      });
  }, []);

  const handleLookup = async () => {
    if (formData.campus_id.length < 3) {
      return;
    }
    try {
      const res = await api.get(`/auth/lookup/student/${formData.campus_id}`);
      const student = res.data;
      if (student) {
        setFormData(prev => ({
          ...prev,
          name: student.name,
          course: student.course || prev.course,
          department: student.department || prev.department
        }));
      }
    } catch (err) {
      console.error("Could not load student data", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
      // Sanitize campus_id (remove hyphens and spaces)
      apiData.campus_id = apiData.campus_id.replace(/[^a-zA-Z0-9]/g, '');
      apiData.role_name = 'student';

      const res = await api.post('/auth/register', apiData);
      
      // Instead of logging them in directly, redirect to login page
      toast.success("Registration successful! Please login.");
      navigate('/student/login');
    } catch (err) {
      let errorMsg = "Registration failed";
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail[0]?.msg || "Validation error in inputs";
        }
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-y-auto py-12 custom-scrollbar">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
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

          {checkingRegistration ? (
             <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
          ) : !registrationOpen ? (
             <div className="text-center p-8 bg-amber-500/10 border border-amber-500/20 rounded-xl">
               <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
               <h3 className="text-xl font-bold text-amber-500 mb-2">Registration Closed</h3>
               <p className="text-amber-400/80">Account registration is currently disabled by the administrator. Please try again later or contact your faculty.</p>
               <div className="mt-6">
                 <Link to="/student/login" className="text-blue-400 hover:text-blue-300 transition-colors">Return to Login</Link>
               </div>
             </div>
          ) : (
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
                    type="text" name="campus_id" value={formData.campus_id} onChange={handleChange} onBlur={handleLookup}
                    className="input-field pl-10 bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50" 
                    placeholder="e.g. 51234" required
                  />
                </div>
              </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Full Name</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                      <User size={18} />
                    </div>
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder="John Doe" 
                      required 
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
                    <option value="Business Administration">Business Administration</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Science">Science</option>
                    <option value="Arts">Arts</option>
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
                    <option value="BBA">BBA</option>
                    <option value="BCom">BCom</option>
                    <option value="BA">BA</option>
                    <option value="BTech">BTech</option>
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
                  <input 
                    type="text" 
                    name="specialisation" 
                    list="specialisationList"
                    value={formData.specialisation || ''} 
                    onChange={handleChange}
                    className="input-field pl-10 bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50" 
                    placeholder="Type or select..." 
                    required 
                  />
                  <datalist id="specialisationList">
                    <option value="Data Science" />
                    <option value="Artificial Intelligence" />
                    <option value="Cyber Security" />
                    <option value="Cloud Computing" />
                    <option value="Finance" />
                    <option value="Marketing" />
                    <option value="Human Resources" />
                    <option value="General" />
                  </datalist>
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
                    {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].map(s => <option key={s} value={s}>{s}</option>)}
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
          )}

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
