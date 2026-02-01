import { useState } from 'react';
import api from '../../services/api';

export default function FinishedDrivesDownload() {
  const [dateRange, setDateRange] = useState('3months');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleDownloadPDF() {
    setLoading(true);
    try {
      let url = '/finished-drives/download-pdf';
      let params = {};

      if (dateRange === 'custom') {
        if (!startDate || !endDate) {
          alert('Please select both start and end dates');
          setLoading(false);
          return;
        }
        params.start_date = startDate;
        params.end_date = endDate;
      } else if (dateRange === 'all') {
        // No params needed, will fetch all
      } else {
        // Extract months from '3months', '6months'
        const months = parseInt(dateRange);
        params.months = months;
      }

      const response = await api.get(url, { 
        params, 
        responseType: 'blob' 
      });

      // Create blob link to download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `finished-drives-${dateRange}-${Date.now()}.pdf`;
      link.click();
      
      setLoading(false);
    } catch (error) {
      console.error('PDF download error:', error);
      alert('Failed to download PDF. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => window.history.back()}
          className="mb-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
        >
          ← Back
        </button>

        <div className="card p-8">
          <h1 className="text-3xl font-bold mb-6">Download Finished Drives Report</h1>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Select Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input w-full"
            >
              <option value="3">Last 3 Months</option>
              <option value="6">Last 6 Months</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleDownloadPDF}
            disabled={loading}
            className={`w-full py-4 rounded-lg font-bold text-lg transition ${
              loading
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Generating PDF...' : 'Download PDF'}
          </button>

          <div className="mt-6 p-4 bg-slate-700 rounded-lg">
            <h3 className="font-semibold mb-2">Report will include:</h3>
            <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
              <li>Company Name & Job Title</li>
              <li>Interview Date</li>
              <li>Total Registered Students</li>
              <li>Total Present & Absent</li>
              <li>Completion Date</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
