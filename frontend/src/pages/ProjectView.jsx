import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from '../components/kanban/KanbanBoard';
import SprintPlanner from '../components/sprints/SprintPlanner';
import MilestoneTimeline from '../components/timeline/MilestoneTimeline';
import WorkloadDashboard from '../components/workload/WorkloadDashboard';
import IssueTracker from '../components/issues/IssueTracker';
import ProjectReports from '../components/reports/ProjectReports';
import ActivityFeed from '../components/activity/ActivityFeed';
import ProjectSettings from '../components/org/ProjectSettings';
import {
  Kanban,
  Zap,
  CalendarDays,
  Users2,
  Bug,
  LineChart,
  History,
  Settings,
  AlertTriangle,
  FolderGit2,
  CheckCircle2,
  Shield
} from 'lucide-react';

const TABS = [
  { id: 'board', label: 'Kanban Board', icon: Kanban },
  { id: 'sprints', label: 'Sprint Planning', icon: Zap },
  { id: 'timeline', label: 'Timeline & Milestones', icon: CalendarDays },
  { id: 'workload', label: 'Team Workload', icon: Users2 },
  { id: 'issues', label: 'Issue Tracker', icon: Bug },
  { id: 'reports', label: 'Reports & Burndown', icon: LineChart },
  { id: 'activity', label: 'Activity Feed', icon: History },
  { id: 'settings', label: 'Project Settings', icon: Settings }
];

const ProjectView = () => {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setCurrentProject, projectRole, isStakeholder } = useAuth();

  const [projectData, setProjectData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentTab = searchParams.get('tab') || 'board';
  const initialTaskId = searchParams.get('taskId');
  const initialIssueId = searchParams.get('issueId');

  const fetchProjectDetails = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.get(`/projects/${projectId}`);
      if (res.success) {
        setProjectData(res.project);
        setSummary(res.summary);
        setCurrentProject(res.project);
      }
    } catch (err) {
      console.error('Error fetching project:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const handleTabChange = (tabId) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tabId);
    // Remove one-time item IDs when manually switching tabs
    params.delete('taskId');
    params.delete('issueId');
    setSearchParams(params);
  };

  if (loading) {
    return <div className="py-24 text-center text-slate-400 text-sm">Loading project workspace...</div>;
  }

  if (!projectData) {
    return (
      <div className="py-24 text-center text-slate-500 text-sm">
        Project not found or you don't have access.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white font-mono font-bold text-sm shadow-md shadow-indigo-600/20 shrink-0">
              {projectData.key}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">{projectData.name}</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {projectData.category}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    projectData.riskLevel === 'High'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : projectData.riskLevel === 'Medium'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {projectData.riskLevel} Risk
                </span>
                {isStakeholder && (
                  <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                    Stakeholder (Read-Only)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {projectData.description || 'Enterprise project workspace.'}
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {summary?.activeSprint && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
                <Zap className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                <span>{summary.activeSprint.name}</span>
              </div>
            )}

            {summary?.blockedTasks > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>{summary.blockedTasks} Blocked</span>
              </div>
            )}

            {summary?.criticalIssues > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                <Bug className="w-3.5 h-3.5 text-rose-600" />
                <span>{summary.criticalIssues} Critical Bugs</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex overflow-x-auto border-t border-slate-100 pt-3 gap-1 text-xs font-bold">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Tab Component */}
      <div>
        {currentTab === 'board' && (
          <KanbanBoard
            projectId={projectId}
            activeSprint={summary?.activeSprint}
            initialTaskId={initialTaskId}
          />
        )}

        {currentTab === 'sprints' && (
          <SprintPlanner
            projectId={projectId}
            onTaskSelect={(taskId) => {
              navigate(`/projects/${projectId}?tab=board&taskId=${taskId}`);
            }}
          />
        )}

        {currentTab === 'timeline' && <MilestoneTimeline projectId={projectId} />}

        {currentTab === 'workload' && (
          <WorkloadDashboard
            projectId={projectId}
            activeSprint={summary?.activeSprint}
          />
        )}

        {currentTab === 'issues' && (
          <IssueTracker
            projectId={projectId}
            initialIssueId={initialIssueId}
          />
        )}

        {currentTab === 'reports' && (
          <ProjectReports
            projectId={projectId}
            projectName={projectData.name}
          />
        )}

        {currentTab === 'activity' && <ActivityFeed projectId={projectId} />}

        {currentTab === 'settings' && (
          <ProjectSettings
            projectId={projectId}
            projectData={projectData}
            onProjectUpdated={(p) => setProjectData(p)}
          />
        )}
      </div>
    </div>
  );
};

export default ProjectView;
