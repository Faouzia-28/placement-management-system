import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function AnalyticsDashboard({ role, drives }){
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

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Analytics</h2>
          {drives && drives.length > 0 && (
            <select 
              className="p-2 bg-slate-800 rounded min-w-[200px]" 
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
          <select className="p-2 bg-slate-800 rounded" value={rangeDays} onChange={e=>setRangeDays(parseInt(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800 rounded">
          <div className="text-sm text-gray-400">Total Drives</div>
          <div className="text-2xl font-bold">{summary ? summary.total_drives : '—'}</div>
        </div>
        <div className="p-4 bg-slate-800 rounded">
          <div className="text-sm text-gray-400">Registrations</div>
          <div className="text-2xl font-bold">{summary ? summary.registrations : '—'}</div>
        </div>
        <div className="p-4 bg-slate-800 rounded">
          <div className="text-sm text-gray-400">Attendance Rate</div>
          <div className="text-2xl font-bold">{summary ? summary.attendance_rate_percent + '%' : '—'}</div>
        </div>
        <div className="p-4 bg-slate-800 rounded">
          <div className="text-sm text-gray-400">Finished</div>
          <div className="text-2xl font-bold">{summary ? summary.finished : '—'}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-800 rounded">
          <div className="text-sm text-gray-400 mb-2">Drives Over Time</div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={drivesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#60a5fa" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 bg-slate-800 rounded">
          <div className="text-sm text-gray-400 mb-2">Attendance Trend (%)</div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="percent" stroke="#34d399" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-800 rounded">
        <div className="text-sm text-gray-400 mb-2">Top Drives by Registrations</div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={registrations} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="company_name" width={150} />
              <Tooltip />
              <Bar dataKey="registrations" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4">
          <table className="w-full table-auto text-left">
            <thead>
              <tr className="text-sm text-gray-400">
                <th className="p-2">Drive</th>
                <th className="p-2">Registrations</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map(r => (
                <tr key={r.drive_id} className="border-t border-slate-700">
                  <td className="p-2">{r.company_name} — {r.job_title}</td>
                  <td className="p-2">{r.registrations}</td>
                  <td className="p-2">
                    <button onClick={()=> window.open(`/drives/${r.drive_id}`)} className="px-3 py-1 bg-blue-600 rounded">Open</button>
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
