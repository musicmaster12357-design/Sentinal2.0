import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import StudentLogin from './pages/Student/StudentLogin';
import StudentRegister from './pages/Student/StudentRegister';
import StudentDashboard from './pages/Student/StudentDashboard';
import VerifyAttendance from './pages/Student/VerifyAttendance';
import FeedbackForm from './pages/Student/FeedbackForm';
import QRScanner from './pages/Scanner/QRScanner';
import ForgotPassword from './pages/Student/ForgotPassword';
import FacultyLogin from './pages/Faculty/FacultyLogin';
import FacultyDashboard from './pages/Faculty/FacultyDashboard';
import LiveSession from './pages/Faculty/LiveSession';
import StudentManagement from './pages/Faculty/StudentManagement';
import AttendanceHistory from './pages/Faculty/AttendanceHistory';
import FacultyFeedback from './pages/Faculty/FacultyFeedback';
import ProfileSettings from './pages/Shared/ProfileSettings';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer } from './components/ui/Toast';

function App() {
  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Navigate to="/student/register" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Student Routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/register" element={<StudentRegister />} />
        
        <Route path="/student/dashboard" element={
          <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
        } />
        <Route path="/student/verify-attendance/:token" element={
          <ProtectedRoute role="student"><VerifyAttendance /></ProtectedRoute>
        } />
        <Route path="/student/feedback/:sessionId" element={
          <ProtectedRoute role="student"><FeedbackForm /></ProtectedRoute>
        } />
        <Route path="/student/profile" element={
          <ProtectedRoute role="student"><ProfileSettings /></ProtectedRoute>
        } />
        <Route path="/scanner" element={
          <ProtectedRoute role="student"><QRScanner /></ProtectedRoute>
        } />
        
        {/* Faculty Routes */}
        <Route path="/faculty/login" element={<FacultyLogin />} />
        <Route path="/faculty/dashboard" element={
          <ProtectedRoute role="faculty"><FacultyDashboard /></ProtectedRoute>
        } />
        <Route path="/faculty/students" element={
          <ProtectedRoute role="faculty"><StudentManagement /></ProtectedRoute>
        } />
        <Route path="/faculty/attendance" element={
          <ProtectedRoute role="faculty"><AttendanceHistory /></ProtectedRoute>
        } />
        <Route path="/faculty/feedbacks" element={
          <ProtectedRoute role="faculty"><FacultyFeedback /></ProtectedRoute>
        } />
        <Route path="/faculty/profile" element={
          <ProtectedRoute role="faculty"><ProfileSettings /></ProtectedRoute>
        } />
        <Route path="/faculty/session/:id" element={
          <ProtectedRoute role="faculty"><LiveSession /></ProtectedRoute>
        } />
        
        {/* Catch-all Route for 404s */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
