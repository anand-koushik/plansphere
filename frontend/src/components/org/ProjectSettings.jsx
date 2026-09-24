import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  Users,
  Shield,
  Trash2,
  Plus,
  AlertTriangle,
  Save,
  Check
} from 'lucide-react';
import { formatDate } from '../../utils/helpers';

const ProjectSettings = ({ projectId, projectData, onProjectUpdated }) => {
  const { user, canManageProject, isOrgAdmin, isStakeholder } = useAuth();
  const [members, setMembers] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState(projectData?.name || '');
  const [description, setDescription] = useState(projectData?.description || '');
  const [riskLevel, setRiskLevel] = useState(projectData?.riskLevel || 'Low');
  const [budget, setBudget] = useState(projectData?.budget || 0);
  const [targetDate, setTargetDate] = useState(
    projectData?.targetDate ? projectData.targetDate.split('T')[0] : ''
  );

  // Add Member Modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('Developer/Member');
  const [addingMember, setAddingMember] = useState(false);

  const fetchMembers = async () => {
    try {
      const [membersRes, orgMembersRes] = await Promise.all([
        api.get(`/projects/${projectId}/members`),
        api.get(`/organizations/${projectData?.organization?._id || projectData?.organization}/members`)
      ]);

      if (membersRes.success) setMembers(membersRes.data);
      if (orgMembersRes.success) setOrgUsers(orgMembersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectData) {
      setName(projectData.name || '');
      setDescription(projectData.description || '');
      setRiskLevel(projectData.riskLevel || 'Low');
      setBudget(projectData.budget || 0);
      setTargetDate(projectData.targetDate ? projectData.targetDate.split('T')[0] : '');
      fetchMembers();
    }
  }, [projectId, projectData]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!canManageProject) return;

    setSaving(true);
    try {
      const res = await api.put(`/projects/${projectId}`, {
        name: name.trim(),
        description: description.trim(),
        riskLevel,
        budget: Number(budget),
        targetDate: targetDate || null
      });

      if (res.success) {
        onProjectUpdated?.(res.project);
        alert('Project settings saved successfully!');
      }
    } catch (err) {
      alert('Failed to update project settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !canManageProject) return;

    setAddingMember(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, {
        userId: selectedUserId,
        role: selectedRole
      });

      if (res.success) {
        setShowAddMember(false);
        setSelectedUserId('');
        fetchMembers();
      }
    } catch (err) {
      alert('Failed to assign member: ' + err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await api.delete(`/projects/${projectId}/members/${memberId}`);
      setMembers((prev) => prev.filter((m) => m._id !== memberId));
    } catch (err) {
      alert('Failed to remove member: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" />
              General Project Configuration
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update project naming, risk appetite, and budget constraints.
            </p>
          </div>

          {canManageProject && (
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-600/20"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          )}
        </div>

        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={name}
                disabled={!canManageProject}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-semibold disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                disabled={!canManageProject}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Risk Classification
              </label>
              <select
                value={riskLevel}
                disabled={!canManageProject}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50"
              >
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Budget (USD)
                </label>
                <input
                  type="number"
                  value={budget}
                  disabled={!canManageProject}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Target Launch Date
                </label>
                <input
                  type="date"
                  value={targetDate}
                  disabled={!canManageProject}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Project-Scoped RBAC Members */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Project-Scoped Roles & Permissions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign roles specifically for this project (Project Manager, Team Lead, Developer, Stakeholder).
            </p>
          </div>

          {canManageProject && (
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors border border-indigo-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Assign Member
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {members.map((m) => (
            <div
              key={m._id}
              className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
            >
              <div className="flex items-center gap-3">
                <img
                  src={m.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user?.name}`}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h4 className="font-bold text-slate-900">{m.user?.name}</h4>
                  <p className="text-[11px] text-slate-400">{m.user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {m.role}
                </span>

                {canManageProject && m.user?._id !== user?._id && (
                  <button
                    onClick={() => handleRemoveMember(m._id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Remove from project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        title="Assign Member to Project"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Select User
            </label>
            <select
              required
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Choose organization member...</option>
              {orgUsers.map((om) => (
                <option key={om.user?._id} value={om.user?._id}>
                  {om.user?.name} ({om.user?.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Project Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="Project Manager">Project Manager</option>
              <option value="Team Lead">Team Lead</option>
              <option value="Developer/Member">Developer/Member</option>
              <option value="Stakeholder">Stakeholder (Read-Only)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddMember(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingMember || !selectedUserId}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20"
            >
              {addingMember ? 'Assigning...' : 'Assign Role'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectSettings;
