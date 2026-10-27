import React, { useState } from 'react';
import { Download, ArrowUpDown, Search } from 'lucide-react';
import { AlignedInterval } from '../types';

interface IntervalTableProps {
  intervals: AlignedInterval[];
}

export const IntervalTable: React.FC<IntervalTableProps> = ({ intervals }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof AlignedInterval>('startTime');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Filter
  const filtered = intervals.filter((item) =>
    item.startTime.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.forecastPublishTime.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (valA === null) return 1;
    if (valB === null) return -1;
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (field: keyof AlignedInterval) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const exportCSV = () => {
    const headers = ['Delivery Start Time (UTC)', 'Forecast Publish Time (UTC)', 'Forecast (MW)', 'Actual (MW)', 'Error (MW)', 'Abs Error (MW)', 'Pct Error (%)'];
    const rows = intervals.map((i) => [
      i.startTime,
      i.forecastPublishTime,
      i.forecast,
      i.actual,
      i.error,
      i.absError,
      i.pctError !== null ? i.pctError : ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `uk_wind_forecast_accuracy_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-card p-5 shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Settlement Interval Accuracy Ledger</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Detailed 30-minute matching intervals comparing selected forecast against Elexon actuals
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search timestamp..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-cyan"
            />
          </div>

          <button
            onClick={exportCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('startTime')}>
                <div className="flex items-center space-x-1">
                  <span>Delivery Interval (UTC)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('forecastPublishTime')}>
                <div className="flex items-center space-x-1">
                  <span>Forecast Published</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('forecast')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Forecast (MW)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('actual')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Actual (MW)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('error')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Error (MW)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('pctError')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Pct Error</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-card">
            {paginated.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2 px-3 text-slate-200">
                  {new Date(item.startTime).toISOString().replace('.000Z', 'Z').replace('T', ' ')}
                </td>
                <td className="py-2 px-3 text-slate-400 text-[11px]">
                  {new Date(item.forecastPublishTime).toISOString().replace('.000Z', 'Z').replace('T', ' ')}
                </td>
                <td className="py-2 px-3 text-right text-brand-sky font-semibold">
                  {item.forecast.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right text-brand-emerald font-semibold">
                  {item.actual.toLocaleString()}
                </td>
                <td className={`py-2 px-3 text-right font-semibold ${item.error >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {item.error >= 0 ? `+${item.error.toLocaleString()}` : item.error.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right text-slate-300">
                  {item.pctError !== null ? `${item.pctError.toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
        <span>
          Showing {sorted.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length} intervals
        </span>

        <div className="flex items-center space-x-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Prev
          </button>
          <span className="font-mono">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
