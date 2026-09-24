import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/common/Modal';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  FolderKanban,
  Plus,
  ArrowRight,
  ShieldAlert,
  Kanban,
  Zap,
  Users2,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Briefcase,
  Clock,
  Layers,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { formatDate, getPriorityBadge, getStatusBadge } from '../utils/helpers';

const PortfolioDashboard = () => {
  const { currentOrg, isOrgAdmin, canManageProject, user, setCurrentProject } = useAuth();
  const [projects, setProjects] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const navigate = useNavigate();

  // Create Project Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('software');
  const [riskLevel, setRiskLevel] = useState('Low');
  const [creating, setCreating] = useState(false);

  const fetchDashboardData = async () => {
    if (!currentOrg?._id) return;
    setLoading(true);
    try {
      const [projectsRes, tasksRes, teamsRes] = await Promise.all([
        api.get('/projects', { organization: currentOrg._id }),
        api.get('/tasks/assigned/me'),
        api.get(`/organizations/${currentOrg._id}/teams`)
      ]);

      if (projectsRes.success) {
        setProjects(projectsRes.data);
      }

      if (tasksRes.success) {
        // Filter tasks that belong to the active organization or show all user's assigned tasks
        setAssignedTasks(tasksRes.data || []);
      }

      if (teamsRes.success) {
        const uId = user?._id;
        const userTeams = (teamsRes.data || []).filter(
          (t) =>
            (t.members || []).some((m) => (m._id || m) === uId) ||
            (t.lead?._id || t.lead) === uId
        );
        setMyTeams(userTeams);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentOrg, user?._id]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!name.trim() || !key.trim() || !currentOrg?._id) return;

    setCreating(true);
    try {
      const res = await api.post('/projects', {
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim(),
        category,
        riskLevel,
        organization: currentOrg._id
      });

      if (res.success) {
        setShowCreateModal(false);
        setName('');
        setKey('');
        setDescription('');
        fetchDashboardData();
        setCurrentProject(res.project);
        navigate(`/projects/${res.project._id}?tab=board`);
      }
    } catch (err) {
      alert('Failed to create project: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    return true;
  });

  const softwareCount = projects.filter((p) => p.category === 'software').length;
  const businessCount = projects.filter((p) => p.category === 'business').length;

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading portfolio overview...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Enterprise Portfolio
            </span>
            <span className="text-xs text-slate-400 font-medium">{currentOrg?.name}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Projects Portfolio & Strategic Programs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track roadmaps, sprint throughput, team allocations, and risk across software & business initiatives.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Projects
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{projects.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Active portfolio programs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Software Engineering
          </span>
          <div className="text-2xl font-black text-indigo-600 mt-1">{softwareCount}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Microservices & platforms</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Your Assigned Tasks
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">{assignedTasks.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Deliverables assigned to you</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Your Teams
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{myTeams.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Active squad memberships</span>
        </div>
      </div>

      {/* SECTION: Assigned to You */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Briefcase className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Work Assigned to You</h2>
              <p className="text-[11px] text-slate-400">
                Tasks and stories currently assigned to your account across all projects
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
            {assignedTasks.length} {assignedTasks.length === 1 ? 'Task' : 'Tasks'}
          </span>
        </div>

        {assignedTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignedTasks.map((t) => {
              const priorityBadge = getPriorityBadge(t.priority);
              const statusBadge = getStatusBadge(t.status);
              const projectObj = t.project;

              return (
                <div
                  key={t._id}
                  onClick={() => {
                    if (projectObj?._id) {
                      setCurrentProject(projectObj);
                      navigate(`/projects/${projectObj._id}?tab=board&taskId=${t._id}`);
                    }
                  }}
                  className="p-3.5 rounded-xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-md bg-slate-50/40 hover:bg-white transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {t.taskNumber}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityBadge.bg} ${priorityBadge.text}`}>
                          {t.priority}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                          {t.status}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {t.title}
                    </h4>

                    {t.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[140px] font-semibold text-slate-700">
                      {projectObj?.name || 'Project'}
                    </span>
                    {t.dueDate ? (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(t.dueDate)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400">
                        {t.storyPoints ? `${t.storyPoints} pts` : 'No due date'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-medium">No tasks are currently assigned to you.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              When your team lead or project manager assigns you deliverables, they will appear here.
            </p>
          </div>
        )}
      </div>

      {/* SECTION: Your Teams */}
      {myTeams.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Users2 className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Your Teams & Squads</h2>
                <p className="text-[11px] text-slate-400">
                  Functional engineering squads where you are an active collaborator
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/orgs')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              View All Teams →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myTeams.map((team) => (
              <div
                key={team._id}
                className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/40 hover:bg-white hover:border-indigo-300 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">{team.name}</h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Member
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {team.description || 'Cross-functional collaborative engineering squad.'}
                </p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    Lead: <strong className="text-slate-700">{team.lead?.name || 'Unassigned'}</strong>
                  </span>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {team.members?.slice(0, 4).map((tm) => (
                      <img
                        key={tm._id}
                        src={tm.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tm.name}`}
                        alt={tm.name}
                        title={tm.name}
                        className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover"
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-xl transition-colors ${
            categoryFilter === 'all'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Initiatives ({projects.length})
        </button>
        <button
          onClick={() => setCategoryFilter('software')}
          className={`px-3 py-1.5 rounded-xl transition-colors ${
            categoryFilter === 'software'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Software Engineering ({softwareCount})
        </button>
        <button
          onClick={() => setCategoryFilter('business')}
          className={`px-3 py-1.5 rounded-xl transition-colors ${
            categoryFilter === 'business'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Business & Operations ({businessCount})
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((p) => {
          const progress = p.stats?.progress || 0;
          const totalTasks = p.stats?.totalTasks || 0;
          const completedTasks = p.stats?.completedTasks || 0;

          return (
            <div
              key={p._id}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
                    {p.key}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {p.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.riskLevel === 'High'
                          ? 'bg-rose-50 text-rose-700'
                          : p.riskLevel === 'Medium'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {p.riskLevel} Risk
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <h3
                  onClick={() => {
                    setCurrentProject(p);
                    navigate(`/projects/${p._id}?tab=board`);
                  }}
                  className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer line-clamp-1"
                >
                  {p.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {p.description || 'Enterprise project workspace.'}
                </p>

                {/* Active Sprint Pill */}
                {p.activeSprint && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50/70 p-2 rounded-xl">
                    <Zap className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600 shrink-0" />
                    <span className="truncate">Active: {p.activeSprint}</span>
                  </div>
                )}
              </div>

              {/* Progress & Bottom Actions */}
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>
                      Task Completion ({completedTasks}/{totalTasks})
                    </span>
                    <span className="font-bold text-slate-900">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Quick Navigation Icons */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      onClick={() => {
                        setCurrentProject(p);
                        navigate(`/projects/${p._id}?tab=board`);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                      title="Kanban Board"
                    >
                      <Kanban className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setCurrentProject(p);
                        navigate(`/projects/${p._id}?tab=sprints`);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                      title="Sprint Planning"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setCurrentProject(p);
                        navigate(`/projects/${p._id}?tab=timeline`);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                      title="Milestone Timeline"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setCurrentProject(p);
                        navigate(`/projects/${p._id}?tab=workload`);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                      title="Team Workload"
                    >
                      <Users2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setCurrentProject(p);
                      navigate(`/projects/${p._id}?tab=board`);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Project"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Project Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!key) {
                  setKey(e.target.value.substring(0, 5).replace(/[^a-zA-Z]/g, '').toUpperCase());
                }
              }}
              placeholder="e.g. CloudScale NextGen Platform"
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Project Key
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder="e.g. CLOUD"
                className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl px-3 py-2 text-indigo-700 uppercase focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="software">Software Engineering</option>
                <option value="business">Business / Marketing</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of project scope..."
              className="w-full text-xs border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Risk Assessment
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
            </select>
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
              disabled={creating || !name.trim() || !key.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20"
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PortfolioDashboard;
