import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  History,
  Paperclip,
  UploadCloud,
  FileText,
  User,
  ShieldAlert,
  Send
} from 'lucide-react';
import { formatDate, formatRelativeTime, getSeverityBadge, getStatusBadge } from '../../utils/helpers';

const IssueDetailModal = ({
  isOpen,
  onClose,
  issueId,
  projectId,
  onIssueUpdated,
  teamMembers = []
}) => {
  const { isStakeholder } = useAuth();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Status transition form
  const [status, setStatus] = useState('open');
  const [severity, setSeverity] = useState('medium');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState('');
  const [statusChangeNote, setStatusChangeNote] = useState('');

  // Explicit resolve form
  const [showResolveBox, setShowResolveBox] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchIssue = async () => {
    if (!issueId || !isOpen) return;
    setLoading(true);
    try {
      const res = await api.get(`/projects/${projectId}/issues/${issueId}`);
      if (res.success) {
        const i = res.issue;
        setIssue(i);
        setStatus(i.status);
        setSeverity(i.severity);
        setPriority(i.priority);
        setAssignee(i.assignee?._id || '');
        setResolutionNotes(i.resolutionNotes || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
  }, [issueId, isOpen, projectId]);

  const handleUpdate = async () => {
    if (isStakeholder) return;
    setSaving(true);
    try {
      const res = await api.put(`/projects/${projectId}/issues/${issueId}`, {
        status,
        severity,
        priority,
        assignee: assignee || null,
        statusChangeNote: statusChangeNote.trim() || undefined
      });

      if (res.success) {
        setIssue(res.issue);
        onIssueUpdated(res.issue);
        setStatusChangeNote('');
        alert('Issue updated successfully');
      }
    } catch (err) {
      alert('Failed to update issue: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (isStakeholder) return;

    try {
      const res = await api.post(`/projects/${projectId}/issues/${issueId}/resolve`, {
        resolutionNotes: resolutionNotes.trim()
      });
      if (res.success) {
        setIssue(res.issue);
        setStatus('resolved');
        setShowResolveBox(false);
        onIssueUpdated(res.issue);
      }
    } catch (err) {
      alert('Failed to resolve issue: ' + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || isStakeholder) return;

    setUploading(true);
    try {
      const res = await api.upload(`/projects/${projectId}/issues/${issueId}/attachments`, file);
      if (res.success) {
        setIssue((prev) => ({ ...prev, attachments: res.attachments }));
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading issue details...</div>
      ) : !issue ? (
        <div className="py-16 text-center text-slate-400 text-sm">Issue not found</div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                {issue.issueNumber}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getSeverityBadge(issue.severity).bg}`}>
                {issue.severity.toUpperCase()} SEVERITY
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(issue.status).bg}`}>
                {issue.status}
              </span>
            </div>

            {!isStakeholder && issue.status !== 'resolved' && (
              <button
                onClick={() => setShowResolveBox(!showResolveBox)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Resolve Bug
              </button>
            )}
          </div>

          {/* Resolve input drawer if triggered */}
          {showResolveBox && (
            <form onSubmit={handleResolve} className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Mark Issue as Resolved
              </h4>
              <textarea
                rows={2}
                required
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain the root cause fix or commit reference..."
                className="w-full text-xs border border-emerald-300 rounded-xl p-3 focus:outline-none focus:border-emerald-500 bg-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResolveBox(false)}
                  className="px-3 py-1.5 text-xs text-emerald-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          )}

          {/* Resolution Notes Banner if already resolved */}
          {issue.resolutionNotes && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900">
              <span className="font-bold flex items-center gap-1 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Resolution Details:
              </span>
              <p className="leading-relaxed">{issue.resolutionNotes}</p>
              {issue.resolvedBy && (
                <span className="text-[10px] text-emerald-700 block mt-2">
                  Resolved by {issue.resolvedBy.name} on {formatDate(issue.resolvedAt)}
                </span>
              )}
            </div>
          )}

          {/* Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Title, Details, Reproduction Steps, Status History */}
            <div className="lg:col-span-2 space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">{issue.title}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{issue.description}</p>
              </div>

              {/* Reproduction Details */}
              <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Steps to Reproduce:</span>
                  <pre className="font-mono text-slate-800 bg-white p-3 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed text-[11px]">
                    {issue.reproductionSteps || 'None provided'}
                  </pre>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="font-bold text-slate-700 block mb-0.5">Expected Behavior:</span>
                    <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 text-[11px]">
                      {issue.expectedBehavior || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block mb-0.5">Actual Behavior:</span>
                    <p className="text-rose-700 bg-white p-2.5 rounded-xl border border-rose-200 text-[11px]">
                      {issue.actualBehavior || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    Screenshots & Logs ({issue.attachments?.length || 0})
                  </span>
                  {!isStakeholder && (
                    <label className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      <UploadCloud className="w-3.5 h-3.5" />
                      Upload File
                      <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {issue.attachments?.map((att, i) => (
                    <a
                      key={i}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-white transition-all flex items-center gap-2 group"
                    >
                      <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600">
                          {att.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {Math.round((att.size || 0) / 1024)} KB
                        </p>
                      </div>
                    </a>
                  ))}
                  {(!issue.attachments || issue.attachments.length === 0) && (
                    <div className="col-span-2 py-3 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                      No attachments uploaded
                    </div>
                  )}
                </div>
              </div>

              {/* Status History Audit Trail */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
                  <History className="w-3.5 h-3.5 text-indigo-500" />
                  Status Transition History (Audit Log)
                </h4>
                <div className="space-y-2 border-l-2 border-slate-200 pl-3 ml-2">
                  {issue.statusHistory?.map((h, idx) => (
                    <div key={idx} className="relative text-xs">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 capitalize">{h.status}</span>
                        <span className="text-[10px] text-slate-400">
                          by {h.changedBy?.name || 'User'} • {formatRelativeTime(h.changedAt)}
                        </span>
                      </div>
                      {h.note && <p className="text-slate-600 mt-0.5 text-[11px]">{h.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 1 Col: Status Transition Controls */}
            <div className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Workflow Actions
              </h4>

              {/* Status Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Change Status
                </label>
                <select
                  value={status}
                  disabled={isStakeholder}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="wont_fix">Won't Fix</option>
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Severity
                </label>
                <select
                  value={severity}
                  disabled={isStakeholder}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  disabled={isStakeholder}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Assignee
                </label>
                <select
                  value={assignee}
                  disabled={isStakeholder}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.user?._id || m._id} value={m.user?._id || m._id}>
                      {m.user?.name || m.name} ({m.role || 'Member'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Transition Note */}
              {!isStakeholder && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Audit Log Note
                  </label>
                  <input
                    type="text"
                    value={statusChangeNote}
                    onChange={(e) => setStatusChangeNote(e.target.value)}
                    placeholder="Reason for change..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {!isStakeholder && (
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-600/20"
                >
                  {saving ? 'Updating...' : 'Save Changes'}
                </button>
              )}

              <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
                <div>Reporter: <strong className="text-slate-700">{issue.reporter?.name}</strong></div>
                <div>Reported: {formatDate(issue.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default IssueDetailModal;
