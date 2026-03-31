import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

// Enhanced modern color palette with vibrant, high-contrast colors
const PIE_COLORS = [
  '#3b82f6', // Vibrant Blue
  '#10b981', // Emerald Green
  '#a855f7', // Purple
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#8b5cf6'  // Violet
];

// Custom tooltip component with glassmorphism style
const CustomPieTooltip = ({ active, payload, isDark }) => {
  if (active && payload && payload[0]) {
    const { value, payload: data } = payload[0];
    const percent = data.percent ? (data.percent * 100).toFixed(1) : 'N/A';
    return (
      <div 
        className="px-3 py-2 rounded-lg backdrop-blur-md bg-opacity-90 border border-white border-opacity-20 shadow-2xl"
        style={{
          backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          boxShadow: isDark 
            ? '0 8px 32px 0 rgba(31, 38, 135, 0.37)' 
            : '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
        }}
      >
        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {data.company_name}
        </p>
        <p className={`text-xs font-medium ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
          {value} registrations
        </p>
        <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {percent}%
        </p>
      </div>
    );
  }
  return null;
};

// Custom label renderer with connector lines and better positioning
const renderCustomLabel = (entry, isDark, index, total) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, company_name } = entry;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
  
  // Only show label if segment is >= 5% to avoid crowding
  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill={isDark ? '#f8fafc' : '#0f172a'}
      className="text-xs font-semibold"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
    >
      {(percent * 100).toFixed(0)}%
    </text>
  );
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

      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Top Drives by Registrations</div>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <defs>
                {/* SVG gradients for enhanced visual depth */}
                <linearGradient id="grad-0" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={PIE_COLORS[0]} stopOpacity={1} />
                  <stop offset="100%" stopColor={PIE_COLORS[0]} stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={PIE_COLORS[1]} stopOpacity={1} />
                  <stop offset="100%" stopColor={PIE_COLORS[1]} stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={PIE_COLORS[2]} stopOpacity={1} />
                  <stop offset="100%" stopColor={PIE_COLORS[2]} stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={PIE_COLORS[3]} stopOpacity={1} />
                  <stop offset="100%" stopColor={PIE_COLORS[3]} stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="grad-4" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={PIE_COLORS[4]} stopOpacity={1} />
                  <stop offset="100%" stopColor={PIE_COLORS[4]} stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="grad-5" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={PIE_COLORS[5]} stopOpacity={1} />
                  <stop offset="100%" stopColor={PIE_COLORS[5]} stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="grad-6" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={PIE_COLORS[6]} stopOpacity={1} />
                  <stop offset="100%" stopColor={PIE_COLORS[6]} stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="grad-7" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={PIE_COLORS[7]} stopOpacity={1} />
                  <stop offset="100%" stopColor={PIE_COLORS[7]} stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="grad-8" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={PIE_COLORS[8]} stopOpacity={1} />
                  <stop offset="100%" stopColor={PIE_COLORS[8]} stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="grad-9" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={PIE_COLORS[9]} stopOpacity={1} />
                  <stop offset="100%" stopColor={PIE_COLORS[9]} stopOpacity={0.7} />
                </linearGradient>
                {/* Filter for glow effect */}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
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
                outerRadius={88}
                innerRadius={40}
                paddingAngle={4}
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
                onMouseEnter={(_, index) => setActiveSlice(index)}
                onMouseLeave={() => setActiveSlice(null)}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, company_name }, index) => {
                  if (percent < 0.05) return null;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
                  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                  return (
                    <text
                      x={x}
                      y={y}
                      fill={theme === 'dark' ? '#f8fafc' : '#0f172a'}
                      className="text-xs font-bold"
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                    >
                      {(percent * 100).toFixed(0)}%
                    </text>
                  );
                }}
              >
                {registrations.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.drive_id || index}`}
                    fill={`url(#grad-${index % 10})`}
                    opacity={activeSlice === null || activeSlice === index ? 1 : 0.6}
                    style={{
                      filter: activeSlice === index ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))' : 'none',
                      transition: 'opacity 200ms ease-out, filter 200ms ease-out',
                      cursor: 'pointer',
                      transform: activeSlice === index ? 'scale(1.02)' : 'scale(1)',
                      transformOrigin: `${entry.cx}px ${entry.cy}px`,
                    }}
                  />
                ))}
              </Pie>
              <Tooltip 
                content={<CustomPieTooltip isDark={theme === 'dark'} />}
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              />
              <Legend 
                wrapperStyle={{
                  paddingTop: '20px',
                  display: 'flex',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
                formatter={(value) => (
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: theme === 'dark' ? '#d1d5db' : '#374151',
                    letterSpacing: '0.3px'
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
