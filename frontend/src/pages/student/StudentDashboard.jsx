import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

export default function StudentDashboard(){
  const { user, logout } = useAuth();
  const { toggle } = useTheme();
  const [drives, setDrives] = useState([]);
  const [eligible, setEligible] = useState(new Set());
  const [registered, setRegistered] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(()=>{ 
    fetchDrives();
    const interval = setInterval(fetchDrives, 3000);
    return () => clearInterval(interval);
  }, []);

  async function fetchDrives(){
    try {
      const res = await api.get('/drives');
      setDrives(res.data);
      
      const eligibleSet = new Set();
      const registeredSet = new Set();
      
      for(const drive of res.data){
        if(drive.status === 'posted' || drive.status === 'attending'){
          try {
            const eligRes = await api.get(`/eligibility/${drive.drive_id}/check`);
            if(eligRes.data.eligible) eligibleSet.add(drive.drive_id);
          } catch(e) {
            console.log(`Eligibility check failed for drive ${drive.drive_id}:`, e.message);
          }
          
          try {
            const regRes = await api.get(`/registrations/${drive.drive_id}/check`);
            if(regRes.data.registered) registeredSet.add(drive.drive_id);
          } catch(e) {
            console.log(`Registration check failed for drive ${drive.drive_id}:`, e.message);
          }
        }
      }
      
      setEligible(eligibleSet);
      setRegistered(registeredSet);
    } catch(e) {
      console.error('Error fetching drives:', e);
      setDrives([]);
    }
  }

  async function registerForDrive(driveId){
    if(loading) return;
    setLoading(true);
    try {
      await api.post(`/registrations/${driveId}/register`);
      alert('Successfully registered for the drive!');
      await fetchDrives();
      setActiveTab('registered');
    }catch(e){ 
      alert('Registration failed: '+(e.response?.data?.message||e.message)); 
    }finally{
      setLoading(false);
    }
  }

  const postedDrives = drives.filter(d => (d.status || 'posted') === 'posted' && !d.attendance_published);
  const eligibleDrives = postedDrives.filter(d => eligible.has(d.drive_id) && !registered.has(d.drive_id));
  const allDrives = postedDrives;
  const registeredDrives = drives.filter(d => registered.has(d.drive_id));
  const ongoingDrives = drives.filter(d => d.status === 'attending' && !d.attendance_published);
  const finishedDrives = drives.filter(d => d.attendance_published);

  async function downloadFinishedExcel() {
    try {
      const res = await api.get('/finished-drives/download-excel', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `finished-drives-${Date.now()}.xlsx`;
      link.click();
    } catch (e) {
      console.error('Download finished drives error:', e);
      alert('Failed to download finished drives');
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Modern Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 flex flex-col shadow-lg`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">PlaceOps</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Student Portal</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Close panel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
            </svg>
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('eligible')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'eligible' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Eligible Drives
            {eligibleDrives.length > 0 && (
              <span className="ml-auto px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                {eligibleDrives.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'all' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            All Drives
          </button>
          <button
            onClick={() => setActiveTab('registered')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'registered' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            My Registrations
            {registeredDrives.length > 0 && (
              <span className="ml-auto px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                {registeredDrives.length}
              </span>
            )}
          </button>
        </nav>
      </aside>

      {/* Sidebar Toggle Button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-lg z-50"
          title="Open panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className={`${!sidebarOpen ? 'ml-16' : ''} transition-all duration-300`}>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Explore placement opportunities and manage registrations</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{user?.name?.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.name}</span>
              </div>
              <button 
                onClick={toggle} 
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Theme
              </button>
              <button 
                onClick={logout} 
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              {/* Welcome Banner */}
              <div className="bg-gradient-primary rounded-2xl p-6 mb-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Welcome, {user?.name}!</h2>
                    <p className="text-blue-100">Discover placement opportunities and track your applications</p>
                  </div>
                  <div className="hidden md:block">
                    <svg className="w-16 h-16 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card card-hover p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Eligible Drives</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{eligibleDrives.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="card card-hover p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 dark:text-green-400 text-sm font-medium">Registered</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">{registeredDrives.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="card card-hover p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Ongoing</p>
                      <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{ongoingDrives.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="card card-hover p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Total Drives</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{allDrives.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Quick Actions</h3>
                  </div>
                  <div className="space-y-4">
                    <button 
                      onClick={() => setActiveTab('eligible')}
                      className="w-full flex items-center gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">View Eligible Drives</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Browse drives you can apply for</p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setActiveTab('registered')}
                      className="w-full flex items-center gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">My Registrations</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Track your applications</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Opportunities</h3>
                    <button 
                      onClick={() => setActiveTab('eligible')}
                      className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {eligibleDrives.slice(0, 3).map(drive => (
                      <div key={drive.drive_id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{drive.company_name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{drive.job_title}</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          Eligible
                        </span>
                      </div>
                    ))}
                    {eligibleDrives.length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No eligible drives available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'eligible' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Eligible Drives</h2>
                <p className="text-gray-600 dark:text-gray-400">Drives you can register for based on your profile</p>
              </div>
              
              {eligibleDrives.length === 0 ? (
                <div className="card p-12 text-center">
                  <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Eligible Drives</h3>
                  <p className="text-gray-600 dark:text-gray-400">Check back later for new opportunities that match your profile</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {eligibleDrives.map(drive => (
                    <div key={drive.drive_id} className="card card-hover p-6 border-l-4 border-green-500">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{drive.company_name}</h3>
                          <p className="text-blue-600 dark:text-blue-400 font-medium">{drive.job_title}</p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                          Eligible
                        </span>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">{drive.job_description}</p>
                      
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <div className="flex justify-between">
                          <span>Min CGPA:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{drive.min_cgpa}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Domain:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{drive.job_domain}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => registerForDrive(drive.drive_id)}
                          disabled={loading}
                          className="flex-1 btn-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loading ? (
                            <div className="loading-spinner"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          )}
                          Register
                        </button>
                        {drive.pdf_path && (
                          <a
                            href={`http://localhost:4000${drive.pdf_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="View Job Description"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'all' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">All Drives</h2>
                <p className="text-gray-600 dark:text-gray-400">View all available placement drives</p>
              </div>
              
              {allDrives.length === 0 ? (
                <div className="card p-12 text-center">
                  <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Drives Available</h3>
                  <p className="text-gray-600 dark:text-gray-400">Check back later for new placement opportunities</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allDrives.map(drive => (
                    <div key={drive.drive_id} className="card card-hover p-6 border-l-4 border-blue-500">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{drive.company_name}</h3>
                          <p className="text-blue-600 dark:text-blue-400 font-medium">{drive.job_title}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          eligible.has(drive.drive_id) && !registered.has(drive.drive_id)
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : registered.has(drive.drive_id)
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                          {registered.has(drive.drive_id) ? 'Registered' : eligible.has(drive.drive_id) ? 'Eligible' : 'Not Eligible'}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">{drive.job_description}</p>
                      
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <div className="flex justify-between">
                          <span>Min CGPA:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{drive.min_cgpa}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Domain:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{drive.job_domain}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {eligible.has(drive.drive_id) && !registered.has(drive.drive_id) && (
                          <button
                            onClick={() => registerForDrive(drive.drive_id)}
                            disabled={loading}
                            className="flex-1 btn-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {loading ? (
                              <div className="loading-spinner"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            )}
                            Register
                          </button>
                        )}
                        {registered.has(drive.drive_id) && (
                          <div className="flex-1 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg text-center font-medium">
                            ✓ Registered
                          </div>
                        )}
                        {!eligible.has(drive.drive_id) && (
                          <div className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-center font-medium">
                            Not Eligible
                          </div>
                        )}
                        {drive.pdf_path && (
                          <a
                            href={`http://localhost:4000${drive.pdf_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="View Job Description"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'registered' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">My Registrations</h2>
                <p className="text-gray-600 dark:text-gray-400">Drives you have registered for</p>
              </div>
              
              {registeredDrives.length === 0 ? (
                <div className="card p-12 text-center">
                  <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Registrations Yet</h3>
                  <p className="text-gray-600 dark:text-gray-400">Register for eligible drives to see them here</p>
                  <button 
                    onClick={() => setActiveTab('eligible')}
                    className="mt-4 btn-primary text-white px-6 py-2 rounded-lg"
                  >
                    Browse Eligible Drives
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {registeredDrives.map(drive => (
                    <div key={drive.drive_id} className="card card-hover p-6 border-l-4 border-green-500">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{drive.company_name}</h3>
                          <p className="text-blue-600 dark:text-blue-400 font-medium">{drive.job_title}</p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                          ✓ Registered
                        </span>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">{drive.job_description}</p>
                      
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {drive.status === 'attending' ? 'In Progress' : 'Posted'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Domain:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{drive.job_domain}</span>
                        </div>
                      </div>

                      {drive.pdf_path && (
                        <a
                          href={`http://localhost:4000${drive.pdf_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Job Description
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}