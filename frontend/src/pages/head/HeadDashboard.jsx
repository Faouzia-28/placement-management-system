import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import AnalyticsDashboard from '../analytics/AnalyticsDashboard'

export default function HeadDashboard(){
  const { user, logout } = useAuth();
  const { toggle } = useTheme();
  const [drives, setDrives] = useState([]);
  const [finishedDrives, setFinishedDrives] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedDrivesToDelete, setSelectedDrivesToDelete] = useState(new Set());
  const [form, setForm] = useState({ company_name:'', job_title:'', domain_id:'', job_description:'', interview_date:'', min_cgpa:6, min_10th:60, min_12th:60, max_backlogs:0, pdf:null, auto_calc:false });
  const [pdfName, setPdfName] = useState('');
  const [triggeringEligibility, setTriggeringEligibility] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(()=>{ 
    fetchDrives();
    fetchDomains();
    
    // Poll every 3 seconds to check for updates from coordinator
    const interval = setInterval(fetchDrives, 3000);
    
    return () => { clearInterval(interval); };
  },[]);

  async function fetchDomains(){
    try{
      const res = await api.get('/job-domains');
      setDomains(res.data);
      if(res.data.length > 0) {
        setForm(prev => ({...prev, domain_id: res.data[0].domain_id}));
      }
    }catch(e){ console.error('Error loading domains:', e); }
  }

  async function fetchDrives(){
    try{
      const res = await api.get('/drives');
      setDrives(res.data);
    }catch(e){ console.error(e); }
  }

  async function fetchFinishedDrives(){
    try{
      const res = await api.get('/finished-drives?limit=10');
      setFinishedDrives(res.data);
    }catch(e){ console.error(e); }
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

  // Poll finished drives when on finished tab
  useEffect(() => {
    if (activeTab === 'finished') {
      fetchFinishedDrives();
      // Poll every 3 seconds when viewing finished tab
      const interval = setInterval(fetchFinishedDrives, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  function handlePdfChange(e){
    const file = e.target.files[0];
    if(file){
      setForm({...form, pdf: file});
      setPdfName(file.name);
    }
  }

  async function create(){
    if(!form.company_name || !form.job_title) {
      alert('Please fill in Company and Job Title');
      return;
    }
    setLoading(true);
    try{
      // Use FormData for multipart/form-data when there's a PDF
      const formData = new FormData();
      formData.append('company_name', form.company_name);
      formData.append('job_title', form.job_title);
      formData.append('domain_id', form.domain_id || 1);
      formData.append('job_description', form.job_description || '');
      formData.append('interview_date', form.interview_date || '');
      formData.append('min_cgpa', parseFloat(form.min_cgpa) || 0);
      formData.append('min_10th', parseFloat(form.min_10th) || 0);
      formData.append('min_12th', parseFloat(form.min_12th) || 0);
      formData.append('max_backlogs', parseInt(form.max_backlogs) || 0);
      // include auto-calc flag
      formData.append('auto_calc', form.auto_calc ? 'true' : 'false');
      if(form.pdf){
        formData.append('pdf', form.pdf);
      }
      
      await api.post('/drives', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Drive posted successfully!');
      setForm({ company_name:'', job_title:'', domain_id:1, job_description:'', interview_date:'', min_cgpa:6, min_10th:60, min_12th:60, max_backlogs:0, pdf:null });
      setPdfName('');
      fetchDrives();
    }catch(e){ 
      console.error(e);
      alert('Error: '+(e.response?.data?.message||e.message)); 
    }finally{
      setLoading(false);
    }
  }

  async function deleteDrive(){
    if(selectedDrivesToDelete.size === 0){
      alert('Please select at least one drive to delete');
      return;
    }
    if(!window.confirm(`Are you sure you want to delete ${selectedDrivesToDelete.size} drive(s)?`)){
      return;
    }
    setDeleteLoading(true);
    try{
      for(const driveId of selectedDrivesToDelete){
        await api.delete(`/drives/${driveId}`);
      }
      alert(`${selectedDrivesToDelete.size} drive(s) deleted successfully!`);
      setSelectedDrivesToDelete(new Set());
      fetchDrives();
    }catch(e){
      console.error(e);
      alert('Error: '+(e.response?.data?.message||e.message));
    }finally{
      setDeleteLoading(false);
    }
  }

  function toggleDriveSelection(driveId){
    const newSet = new Set(selectedDrivesToDelete);
    if(newSet.has(driveId)){
      newSet.delete(driveId);
    }else{
      newSet.add(driveId);
    }
    setSelectedDrivesToDelete(newSet);
  }

  function toggleAllDrives(){
    if(selectedDrivesToDelete.size === drives.length){
      setSelectedDrivesToDelete(new Set());
    }else{
      setSelectedDrivesToDelete(new Set(drives.map(d => d.drive_id)));
    }
  }
  
  async function triggerEligibility(driveId){
    setTriggeringEligibility(driveId);
    try{
      await api.post(`/drives/${driveId}/trigger-eligibility`);
      alert('Eligibility filtering triggered successfully!');
      fetchDrives();
    }catch(e){
      console.error(e);
      alert('Error: '+(e.response?.data?.message||e.message));
    }finally{
      setTriggeringEligibility(null);
    }
  }

  const pendingDrives = drives.filter(d => d.status === 'pending');
  const postedDrives = drives.filter(d => d.status === 'posted' && !d.attendance_published);
  const ongoingDrives = drives.filter(d => d.status === 'attending' && !d.attendance_published);
  const completedDrives = drives.filter(d => d.attendance_published);

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Modern Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 flex flex-col shadow-lg`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">PlaceOps</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Head Portal</p>
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
            onClick={() => setActiveTab('post')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'post' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Post Drive
          </button>
          <button
            onClick={() => setActiveTab('posted')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === 'posted' ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
            </svg>
            Posted Drives
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Head Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage placement drives and oversee operations</p>
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
                    <p className="text-blue-100">Oversee placement operations and drive management</p>
                  </div>
                  <div className="hidden md:block">
                    <svg className="w-16 h-16 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card card-hover p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total Drives</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{drives.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
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
                      <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Completed</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{completedDrives.length}</p>
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
                      onClick={() => setActiveTab('post')}
                      className="w-full flex items-center gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Post New Drive</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Create and publish placement drives</p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setActiveTab('analytics')}
                      className="w-full flex items-center gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">View Analytics</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Monitor placement statistics</p>
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
                    {drives.slice(0, 3).map(drive => (
                      <div key={drive.drive_id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className={`w-3 h-3 rounded-full ${drive.status === 'posted' ? 'bg-green-500' : drive.status === 'attending' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{drive.company_name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{drive.job_title}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          drive.status === 'posted' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 
                          drive.status === 'attending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        }`}>
                          {drive.status === 'posted' ? 'Posted' : drive.status === 'attending' ? 'Ongoing' : 'Pending'}
                        </span>
                      </div>
                    ))}
                    {drives.length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No drives created yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard role="HEAD" />
          )}

          {activeTab === 'post' && (
            <div className="animate-fade-in">
              <div className="max-w-4xl mx-auto">
                <div className="card p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Post New Drive</h2>
                    <p className="text-gray-600 dark:text-gray-400">Create a new placement drive for students</p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Company Name *</label>
                        <input 
                          placeholder="e.g., Google, Microsoft" 
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                          value={form.company_name} 
                          onChange={e=>setForm({...form, company_name:e.target.value})} 
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Job Title *</label>
                        <input 
                          placeholder="e.g., SDE, Data Scientist" 
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                          value={form.job_title} 
                          onChange={e=>setForm({...form, job_title:e.target.value})} 
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Job Domain</label>
                        <select 
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                          value={form.domain_id} 
                          onChange={e=>setForm({...form, domain_id:parseInt(e.target.value)})}
                        >
                          <option value="">-- Select Domain --</option>
                          {domains.map(d=> <option key={d.domain_id} value={d.domain_id}>{d.domain_name}</option>)}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Interview Date</label>
                        <input 
                          type="date" 
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                          value={form.interview_date} 
                          onChange={e=>setForm({...form, interview_date:e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Job Description</label>
                        <textarea 
                          placeholder="Job description..." 
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                          rows="4" 
                          value={form.job_description} 
                          onChange={e=>setForm({...form, job_description:e.target.value})} 
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Job Description PDF</label>
                        <div className="relative">
                          <input type="file" accept=".pdf" className="hidden" id="pdf-upload" onChange={handlePdfChange} />
                          <label htmlFor="pdf-upload" className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer block text-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            {pdfName ? (
                              <div className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {pdfName}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Click to upload PDF
                              </div>
                            )}
                          </label>
                        </div>
                        {pdfName && <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ File selected</p>}
                      </div>
                    </div>
                  </div>

                  {/* Eligibility Criteria */}
                  <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Eligibility Criteria</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Min CGPA</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                          value={form.min_cgpa} 
                          onChange={e=>setForm({...form, min_cgpa:parseFloat(e.target.value)})} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Min 10th %</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                          value={form.min_10th} 
                          onChange={e=>setForm({...form, min_10th:parseFloat(e.target.value)})} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Min 12th %</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                          value={form.min_12th} 
                          onChange={e=>setForm({...form, min_12th:parseFloat(e.target.value)})} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Max Backlogs</label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                          value={form.max_backlogs} 
                          onChange={e=>setForm({...form, max_backlogs:parseInt(e.target.value)})} 
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-4">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input 
                          type="checkbox" 
                          checked={form.auto_calc} 
                          onChange={e=>setForm({...form, auto_calc: e.target.checked})} 
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Auto-calculate eligibility on post</span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button 
                      onClick={create} 
                      disabled={loading} 
                      className="btn-primary text-white font-semibold py-3 px-8 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="loading-spinner"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Post Drive
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'posted' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Posted Drives</h2>
                <p className="text-gray-600 dark:text-gray-400">Drives available to students and pending coordinator review</p>
              </div>

              {/* Pending Drives Section */}
              {pendingDrives.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    Pending Coordinator Review ({pendingDrives.length})
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingDrives.map(drive => (
                      <div key={drive.drive_id} className="card card-hover p-6 border-l-4 border-yellow-500">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{drive.company_name}</h4>
                            <p className="text-blue-600 dark:text-blue-400 font-medium">{drive.job_title}</p>
                          </div>
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-medium">
                            Pending
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
                            <span className="font-medium text-gray-900 dark:text-white">{drive.domain_name}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteDrive(drive.drive_id)}
                            className="flex-1 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          >
                            Delete
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
                </div>
              )}

              {/* Posted Drives Section */}
              {postedDrives.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Published Drives ({postedDrives.length})
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {postedDrives.map(drive => (
                      <div key={drive.drive_id} className="card card-hover p-6 border-l-4 border-green-500">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{drive.company_name}</h4>
                            <p className="text-blue-600 dark:text-blue-400 font-medium">{drive.job_title}</p>
                          </div>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                            Published
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
                            <span className="font-medium text-gray-900 dark:text-white">{drive.domain_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Published:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {drive.published_at ? new Date(drive.published_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Are you sure you want to delete the drive "${drive.company_name} - ${drive.job_title}"? This will remove it from all panels and cannot be undone.`)) return;
                              try {
                                await api.delete(`/drives/${drive.drive_id}`);
                                alert('Drive deleted successfully!');
                                fetchDrives(); // Refresh the drives list
                              } catch (e) {
                                console.error('Delete error:', e);
                                alert('Error deleting drive: ' + (e.response?.data?.message || e.message));
                              }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                          {drive.pdf_path && (
                            <a
                              href={`http://localhost:5000${drive.pdf_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View PDF
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingDrives.length === 0 && postedDrives.length === 0 && (
                <div className="card p-12 text-center">
                  <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Drives Posted</h3>
                  <p className="text-gray-600 dark:text-gray-400">Create your first drive to get started</p>
                  <button 
                    onClick={() => setActiveTab('post')}
                    className="mt-4 btn-primary text-white px-6 py-2 rounded-lg"
                  >
                    Post New Drive
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ongoing' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ongoing Drives</h2>
                <p className="text-gray-600 dark:text-gray-400">Drives currently in progress</p>
              </div>

              {ongoingDrives.length === 0 ? (
                <div className="card p-12 text-center">
                  <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Ongoing Drives</h3>
                  <p className="text-gray-600 dark:text-gray-400">Drives in progress will appear here</p>
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
                      
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <div className="flex justify-between">
                          <span>Domain:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{drive.domain_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Interview Date:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {drive.interview_date ? new Date(drive.interview_date).toLocaleDateString() : 'TBD'}
                          </span>
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

          {activeTab === 'finished' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Finished Drives</h2>
                <p className="text-gray-600 dark:text-gray-400">Completed placement drives</p>
              </div>

              {completedDrives.length === 0 ? (
                <div className="card p-12 text-center">
                  <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Finished Drives</h3>
                  <p className="text-gray-600 dark:text-gray-400">Completed drives will appear here</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedDrives.map(drive => (
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
                          <span className="font-medium text-gray-900 dark:text-white">{drive.domain_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completed:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {drive.published_at ? new Date(drive.published_at).toLocaleDateString() : 'N/A'}
                          </span>
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