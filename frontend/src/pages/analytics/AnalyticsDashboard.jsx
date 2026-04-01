import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

// Modern dashboard palette focused on cyan, blue, teal, and purple.
const PIE_COLORS = [
  '#22d3ee',
  '#3b82f6',
  '#14b8a6',
  '#8b5cf6'
];

// Clean, minimal tooltip for donut slices.
const CustomPieTooltip = ({ active, payload, isDark }) => {
  if (active && payload && payload[0]) {
    const { value, payload: data } = payload[0];
    const percent = typeof data.percent === 'number' ? `${(data.percent * 100).toFixed(1)}%` : null;
    return (
      <div 
        className="px-3 py-2 rounded-lg border shadow-xl"
        style={{
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.96)',
          borderColor: isDark ? '#1e293b' : '#e2e8f0',
          boxShadow: isDark ? '0 10px 30px rgba(2, 6, 23, 0.45)' : '0 10px 30px rgba(15, 23, 42, 0.14)',
        }}
      >
        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {data.company_name}
        </p>
        <p className={`text-xs font-medium ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{value} registrations</p>
        {percent && <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{percent}</p>}
      </div>
    );
  }
  return null;
};

export default function AnalyticsDashboard({ role, drives }){
  const { theme } = useTheme();
  const [rangeDays, setRangeDays] = useState(30);
  const [summary, setSummary] = useState(null);
  const [drivesTrend, setDrivesTrend] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState('');
  const [activeSlice, setActiveSlice] = useState(null);

  useEffect(() => { 
    fetchAll();
    // Auto-refresh analytics every 30 seconds
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [rangeDays, selectedDrive]);

  async function fetchAll(){
    setLoading(true);
    try{
      const driveParam = selectedDrive ? `&drive_id=${selectedDrive}` : '';
      const s = await api.get(`/analytics/summary?days=${rangeDays}${driveParam}`);
      setSummary(s.data);
      const t = await api.get(`/analytics/drives-over-time?days=${rangeDays}${driveParam}`);
      setDrivesTrend(t.data || []);
      const r = await api.get(`/analytics/registrations-by-drive?days=${rangeDays}&limit=10${driveParam}`);
      setRegistrations(r.data || []);
      const a = await api.get(`/analytics/attendance-trend?days=${rangeDays}${driveParam}`);
      setAttendanceTrend(a.data || []);
    }catch(e){ console.error('analytics fetch error', e); }
    setLoading(false);
  }

  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#334155' : '#dbe3ee';
  const axisStroke = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle = {
    backgroundColor: isDark ? '#111827' : '#ffffff',
    border: isDark ? '1px solid #334155' : '1px solid #dbe3ee',
    borderRadius: '10px',
    color: isDark ? '#f1f5f9' : '#0f172a'
  };

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analytics</h2>
          {drives && drives.length > 0 && (
            <select 
              className="p-2.5 min-w-[220px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={selectedDrive} 
              onChange={e=>setSelectedDrive(e.target.value)}
            >
              <option value="">All Drives</option>
              {drives.map(d => (
                <option key={d.drive_id} value={d.drive_id}>
                  {d.company_name} - {d.job_title}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={rangeDays} onChange={e=>setRangeDays(parseInt(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-white dark:bg-gray-800 shadow-sm">
          <div className="text-sm text-blue-600 dark:text-blue-300">Total Drives</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary ? summary.total_drives : '—'}</div>
        </div>
        <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-white dark:bg-gray-800 shadow-sm">
          <div className="text-sm text-emerald-600 dark:text-emerald-300">Registrations</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary ? summary.registrations : '—'}</div>
        </div>
        <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-white dark:bg-gray-800 shadow-sm">
          <div className="text-sm text-amber-600 dark:text-amber-300">Attendance Rate</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary ? summary.attendance_rate_percent + '%' : '—'}</div>
        </div>
        <div className="p-4 rounded-xl border border-violet-100 dark:border-violet-900/40 bg-white dark:bg-gray-800 shadow-sm">
          <div className="text-sm text-violet-600 dark:text-violet-300">Finished</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary ? summary.finished : '—'}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Drives Over Time</div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={drivesTrend}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: axisStroke, fontSize: 12 }} />
                <YAxis tick={{ fill: axisStroke, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#60a5fa" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Attendance Trend (%)</div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={attendanceTrend}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: axisStroke, fontSize: 12 }} />
                <YAxis tick={{ fill: axisStroke, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="percent" stroke="#34d399" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 shadow-[0_18px_40px_rgba(2,6,23,0.45)] overflow-hidden">
        <div className="text-sm font-semibold text-slate-200 mb-4 tracking-wide">Top Drives by Registrations</div>
        <div className="w-full h-[360px] flex items-center justify-center">
          <ResponsiveContainer>
            <PieChart margin={{ top: 14, right: 14, bottom: 14, left: 14 }}>
              <defs>
                {registrations.map((entry, index) => {
                  const start = PIE_COLORS[index % PIE_COLORS.length];
                  const end = PIE_COLORS[(index + 1) % PIE_COLORS.length];
                  return (
                    <linearGradient key={`grad-${entry.drive_id || index}`} id={`grad-${entry.drive_id || index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={start} stopOpacity={1} />
                      <stop offset="100%" stopColor={end} stopOpacity={0.82} />
                    </linearGradient>
                  );
                })}
                <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="10" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <Pie
                data={registrations}
                dataKey="registrations"
                nameKey="company_name"
                cx="50%"
                cy="50%"
                outerRadius={128}
                innerRadius={72}
                paddingAngle={0}
                animationBegin={0}
                animationDuration={700}
                animationEasing="ease-in-out"
                onMouseEnter={(_, index) => setActiveSlice(index)}
                onMouseLeave={() => setActiveSlice(null)}
                label={false}
                labelLine={false}
                stroke="none"
                style={{ filter: 'drop-shadow(0 16px 26px rgba(34, 211, 238, 0.22))' }}
              >
                {registrations.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.drive_id || index}`}
                    fill={`url(#grad-${entry.drive_id || index})`}
                    stroke="none"
                    opacity={activeSlice === null || activeSlice === index ? 1 : 0.58}
                    style={{
                      filter: activeSlice === index ? 'drop-shadow(0 0 18px rgba(59, 130, 246, 0.45))' : 'url(#softGlow)',
                      transition: 'opacity 260ms ease, filter 260ms ease',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Pie>
              <Tooltip 
                content={<CustomPieTooltip isDark={theme === 'dark'} />}
                cursor={false}
              />
              <Legend 
                iconType="circle"
                wrapperStyle={{
                  paddingTop: '14px',
                  display: 'flex',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
                formatter={(value) => (
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#cbd5e1',
                    letterSpacing: '0.2px'
                  }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4">
          <table className="w-full table-auto text-left text-gray-700 dark:text-gray-200">
            <thead>
              <tr className="text-sm text-gray-500 dark:text-gray-400">
                <th className="p-2">Drive</th>
                <th className="p-2">Registrations</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map(r => (
                <tr key={r.drive_id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-2">{r.company_name} — {r.job_title}</td>
                  <td className="p-2">{r.registrations}</td>
                  <td className="p-2">
                    <button onClick={()=> window.open(`/drives/${r.drive_id}`)} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors">Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
