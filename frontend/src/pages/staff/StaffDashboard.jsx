import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

export default function StaffDashboard(){
  const { user, logout } = useAuth();
  const { toggle } = useTheme();
  const [drives, setDrives] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  useEffect(() => {
    fetchDrives();
    const interval = setInterval(fetchDrives, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'students' && selectedDrive) {
      fetchRegistrations(selectedDrive);
    }
  }, [activeTab, selectedDrive]);

  async function fetchDrives(){
    try {
      const res = await api.get('/drives');
      setDrives(res.data);
    } catch (e) {
      console.error(e);
      setDrives([]);
    }
  }

  async function fetchRegistrations(driveId){
    try {
      setLoadingRegs(true);
      const res = await api.get(`/registrations/${driveId}/list`);
      setRegistrations(res.data || []);
    } catch (e) {
      console.error('Error fetching registrations:', e);
      setRegistrations([]);
    } finally {
      setLoadingRegs(false);
    }
  }

  const postedDrives = drives.filter(d => (d.status || 'posted') === 'posted' && !d.attendance_published);
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

  function downloadStudentListCsv() {
    if (!selectedDrive) {
      alert('Select a drive to download student list');
      return;
    }
    if (!registrations.length) {
      alert('No students to download');
      return;
    }
    const header = ['Name', 'Email', 'Registered At'];
    const rows = registrations.map(r => [
      r.name || '',
      r.email || '',
      r.registered_at ? new Date(r.registered_at).toLocaleString() : ''
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `student-list-drive-${selectedDrive}-${Date.now()}.csv`;
    link.click();
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">PlaceOps</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Staff Portal</p>
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
            onClick={() => setActiveTab('posted')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'posted' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Posted Drives
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'students' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Student Lists
          </button>
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'ongoing' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ongoing
          </button>
          <button
            onClick={() => setActiveTab('finished')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'finished' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Finished
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Monitor placement drives and student registrations</p>
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
                    <p className="text-blue-100">Monitor placement activities and student registrations</p>
                  </div>
                  <div className="hidden md:block">
                    <svg className="w-16 h-16 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card card-hover p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Posted Drives</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{postedDrives.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

                <div className="card card-hover p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 dark:text-green-400 text-sm font-medium">Finished</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">{finishedDrives.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="card card-hover p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Total Drives</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{drives.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Activity */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Quick Actions */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Quick Actions</h3>
                  </div>
                  <div className="space-y-4">
                    <button 
                      onClick={() => setActiveTab('posted')}
                      className="w-full flex items-center gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">View Posted Drives</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Browse available placement opportunities</p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setActiveTab('students')}
                      className="w-full flex items-center gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Student Lists</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">View registered students and download lists</p>
                      </div>
                    </button>

                    <button 
                      onClick={downloadFinishedExcel}
                      className="w-full flex items-center gap-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Download Reports</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Export finished drives data</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Drives</h3>
                    <button 
                      onClick={() => setActiveTab('posted')}
                      className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {postedDrives.slice(0, 3).map(drive => (
                      <div key={drive.drive_id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{drive.company_name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{drive.job_title}</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          Posted
                        </span>
                      </div>
                    ))}
                    {postedDrives.length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No posted drives available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'posted' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Posted Drives</h2>
                <p className="text-gray-600 dark:text-gray-400">View all available placement opportunities</p>
              </div>
              
              {postedDrives.length === 0 ? (
                <div className="card p-12 text-center">
                  <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Posted Drives</h3>
                  <p className="text-gray-600 dark:text-gray-400">There are no drives currently posted for students</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {postedDrives.map(drive => (
                    <div key={drive.drive_id} className="card card-hover p-6 border-l-4 border-blue-500">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{drive.company_name}</h3>
                          <p className="text-blue-600 dark:text-blue-400 font-medium">{drive.job_title}</p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                          Posted
                        </span>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">{drive.job_description}</p>
                      
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <div className="flex justify-between">
                          <span>Min CGPA:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{drive.min_cgpa}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Min 10th:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{drive.min_10th}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Min 12th:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{drive.min_12th}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Backlogs:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{drive.max_backlogs}</span>
                        </div>
                      </div>

                      {drive.pdf_path && (
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                          <a
                            href={encodeURI(`http://localhost:4000${drive.pdf_path}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View Job Description
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'students' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Student Lists</h2>
                  <p className="text-gray-600 dark:text-gray-400">View registered students and download lists</p>
                </div>
                <button
                  onClick={downloadStudentListCsv}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  title="Download student list (CSV)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download CSV
                </button>
              </div>
              
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Drive Selection */}
                <div className="card p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Drive</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {ongoingDrives.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">No drives with registrations</p>
                    ) : (
                      ongoingDrives.map(drive => (
                        <button
                          key={drive.drive_id}
                          onClick={() => setSelectedDrive(drive.drive_id)}
                          className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${selectedDrive === drive.drive_id ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          <div className="font-semibold text-gray-900 dark:text-white">{drive.company_name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{drive.job_title}</div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Registration Closed</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Student List */}
                <div className="lg:col-span-2 card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedDrive ? 'Registered Students' : 'Select a Drive'}
                    </h3>
                    {selectedDrive && registrations.length > 0 && (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                        {registrations.length} students
                      </span>
                    )}
                  </div>

                  {!selectedDrive ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-12">Select a drive to view registered students</p>
                  ) : loadingRegs ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="loading-spinner"></div>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">Loading students...</span>
                    </div>
                  ) : registrations.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-12">No students registered for this drive</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-600">
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Name</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Email</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Registered At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map(student => (
                            <tr key={student.registration_id || `${student.student_id}-${student.drive_id}`} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="py-3 px-4 text-gray-900 dark:text-white">{student.name}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{student.email}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                {student.registered_at ? new Date(student.registered_at).toLocaleString() : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ongoing' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ongoing Drives</h2>
                <p className="text-gray-600 dark:text-gray-400">Monitor drives currently in progress</p>
              </div>

              {ongoingDrives.length === 0 ? (
                <div className="card p-12 text-center">
                  <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Ongoing Drives</h3>
                  <p className="text-gray-600 dark:text-gray-400">There are no drives currently in progress</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ongoingDrives.map(drive => (
                    <div key={drive.drive_id} className="card card-hover p-6 border-l-4 border-yellow-500">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{drive.company_name}</h3>
                          <p className="text-blue-600 dark:text-blue-400 font-medium">{drive.job_title}</p>
                        </div>
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-medium">
                          In Progress
                        </span>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">{drive.job_description}</p>
                      
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex justify-between">
                          <span>Domain:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{drive.job_domain}</span>
                        </div>
                        {drive.interview_date && (
                          <div className="flex justify-between">
                            <span>Interview:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {new Date(drive.interview_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'finished' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Finished Drives</h2>
                  <p className="text-gray-600 dark:text-gray-400">View completed drives and download reports</p>
                </div>
                <button
                  onClick={downloadFinishedExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  title="Download finished drives (Excel)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Excel
                </button>
              </div>

              {finishedDrives.length === 0 ? (
                <div className="card p-12 text-center">
                  <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Finished Drives</h3>
                  <p className="text-gray-600 dark:text-gray-400">Completed drives will appear here</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {finishedDrives.map(drive => (
                    <div key={drive.drive_id} className="card card-hover p-6 border-l-4 border-green-500">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{drive.company_name}</h3>
                          <p className="text-blue-600 dark:text-blue-400 font-medium">{drive.job_title}</p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                          Completed
                        </span>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">{drive.job_description}</p>
                      
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <div className="flex justify-between">
                          <span>Domain:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{drive.job_domain}</span>
                        </div>
                        {drive.interview_date && (
                          <div className="flex justify-between">
                            <span>Interview:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {new Date(drive.interview_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">Published</span>
                        </div>
                      </div>

                      {drive.pdf_path && (
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                          <a
                            href={encodeURI(`http://localhost:4000${drive.pdf_path}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View Job Description
                          </a>
                        </div>
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
