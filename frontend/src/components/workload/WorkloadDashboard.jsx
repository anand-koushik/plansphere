import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertOctagon,
  ChevronDown,
  Layers
} from 'lucide-react';
import { getPriorityBadge, getStatusBadge } from '../../utils/helpers';

const WorkloadDashboard = ({ projectId, activeSprint }) => {
  const [sprintFilter, setSprintFilter] = useState(activeSprint?._id || 'all');
  const [sprints, setSprints] = useState([]);
  const [workloadData, setWorkloadData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);

  // Load sprints list
  useEffect(() => {
    const fetchSprints = async () => {
      try {
        const res = await api.get(`/projects/${projectId}/sprints`);
        if (res.success) setSprints(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSprints();
  }, [projectId]);

  // Load workload breakdown
  const fetchWorkload = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/projects/${projectId}/workload`, {
        sprintId: sprintFilter
      });
      if (res.success) {
        setWorkloadData(res);
      }
    } catch (err) {
      console.error('Error fetching workload:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkload();
  }, [projectId, sprintFilter]);

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Computing team workload allocations...</div>;
  }

  const { summary, members = [], unassigned } = workloadData || {};

  return (
    <div className="space-y-6">
      {/* Top Banner & Sprint Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Team Workload & Capacity Balancing
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor developer allocation, detect capacity bottlenecks, and prevent burnout.
          </p>
        </div>

        {/* Sprint Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Scope:</label>
          <select
            value={sprintFilter}
            onChange={(e) => setSprintFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Sprints</option>
            {activeSprint && <option value={activeSprint._id}>Active: {activeSprint.name}</option>}
            {sprints
              .filter((s) => s._id !== activeSprint?._id)
              .map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.status})
                </option>
              ))}
            <option value="backlog">Backlog Only</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Points */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Committed Points
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {summary?.totalTeamPoints || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {summary?.completedTeamPoints || 0} points done ({summary?.overallCompletion || 0}%)
          </span>
        </div>

        {/* Team Members */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Active Team Size
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {summary?.totalTeamMembers || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Standard capacity: 13 pts/member</span>
        </div>

        {/* Overloaded Warning */}
        <div
          className={`p-4 rounded-2xl border shadow-2xs ${
            (summary?.overloadedMembersCount || 0) > 0
              ? 'bg-rose-50/60 border-rose-200 text-rose-950'
              : 'bg-white border-slate-200/80 text-slate-900'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Overloaded Members
          </span>
          <div className="text-2xl font-black mt-1 flex items-center gap-2">
            <span
              className={
                (summary?.overloadedMembersCount || 0) > 0 ? 'text-rose-600' : 'text-slate-900'
              }
            >
              {summary?.overloadedMembersCount || 0}
            </span>
            {(summary?.overloadedMembersCount || 0) > 0 && (
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />
            )}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {(summary?.overloadedMembersCount || 0) > 0
              ? 'Rebalance assigned tasks'
              : 'All loads within limits'}
          </span>
        </div>

        {/* Unassigned Work */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Unassigned Work
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {summary?.unassignedTasksCount || 0} tasks
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {summary?.unassignedPoints || 0} story points pending assignment
          </span>
        </div>
      </div>

      {/* Member Cards Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Capacity Allocation by Engineer
        </h3>

        <div className="space-y-3">
          {members.map((m) => {
            const isOverloaded = m.isOverloaded;
            const isExpanded = expandedUser === m.user._id;

            return (
              <div
                key={m.user._id}
                className={`bg-white rounded-2xl border transition-all p-4 shadow-2xs ${
                  isOverloaded
                    ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={m.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user.name}`}
                      alt={m.user.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{m.user.name}</h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {m.role}
                        </span>
                        {isOverloaded && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Overloaded ({m.totalPoints}/13 pts)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{m.user.jobTitle}</p>
                    </div>
                  </div>

                  {/* Points & Stats */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-800">
                        {m.totalPoints} / {m.capacityPoints} pts
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        {m.utilization}% Capacity
                      </span>
                    </div>

                    <button
                      onClick={() => setExpandedUser(isExpanded ? null : m.user._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-transform"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverloaded
                          ? 'bg-rose-500'
                          : m.utilization > 75
                          ? 'bg-indigo-600'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, m.utilization)}%` }}
                    />
                  </div>
                </div>

                {/* Quick Task Status Pills */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  <span>
                    Total Tasks: <strong className="text-slate-800">{m.totalTasks}</strong>
                  </span>
                  <span>
                    In Progress: <strong className="text-indigo-600">{m.inProgressTasks}</strong>
                  </span>
                  <span>
                    Done: <strong className="text-emerald-600">{m.completedTasks}</strong>
                  </span>
                  {m.blockedTasks > 0 && (
                    <span className="text-rose-600 font-bold">
                      Blocked: {m.blockedTasks}
                    </span>
                  )}
                </div>

                {/* Expanded Task List */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Assigned Work Items
                    </p>
                    {m.tasks.map((task) => (
                      <div
                        key={task._id}
                        className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                            {task.taskNumber}
                          </span>
                          <span className="truncate text-slate-700">{task.title}</span>
                          {task.isBlocked && (
                            <span className="text-[10px] text-red-600 bg-red-100 px-1 rounded font-bold">
                              Blocked
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${getStatusBadge(task.status).bg}`}>
                            {task.status}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600">
                            {task.storyPoints} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkloadDashboard;
