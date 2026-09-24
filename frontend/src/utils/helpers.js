export const formatDate = (dateStr) => {
  if (!dateStr) return 'No date';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffInSec = Math.floor((now - d) / 1000);

  if (diffInSec < 60) return 'Just now';
  if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}m ago`;
  if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}h ago`;
  if (diffInSec < 604800) return `${Math.floor(diffInSec / 86400)}d ago`;
  return formatDate(dateStr);
};

export const getPriorityBadge = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return { label: 'Urgent', bg: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500' };
    case 'high':
      return { label: 'High', bg: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' };
    case 'medium':
      return { label: 'Medium', bg: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' };
    case 'low':
    default:
      return { label: 'Low', bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  }
};

export const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'done':
    case 'achieved':
    case 'resolved':
    case 'completed':
      return { label: 'Done', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' };
    case 'in_progress':
      return { label: 'In Progress', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' };
    case 'in_review':
    case 'investigating':
      return { label: 'In Review', bg: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' };
    case 'todo':
    case 'open':
    case 'planned':
      return { label: 'To Do', bg: 'bg-slate-100 text-slate-800 border-slate-200', dot: 'bg-slate-400' };
    case 'blocked':
      return { label: 'Blocked', bg: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' };
    case 'backlog':
    default:
      return { label: 'Backlog', bg: 'bg-zinc-100 text-zinc-700 border-zinc-200', dot: 'bg-zinc-400' };
  }
};

export const getSeverityBadge = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return { label: 'Critical', bg: 'bg-red-100 text-red-800 border-red-300' };
    case 'high':
      return { label: 'High', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'medium':
      return { label: 'Medium', bg: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    case 'low':
    default:
      return { label: 'Low', bg: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
};
