import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import LoginPage from './pages/LoginPage'

// Role-based page imports
import StudentDashboard from './pages/student/StudentDashboard'
import StaffDashboard from './pages/staff/StaffDashboard'
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard'
import HeadDashboard from './pages/head/HeadDashboard'

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth()
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }
  
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={`/${user.role.toLowerCase()}`} replace />} />
      
      {/* Student Routes */}
      <Route 
        path="/student/*" 
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Staff Routes */}
      <Route 
        path="/staff/*" 
        element={
          <ProtectedRoute allowedRoles={['STAFF']}>
            <StaffDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Coordinator Routes */}
      <Route 
        path="/coordinator/*" 
        element={
          <ProtectedRoute allowedRoles={['COORDINATOR']}>
            <CoordinatorDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Head Routes */}
      <Route 
        path="/head/*" 
        element={
          <ProtectedRoute allowedRoles={['HEAD']}>
            <HeadDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Default redirect based on role */}
      <Route 
        path="/" 
        element={<Navigate to={`/${user.role.toLowerCase()}`} replace />} 
      />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to={`/${user.role.toLowerCase()}`} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <AppRoutes />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App