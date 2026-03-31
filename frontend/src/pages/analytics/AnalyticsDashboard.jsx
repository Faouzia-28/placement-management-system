import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const PIE_COLORS = ['#60a5fa', '#34d399', '#f59e0b', '#a78bfa', '#f472b6', '#22d3ee', '#f87171', '#84cc16', '#f97316', '#2dd4bf'];

export default function AnalyticsDashboard({ role, drives }){
  const { theme } = useTheme();
  const [rangeDays, setRangeDays] = useState(30);
  const [summary, setSummary] = useState(null);
  const [drivesTrend, setDrivesTrend] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState('');

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

      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Top Drives by Registrations</div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={registrations}
                dataKey="registrations"
                nameKey="company_name"
                cx="50%"
                cy="50%"
                outerRadius={88}
                innerRadius={32}
                paddingAngle={2}
                label={({ company_name, percent }) => `${company_name} ${(percent * 100).toFixed(0)}%`}
              >
                {registrations.map((entry, index) => (
                  <Cell key={`cell-${entry.drive_id || index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}`, 'Registrations']} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
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
