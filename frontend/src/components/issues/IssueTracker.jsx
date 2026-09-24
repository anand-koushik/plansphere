import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import IssueDetailModal from './IssueDetailModal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Bug,
  Plus,
  Search,
  Filter,
  AlertOctagon,
  CheckCircle2,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { formatDate, getSeverityBadge, getStatusBadge, getPriorityBadge } from '../../utils/helpers';

const IssueTracker = ({ projectId, initialIssueId }) => {
  const { user, isStakeholder } = useAuth();
  const [issues, setIssues] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected issue modal
  const [selectedIssueId, setSelectedIssueId] = useState(initialIssueId || null);
  const [isDetailOpen, setIsDetailOpen] = useState(Boolean(initialIssueId));

  // Report Issue Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [priority, setPriority] = useState('medium');
  const [reproductionSteps, setReproductionSteps] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [assignee, setAssignee] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchIssues = async () => {
    try {
      const [issuesRes, membersRes] = await Promise.all([
        api.get(`/projects/${projectId}/issues`),
        api.get(`/projects/${projectId}/members`)
      ]);

      if (issuesRes.success) setIssues(issuesRes.data);
      if (membersRes.success) setTeamMembers(membersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [projectId]);

  useEffect(() => {
    if (initialIssueId) {
      setSelectedIssueId(initialIssueId);
      setIsDetailOpen(true);
    }
  }, [initialIssueId]);

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!title.trim() || isStakeholder) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/projects/${projectId}/issues`, {
        title: title.trim(),
        description: description.trim(),
        severity,
        priority,
        reproductionSteps,
        expectedBehavior,
        actualBehavior,
        assignee: assignee || null
      });

      if (res.success) {
        setIssues((prev) => [res.issue, ...prev]);
        setShowCreateModal(false);
        setTitle('');
        setDescription('');
        setReproductionSteps('');
        setExpectedBehavior('');
        setActualBehavior('');
        setAssignee('');
      }
    } catch (err) {
      alert('Failed to report issue: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIssues = issues.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = i.title?.toLowerCase().includes(q);
      const matchNum = i.issueNumber?.toLowerCase().includes(q);
      if (!matchTitle && !matchNum) return false;
    }
    return true;
  });

  const criticalCount = issues.filter((i) => i.severity === 'critical' && !['resolved', 'closed'].includes(i.status)).length;
  const highCount = issues.filter((i) => i.severity === 'high' && !['resolved', 'closed'].includes(i.status)).length;
  const resolvedCount = issues.filter((i) => ['resolved', 'closed'].includes(i.status)).length;

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading issue tracker...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Bug className="w-5 h-5 text-rose-600" />
            Issue Tracker & Quality Assurance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log software defects, document reproduction steps, and trace resolution history.
          </p>
        </div>

        {!isStakeholder && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-rose-600/20"
          >
            <Plus className="w-4 h-4" />
            Report Issue
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Issues
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{issues.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">{resolvedCount} resolved</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Critical Defect Backlog
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1 flex items-center gap-2">
            {criticalCount}
            {criticalCount > 0 && <AlertOctagon className="w-5 h-5 text-rose-500" />}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Requires immediate patch</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            High Severity
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">{highCount}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Active investigation</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Resolution Rate
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {issues.length > 0 ? Math.round((resolvedCount / issues.length) * 100) : 100}%
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Closed or resolved</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Severity */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-semibold">
          Showing {filteredIssues.length} of {issues.length} issues
        </span>
      </div>

      {/* Issues Table List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Key</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Reported</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No issues found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr
                    key={issue._id}
                    onClick={() => {
                      setSelectedIssueId(issue._id);
                      setIsDetailOpen(true);
                    }}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">
                      {issue.issueNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      {issue.title}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${getSeverityBadge(issue.severity).bg}`}>
                        {issue.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${getPriorityBadge(issue.priority).bg}`}>
                        {issue.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${getStatusBadge(issue.status).bg}`}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {issue.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={issue.assignee.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${issue.assignee.name}`}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span className="truncate max-w-[100px]">{issue.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {formatDate(issue.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Detail Modal */}
      {selectedIssueId && (
        <IssueDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedIssueId(null);
          }}
          issueId={selectedIssueId}
          projectId={projectId}
          onIssueUpdated={(updated) => {
            setIssues((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
          }}
          teamMembers={teamMembers}
        />
      )}

      {/* Create Issue Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Report New Bug / Issue"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateIssue} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Issue Summary
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Memory leak during high concurrency WebSocket payload bursts"
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-rose-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-rose-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Assignee
              </label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-rose-500"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.user?._id || m._id} value={m.user?._id || m._id}>
                    {m.user?.name || m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Reproduction Steps
            </label>
            <textarea
              rows={3}
              value={reproductionSteps}
              onChange={(e) => setReproductionSteps(e.target.value)}
              placeholder="1. Navigate to...\n2. Click...\n3. Observe..."
              className="w-full text-xs font-mono border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Expected Behavior
              </label>
              <input
                type="text"
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                placeholder="What should happen..."
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Actual Behavior
              </label>
              <input
                type="text"
                value={actualBehavior}
                onChange={(e) => setActualBehavior(e.target.value)}
                placeholder="What actually happens..."
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-rose-600/20"
            >
              {submitting ? 'Submitting...' : 'Report Bug'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default IssueTracker;
