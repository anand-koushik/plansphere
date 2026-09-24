import React, { useState, useEffect } from 'react';
import Modal from '../components/common/Modal';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Users,
  Shield,
  UserPlus,
  Trash2,
  Edit2,
  Layers,
  Crown,
  CheckCircle2,
  FolderGit2,
  Plus,
  UserCheck,
  UserMinus,
  Mail,
  X
} from 'lucide-react';
import { formatDate } from '../utils/helpers';

const OrganizationPage = () => {
  const { currentOrg, isOrgAdmin, user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('members'); // 'members', 'teams', 'settings'
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [inviting, setInviting] = useState(false);

  // Create Team modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [selectedCreateTeamMembers, setSelectedCreateTeamMembers] = useState([]);
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Add Member to Team modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedTeamForAdd, setSelectedTeamForAdd] = useState(null);
  const [memberIdToAdd, setMemberIdToAdd] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // Edit Org modal
  const [orgName, setOrgName] = useState(currentOrg?.name || '');
  const [orgDesc, setOrgDesc] = useState(currentOrg?.description || '');
  const [savingOrg, setSavingOrg] = useState(false);

  const fetchOrgData = async () => {
    if (!currentOrg?._id) return;
    setLoading(true);
    try {
      const [membersRes, teamsRes] = await Promise.all([
        api.get(`/organizations/${currentOrg._id}/members`),
        api.get(`/organizations/${currentOrg._id}/teams`)
      ]);

      if (membersRes.success) setMembers(membersRes.data);
      if (teamsRes.success) setTeams(teamsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgData();
  }, [currentOrg]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !isOrgAdmin) return;

    setInviting(true);
    try {
      const res = await api.post(`/organizations/${currentOrg._id}/invite`, {
        email: inviteEmail.trim(),
        role: inviteRole
      });

      if (res.success) {
        setShowInviteModal(false);
        setInviteEmail('');
        fetchOrgData();
        alert(`User ${inviteEmail} successfully invited and enrolled into organization and projects.`);
      }
    } catch (err) {
      alert('Failed to invite member: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim() || !isOrgAdmin) return;

    setCreatingTeam(true);
    try {
      const leadId = teamLeadId || user._id;
      const initialMembers = Array.from(new Set([leadId, ...selectedCreateTeamMembers]));

      const res = await api.post(`/organizations/${currentOrg._id}/teams`, {
        name: teamName.trim(),
        description: teamDescription.trim(),
        lead: leadId,
        members: initialMembers
      });

      if (res.success) {
        setShowTeamModal(false);
        setTeamName('');
        setTeamDescription('');
        setTeamLeadId('');
        setSelectedCreateTeamMembers([]);
        fetchOrgData();
      }
    } catch (err) {
      alert('Failed to create team: ' + err.message);
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleOpenAddMemberModal = (team) => {
    setSelectedTeamForAdd(team);
    setMemberIdToAdd('');
    setShowAddMemberModal(true);
  };

  const handleAddMemberToTeam = async (e) => {
    e.preventDefault();
    if (!selectedTeamForAdd || !memberIdToAdd) return;

    setAddingMember(true);
    try {
      const res = await api.post(`/organizations/${currentOrg._id}/teams/${selectedTeamForAdd._id}/members`, {
        userId: memberIdToAdd
      });

      if (res.success) {
        setShowAddMemberModal(false);
        setSelectedTeamForAdd(null);
        setMemberIdToAdd('');
        fetchOrgData();
      }
    } catch (err) {
      alert('Failed to add member to team: ' + err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMemberFromTeam = async (teamId, memberUserId) => {
    if (!window.confirm('Remove this member from the team?')) return;
    try {
      const res = await api.delete(`/organizations/${currentOrg._id}/teams/${teamId}/members/${memberUserId}`);
      if (res.success) {
        fetchOrgData();
      }
    } catch (err) {
      alert('Failed to remove member from team: ' + err.message);
    }
  };

  const handleDeleteTeam = async (teamId, tName) => {
    if (!window.confirm(`Delete team "${tName}"?`)) return;
    try {
      const res = await api.delete(`/organizations/${currentOrg._id}/teams/${teamId}`);
      if (res.success) {
        fetchOrgData();
      }
    } catch (err) {
      alert('Failed to delete team: ' + err.message);
    }
  };

  const handleUpdateOrg = async (e) => {
    e.preventDefault();
    if (!isOrgAdmin) return;

    setSavingOrg(true);
    try {
      const res = await api.put(`/organizations/${currentOrg._id}`, {
        name: orgName.trim(),
        description: orgDesc.trim()
      });

      if (res.success) {
        alert('Organization profile updated.');
        refreshUser();
      }
    } catch (err) {
      alert('Failed to update org: ' + err.message);
    } finally {
      setSavingOrg(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the organization?')) return;
    try {
      await api.delete(`/organizations/${currentOrg._id}/members/${memberId}`);
      fetchOrgData();
    } catch (err) {
      alert('Failed to remove: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{currentOrg?.name}</h1>
              <p className="text-xs text-slate-500">
                Organization Administration, Teams & Identity Provisioning
              </p>
            </div>
          </div>
        </div>

        {isOrgAdmin ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-600/20"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
            <button
              onClick={() => setShowTeamModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
            >
              <Users className="w-4 h-4" />
              Create Team
            </button>
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Standard Member View
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        {[
          { id: 'members', label: `Members (${members.length})`, icon: Users },
          { id: 'teams', label: `Teams (${teams.length})`, icon: Layers },
          { id: 'settings', label: 'Organization Settings', icon: Shield }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Members */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {members.map((m) => (
              <div
                key={m._id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={m.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user?.name}`}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{m.user?.name}</h4>
                      {m.role === 'Org Admin' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full">
                          <Crown className="w-3 h-3 text-amber-500" /> Admin
                        </span>
                      )}
                      {m.user?._id === user?._id && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">{m.user?.email}</p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{m.user?.jobTitle}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {m.role}
                  </span>

                  {isOrgAdmin && m.user?._id !== user?._id && (
                    <button
                      onClick={() => handleRemoveMember(m._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                      title="Remove member from organization"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Teams */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {teams.map((team) => {
            const isUserInTeam = team.members?.some((tm) => (tm._id || tm) === user?._id);
            const isUserLead = (team.lead?._id || team.lead) === user?._id;
            const canManageTeam = isOrgAdmin || isUserLead;

            return (
              <div
                key={team._id}
                className={`bg-white p-5 rounded-2xl border transition-all shadow-2xs space-y-4 ${
                  isUserInTeam || isUserLead
                    ? 'border-indigo-300 ring-2 ring-indigo-50/80'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Team Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{team.name}</h3>
                      {(isUserInTeam || isUserLead) && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Your Team
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {team.description || 'Cross-functional collaborative engineering unit.'}
                    </p>
                  </div>

                  {isOrgAdmin && (
                    <button
                      onClick={() => handleDeleteTeam(team._id, team.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete team"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Team Lead Section */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={team.lead?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${team.lead?.name || 'Lead'}`}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider block">
                        Team Lead
                      </span>
                      <span className="font-bold text-slate-800">
                        {team.lead?.name || 'Unassigned Lead'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500">{team.lead?.email}</span>
                </div>

                {/* Team Members List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Team Members ({team.members?.length || 0})
                    </span>

                    {canManageTeam && (
                      <button
                        onClick={() => handleOpenAddMemberModal(team)}
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Member</span>
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {team.members && team.members.length > 0 ? (
                      team.members.map((tm) => (
                        <div
                          key={tm._id}
                          className="px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={tm.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tm.name}`}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800 truncate block">
                                {tm.name} {tm._id === user?._id && <span className="text-indigo-600 text-[10px]">(You)</span>}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {tm.jobTitle || tm.email}
                              </span>
                            </div>
                          </div>

                          {canManageTeam && tm._id !== team.lead?._id && (
                            <button
                              onClick={() => handleRemoveMemberFromTeam(team._id, tm._id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Remove from team"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400 italic">
                        No additional members in this team yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {teams.length === 0 && (
            <div className="col-span-2 py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-dashed border-slate-300">
              No teams created yet. Create functional squads to group workload and assignments.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Organization Settings */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Organization Profile</h3>
          <form onSubmit={handleUpdateOrg} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                disabled={!isOrgAdmin}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                disabled={!isOrgAdmin}
                value={orgDesc}
                onChange={(e) => setOrgDesc(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50"
              />
            </div>

            {isOrgAdmin && (
              <button
                type="submit"
                disabled={savingOrg}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm shadow-indigo-600/20"
              >
                {savingOrg ? 'Saving...' : 'Save Organization'}
              </button>
            )}
          </form>
        </div>
      )}

      {/* Invite Member Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite New Team Member"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Member Email
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="e.g. colleague@company.com"
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Organization Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="Member">Member (Standard Access)</option>
              <option value="Org Admin">Org Admin (Full Administration)</option>
              <option value="Guest">Guest (Restricted)</option>
            </select>
          </div>

          <p className="text-[11px] text-slate-400">
            If the user doesn't already have an account, one will be automatically provisioned with
            default access credentials (password: <code>password123</code>). They will be automatically enrolled in all active projects.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20"
            >
              {inviting ? 'Inviting...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Team Modal */}
      <Modal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        title="Create Functional Team"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Team Name
            </label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Core Infrastructure"
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              placeholder="Responsibilities and domain..."
              className="w-full text-xs border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Team Lead
            </label>
            <select
              value={teamLeadId}
              onChange={(e) => setTeamLeadId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select team lead...</option>
              {members.map((m) => (
                <option key={m.user?._id} value={m.user?._id}>
                  {m.user?.name} ({m.user?.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Initial Team Members
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2.5">
              {members.map((m) => {
                const uId = m.user?._id;
                if (!uId || uId === teamLeadId) return null;
                const isChecked = selectedCreateTeamMembers.includes(uId);

                return (
                  <label
                    key={uId}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCreateTeamMembers((prev) => [...prev, uId]);
                        } else {
                          setSelectedCreateTeamMembers((prev) => prev.filter((id) => id !== uId));
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <img
                      src={m.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user?.name}`}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="font-semibold text-slate-800">{m.user?.name}</span>
                    <span className="text-[10px] text-slate-400">({m.user?.jobTitle})</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowTeamModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingTeam || !teamName.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20"
            >
              {creatingTeam ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Member to Team Modal */}
      {selectedTeamForAdd && (
        <Modal
          isOpen={showAddMemberModal}
          onClose={() => {
            setShowAddMemberModal(false);
            setSelectedTeamForAdd(null);
          }}
          title={`Add Member to ${selectedTeamForAdd.name}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleAddMemberToTeam} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Select Colleague
              </label>
              <select
                required
                value={memberIdToAdd}
                onChange={(e) => setMemberIdToAdd(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Choose an organization member...</option>
                {members
                  .filter((m) => {
                    const memberUserId = m.user?._id;
                    const existingTeamUserIds = (selectedTeamForAdd.members || []).map((tm) => tm._id || tm);
                    return memberUserId && !existingTeamUserIds.includes(memberUserId);
                  })
                  .map((m) => (
                    <option key={m.user?._id} value={m.user?._id}>
                      {m.user?.name} - {m.user?.jobTitle} ({m.user?.email})
                    </option>
                  ))}
              </select>
            </div>

            <p className="text-[11px] text-slate-400">
              This colleague will immediately be linked to <strong>{selectedTeamForAdd.name}</strong> and have access to team projects and workload assignments.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedTeamForAdd(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingMember || !memberIdToAdd}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20"
              >
                {addingMember ? 'Adding...' : 'Add to Team'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default OrganizationPage;
