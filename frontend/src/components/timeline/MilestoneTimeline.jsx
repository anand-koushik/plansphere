import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarDays,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Flag,
  Target,
  ChevronRight
} from 'lucide-react';
import { formatDate } from '../../utils/helpers';

const MilestoneTimeline = ({ projectId }) => {
  const { canLeadTeam } = useAuth();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Milestone Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('planned');
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchMilestones = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/milestones`);
      if (res.success) {
        setMilestones(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dueDate || !canLeadTeam) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/projects/${projectId}/milestones`, {
        title: title.trim(),
        description: description.trim(),
        dueDate,
        status,
        progress: Number(progress)
      });
      if (res.success) {
        setShowCreateModal(false);
        setTitle('');
        setDescription('');
        setDueDate('');
        setProgress(0);
        fetchMilestones();
      }
    } catch (err) {
      alert('Failed to create milestone: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusDisplay = (st, due) => {
    const isPast = new Date(due) < new Date();
    if (st === 'achieved') {
      return {
        label: 'Achieved',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle
      };
    }
    if (st === 'in_progress') {
      return {
        label: isPast ? 'Delayed / In Progress' : 'In Progress',
        bg: isPast
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: isPast ? AlertCircle : Clock
      };
    }
    if (isPast && st !== 'achieved') {
      return {
        label: 'Delayed',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: AlertCircle
      };
    }
    return {
      label: 'Planned',
      bg: 'bg-slate-50 text-slate-700 border-slate-200',
      icon: Target
    };
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading project timeline...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            Project Milestones & Timeline Progression
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Key deliverables, risk-adjusted target dates, and completion metrics.
          </p>
        </div>

        {canLeadTeam && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Add Milestone
          </button>
        )}
      </div>

      {/* Timeline Gantt-Style Flow Cards */}
      <div className="space-y-4">
        {milestones.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 text-xs">
            No milestones planned yet. Create your first milestone to establish deadlines.
          </div>
        ) : (
          milestones.map((m, index) => {
            const statusInfo = getStatusDisplay(m.status, m.dueDate);
            const StatusIcon = statusInfo.icon;
            const effProgress = m.taskStats?.calculatedProgress ?? m.progress;

            return (
              <div
                key={m._id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
                      <Flag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{m.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{m.description || 'No description'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusInfo.label}
                    </span>

                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                      Due {formatDate(m.dueDate)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Task Stats */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>
                      Linked Tasks:{' '}
                      <strong className="text-slate-900">
                        {m.taskStats?.completed || 0} / {m.taskStats?.total || 0} Done
                      </strong>
                    </span>
                    <span className="text-indigo-600 font-bold">{effProgress}%</span>
                  </div>

                  {/* Visual Bar */}
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        effProgress === 100
                          ? 'bg-emerald-500'
                          : m.status === 'delayed'
                          ? 'bg-rose-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, effProgress)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Milestone Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Project Milestone"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Milestone Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SOC2 Compliance Sign-off"
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key deliverable details..."
              className="w-full text-xs border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="achieved">Achieved</option>
                <option value="delayed">Delayed</option>
              </select>
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
              disabled={submitting || !title.trim() || !dueDate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20"
            >
              {submitting ? 'Creating...' : 'Save Milestone'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MilestoneTimeline;
