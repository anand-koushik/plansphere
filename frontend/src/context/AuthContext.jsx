import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const DEMO_PERSONAS = [
  {
    role: 'Org Admin',
    name: 'Sarah Jenkins',
    email: 'admin@plansphere.io',
    jobTitle: 'VP of Engineering / Org Admin',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    description: 'Full organizational authority, teams, members, and project oversight.'
  },
  {
    role: 'Project Manager',
    name: 'David Chen',
    email: 'pm@plansphere.io',
    jobTitle: 'Senior Technical PM',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    description: 'Plans sprints, manages milestones, risks, workload, and project reports.'
  },
  {
    role: 'Team Lead',
    name: 'Elena Rostova',
    email: 'lead@plansphere.io',
    jobTitle: 'Fullstack Tech Lead',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    description: 'Manages team velocity, reviews tasks, resolves blockers, and coordinates releases.'
  },
  {
    role: 'Developer/Member',
    name: 'Alex Rivera',
    email: 'dev@plansphere.io',
    jobTitle: 'Senior Frontend Engineer',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    description: 'Updates task progress, drags kanban cards, comments, files, and reports issues.'
  },
  {
    role: 'Stakeholder',
    name: 'Marcus Vance',
    email: 'stakeholder@plansphere.io',
    jobTitle: 'Director of Product & Strategy',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    description: 'Read-only visibility for executive progress, milestones, risks, and burndown reports.'
  }
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('plansphere_token') || null);
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrgState] = useState(null);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProjectState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to persist current org
  const setCurrentOrg = (org) => {
    setCurrentOrgState(org);
    if (org && org._id) {
      localStorage.setItem('plansphere_active_org', org._id);
    } else {
      localStorage.removeItem('plansphere_active_org');
    }
  };

  // Helper to persist current project
  const setCurrentProject = (project) => {
    setCurrentProjectState(project);
    if (project && project._id) {
      localStorage.setItem('plansphere_active_project', project._id);
    } else {
      localStorage.removeItem('plansphere_active_project');
    }
  };

  // Load user profile and affiliations on mount
  const refreshUser = async () => {
    try {
      const storedToken = localStorage.getItem('plansphere_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      const res = await api.get('/auth/me');
      if (res.success) {
        setUser(res.user);
        setOrganizations(res.organizations || []);
        setProjects(res.projects || []);

        // Restore or pick default organization
        const savedOrgId = localStorage.getItem('plansphere_active_org');
        const matchedOrg = (res.organizations || []).find((o) => o._id === savedOrgId);
        const activeOrg = matchedOrg || (res.organizations && res.organizations[0]) || null;
        setCurrentOrgState(activeOrg);
        if (activeOrg) {
          localStorage.setItem('plansphere_active_org', activeOrg._id);
        }

        // Restore or pick default project
        const savedProjId = localStorage.getItem('plansphere_active_project');
        const matchedProj = (res.projects || []).find((p) => p._id === savedProjId);
        const activeProj = matchedProj || (res.projects && res.projects[0]) || null;
        setCurrentProjectState(activeProj);
        if (activeProj) {
          localStorage.setItem('plansphere_active_project', activeProj._id);
        }
      }
    } catch (err) {
      console.error('Session restore failed:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.success) {
        localStorage.setItem('plansphere_token', res.token);
        setToken(res.token);
        setUser(res.user);
        setOrganizations(res.organizations || []);

        if (res.organizations && res.organizations.length > 0) {
          setCurrentOrg(res.organizations[0]);
        }
        await refreshUser();
        return res;
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', userData);
      if (res.success) {
        localStorage.setItem('plansphere_token', res.token);
        setToken(res.token);
        setUser(res.user);
        if (res.organization) {
          setOrganizations([res.organization]);
          setCurrentOrg(res.organization);
        }
        await refreshUser();
        return res;
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('plansphere_token');
    localStorage.removeItem('plansphere_active_org');
    localStorage.removeItem('plansphere_active_project');
    setToken(null);
    setUser(null);
    setOrganizations([]);
    setProjects([]);
    setCurrentOrgState(null);
    setCurrentProjectState(null);
  };

  // Instant 1-click persona switcher for grading and testing
  const switchPersona = async (email) => {
    try {
      return await login(email, 'password123');
    } catch (err) {
      console.error('Persona switch failed:', err.message);
      throw err;
    }
  };

  // Derive roles
  const orgRole = currentOrg?.role || (user?.systemRole === 'superadmin' ? 'Org Admin' : 'Member');
  const projectRole = currentProject?.role || (orgRole === 'Org Admin' ? 'Project Manager' : 'Developer/Member');

  const isStakeholder = projectRole === 'Stakeholder';
  const isOrgAdmin = orgRole === 'Org Admin' || user?.systemRole === 'superadmin';
  const canManageProject = isOrgAdmin || projectRole === 'Project Manager';
  const canLeadTeam = canManageProject || projectRole === 'Team Lead';
  const canEditTask = !isStakeholder;

  const value = {
    user,
    token,
    organizations,
    currentOrg,
    setCurrentOrg,
    projects,
    currentProject,
    setCurrentProject,
    orgRole,
    projectRole,
    isStakeholder,
    isOrgAdmin,
    canManageProject,
    canLeadTeam,
    canEditTask,
    login,
    register,
    logout,
    switchPersona,
    refreshUser,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
