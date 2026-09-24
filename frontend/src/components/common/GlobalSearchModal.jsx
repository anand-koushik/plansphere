import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Search, X, CheckSquare, AlertCircle, FolderKanban, Users } from 'lucide-react';
import { getPriorityBadge, getStatusBadge, getSeverityBadge } from '../../utils/helpers';

const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ tasks: [], issues: [], projects: [], users: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ tasks: [], issues: [], projects: [], users: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ tasks: [], issues: [], projects: [], users: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/search', { q: query.trim() });
        if (res.success) {
          setResults(res.results);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    results.tasks.length + results.issues.length + results.projects.length + results.users.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-start justify-center p-4 pt-16 sm:p-6 sm:pt-24 text-center">
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-2xl border border-slate-200">
          <div className="flex items-center px-4 py-3.5 border-b border-slate-100">
            <Search className="w-5 h-5 text-slate-400 mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, bugs, projects, or team members..."
              className="w-full bg-transparent text-sm text-slate-900 focus:outline-none placeholder:text-slate-400 font-medium"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded">
              ESC
            </kbd>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
            {loading && (
              <div className="py-8 text-center text-xs text-slate-400">Searching across workspace...</div>
            )}

            {!loading && query && totalResults === 0 && (
              <div className="py-8 text-center text-sm text-slate-500">
                No matching results found for "<span className="font-semibold">{query}</span>"
              </div>
            )}

            {!loading && !query && (
              <div className="py-6 text-center text-xs text-slate-400">
                Type something to search across tasks, issues, and team members.
              </div>
            )}

            {/* Tasks */}
            {results.tasks.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                  Tasks ({results.tasks.length})
                </div>
                <div className="space-y-1">
                  {results.tasks.map((task) => (
                    <div
                      key={task._id}
                      onClick={() => {
                        onClose();
                        navigate(`/projects/${task.project?._id || task.project}?tab=board&taskId=${task._id}`);
                      }}
                      className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {task.taskNumber}
                        </span>
                        <span className="text-xs font-medium text-slate-800 truncate">
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${getStatusBadge(task.status).bg}`}>
                          {task.status}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${getPriorityBadge(task.priority).bg}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues */}
            {results.issues.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  Issues & Bugs ({results.issues.length})
                </div>
                <div className="space-y-1">
                  {results.issues.map((issue) => (
                    <div
                      key={issue._id}
                      onClick={() => {
                        onClose();
                        navigate(`/projects/${issue.project?._id || issue.project}?tab=issues&issueId=${issue._id}`);
                      }}
                      className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          {issue.issueNumber}
                        </span>
                        <span className="text-xs font-medium text-slate-800 truncate">
                          {issue.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${getSeverityBadge(issue.severity).bg}`}>
                          {issue.severity}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${getStatusBadge(issue.status).bg}`}>
                          {issue.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {results.projects.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                  <FolderKanban className="w-3.5 h-3.5 text-emerald-500" />
                  Projects ({results.projects.length})
                </div>
                <div className="space-y-1">
                  {results.projects.map((proj) => (
                    <div
                      key={proj._id}
                      onClick={() => {
                        onClose();
                        navigate(`/projects/${proj._id}`);
                      }}
                      className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {proj.key}
                        </span>
                        <span className="text-xs font-semibold text-slate-900">{proj.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 capitalize">{proj.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users */}
            {results.users.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                  Team Members ({results.users.length})
                </div>
                <div className="space-y-1">
                  {results.users.map((u) => (
                    <div
                      key={u._id}
                      className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all flex items-center gap-3"
                    >
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{u.name}</p>
                        <p className="text-[11px] text-slate-500">{u.jobTitle} • {u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
