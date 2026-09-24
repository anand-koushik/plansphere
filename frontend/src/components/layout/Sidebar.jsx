import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import {
  LayoutDashboard,
  Kanban,
  Zap,
  CalendarDays,
  Users2,
  Bug,
  LineChart,
  History,
  Settings,
  Building2,
  ChevronRight,
  FolderGit2,
  Plus
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { currentOrg, currentProject, setCurrentProject, projectRole, orgRole, isOrgAdmin } = useAuth();
  const [projectList, setProjectList] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Load projects for current organization
  useEffect(() => {
    if (!currentOrg?._id) return;
    const fetchOrgProjects = async () => {
      try {
        const res = await api.get('/projects', { organization: currentOrg._id });
        if (res.success) {
          setProjectList(res.data);
          // Set initial active project if none selected or not in current list
          if (!currentProject || !res.data.some((p) => p._id === currentProject._id)) {
            if (res.data.length > 0) {
              setCurrentProject(res.data[0]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching org projects:', err.message);
      }
    };
    fetchOrgProjects();
  }, [currentOrg]);

  const activeProjectId = currentProject?._id;

  const projectNavItems = [
    { name: 'Kanban Board', tab: 'board', icon: Kanban },
    { name: 'Sprint Planning', tab: 'sprints', icon: Zap },
    { name: 'Timeline & Milestones', tab: 'timeline', icon: CalendarDays },
    { name: 'Team Workload', tab: 'workload', icon: Users2 },
    { name: 'Issue Tracker', tab: 'issues', icon: Bug },
    { name: 'Reports & Analytics', tab: 'reports', icon: LineChart },
    { name: 'Activity Feed', tab: 'activity', icon: History },
    { name: 'Project Settings', tab: 'settings', icon: Settings }
  ];

  const currentTab = new URLSearchParams(location.search).get('tab') || 'board';
  const isProjectPage = location.pathname.startsWith('/projects/');

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/40">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white">PlanSphere</span>
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-indigo-400">
                Enterprise
              </span>
            </div>
          </div>
        </div>

        {/* Project Selector Box */}
        <div className="p-3 border-b border-slate-800/60">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
            Active Project
          </label>
          <div className="relative">
            <select
              value={activeProjectId || ''}
              onChange={(e) => {
                const selected = projectList.find((p) => p._id === e.target.value);
                if (selected) {
                  setCurrentProject(selected);
                  navigate(`/projects/${selected._id}?tab=${currentTab}`);
                }
              }}
              className="w-full appearance-none bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-white px-3 py-2 rounded-xl border border-slate-700/80 focus:outline-none focus:border-indigo-500 transition-colors pr-8 cursor-pointer"
            >
              {projectList.map((p) => (
                <option key={p._id} value={p._id} className="bg-slate-900 text-white py-1">
                  [{p.key}] {p.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-2.5 text-slate-400">
              <ChevronRight className="w-3.5 h-3.5 rotate-90" />
            </div>
          </div>
        </div>

        {/* Navigation Menus */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main Portfolio Overview */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Workspace
            </div>
            <NavLink
              to="/"
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive && location.pathname === '/'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Portfolio Dashboard</span>
            </NavLink>
          </div>

          {/* Project-Specific Modules */}
          {activeProjectId && (
            <div>
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Project Modules
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-400 font-semibold">
                  {currentProject?.key}
                </span>
              </div>
              <div className="space-y-0.5">
                {projectNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isProjectPage && currentTab === item.tab;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => {
                        navigate(`/projects/${activeProjectId}?tab=${item.tab}`);
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Organization Administration */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Administration
            </div>
            <NavLink
              to="/orgs"
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`
              }
            >
              <Building2 className="w-4 h-4" />
              <span>Org, Teams & Members</span>
              {isOrgAdmin && (
                <span className="ml-auto text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
            </NavLink>
          </div>
        </div>

        {/* Footer Role Badge */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs px-2 py-1 bg-slate-800/60 rounded-lg">
            <span className="text-[11px] text-slate-400">Current Role:</span>
            <span className="text-[11px] font-bold text-indigo-400">
              {projectRole || orgRole || 'Member'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
