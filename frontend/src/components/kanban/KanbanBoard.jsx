import React, { useState, useEffect, useMemo } from 'react';
import KanbanColumn from './KanbanColumn';
import TaskDetailModal from './TaskDetailModal';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Plus, Filter, Search, CheckCircle2, AlertCircle } from 'lucide-react';

const COLUMNS = [
  { id: 'backlog', name: 'Backlog', color: 'bg-zinc-400' },
  { id: 'todo', name: 'To Do', color: 'bg-slate-400' },
  { id: 'in_progress', name: 'In Progress', color: 'bg-indigo-500' },
  { id: 'in_review', name: 'In Review', color: 'bg-purple-500' },
  { id: 'done', name: 'Done', color: 'bg-emerald-500' }
];

const KanbanBoard = ({ projectId, activeSprint, initialTaskId }) => {
  const { user, isStakeholder, canEditTask } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);

  // Filters
  const [sprintFilter, setSprintFilter] = useState('active'); // 'active', 'all', 'backlog'
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected task for detail modal
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId || null);
  const [isDetailOpen, setIsDetailOpen] = useState(Boolean(initialTaskId));

  // Quick Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createColumnId, setCreateColumnId] = useState('todo');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newStoryPoints, setNewStoryPoints] = useState(1);
  const [newAssignee, setNewAssignee] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch tasks and project members
  const fetchBoardData = async () => {
    try {
      const [tasksRes, membersRes] = await Promise.all([
        api.get(`/projects/${projectId}/tasks`),
        api.get(`/projects/${projectId}/members`)
      ]);

      if (tasksRes.success) {
        setTasks(tasksRes.data);
      }
      if (membersRes.success) {
        setTeamMembers(membersRes.data);
      }
    } catch (err) {
      console.error('Failed to load kanban data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, [projectId]);

  useEffect(() => {
    if (initialTaskId) {
      setSelectedTaskId(initialTaskId);
      setIsDetailOpen(true);
    }
  }, [initialTaskId]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Sprint filter
      if (sprintFilter === 'active') {
        if (activeSprint?._id) {
          if (!task.sprint || (task.sprint._id || task.sprint) !== activeSprint._id) {
            return false;
          }
        }
      } else if (sprintFilter === 'backlog') {
        if (task.sprint !== null) return false;
      }

      // Assignee filter
      if (assigneeFilter === 'me') {
        if (!task.assignee || task.assignee._id !== user?._id) return false;
      } else if (assigneeFilter === 'unassigned') {
        if (task.assignee !== null) return false;
      } else if (assigneeFilter !== 'all') {
        if (!task.assignee || task.assignee._id !== assigneeFilter) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(q);
        const matchesNum = task.taskNumber?.toLowerCase().includes(q);
        const matchesLabel = task.labels?.some((l) => l.toLowerCase().includes(q));
        if (!matchesTitle && !matchesNum && !matchesLabel) return false;
      }

      return true;
    });
  }, [tasks, sprintFilter, activeSprint, assigneeFilter, priorityFilter, searchQuery, user]);

  // Drag and Drop handlers with Optimistic Update
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.setData('text/plain', task._id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleDropTask = async (targetColumnId) => {
    if (!draggedTask || draggedTask.status === targetColumnId || isStakeholder) {
      setDraggedTask(null);
      return;
    }

    const previousTasks = [...tasks];
    const taskId = draggedTask._id;

    // Optimistic UI Update
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: targetColumnId } : t))
    );
    setDraggedTask(null);

    try {
      await api.patch(`/projects/${projectId}/tasks/${taskId}/status`, {
        status: targetColumnId
      });

      // If dragged from backlog to active column and activeSprint exists, auto-link to sprint
      if (draggedTask.status === 'backlog' && targetColumnId !== 'backlog' && activeSprint?._id && !draggedTask.sprint) {
        await api.put(`/projects/${projectId}/tasks/${taskId}`, {
          sprint: activeSprint._id
        });
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, sprint: activeSprint } : t))
        );
      }
    } catch (err) {
      console.error('Failed to move task, rolling back:', err);
      // Rollback
      setTasks(previousTasks);
      alert('Unable to move task. Reverted changes.');
    }
  };

  const handleQuickAdd = (columnId) => {
    if (isStakeholder) return;
    setCreateColumnId(columnId);
    setNewTitle('');
    setNewPriority('medium');
    setNewStoryPoints(1);
    setNewAssignee(user?._id || '');
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || isStakeholder) return;

    setCreating(true);
    try {
      const res = await api.post(`/projects/${projectId}/tasks`, {
        title: newTitle.trim(),
        status: createColumnId,
        priority: newPriority,
        storyPoints: Number(newStoryPoints),
        assignee: newAssignee || null,
        sprint: activeSprint?._id || null
      });

      if (res.success) {
        setTasks((prev) => [res.task, ...prev]);
        setIsCreateOpen(false);
      }
    } catch (err) {
      alert('Failed to create task: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
    );
  };

  const handleTaskDeleted = (deletedId) => {
    setTasks((prev) => prev.filter((t) => t._id !== deletedId));
  };

  return (
    <div className="space-y-4">
      {/* Control Bar: Filters & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Sprint Scope */}
          <select
            value={sprintFilter}
            onChange={(e) => setSprintFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="active">Active Sprint {activeSprint ? `(${activeSprint.name})` : ''}</option>
            <option value="all">All Sprints & Backlog</option>
            <option value="backlog">Backlog Only</option>
          </select>

          {/* Assignee */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Assignees</option>
            <option value="me">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
            {teamMembers.map((m) => (
              <option key={m.user?._id || m._id} value={m.user?._id || m._id}>
                {m.user?.name || m.name}
              </option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {!isStakeholder ? (
            <button
              onClick={() => handleQuickAdd('todo')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
          ) : (
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              Read-Only (Stakeholder)
            </span>
          )}
        </div>
      </div>

      {/* Kanban Board Columns Container */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading board tasks...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={colTasks}
                onTaskClick={(task) => {
                  setSelectedTaskId(task._id);
                  setIsDetailOpen(true);
                }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDropTask={handleDropTask}
                onQuickAdd={handleQuickAdd}
                draggedTaskId={draggedTask?._id}
                canEdit={canEditTask}
              />
            );
          })}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedTaskId(null);
          }}
          taskId={selectedTaskId}
          projectId={projectId}
          activeSprint={activeSprint}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          teamMembers={teamMembers}
          allTasks={tasks}
        />
      )}

      {/* Quick Create Task Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Task"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Task Title
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Implement webhook retry telemetry"
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Story Points
              </label>
              <select
                value={newStoryPoints}
                onChange={(e) => setNewStoryPoints(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                {[1, 2, 3, 5, 8, 13].map((pts) => (
                  <option key={pts} value={pts}>
                    {pts} points
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Assignee
            </label>
            <select
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
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

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20"
            >
              {creating ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default KanbanBoard;
