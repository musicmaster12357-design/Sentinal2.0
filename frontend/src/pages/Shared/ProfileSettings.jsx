import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from '../../store/toastStore';
import api from '../../services/api';
import { User, Lock, Mail, Phone, Book, Building2, GraduationCap, Calendar } from 'lucide-react';

export default function ProfileSettings() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    department: '',
    course: '',
    specialisation: '',
    semester: '',
  });

  const [passData, setPassData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        department: user.department || '',
        course: user.course || '',
        specialisation: user.specialisation || '',
        semester: user.semester || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/users/me', {
        name: formData.name,
        phone: formData.phone,
        department: formData.department,
        course: formData.course,
        specialisation: formData.specialisation,
        semester: formData.semester
      });
      const updatedUser = await api.get('/users/me');
      setUser(updatedUser.data);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passData.new_password !== passData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    setPassLoading(true);
    try {
      await api.post('/auth/change-password', {
        old_password: passData.old_password,
        new_password: passData.new_password,
      });
      toast.success('Password updated successfully!');
      setPassData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update password');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <DashboardLayout title="Profile Settings" role={user?.role}>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Profile Details Section */}
        <Card className="p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary-light border border-primary/30">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Personal Information</h2>
              <p className="text-text-secondary text-sm">Update your contact and academic details.</p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Full Name</label>
                <Input 
                  icon={User}
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Email Address (Read-only)</label>
                <Input 
                  icon={Mail}
                  type="email" 
                  value={user?.email || ''} 
                  disabled 
                  className="opacity-60 cursor-not-allowed"
                />
              </div>

              {user?.role && user.role.toLowerCase() === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Campus ID (Read-only)</label>
                    <Input 
                      icon={User}
                      type="text" 
                      value={user?.campus_id || ''} 
                      disabled 
                      className="opacity-60 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Phone Number</label>
                    <Input 
                      icon={Phone}
                      type="text" 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Department</label>
                    <div className="relative group w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                        <Building2 size={18} />
                      </div>
                      <select 
                        value={formData.department} 
                        onChange={e => setFormData({...formData, department: e.target.value})}
                        className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all pl-10 appearance-none"
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
                    <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Course</label>
                    <div className="relative group w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                        <GraduationCap size={18} />
                      </div>
                      <select
                        value={formData.course} 
                        onChange={e => setFormData({...formData, course: e.target.value})}
                        className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all pl-10 appearance-none"
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
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Specialisation</label>
                    <div className="relative group w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                        <Book size={18} />
                      </div>
                      <input 
                        type="text"
                        list="profileSpecialisationList"
                        value={formData.specialisation || ''} 
                        onChange={e => setFormData({...formData, specialisation: e.target.value})}
                        placeholder="Type or select..."
                        className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all pl-10"
                      />
                      <datalist id="profileSpecialisationList">
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
                    <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Semester</label>
                    <div className="relative group w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                        <Calendar size={18} />
                      </div>
                      <select 
                        value={formData.semester} 
                        onChange={e => setFormData({...formData, semester: e.target.value})}
                        className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all pl-10 appearance-none"
                      >
                        <option value="" disabled>Select Sem</option>
                        {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
              
              {user?.role && (user.role.toLowerCase() === 'faculty' || user.role === 'Super Admin') && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Department</label>
                  <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                      <Building2 size={18} />
                    </div>
                    <select 
                      value={formData.department} 
                      onChange={e => setFormData({...formData, department: e.target.value})}
                      className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all pl-10 appearance-none"
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Business Administration">Business Administration</option>
                      <option value="Commerce">Commerce</option>
                      <option value="Science">Science</option>
                      <option value="Arts">Arts</option>
                    </select>
                  </div>
                </div>
              )}

            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Password Reset Section */}
        <Card className="p-8 relative overflow-hidden border-t-2 border-t-purple-500/30">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
              <Lock size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Change Password</h2>
              <p className="text-text-secondary text-sm">Ensure your account uses a strong, unique password.</p>
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-6 max-w-md">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Current Password</label>
              <Input 
                icon={Lock}
                type="password" 
                value={passData.old_password} 
                onChange={e => setPassData({...passData, old_password: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">New Password</label>
              <Input 
                icon={Lock}
                type="password" 
                value={passData.new_password} 
                onChange={e => setPassData({...passData, new_password: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Confirm New Password</label>
              <Input 
                icon={Lock}
                type="password" 
                value={passData.confirm_password} 
                onChange={e => setPassData({...passData, confirm_password: e.target.value})} 
                required 
              />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20" disabled={passLoading}>
                {passLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </Card>

      </div>
    </DashboardLayout>
  );
}
