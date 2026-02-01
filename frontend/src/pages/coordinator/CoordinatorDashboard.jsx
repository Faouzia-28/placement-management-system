import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import AnalyticsDashboard from '../analytics/AnalyticsDashboard'

export default function CoordinatorDashboard(){
  const { user, logout } = useAuth();
  const { toggle } = useTheme();
  const [drives, setDrives] = useState([]);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [driveDetails, setDriveDetails] = useState(null);
  const [allEligible, setAllEligible] = useState([]);
  const [filteredEligible, setFilteredEligible] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [registrations, setRegistrations] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Sub-filter state
  const [subFilter, setSubFilter] = useState({
    cgpa_min: '',
    branch: '',
    exclude_backlogs: false
  });

  // Load all drives on mount and set up polling
  useEffect(() => {
    const fetchDrives = () => {
      api.get('/drives')
        .then(r => setDrives(r.data))
        .catch(e => console.error('Error loading drives:', e));
    };
    
    fetchDrives();
    
    // Poll every 3 seconds to check for new drives from HEAD
    const interval = setInterval(fetchDrives, 3000);
    
    return () => { clearInterval(interval); };
  }, []);

  // When drive is selected, load its details and eligible students
  async function selectDrive(driveId) {
    if (!driveId) {
      setSelectedDrive(null);
      setDriveDetails(null);
      setAllEligible([]);
      setFilteredEligible([]);
      setSelectedStudents(new Set());
      setSubFilter({ cgpa_min: '', branch: '', exclude_backlogs: false });
      setAvailableBranches([]);
      return;
    }

    setLoading(true);
    try {
      const driveRes = await api.get(`/drives/${driveId}`);
      setDriveDetails(driveRes.data);
      setSelectedDrive(driveId);

      const eligRes = await api.get(`/eligibility/${driveId}/list`);
      const students = eligRes.data || [];
      setAllEligible(students);
      setFilteredEligible(students);
      setSelectedStudents(new Set());
      setSubFilter({ cgpa_min: '', branch: '', exclude_backlogs: false });

      const branches = [...new Set(students.map(s => s.branch).filter(Boolean))].sort();
      setAvailableBranches(branches);
      
      console.log('Eligible students loaded:', students.length);
    } catch (e) {
      console.error('Error selecting drive:', e);
      alert('Error loading drive: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-apply sub-filter on input change
  React.useEffect(() => {
    if (!selectedDrive) return;
    const minC = subFilter.cgpa_min ? parseFloat(subFilter.cgpa_min) : null;
    const results = allEligible.filter(s => {
      if (minC !== null && !(parseFloat(s.cgpa) >= minC)) return false;
      if (subFilter.branch && s.branch !== subFilter.branch) return false;
      if (subFilter.exclude_backlogs && s.active_backlogs > 0) return false;
      return true;
    });
    setFilteredEligible(results);
  }, [subFilter, allEligible, selectedDrive]);

  // Toggle student selection
  function toggleStudent(studentId) {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  }

  // Toggle all students
  function toggleAllStudents() {
    const newSelected = new Set();
    if (selectedStudents.size !== displayedStudents.length) {
      displayedStudents.forEach(s => newSelected.add(s.student_id));
    }
    setSelectedStudents(newSelected);
  }

  // Filter students by search
  const displayedStudents = filteredEligible.filter(s => {
    const query = searchQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(query) ||
      s.roll_number?.toLowerCase().includes(query) ||
      s.branch?.toLowerCase().includes(query)
    );
  });

  const attendanceMap = attendanceList.reduce((acc, row) => {
    acc[row.student_id] = row.status;
    return acc;
  }, {});
  const attendanceLocked = !!driveDetails?.attendance_published;

  async function loadRegistrations() {
    if (!selectedDrive) return;
    setRegistrationsLoading(true);
    try {
      const res = await api.get(`/registrations/${selectedDrive}/list`);
      setRegistrations(res.data || []);
    } catch (e) {
      console.error('Error loading registrations:', e);
      setRegistrations([]);
    } finally {
      setRegistrationsLoading(false);
    }
  }

  async function loadAttendance() {
    if (!selectedDrive) return;
    setAttendanceLoading(true);
    try {
      const res = await api.get(`/attendance/${selectedDrive}/list`);
      setAttendanceList(res.data || []);
    } catch (e) {
      console.error('Error loading attendance:', e);
      setAttendanceList([]);
    } finally {
      setAttendanceLoading(false);
    }
  }

  async function markAttendance(studentId, status) {
    if (!selectedDrive) return;
    try {
      // Convert to uppercase to match database constraint
      const upperStatus = status.toUpperCase();
      await api.post(`/attendance/${selectedDrive}/mark`, { student_id: studentId, status: upperStatus });
      await loadAttendance();
    } catch (e) {
      console.error('Error marking attendance:', e);
      alert('Error marking attendance: ' + (e.response?.data?.message || e.message));
    }
  }

  function resetFilterAndSelection() {
    setSubFilter({ cgpa_min: '', branch: '', exclude_backlogs: false });
    setSelectedStudents(new Set());
    setSearchQuery('');
    setFilteredEligible(allEligible);
  }

  useEffect(() => {
    if (!selectedDrive) return;
    if (activeTab === 'attendance') {
      loadRegistrations();
      loadAttendance();
    }
    if (activeTab === 'registered') {
      loadRegistrations();
    }
  }, [selectedDrive, activeTab]);

  async function downloadAttendanceCsv() {
    if (!selectedDrive) return alert('Select a drive to download attendance');
    try {
      const res = await api.get(`/attendance/${selectedDrive}/download-csv`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `attendance-drive-${selectedDrive}-${Date.now()}.csv`;
      link.click();
    } catch (e) {
      console.error('CSV download error:', e);
      alert('Failed to download CSV');
    }
  }

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

  const pendingDrives = drives.filter(d => (d.status || 'pending') === 'pending');
  const postedDrives = drives.filter(d => (d.status || 'posted') === 'posted');
  const ongoingDrives = drives.filter(d => d.status === 'attending' && !d.attendance_published);
  const finishedDrives = drives.filter(d => d.attendance_published);

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Modern Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 flex flex-col shadow-lg`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">PlaceOps</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Coordinator Portal</p>
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
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'analytics' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('filter')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'filter' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Drive Filtering
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'attendance' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Attendance
          </button>
          <button
            onClick={() => setActiveTab('registered')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'registered' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Registered
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coordinator Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage drive filtering and student coordination</p>
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
                    <p className="text-blue-100">Coordinate placement drives and manage student filtering</p>
                  </div>
                  <div className="hidden md:block">
                    <svg className="w-16 h-16 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card card-hover p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Pending Drives</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{pendingDrives.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="card card-hover p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 dark:text-green-400 text-sm font-medium">Posted</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">{postedDrives.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                      <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Finished</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{finishedDrives.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                      onClick={() => setActiveTab('filter')}
                      className="w-full flex items-center gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Filter & Publish Drives</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Review and publish pending drives</p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setActiveTab('attendance')}
                      className="w-full flex items-center gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Mark Attendance</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Track student attendance for drives</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pending Actions</h3>
                    <button 
                      onClick={() => setActiveTab('filter')}
                      className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {pendingDrives.slice(0, 3).map(drive => (
                      <div key={drive.drive_id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{drive.company_name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{drive.job_title}</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                          Needs Review
                        </span>
                      </div>
                    ))}
                    {pendingDrives.length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No pending drives to review</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard role="COORDINATOR" drives={drives} />
          )}

          {activeTab === 'attendance' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Attendance Management</h2>
                <p className="text-gray-600 dark:text-gray-400">Mark attendance for ongoing drives</p>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Drive Selection */}
                <div className="card p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Drive</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {ongoingDrives.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">No ongoing drives</p>
                    ) : (
                      ongoingDrives.map(d => (
                        <button
                          key={d.drive_id}
                          onClick={() => setSelectedDrive(d.drive_id)}
                          className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${selectedDrive === d.drive_id ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          <div className="font-semibold text-gray-900 dark:text-white">{d.company_name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{d.job_title}</div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {d.status === 'attending' ? 'In Progress' : 'Ready for Attendance'}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Attendance List */}
                <div className="lg:col-span-2 card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedDrive ? 'Mark Attendance' : 'Select a Drive'}
                    </h3>
                    {selectedDrive && (
                      <div className="flex gap-2">
                        {!attendanceLocked && (
                          <button
                            onClick={async () => {
                              if (!window.confirm('Are you sure you want to publish attendance? This will finalize the drive and cannot be undone.')) return;
                              try {
                                await api.post(`/attendance/${selectedDrive}/publish`);
                                alert('Attendance published successfully! Drive has been completed.');
                                // Refresh drives to update status
                                const res = await api.get('/drives');
                                setDrives(res.data);
                                // Refresh drive details
                                const driveRes = await api.get(`/drives/${selectedDrive}`);
                                setDriveDetails(driveRes.data);
                                // Refresh attendance
                                loadAttendance();
                              } catch (e) {
                                console.error('Publish attendance error:', e);
                                alert('Error: ' + (e.response?.data?.message || e.message));
                              }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Publish Attendance
                          </button>
                        )}
                        <button
                          onClick={downloadAttendanceCsv}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download CSV
                        </button>
                      </div>
                    )}
                  </div>

                  {!selectedDrive ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-12">Select a drive to mark attendance</p>
                  ) : attendanceLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="loading-spinner"></div>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">Loading attendance...</span>
                    </div>
                  ) : registrations.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-12">No registered students for this drive</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {registrations.map(student => (
                        <div key={student.student_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">{student.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{student.email}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => markAttendance(student.student_id, 'present')}
                              disabled={attendanceLocked}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                attendanceMap[student.student_id] === 'PRESENT'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                              } ${attendanceLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => markAttendance(student.student_id, 'absent')}
                              disabled={attendanceLocked}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                attendanceMap[student.student_id] === 'ABSENT'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                              } ${attendanceLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              Absent
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {attendanceLocked && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                        ⚠️ Attendance has been published and is now locked
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'registered' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Registered Students</h2>
                <p className="text-gray-600 dark:text-gray-400">View students registered for drives</p>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Drive Selection */}
                <div className="card p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Drive</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {postedDrives.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">No posted drives</p>
                    ) : (
                      postedDrives.map(d => (
                        <button
                          key={d.drive_id}
                          onClick={() => setSelectedDrive(d.drive_id)}
                          className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${selectedDrive === d.drive_id ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          <div className="font-semibold text-gray-900 dark:text-white">{d.company_name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{d.job_title}</div>
                          <div className="text-xs text-green-600 dark:text-green-400 mt-1">Posted</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Registration List */}
                <div className="lg:col-span-2 card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedDrive ? 'Registered Students' : 'Select a Drive'}
                    </h3>
                    <div className="flex items-center gap-3">
                      {selectedDrive && registrations.length > 0 && (
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                          {registrations.length} registered
                        </span>
                      )}
                      {selectedDrive && (
                        <>
                          {console.log('Selected drive:', selectedDrive)}
                          {console.log('Drive details:', driveDetails)}
                          {driveDetails && console.log('Drive status:', driveDetails.status)}
                          <button
                            onClick={async () => {
                              if (!window.confirm('Are you sure you want to stop registrations for this drive? Students will no longer be able to register.')) return;
                              try {
                                await api.post(`/drives/${selectedDrive}/stop-registrations`);
                                alert('Registrations stopped successfully! Drive moved to attendance phase.');
                                // Refresh drives to update status
                                const res = await api.get('/drives');
                                setDrives(res.data);
                                // Refresh drive details
                                const driveRes = await api.get(`/drives/${selectedDrive}`);
                                setDriveDetails(driveRes.data);
                              } catch (e) {
                                console.error('Stop registrations error:', e);
                                alert('Error: ' + (e.response?.data?.message || e.message));
                              }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v.01a1 1 0 01-1 1h-4a1 1 0 01-1-1V10z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15a1 1 0 011-1h4a1 1 0 011 1v.01a1 1 0 01-1 1h-4a1 1 0 01-1-1V15z" />
                            </svg>
                            Stop Registrations
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {!selectedDrive ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-12">Select a drive to view registrations</p>
                  ) : registrationsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="loading-spinner"></div>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">Loading registrations...</span>
                    </div>
                  ) : registrations.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-12">No students registered for this drive</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {registrations.map(student => (
                        <div key={student.student_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">{student.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{student.email}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Registered: {student.registered_at ? new Date(student.registered_at).toLocaleString() : 'N/A'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                              Registered
                            </span>
                          </div>
                        </div>
                      ))}
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
                      </div>

                      <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        <button
                          onClick={() => {
                            setSelectedDrive(drive.drive_id);
                            setActiveTab('attendance');
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          Mark Attendance
                        </button>
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
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Excel Report
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'filter' && (
            <div className="animate-fade-in">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Column 1: Pending Drives */}
                <div className="card p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Pending Drives</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Select a drive to review and filter students</p>
                  </div>
                  
                  {selectedDrive && driveDetails && (
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Selected Drive</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-semibold text-blue-900 dark:text-blue-200">Company:</span> {driveDetails.company_name}</div>
                        <div><span className="font-semibold text-blue-900 dark:text-blue-200">Position:</span> {driveDetails.job_title}</div>
                        <div><span className="font-semibold text-blue-900 dark:text-blue-200">Domain:</span> {driveDetails.job_domain}</div>
                        {driveDetails.interview_date && (
                          <div><span className="font-semibold text-blue-900 dark:text-blue-200">Interview:</span> {new Date(driveDetails.interview_date).toLocaleDateString()}</div>
                        )}
                        {driveDetails.pdf_path && (
                          <div className="mt-2">
                            <a href={`/uploads/${encodeURI(driveDetails.pdf_path)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline text-sm">
                              📄 Job Description
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {pendingDrives.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">No pending drives</p>
                    ) : (
                      pendingDrives.map(d => (
                        <div 
                          key={d.drive_id} 
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${selectedDrive === d.drive_id ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          onClick={() => selectDrive(d.drive_id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{d.company_name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{d.job_title}</p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 ml-2 flex-shrink-0">
                              PENDING
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 2: Criteria & Filters */}
                <div className="card p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Filter & Criteria</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Review criteria and apply additional filters</p>
                  </div>
                  
                  {!selectedDrive ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">Select a drive to view criteria</p>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3">HEAD Posted Criteria</h4>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          {driveDetails ? (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Min CGPA:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{driveDetails.min_cgpa}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Min 10th:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{driveDetails.min_10th}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Min 12th:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{driveDetails.min_12th}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Max Backlogs:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{driveDetails.max_backlogs}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3">Your Sub-Filter</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CGPA Min</label>
                            <input 
                              type="number" 
                              step="0.1" 
                              value={subFilter.cgpa_min} 
                              onChange={e => setSubFilter({ ...subFilter, cgpa_min: e.target.value })} 
                              placeholder="e.g., 7.0" 
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                            <select 
                              value={subFilter.branch} 
                              onChange={e => setSubFilter({ ...subFilter, branch: e.target.value })} 
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            >
                              <option value="">-- All --</option>
                              {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                          <div className="flex items-center">
                            <input 
                              type="checkbox" 
                              id="exclude_backlogs" 
                              checked={subFilter.exclude_backlogs} 
                              onChange={e => setSubFilter({ ...subFilter, exclude_backlogs: e.target.checked })} 
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label htmlFor="exclude_backlogs" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">No Backlogs</label>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        <button 
                          onClick={async () => {
                            if (!selectedDrive) return alert('Select a drive');
                            if (selectedStudents.size === 0) return alert('Please select at least one student');
                            if (!window.confirm(`Publish this drive for ${selectedStudents.size} selected student(s)?`)) return;
                            try {
                              const res = await api.post(`/drives/${selectedDrive}/publish`, {
                                selected_students: Array.from(selectedStudents)
                              });
                              console.log('Publish response:', res.data);
                              alert('Drive published successfully!');
                              // Update the drives list to reflect published status
                              setDrives(drives.map(d => d.drive_id === selectedDrive ? { ...d, status: 'posted' } : d));
                              // Fetch fresh drives list to sync with other users
                              api.get('/drives').then(r => setDrives(r.data)).catch(e => console.error(e));
                              // Deselect the drive to hide filter options
                              setSelectedDrive(null);
                              setDriveDetails(null);
                              setAllEligible([]);
                              setFilteredEligible([]);
                              resetFilterAndSelection();
                            } catch (e) {
                              console.error('Publish error:', e);
                              alert('Error: ' + (e.response?.data?.message || e.message));
                            }
                          }} 
                          className="w-full btn-primary text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          Publish Drive ({selectedStudents.size} selected)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column 3: Students */}
                <div className="card p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Students ({displayedStudents.length})</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Select students to include in the drive</p>
                  </div>
                  
                  {!selectedDrive ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">Select a drive to view students</p>
                  ) : (
                    <div className="space-y-4">
                      <input 
                        type="text" 
                        placeholder="Search by name, roll, dept..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      />

                      {displayedStudents.length > 0 && (
                        <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <input 
                            type="checkbox" 
                            id="select_all" 
                            checked={selectedStudents.size > 0 && selectedStudents.size === displayedStudents.length} 
                            onChange={toggleAllStudents} 
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <label htmlFor="select_all" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex-1">
                            {selectedStudents.size === displayedStudents.length && displayedStudents.length > 0 ? 'Deselect All' : `Select All`}
                          </label>
                          {selectedStudents.size > 0 && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                              {selectedStudents.size} selected
                            </span>
                          )}
                        </div>
                      )}

                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {displayedStudents.length === 0 ? (
                          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No eligible students</p>
                        ) : (
                          displayedStudents.map(s => (
                            <div key={s.student_id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                              <input 
                                type="checkbox" 
                                checked={selectedStudents.has(s.student_id)} 
                                onChange={() => toggleStudent(s.student_id)} 
                                className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white text-sm">{s.name}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{s.roll_number}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-500">{s.branch} | CGPA: {s.cgpa}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}