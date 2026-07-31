import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, role }) {
  const { token, user, setUser } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token && !user) {
        try {
          const res = await api.get('/auth/profile/me');
          setUser(res.data);
        } catch (err) {
          console.error("Failed to verify token", err);
          // If token is invalid, clear it
          useAuthStore.getState().logout();
        }
      }
      setIsVerifying(false);
    };
    verifyUser();
  }, [token, user, setUser]);

  if (!token) {
    return <Navigate to={role === 'faculty' ? "/faculty/login" : "/student/login"} replace />;
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (role && user?.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
