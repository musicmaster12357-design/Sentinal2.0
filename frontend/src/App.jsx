import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import StudentLogin from './pages/Student/StudentLogin';
import StudentRegister from './pages/Student/StudentRegister';
import StudentDashboard from './pages/Student/StudentDashboard';
import VerifyAttendance from './pages/Student/VerifyAttendance';
import FeedbackForm from './pages/Student/FeedbackForm';
import QRScanner from './pages/Scanner/QRScanner';
import FacultyLogin from './pages/Faculty/FacultyLogin';
import FacultyDashboard from './pages/Faculty/FacultyDashboard';
import LiveSession from './pages/Faculty/LiveSession';
import StudentsList from './pages/Faculty/StudentsList';
import AttendanceHistory from './pages/Faculty/AttendanceHistory';
import FacultyFeedback from './pages/Faculty/FacultyFeedback';
import StudentLayout from './pages/Student/StudentLayout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/faculty/login" replace />} />
        
        {/* Student Routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/register" element={<StudentRegister />} />
        <Route path="/student/dashboard" element={<StudentLayout title="Student Dashboard"><StudentDashboard /></StudentLayout>} />
        <Route path="/student/verify-attendance/:token" element={<VerifyAttendance />} />
        <Route path="/student/feedback/:sessionId" element={<StudentLayout title="Feedback"><FeedbackForm /></StudentLayout>} />
        <Route path="/scanner" element={<StudentLayout title="Scan QR Code"><QRScanner /></StudentLayout>} />
        
        {/* Faculty Routes */}
        <Route path="/faculty/login" element={<FacultyLogin />} />
        <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
        <Route path="/faculty/students" element={<StudentsList />} />
        <Route path="/faculty/attendance" element={<AttendanceHistory />} />
        <Route path="/faculty/feedbacks" element={<FacultyFeedback />} />
        <Route path="/faculty/session/:id" element={<LiveSession />} />
      </Routes>
    </Router>
  );
}

export default App;
