import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  User,
  AlertTriangle,
  Paperclip,
  Send,
  Trash2,
  CheckCircle2,
  Link2,
  Clock,
  Layers,
  UploadCloud,
  FileText,
  Zap
} from 'lucide-react';
import { formatDate, formatRelativeTime, getPriorityBadge, getStatusBadge } from '../../utils/helpers';

const TaskDetailModal = ({
  isOpen,
  onClose,
  taskId,
  projectId,
  activeSprint,
  onTaskUpdated,
  onTaskDeleted,
  teamMembers = [],
  allTasks = []
}) => {
  const { user, canEditTask, isStakeholder } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [uploading, setUploading] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [storyPoints, setStoryPoints] = useState(1);
  const [sprint, setSprint] = useState('');
  const [projectSprints, setProjectSprints] = useState([]);
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockerReason, setBlockerReason] = useState('');
  const [dependencyId, setDependencyId] = useState('');

  useEffect(() => {
    if (!taskId || !isOpen) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [taskRes, commentRes, sprintRes] = await Promise.all([
          api.get(`/projects/${projectId}/tasks/${taskId}`),
          api.get('/comments', { taskId }),
          api.get(`/projects/${projectId}/sprints`)
        ]);

        if (taskRes.success) {
          const t = taskRes.task;
          setTask(t);
          setTitle(t.title);
          setDescription(t.description || '');
          setStatus(t.status);
          setPriority(t.priority);
          setStoryPoints(t.storyPoints || 0);
          setSprint(t.sprint?._id || t.sprint || '');
          setAssignee(t.assignee?._id || '');
          setDueDate(t.dueDate ? t.dueDate.split('T')[0] : '');
          setIsBlocked(t.isBlocked || false);
          setBlockerReason(t.blockerReason || '');
        }

        if (commentRes.success) {
          setComments(commentRes.data);
        }

        if (sprintRes.success) {
          setProjectSprints(sprintRes.data || []);
        }
      } catch (err) {
        console.error('Error fetching task details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [taskId, isOpen, projectId]);

  const handleSave = async () => {
    if (!title.trim() || isStakeholder) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description,
        status,
        priority,
        storyPoints: Number(storyPoints),
        sprint: sprint || null,
        assignee: assignee || null,
        dueDate: dueDate || null,
        isBlocked,
        blockerReason: isBlocked ? blockerReason : ''
      };

      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, payload);
      if (res.success) {
        setTask(res.task);
        onTaskUpdated(res.task);
        onClose();
      }
    } catch (err) {
      alert('Failed to update task: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${task?.taskNumber}?`)) return;
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
      onTaskDeleted(taskId);
      onClose();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isStakeholder) return;

    try {
      const res = await api.post('/comments', {
        projectId,
        taskId,
        content: newComment.trim()
      });
      if (res.success) {
        setComments((prev) => [...prev, res.comment]);
        setNewComment('');
      }
    } catch (err) {
      alert('Failed to post comment: ' + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || isStakeholder) return;

    setUploading(true);
    try {
      const res = await api.upload(`/projects/${projectId}/tasks/${taskId}/attachments`, file);
      if (res.success) {
        setTask((prev) => ({ ...prev, attachments: res.attachments }));
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddDependency = async () => {
    if (!dependencyId || isStakeholder) return;
    try {
      const updatedDeps = [...(task.dependencies?.map((d) => d._id || d) || []), dependencyId];
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, {
        dependencies: updatedDeps
      });
      if (res.success) {
        setTask(res.task);
        setDependencyId('');
      }
    } catch (err) {
      alert('Failed to add dependency: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading task details...</div>
      ) : !task ? (
        <div className="py-16 text-center text-slate-400 text-sm">Task not found</div>
      ) : (
        <div className="space-y-6">
          {/* Top Bar: Key & Action Buttons */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {task.taskNumber}
              </span>
              <span className="text-xs text-slate-400 capitalize">
                Type: <strong className="text-slate-700">{task.type}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!isStakeholder && (
                <>
                  <button
                    onClick={handleDelete}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Read-only Alert for Stakeholder */}
          {isStakeholder && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>You are viewing this project as a <strong>Stakeholder</strong>. Modifications are read-only.</span>
            </div>
          )}

          {/* Main Grid: Left Column (Details & Comments) + Right Column (Attributes) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Title, Description, Blocker Banner, Attachments, Comments */}
            <div className="lg:col-span-2 space-y-5">
              {/* Title Input */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={title}
                  disabled={isStakeholder}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-base font-bold text-slate-900 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50"
                  placeholder="Task title..."
                />
              </div>

              {/* Description & Mentions Support */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Description & @Mentions
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Tip: Type @Name to mention teammates
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={description}
                  disabled={isStakeholder}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs text-slate-700 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 leading-relaxed font-sans"
                  placeholder="Provide detailed acceptance criteria or context..."
                />
              </div>

              {/* Blocker Flagging Section */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isBlocked
                    ? 'border-red-300 bg-red-50/40 ring-1 ring-red-200'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isBlocked}
                      disabled={isStakeholder}
                      onChange={(e) => setIsBlocked(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <AlertTriangle
                        className={`w-3.5 h-3.5 ${isBlocked ? 'text-red-600' : 'text-slate-400'}`}
                      />
                      Flag as Blocked / Impediment
                    </span>
                  </label>
                  {isBlocked && (
                    <span className="text-[10px] font-bold uppercase text-red-600 bg-red-100 px-2 py-0.5 rounded">
                      Action Required
                    </span>
                  )}
                </div>

                {isBlocked && (
                  <input
                    type="text"
                    value={blockerReason}
                    disabled={isStakeholder}
                    onChange={(e) => setBlockerReason(e.target.value)}
                    placeholder="State blocker reason (e.g. pending Infosec approval, API down)..."
                    className="w-full text-xs text-red-950 bg-white border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-400 placeholder:text-red-300"
                  />
                )}
              </div>

              {/* Task Dependencies */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Dependencies (Blocked By)
                </label>
                <div className="space-y-1.5 mb-2">
                  {task.dependencies && task.dependencies.length > 0 ? (
                    task.dependencies.map((dep) => (
                      <div
                        key={dep._id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-mono font-bold text-slate-700">{dep.taskNumber}</span>
                          <span className="truncate text-slate-600">{dep.title}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${getStatusBadge(dep.status).bg}`}>
                          {dep.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No dependencies linked</p>
                  )}
                </div>

                {!isStakeholder && (
                  <div className="flex gap-2">
                    <select
                      value={dependencyId}
                      onChange={(e) => setDependencyId(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Select prerequisite task...</option>
                      {allTasks
                        .filter((t) => t._id !== taskId)
                        .map((t) => (
                          <option key={t._id} value={t._id}>
                            [{t.taskNumber}] {t.title} ({t.status})
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddDependency}
                      disabled={!dependencyId}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-xl"
                    >
                      Link
                    </button>
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    Attachments ({task.attachments?.length || 0})
                  </label>
                  {!isStakeholder && (
                    <label className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      <UploadCloud className="w-3.5 h-3.5" />
                      Upload File
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>

                {uploading && (
                  <div className="p-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg">
                    Uploading attachment...
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {task.attachments?.map((att, i) => (
                    <a
                      key={i}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-white transition-all flex items-center gap-2 group"
                    >
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
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
                  {(!task.attachments || task.attachments.length === 0) && (
                    <div className="col-span-2 py-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                      No files attached yet
                    </div>
                  )}
                </div>
              </div>

              {/* Discussion & Mentions Thread */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Activity & Discussion
                </h4>

                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No comments yet. Start the conversation!</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c._id} className="flex items-start gap-2.5 text-xs">
                        <img
                          src={c.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.author?.name}`}
                          alt={c.author?.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
                        />
                        <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800">{c.author?.name}</span>
                            <span className="text-[10px] text-slate-400">
                              {formatRelativeTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed font-sans">{c.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {!isStakeholder && (
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment... (use @name to mention)"
                      className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm shadow-indigo-600/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right 1 Col: Metadata & Selectors */}
            <div className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  disabled={isStakeholder}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              {/* Sprint Iteration */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Sprint Iteration
                  </label>
                  {!sprint && activeSprint && !isStakeholder && (
                    <button
                      type="button"
                      onClick={() => setSprint(activeSprint._id)}
                      className="text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 cursor-pointer"
                    >
                      ⚡ Move to Active
                    </button>
                  )}
                </div>
                <select
                  value={sprint}
                  disabled={isStakeholder}
                  onChange={(e) => setSprint(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Product Backlog (No Sprint)</option>
                  {projectSprints.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.status === 'active' ? `Active: ${s.name}` : s.name}
                    </option>
                  ))}
                </select>
                {!sprint && activeSprint && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    In Backlog. Click "Move to Active" to commit to <strong>{activeSprint.name}</strong>.
                  </p>
                )}
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
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Story Points */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Story Points
                </label>
                <select
                  value={storyPoints}
                  disabled={isStakeholder}
                  onChange={(e) => setStoryPoints(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  {[0, 1, 2, 3, 5, 8, 13, 21].map((pts) => (
                    <option key={pts} value={pts}>
                      {pts} points
                    </option>
                  ))}
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

              {/* Due Date */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  disabled={isStakeholder}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Reporter & Timestamps */}
              <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
                <div>
                  Reporter: <strong className="text-slate-700">{task.reporter?.name || 'Admin'}</strong>
                </div>
                <div>
                  Created: {formatDate(task.createdAt)}
                </div>
                {task.updatedAt && (
                  <div>Updated: {formatRelativeTime(task.updatedAt)}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TaskDetailModal;
