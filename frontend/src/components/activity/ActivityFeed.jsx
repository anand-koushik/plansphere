import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  History,
  CheckCircle,
  MoveRight,
  AlertTriangle,
  MessageSquare,
  Zap,
  FolderKanban,
  Flag,
  User
} from 'lucide-react';
import { formatRelativeTime } from '../../utils/helpers';

const ActivityFeed = ({ projectId }) => {
  const [activities, setActivities] = useState([]);
  const [entityFilter, setEntityFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const params = {};
      if (entityFilter !== 'all') params.entityType = entityFilter;

      const res = await api.get(`/activities/project/${projectId}`, params);
      if (res.success) {
        setActivities(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [projectId, entityFilter]);

  const getActionBadge = (action) => {
    switch (action) {
      case 'created_task':
      case 'created_sprint':
      case 'created_milestone':
      case 'created_project':
        return { label: 'Created', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'moved_task':
      case 'changed_task_status':
      case 'updated_issue_status':
        return { label: 'Status Update', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'resolved_issue':
        return { label: 'Resolved', color: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'blocked_task':
        return { label: 'Blocked', color: 'bg-red-50 text-red-700 border-red-200' };
      case 'unblocked_task':
        return { label: 'Unblocked', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'added_comment':
        return { label: 'Comment', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: 'Updated', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading project activity feed...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Project Audit Trail & Change Activity
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log recording task movements, blocker flags, comment threads, and sprint milestones.
          </p>
        </div>

        {/* Filter */}
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Events</option>
          <option value="task">Tasks Only</option>
          <option value="issue">Issues & Bugs</option>
          <option value="sprint">Sprints</option>
          <option value="comment">Comments & Mentions</option>
        </select>
      </div>

      {/* Activity Timeline Stream */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        {activities.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No activity recorded yet for this project.
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 ml-3.5 space-y-6 py-2">
            {activities.map((act) => {
              const badge = getActionBadge(act.action);

              return (
                <div key={act._id} className="relative pl-6 text-xs">
                  {/* Bullet */}
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 ring-4 ring-white" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <img
                        src={act.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${act.user?.name}`}
                        alt={act.user?.name}
                        className="w-5 h-5 rounded-full object-cover border border-slate-200"
                      />
                      <strong className="text-slate-900">{act.user?.name}</strong>
                      <span className={`px-2 py-0.2 rounded-full font-bold text-[10px] border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="font-semibold text-slate-800">{act.entityTitle}</span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatRelativeTime(act.createdAt)}
                    </span>
                  </div>

                  {/* Details box if present */}
                  {act.details && Object.keys(act.details).length > 0 && (
                    <div className="mt-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 font-sans">
                      {act.details.from && act.details.to && (
                        <span>
                          Moved from <strong className="text-slate-800">{act.details.from}</strong> to{' '}
                          <strong className="text-indigo-600">{act.details.to}</strong>
                        </span>
                      )}
                      {act.details.blockerReason && (
                        <span className="text-red-700 font-medium block">
                          Blocker Reason: {act.details.blockerReason}
                        </span>
                      )}
                      {act.details.snippet && (
                        <span className="italic block text-slate-500">
                          "{act.details.snippet}"
                        </span>
                      )}
                      {act.details.resolutionNotes && (
                        <span className="text-teal-700 font-medium block">
                          Resolution: {act.details.resolutionNotes}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
