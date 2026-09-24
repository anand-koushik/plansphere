import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Zap,
  Play,
  CheckCircle2,
  Calendar,
  Layers,
  Plus,
  ArrowRight,
  AlertTriangle,
  MoveRight,
  CheckSquare,
  Square,
  ArrowUpRight,
  Check
} from 'lucide-react';
import { formatDate, getPriorityBadge } from '../../utils/helpers';

const SprintPlanner = ({ projectId, onTaskSelect }) => {
  const { user, canLeadTeam, isStakeholder } = useAuth();
  const [sprints, setSprints] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movingTasks, setMovingTasks] = useState(false);
  const [selectedBacklogTasks, setSelectedBacklogTasks] = useState([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintGoal, setNewSprintGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Complete sprint modal
  const [completingSprint, setCompletingSprint] = useState(null);
  const [retrospective, setRetrospective] = useState('');

  const fetchSprintData = async () => {
    try {
      const [sprintRes, taskRes] = await Promise.all([
        api.get(`/projects/${projectId}/sprints`),
        api.get(`/projects/${projectId}/tasks`)
      ]);

      if (sprintRes.success) setSprints(sprintRes.data);
      if (taskRes.success) setTasks(taskRes.data);
    } catch (err) {
      console.error('Error fetching sprint data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSprintData();
  }, [projectId]);

  const activeSprint = sprints.find((s) => s.status === 'active');
  const plannedSprints = sprints.filter((s) => s.status === 'planned');
  const completedSprints = sprints.filter((s) => s.status === 'completed');

  const backlogTasks = tasks.filter((t) => !t.sprint);

  // Compute live sprint metrics from current tasks state
  const activeSprintTasks = tasks.filter(
    (t) => t.sprint?._id === activeSprint?._id || t.sprint === activeSprint?._id
  );
  const activeTotalPoints = activeSprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const activeCompletedPoints = activeSprintTasks
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const activePercent = activeTotalPoints > 0 ? Math.round((activeCompletedPoints / activeTotalPoints) * 100) : 0;

  const handleStartSprint = async (sprintId) => {
    if (!canLeadTeam) return;
    try {
      const res = await api.post(`/projects/${projectId}/sprints/${sprintId}/start`);
      if (res.success) {
        alert(res.message);
        fetchSprintData();
      }
    } catch (err) {
      alert('Error starting sprint: ' + err.message);
    }
  };

  const handleCompleteSprint = async () => {
    if (!completingSprint || !canLeadTeam) return;
    try {
      const res = await api.post(`/projects/${projectId}/sprints/${completingSprint._id}/complete`, {
        retrospective
      });
      if (res.success) {
        alert(res.message);
        setCompletingSprint(null);
        setRetrospective('');
        fetchSprintData();
      }
    } catch (err) {
      alert('Error completing sprint: ' + err.message);
    }
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!newSprintName.trim() || !canLeadTeam) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/projects/${projectId}/sprints`, {
        name: newSprintName.trim(),
        goal: newSprintGoal.trim(),
        startDate: startDate || null,
        endDate: endDate || null
      });
      if (res.success) {
        setShowCreateModal(false);
        setNewSprintName('');
        setNewSprintGoal('');
        setStartDate('');
        setEndDate('');
        fetchSprintData();
      }
    } catch (err) {
      alert('Failed to create sprint: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Move task to a sprint or backlog
  const handleMoveTaskSprint = async (taskId, targetSprintId) => {
    if (!canLeadTeam) return;
    try {
      await api.put(`/projects/${projectId}/tasks/${taskId}`, {
        sprint: targetSprintId || null
      });
      fetchSprintData();
    } catch (err) {
      alert('Failed to update task sprint: ' + err.message);
    }
  };

  // Move a single task from backlog directly to active sprint
  const handleMoveSingleTaskToActiveSprint = async (taskId) => {
    if (!activeSprint || !canLeadTeam) return;
    try {
      await api.put(`/projects/${projectId}/tasks/${taskId}`, {
        sprint: activeSprint._id
      });
      fetchSprintData();
    } catch (err) {
      alert('Failed to move task: ' + err.message);
    }
  };

  // Move ALL tasks in Product Backlog to the currently active sprint
  const handleMoveAllBacklogToActiveSprint = async () => {
    if (!activeSprint || !canLeadTeam) return;
    if (backlogTasks.length === 0) {
      alert('Product Backlog has no items to move.');
      return;
    }

    if (!window.confirm(`Move all ${backlogTasks.length} backlog items into active sprint "${activeSprint.name}"?`)) return;

    setMovingTasks(true);
    try {
      const res = await api.post(`/projects/${projectId}/sprints/active/move-tasks`, {
        fromBacklog: true
      });
      if (res.success) {
        alert(res.message);
        setSelectedBacklogTasks([]);
        fetchSprintData();
      }
    } catch (err) {
      alert('Failed to move tasks to active sprint: ' + err.message);
    } finally {
      setMovingTasks(false);
    }
  };

  // Move selected tasks in Product Backlog to currently active sprint
  const handleMoveSelectedBacklogToActiveSprint = async () => {
    if (!activeSprint || !canLeadTeam || selectedBacklogTasks.length === 0) return;

    setMovingTasks(true);
    try {
      const res = await api.post(`/projects/${projectId}/sprints/active/move-tasks`, {
        taskIds: selectedBacklogTasks
      });
      if (res.success) {
        alert(res.message);
        setSelectedBacklogTasks([]);
        fetchSprintData();
      }
    } catch (err) {
      alert('Failed to move selected tasks: ' + err.message);
    } finally {
      setMovingTasks(false);
    }
  };

  // Move all tasks from a planned sprint into currently active sprint
  const handleMoveSprintTasksToActive = async (sprint) => {
    if (!activeSprint || !canLeadTeam) return;
    if (!window.confirm(`Move all tasks from "${sprint.name}" into active sprint "${activeSprint.name}"?`)) return;

    try {
      const res = await api.post(`/projects/${projectId}/sprints/active/move-tasks`, {
        fromSprintId: sprint._id
      });
      if (res.success) {
        alert(res.message);
        fetchSprintData();
      }
    } catch (err) {
      alert('Failed to transfer sprint tasks: ' + err.message);
    }
  };

  const handleToggleSelectAllBacklog = () => {
    if (selectedBacklogTasks.length === backlogTasks.length) {
      setSelectedBacklogTasks([]);
    } else {
      setSelectedBacklogTasks(backlogTasks.map((t) => t._id));
    }
  };

  // Toggle complete task and automatically update story points
  const handleToggleTaskComplete = async (task) => {
    const isDone = task.status === 'done';
    const newStatus = isDone ? 'todo' : 'done';

    // Optimistic local update so story points and progress bar update instantly
    setTasks((prev) =>
      prev.map((t) => (t._id === task._id ? { ...t, status: newStatus } : t))
    );

    try {
      await api.patch(`/projects/${projectId}/tasks/${task._id}/status`, {
        status: newStatus
      });
      fetchSprintData();
    } catch (err) {
      console.error('Failed to update task status:', err);
      fetchSprintData();
      alert('Failed to update task status: ' + err.message);
    }
  };

  // Update story points for a task
  const handleUpdateTaskPoints = async (taskId, newPoints) => {
    const pts = Math.max(0, Number(newPoints) || 0);

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, storyPoints: pts } : t))
    );

    try {
      await api.put(`/projects/${projectId}/tasks/${taskId}`, {
        storyPoints: pts
      });
      fetchSprintData();
    } catch (err) {
      console.error('Failed to update story points:', err);
      fetchSprintData();
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading sprint planning...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
            Sprint Planning & Velocity Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize backlogs, commit scope to sprints, complete tasks, and track story points in real time.
          </p>
        </div>

        {canLeadTeam && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Create Sprint
          </button>
        )}
      </div>

      {/* Active Sprint Section */}
      {activeSprint ? (
        <div className="bg-white rounded-2xl border border-indigo-200/80 p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-sm font-bold text-slate-900">{activeSprint.name}</h3>
                <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Active Sprint
                </span>
              </div>
              {activeSprint.goal && (
                <p className="text-xs text-slate-600 mt-1 italic">
                  <strong>Goal:</strong> {activeSprint.goal}
                </p>
              )}
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(activeSprint.startDate)} – {formatDate(activeSprint.endDate)}
                </span>
              </div>
            </div>

            {/* Story Points Metrics & Progress Bar */}
            <div className="flex items-center gap-5 flex-wrap">
              <div className="text-right min-w-[170px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xl font-black text-emerald-600">
                    {activeCompletedPoints}
                  </span>
                  <span className="text-sm font-bold text-slate-400">/</span>
                  <span className="text-base font-bold text-slate-700">
                    {activeTotalPoints} pts
                  </span>
                  <span className="text-xs font-bold text-indigo-600 ml-1">
                    ({activePercent}%)
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mt-1.5">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${activePercent}%` }}
                  />
                </div>
                <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1 text-right">
                  Story Points Done
                </span>
              </div>

              {canLeadTeam && backlogTasks.length > 0 && (
                <button
                  onClick={handleMoveAllBacklogToActiveSprint}
                  disabled={movingTasks}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Pull all backlog items into this active sprint"
                >
                  <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>Pull Backlog ({backlogTasks.length})</span>
                </button>
              )}

              {canLeadTeam && (
                <button
                  onClick={() => setCompletingSprint(activeSprint)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Sprint
                </button>
              )}
            </div>
          </div>

          {/* Active Sprint Tasks List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Committed Sprint Tasks ({activeSprintTasks.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                Click <strong>"Complete Task"</strong> on any item to mark it done and update story points.
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {activeSprintTasks.map((task) => {
                const isTaskDone = task.status === 'done';

                return (
                  <div
                    key={task._id}
                    className={`p-3 flex items-center justify-between text-xs transition-colors ${
                      isTaskDone
                        ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border-l-4 border-l-emerald-500'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      onClick={() => onTaskSelect?.(task._id)}
                    >
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded shrink-0">
                        {task.taskNumber}
                      </span>
                      <span className={`font-medium truncate ${isTaskDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.title}
                      </span>
                      {task.isBlocked && (
                        <span className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-bold shrink-0">
                          <AlertTriangle className="w-3 h-3" /> Blocked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${getPriorityBadge(task.priority).bg}`}>
                        {task.priority}
                      </span>

                      {/* Story Points dropdown / updater */}
                      <select
                        value={task.storyPoints || 0}
                        disabled={isStakeholder}
                        onChange={(e) => handleUpdateTaskPoints(task._id, e.target.value)}
                        className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 text-[11px] font-bold cursor-pointer hover:bg-indigo-100 focus:outline-none"
                        title="Click to update story points for this task"
                      >
                        {[0, 1, 2, 3, 5, 8, 13, 21].map((pts) => (
                          <option key={pts} value={pts}>{pts} pts</option>
                        ))}
                      </select>

                      {/* Complete Task Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleTaskComplete(task)}
                        disabled={isStakeholder}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                          isTaskDone
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                        }`}
                        title={isTaskDone ? 'Mark as incomplete' : `Complete task to add ${task.storyPoints || 0} story points`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isTaskDone ? 'Completed' : 'Complete Task'}</span>
                      </button>

                      {canLeadTeam && (
                        <button
                          onClick={() => handleMoveTaskSprint(task._id, null)}
                          className="text-[11px] text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                          title="Move back to Product Backlog"
                        >
                          To Backlog
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {activeSprintTasks.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No tasks currently in this active sprint. Use the Product Backlog below to commit tasks!
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center">
          <Zap className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-60" />
          <h3 className="text-sm font-bold text-slate-800">No Sprint Currently Active</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Choose a planned sprint below to start, or create a new sprint to begin an iteration.
          </p>
        </div>
      )}

      {/* Planned Sprints */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Planned Sprints ({plannedSprints.length})
        </h3>
        {plannedSprints.map((sprint) => {
          const sTasks = tasks.filter((t) => t.sprint?._id === sprint._id || t.sprint === sprint._id);
          const totalPoints = sTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

          return (
            <div
              key={sprint._id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{sprint.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sprint.goal || 'No goal set'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {totalPoints} story points ({sTasks.length} tasks)
                  </span>

                  {/* Option to move all tasks in this planned sprint to currently active sprint */}
                  {activeSprint && canLeadTeam && sTasks.length > 0 && (
                    <button
                      onClick={() => handleMoveSprintTasksToActive(sprint)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-amber-200 transition-colors cursor-pointer"
                      title={`Move all tasks from ${sprint.name} to active sprint "${activeSprint.name}"`}
                    >
                      <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      Move to Active Sprint
                    </button>
                  )}

                  {canLeadTeam && (
                    <button
                      onClick={() => handleStartSprint(sprint._id)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-indigo-200 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-indigo-700" />
                      Start Sprint
                    </button>
                  )}
                </div>
              </div>

              {/* Sprint Tasks */}
              {sTasks.length > 0 && (
                <div className="space-y-1">
                  {sTasks.map((task) => (
                    <div
                      key={task._id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-slate-600">{task.taskNumber}</span>
                        <span className="truncate text-slate-700">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={task.storyPoints || 0}
                          disabled={isStakeholder}
                          onChange={(e) => handleUpdateTaskPoints(task._id, e.target.value)}
                          className="bg-white text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold cursor-pointer"
                          title="Update story points"
                        >
                          {[0, 1, 2, 3, 5, 8, 13, 21].map((pts) => (
                            <option key={pts} value={pts}>{pts} pts</option>
                          ))}
                        </select>

                        {activeSprint && canLeadTeam && (
                          <button
                            onClick={() => handleMoveSingleTaskToActiveSprint(task._id)}
                            className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-100"
                          >
                            → Active Sprint
                          </button>
                        )}
                        <button
                          onClick={() => handleMoveTaskSprint(task._id, null)}
                          className="text-[11px] text-slate-400 hover:text-rose-600 font-medium"
                          title="Send back to backlog"
                        >
                          To Backlog
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {plannedSprints.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            No planned sprints in queue. Create one above to plan future releases.
          </div>
        )}
      </div>

      {/* Product Backlog Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Product Backlog ({backlogTasks.length} unassigned tasks)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pull backlog tasks into the active sprint, assign story points, or complete items directly.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              {backlogTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)} Backlog Pts
            </span>

            {/* Move to currently active sprint controls */}
            {activeSprint && canLeadTeam && backlogTasks.length > 0 && (
              <>
                {selectedBacklogTasks.length > 0 && (
                  <button
                    onClick={handleMoveSelectedBacklogToActiveSprint}
                    disabled={movingTasks}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Move Selected ({selectedBacklogTasks.length}) to Active Sprint
                  </button>
                )}

                <button
                  onClick={handleMoveAllBacklogToActiveSprint}
                  disabled={movingTasks}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-sm shadow-amber-500/20 cursor-pointer"
                  title={`Move all ${backlogTasks.length} backlog items to ${activeSprint.name}`}
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                  Move All Backlog to Active Sprint ({activeSprint.name})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Backlog Items List */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {backlogTasks.length > 0 && canLeadTeam && activeSprint && (
            <div className="p-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedBacklogTasks.length === backlogTasks.length && backlogTasks.length > 0}
                  onChange={handleToggleSelectAllBacklog}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-700">
                  {selectedBacklogTasks.length === backlogTasks.length
                    ? 'Deselect All'
                    : `Select All (${backlogTasks.length})`}
                </span>
              </label>

              {activeSprint && (
                <span className="text-[11px] text-indigo-600 font-medium">
                  Target Active Sprint: <strong>{activeSprint.name}</strong>
                </span>
              )}
            </div>
          )}

          {backlogTasks.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-slate-600">Product Backlog is clear!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                All tasks are currently assigned to active or planned sprints.
              </p>
            </div>
          ) : (
            backlogTasks.map((task) => {
              const isSelected = selectedBacklogTasks.includes(task._id);
              const isTaskDone = task.status === 'done';

              return (
                <div
                  key={task._id}
                  className={`p-3 flex items-center justify-between text-xs transition-colors ${
                    isSelected ? 'bg-indigo-50/40' : isTaskDone ? 'bg-emerald-50/30' : 'bg-white hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {canLeadTeam && activeSprint && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBacklogTasks((prev) => [...prev, task._id]);
                          } else {
                            setSelectedBacklogTasks((prev) => prev.filter((id) => id !== task._id));
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer shrink-0"
                      />
                    )}

                    <div
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                      onClick={() => onTaskSelect?.(task._id)}
                    >
                      <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                        {task.taskNumber}
                      </span>
                      <span className={`font-medium truncate ${isTaskDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.title}
                      </span>
                      {task.isBlocked && (
                        <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-bold shrink-0">
                          Blocked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 ml-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${getPriorityBadge(task.priority).bg}`}>
                      {task.priority}
                    </span>

                    {/* Story Points dropdown / updater */}
                    <select
                      value={task.storyPoints || 0}
                      disabled={isStakeholder}
                      onChange={(e) => handleUpdateTaskPoints(task._id, e.target.value)}
                      className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 text-[11px] font-bold cursor-pointer hover:bg-indigo-100 focus:outline-none"
                      title="Update story points for this backlog task"
                    >
                      {[0, 1, 2, 3, 5, 8, 13, 21].map((pts) => (
                        <option key={pts} value={pts}>{pts} pts</option>
                      ))}
                    </select>

                    {/* Complete Task Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleTaskComplete(task)}
                      disabled={isStakeholder}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isTaskDone
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                      }`}
                      title={isTaskDone ? 'Mark as incomplete' : 'Complete task'}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{isTaskDone ? 'Done' : 'Complete'}</span>
                    </button>

                    {/* Quick 1-Click Move to Active Sprint Button */}
                    {activeSprint && canLeadTeam && (
                      <button
                        onClick={() => handleMoveSingleTaskToActiveSprint(task._id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-slate-950 rounded-lg text-[11px] font-bold transition-all border border-amber-200 hover:border-transparent shrink-0 cursor-pointer"
                        title={`Move directly to active sprint "${activeSprint.name}"`}
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>Move to Active Sprint</span>
                      </button>
                    )}

                    {/* Move to Any Planned Sprint Dropdown */}
                    {canLeadTeam && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleMoveTaskSprint(task._id, e.target.value);
                          }
                        }}
                        defaultValue=""
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="" disabled>
                          Sprint Options...
                        </option>
                        {activeSprint && (
                          <option value={activeSprint._id}>Active: {activeSprint.name}</option>
                        )}
                        {plannedSprints.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Sprint Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Sprint"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSprint} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Sprint Name
            </label>
            <input
              type="text"
              required
              value={newSprintName}
              onChange={(e) => setNewSprintName(e.target.value)}
              placeholder="e.g. Sprint 5 - Performance & Caching"
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Sprint Goal
            </label>
            <textarea
              rows={2}
              value={newSprintGoal}
              onChange={(e) => setNewSprintGoal(e.target.value)}
              placeholder="What is the primary deliverable or outcome?"
              className="w-full text-xs border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
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
              disabled={submitting || !newSprintName.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20"
            >
              {submitting ? 'Creating...' : 'Create Sprint'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete Sprint Modal */}
      <Modal
        isOpen={Boolean(completingSprint)}
        onClose={() => setCompletingSprint(null)}
        title={`Complete ${completingSprint?.name}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Completing this sprint will lock its velocity calculation. Incomplete tasks will be
            rolled back to the backlog or ready for next sprint planning.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Sprint Retrospective & Notes
            </label>
            <textarea
              rows={3}
              value={retrospective}
              onChange={(e) => setRetrospective(e.target.value)}
              placeholder="What went well? What blockers were encountered?"
              className="w-full text-xs border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCompletingSprint(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCompleteSprint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20"
            >
              Confirm Complete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SprintPlanner;
