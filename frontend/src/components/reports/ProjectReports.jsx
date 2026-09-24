import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  LineChart,
  BarChart2,
  PieChart,
  Download,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

const ProjectReports = ({ projectId, projectName }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get(`/projects/${projectId}/reports`);
        if (res.success) {
          setReportData(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [projectId]);

  const handleExportJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'Project'}_Report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Aggregating sprint metrics and burndown...</div>;
  }

  const { statusDistribution = {}, priorityDistribution = {}, velocityData = [], burndown = [], issueStats = {} } =
    reportData || {};

  const totalTasks =
    (statusDistribution.backlog || 0) +
    (statusDistribution.todo || 0) +
    (statusDistribution.in_progress || 0) +
    (statusDistribution.in_review || 0) +
    (statusDistribution.done || 0);

  // SVG Burndown rendering dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = 35;
  const maxPoints = Math.max(...burndown.map((d) => Math.max(d.ideal || 0, d.actual || 0)), 30);

  const getX = (index) => padding + (index * (svgWidth - 2 * padding)) / (burndown.length - 1 || 1);
  const getY = (val) => svgHeight - padding - ((val || 0) * (svgHeight - 2 * padding)) / (maxPoints || 1);

  const idealPath = burndown
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.ideal)}`)
    .join(' ');

  const actualPoints = burndown.filter((d) => d.actual !== null);
  const actualPath = actualPoints
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.actual)}`)
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <LineChart className="w-5 h-5 text-indigo-600" />
            Project Reports, Burndown & Velocity Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time execution telemetry, sprint burndown curve, and quality assurance rates.
          </p>
        </div>

        <button
          onClick={handleExportJSON}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors border border-slate-200 shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          Export JSON Report
        </button>
      </div>

      {/* Grid: Burndown Chart & Velocity History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Sprint Burndown Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-indigo-600" />
                Active Sprint Burndown Curve
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ideal trajectory vs remaining story points
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400 inline-block" />
                Ideal Guide
              </span>
              <span className="flex items-center gap-1 text-indigo-600">
                <span className="w-3 h-0.5 bg-indigo-600 inline-block rounded" />
                Actual Burn
              </span>
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none">
              {/* Grid lines */}
              <line
                x1={padding}
                y1={svgHeight - padding}
                x2={svgWidth - padding}
                y2={svgHeight - padding}
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />
              <line
                x1={padding}
                y1={padding}
                x2={padding}
                y2={svgHeight - padding}
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />

              {/* Y-axis labels */}
              <text x={padding - 6} y={getY(0)} textAnchor="end" fontSize="9" fill="#94a3b8">
                0
              </text>
              <text x={padding - 6} y={getY(Math.round(maxPoints / 2))} textAnchor="end" fontSize="9" fill="#94a3b8">
                {Math.round(maxPoints / 2)}
              </text>
              <text x={padding - 6} y={getY(maxPoints)} textAnchor="end" fontSize="9" fill="#94a3b8">
                {maxPoints} pts
              </text>

              {/* Ideal Guide Line (Dashed) */}
              {idealPath && (
                <path d={idealPath} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
              )}

              {/* Actual Line */}
              {actualPath && (
                <path d={actualPath} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
              )}

              {/* Actual Dots */}
              {actualPoints.map((d, i) => (
                <g key={i}>
                  <circle cx={getX(i)} cy={getY(d.actual)} r="4" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
                  <text
                    x={getX(i)}
                    y={getY(d.actual) - 8}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#312e81"
                  >
                    {d.actual}
                  </text>
                </g>
              ))}

              {/* X-axis labels */}
              {burndown.map((d, i) => {
                if (i % 2 === 0 || i === burndown.length - 1) {
                  return (
                    <text
                      key={i}
                      x={getX(i)}
                      y={svgHeight - padding + 15}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#64748b"
                    >
                      {d.day}
                    </text>
                  );
                }
                return null;
              })}
            </svg>
          </div>
        </div>

        {/* Sprint Velocity History */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                Sprint Velocity Progression
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Story points planned vs completed per iteration
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {velocityData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No sprints on record</p>
            ) : (
              velocityData.map((s) => {
                const percent =
                  s.plannedPoints > 0 ? Math.min(100, Math.round((s.completedPoints / s.plannedPoints) * 100)) : 0;

                return (
                  <div key={s.sprintId} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate max-w-[200px]">
                        {s.name}
                      </span>
                      <span className="text-slate-500 font-semibold">
                        <strong className="text-emerald-600">{s.completedPoints}</strong> /{' '}
                        {s.plannedPoints} pts ({percent}%)
                      </span>
                    </div>

                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Task & Priority Distribution Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Tasks by Status
          </h4>
          <div className="space-y-2 text-xs">
            {[
              { label: 'Backlog', count: statusDistribution.backlog || 0, color: 'bg-zinc-400' },
              { label: 'To Do', count: statusDistribution.todo || 0, color: 'bg-slate-400' },
              { label: 'In Progress', count: statusDistribution.in_progress || 0, color: 'bg-indigo-500' },
              { label: 'In Review', count: statusDistribution.in_review || 0, color: 'bg-purple-500' },
              { label: 'Done', count: statusDistribution.done || 0, color: 'bg-emerald-500' }
            ].map((st) => (
              <div key={st.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                  <span className="text-slate-600">{st.label}</span>
                </div>
                <span className="font-bold text-slate-800">
                  {st.count} ({totalTasks > 0 ? Math.round((st.count / totalTasks) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Tasks by Priority
          </h4>
          <div className="space-y-2 text-xs">
            {[
              { label: 'Urgent', count: priorityDistribution.urgent || 0, color: 'bg-rose-500' },
              { label: 'High', count: priorityDistribution.high || 0, color: 'bg-amber-500' },
              { label: 'Medium', count: priorityDistribution.medium || 0, color: 'bg-blue-500' },
              { label: 'Low', count: priorityDistribution.low || 0, color: 'bg-slate-400' }
            ].map((pr) => (
              <div key={pr.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${pr.color}`} />
                  <span className="text-slate-600">{pr.label}</span>
                </div>
                <span className="font-bold text-slate-800">
                  {pr.count} ({totalTasks > 0 ? Math.round((pr.count / totalTasks) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Issue Quality Assurance Metrics */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Quality Assurance Summary
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Total Logged Defects</span>
              <strong className="text-slate-900">{issueStats.total || 0}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Resolved Defects</span>
              <strong className="text-emerald-600">{issueStats.resolved || 0}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Open Critical Bugs</span>
              <strong className="text-rose-600">{issueStats.critical || 0}</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Resolution Velocity</span>
              <strong className="text-indigo-600">{issueStats.resolutionRate || 100}%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectReports;
