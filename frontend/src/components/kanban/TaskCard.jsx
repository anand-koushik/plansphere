import React from 'react';
import { getPriorityBadge, getStatusBadge } from '../../utils/helpers';
import { AlertTriangle, Paperclip, MessageSquare, Link2, CheckCircle2 } from 'lucide-react';

const TaskCard = ({ task, onClick, onDragStart, onDragEnd, isDragging, canEdit = true }) => {
  const priorityInfo = getPriorityBadge(task.priority);

  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => {
        if (!canEdit) return;
        onDragStart(e, task);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onClick(task)}
      className={`group relative bg-white p-3.5 rounded-2xl border transition-all cursor-pointer select-none shadow-xs hover:shadow-md ${
        isDragging
          ? 'opacity-40 border-indigo-400 rotate-1 scale-95 shadow-lg'
          : task.isBlocked
          ? 'border-red-300 bg-red-50/20 hover:border-red-400'
          : 'border-slate-200/90 hover:border-indigo-300'
      }`}
    >
      {/* Blocker alert header if flagged */}
      {task.isBlocked && (
        <div className="mb-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-100 text-red-700 text-[11px] font-bold">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Blocked: {task.blockerReason || 'Impediment flagged'}</span>
        </div>
      )}

      {/* Top Header: Task Number & Priority Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-mono font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">
          {task.taskNumber}
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityInfo.bg}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`} />
          {priorityInfo.label}
        </span>
      </div>

      {/* Title */}
      <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed mb-3 group-hover:text-indigo-950">
        {task.title}
      </h4>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.labels.slice(0, 3).map((lbl, idx) => (
            <span
              key={idx}
              className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600"
            >
              {lbl}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="text-[9px] text-slate-400 font-medium">
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bottom Footer: Story Points, Indicators & Assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
        <div className="flex items-center gap-2 text-slate-400">
          {/* Story Points */}
          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
            {task.storyPoints || 0} pts
          </span>

          {/* Dependencies count */}
          {task.dependencies && task.dependencies.length > 0 && (
            <span
              className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium"
              title="Has task dependencies"
            >
              <Link2 className="w-3 h-3" />
              {task.dependencies.length}
            </span>
          )}

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
              <Paperclip className="w-3 h-3" />
              {task.attachments.length}
            </span>
          )}
        </div>

        {/* Assignee Avatar */}
        <div>
          {task.assignee ? (
            <img
              src={task.assignee.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignee.name}`}
              alt={task.assignee.name}
              title={`Assigned to ${task.assignee.name}`}
              className="w-6 h-6 rounded-full object-cover border border-white ring-1 ring-slate-200"
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400"
              title="Unassigned"
            >
              ?
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
