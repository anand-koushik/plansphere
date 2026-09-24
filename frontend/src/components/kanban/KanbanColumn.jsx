import React, { useState } from 'react';
import TaskCard from './TaskCard';
import { Plus } from 'lucide-react';

const KanbanColumn = ({
  column,
  tasks,
  onTaskClick,
  onDragStart,
  onDragEnd,
  onDropTask,
  onQuickAdd,
  draggedTaskId,
  canEdit = true
}) => {
  const [isOver, setIsOver] = useState(false);

  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    if (!canEdit) return;
    onDropTask(column.id);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col rounded-2xl bg-slate-100/70 p-3 min-w-[280px] w-full border transition-all ${
        isOver
          ? 'border-indigo-400 bg-indigo-50/50 ring-2 ring-indigo-200'
          : 'border-slate-200/70'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {column.name}
          </h3>
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-slate-200/80 text-[10px] font-bold text-slate-600">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-slate-400">
            {totalPoints} pts
          </span>
          {canEdit && (
            <button
              onClick={() => onQuickAdd(column.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 transition-colors"
              title={`Add task to ${column.name}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[150px] max-h-[calc(100vh-280px)] pr-0.5">
        {tasks.map((task) => (
          <TaskCard
            key={task._id}
            task={task}
            onClick={onTaskClick}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggedTaskId === task._id}
            canEdit={canEdit}
          />
        ))}

        {tasks.length === 0 && (
          <div className="h-28 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs">
            <span>No tasks in {column.name}</span>
            {canEdit && (
              <button
                onClick={() => onQuickAdd(column.id)}
                className="mt-1 text-[11px] text-indigo-600 hover:underline font-medium"
              >
                + Create task
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
