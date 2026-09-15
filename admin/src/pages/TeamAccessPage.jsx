import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  Check,
  Edit3,
  KeyRound,
  Loader2,
  Power,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { adminAccessApi } from '../services/apiService';
import './TeamAccessPage.css';

const EMPTY_MEMBER = { firstName: '', lastName: '', email: '', phone: '', accessRoleId: '' };
const EMPTY_ROLE = { name: '', description: '', permissions: [] };

const formatDate = (value, neverLabel) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : neverLabel;

function TeamAccessPage() {
  const { t } = useTranslation();
  const stateLabel = (state) => t(`teamAccess.states.${state}`, { defaultValue: String(state || '').replaceAll('_', ' ') });
  const [tab, setTab] = useState('members');
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [memberDialog, setMemberDialog] = useState(false);
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER);
  const [editingMember, setEditingMember] = useState(null);
  const [roleDialog, setRoleDialog] = useState(false);
  const [roleForm, setRoleForm] = useState(EMPTY_ROLE);
  const [editingRole, setEditingRole] = useState(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeAction, setActiveAction] = useState('');

  const loadControlPlane = useCallback(async () => {
    setLoading(true);
    try {
      const [memberResult, roleResult, permissionResult, auditResult] = await Promise.all([
        adminAccessApi.getMembers({ limit: 100 }),
        adminAccessApi.getRoles({ includeInactive: true }),
        adminAccessApi.getPermissions(),
        adminAccessApi.getAuditLogs({ limit: 50 }),
      ]);
      setMembers(memberResult.members || []);
      setRoles(roleResult.roles || []);
      setPermissions((permissionResult.permissions || []).filter((permission) => permission.isGrantable));
      setAuditLogs(auditResult.logs || []);
    } catch (error) {
      toast.error(error.message || t('teamAccess.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadControlPlane(); }, [loadControlPlane]);

  const filteredMembers = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return members;
    return members.filter((member) =>
      [member.firstName, member.lastName, member.email, member.accessRoleName, member.state]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value))
    );
  }, [members, search]);

  const permissionGroups = useMemo(() => Object.entries(
    permissions.filter((permission) => {
      const value = permissionSearch.trim().toLowerCase();
      return !value || [permission.name, permission.key, permission.module]
        .some((field) => String(field || '').toLowerCase().includes(value));
    }).reduce((groups, permission) => {
      (groups[permission.module] ||= []).push(permission);
      return groups;
    }, {})
  ), [permissions, permissionSearch]);

  const filteredRoles = useMemo(() => {
    const value = roleSearch.trim().toLowerCase();
    if (!value) return roles;
    return roles.filter((role) => [role.name, role.description, role.key]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(value)));
  }, [roles, roleSearch]);

  const openMemberDialog = (member = null) => {
    setEditingMember(member);
    setMemberForm(member ? {
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      email: member.email || '',
      phone: member.phone || '',
      accessRoleId: String(member.accessRoleId || ''),
    } : EMPTY_MEMBER);
    setMemberDialog(true);
  };

  const submitMember = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        firstName: memberForm.firstName,
        lastName: memberForm.lastName,
        phone: memberForm.phone || null,
        accessRoleId: Number(memberForm.accessRoleId),
      };
      if (editingMember) {
        await adminAccessApi.updateMember(editingMember.id, {
          ...payload,
          version: editingMember.version,
        });
      } else {
        await adminAccessApi.createMember({ ...payload, email: memberForm.email });
      }
      toast.success(editingMember ? t('teamAccess.toasts.memberUpdated') : t('teamAccess.toasts.memberCreated'));
      setMemberDialog(false);
      setMemberForm(EMPTY_MEMBER);
      setEditingMember(null);
      await loadControlPlane();
    } catch (error) {
      toast.error(error.message || (editingMember ? t('teamAccess.errors.updateMember') : t('teamAccess.errors.createMember')));
    } finally {
      setSaving(false);
    }
  };

  const changeMemberState = async (member, state, confirmation = null) => {
    if (confirmation && !window.confirm(confirmation)) return;
    const actionKey = `member:${member.id}:${state}`;
    setActiveAction(actionKey);
    try {
      await adminAccessApi.updateMember(member.id, { version: member.version, state });
      toast.success(t('teamAccess.toasts.memberState', { state: stateLabel(state) }));
      await loadControlPlane();
    } catch (error) {
      toast.error(error.message || t('teamAccess.errors.updateMember'));
    } finally {
      setActiveAction('');
    }
  };

  const resendInvitation = async (member) => {
    const actionKey = `member:${member.id}:resend`;
    setActiveAction(actionKey);
    try {
      await adminAccessApi.resendInvitation(member.id);
      toast.success(t('teamAccess.toasts.invitationQueued'));
      await loadControlPlane();
    } catch (error) {
      toast.error(error.message || t('teamAccess.errors.resendInvitation'));
    } finally {
      setActiveAction('');
    }
  };

  const requestPasswordReset = async (member) => {
    if (!window.confirm(t('teamAccess.confirm.passwordReset', { email: member.email }))) return;
    const actionKey = `member:${member.id}:password-reset`;
    setActiveAction(actionKey);
    try {
      await adminAccessApi.requestMemberPasswordReset(member.id);
      toast.success(t('teamAccess.toasts.passwordResetQueued'));
      await loadControlPlane();
    } catch (error) {
      toast.error(error.message || t('teamAccess.errors.passwordReset'));
    } finally {
      setActiveAction('');
    }
  };

  const openRoleDialog = (role = null) => {
    setEditingRole(role);
    setRoleForm(role ? {
      name: role.name,
      description: role.description || '',
      permissions: [...(role.permissions || [])],
    } : EMPTY_ROLE);
    setPermissionSearch('');
    setRoleDialog(true);
  };

  const togglePermission = (key) => {
    setRoleForm((current) => ({
      ...current,
      permissions: current.permissions.includes(key)
        ? current.permissions.filter((permission) => permission !== key)
        : [...current.permissions, key],
    }));
  };

  const togglePermissionGroup = (items) => {
    const keys = items.map((permission) => permission.key);
    const allSelected = keys.every((key) => roleForm.permissions.includes(key));
    setRoleForm((current) => ({
      ...current,
      permissions: allSelected
        ? current.permissions.filter((permission) => !keys.includes(permission))
        : [...new Set([...current.permissions, ...keys])],
    }));
  };

  const submitRole = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (!editingRole) {
        await adminAccessApi.createRole(roleForm);
      } else {
        await adminAccessApi.updateRole(editingRole.id, {
          ...roleForm,
          description: roleForm.description || null,
          version: editingRole.version,
        });
      }
      toast.success(editingRole ? t('teamAccess.toasts.roleUpdated') : t('teamAccess.toasts.roleCreated'));
      setRoleDialog(false);
      await loadControlPlane();
    } catch (error) {
      toast.error(error.message || t('teamAccess.errors.saveRole'));
    } finally {
      setSaving(false);
    }
  };

  const toggleRoleState = async (role) => {
    const nextActive = !role.isActive;
    const verb = nextActive ? 'activate' : 'deactivate';
    if (!window.confirm(t(`teamAccess.confirm.${verb}Role`, { name: role.name }))) return;

    const actionKey = `role:${role.id}:state`;
    setActiveAction(actionKey);
    try {
      await adminAccessApi.updateRole(role.id, { version: role.version, isActive: nextActive });
      toast.success(t(nextActive ? 'teamAccess.toasts.roleActivated' : 'teamAccess.toasts.roleDeactivated'));
      await loadControlPlane();
    } catch (error) {
      toast.error(error.message || t(`teamAccess.errors.${verb}Role`));
    } finally {
      setActiveAction('');
    }
  };

  const deleteRole = async (role) => {
    if (!window.confirm(t('teamAccess.confirm.deleteRole', { name: role.name }))) return;

    const actionKey = `role:${role.id}:delete`;
    setActiveAction(actionKey);
    try {
      await adminAccessApi.deleteRole(role.id);
      toast.success(t('teamAccess.toasts.roleDeleted'));
      await loadControlPlane();
    } catch (error) {
      toast.error(error.message || t('teamAccess.errors.deleteRole'));
    } finally {
      setActiveAction('');
    }
  };

  return (
    <div className="team-access-page">
      <header className="team-access-header">
        <div>
          <h1>{t('teamAccess.title')}</h1>
          <p>{t('teamAccess.subtitle')}</p>
        </div>
        <button className="ta-icon-button" onClick={loadControlPlane} title={t('common.refresh')} aria-label={t('common.refresh')}>
          <RefreshCw size={18} />
        </button>
      </header>

      <div className="ta-tabs" role="tablist" aria-label={t('teamAccess.views')}>
        {[
          ['members', Users, t('teamAccess.tabs.members')],
          ['roles', ShieldCheck, t('teamAccess.tabs.roles')],
          ['audit', KeyRound, t('teamAccess.tabs.audit')],
        ].map(([value, Icon, label]) => (
          <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>
            <Icon size={17} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ta-loading"><Loader2 className="spin" size={24} /> {t('teamAccess.loading')}</div>
      ) : tab === 'members' ? (
        <section className="ta-section">
          <div className="ta-toolbar">
            <label className="ta-search">
              <Search size={17} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('teamAccess.searchMembers')} />
            </label>
            <button className="ta-primary-button" onClick={() => openMemberDialog()}>
              <Plus size={17} /> {t('teamAccess.addMember')}
            </button>
          </div>
          <div className="ta-table-wrap">
            <table className="ta-table">
              <thead><tr><th>{t('teamAccess.columns.member')}</th><th>{t('teamAccess.columns.role')}</th><th>{t('teamAccess.columns.status')}</th><th>{t('teamAccess.columns.lastLogin')}</th><th>{t('teamAccess.columns.actions')}</th></tr></thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td><strong>{member.firstName} {member.lastName}</strong><span>{member.email}</span></td>
                    <td>{member.accessRoleName}</td>
                    <td>
                      <span className={`ta-status ${member.state}`}>{stateLabel(member.state)}</span>
                      <span className={`ta-email-state ${member.emailVerified ? 'verified' : 'pending'}`}>
                        {member.emailVerified ? t('teamAccess.emailVerified') : t('teamAccess.emailPending')}
                      </span>
                    </td>
                    <td>{formatDate(member.lastLogin, t('teamAccess.never'))}</td>
                    <td className="ta-actions">
                      <button type="button" onClick={() => openMemberDialog(member)} title={t('teamAccess.editMember')} aria-label={t('teamAccess.editMemberName', { name: `${member.firstName} ${member.lastName}` })}>
                        <Edit3 size={16} />
                      </button>
                      {['pending_invite', 'revoked'].includes(member.state) && (
                        <button type="button" disabled={!!activeAction} onClick={() => resendInvitation(member)} title={t('teamAccess.resendInvitation')} aria-label={t('teamAccess.resendInvitationTo', { email: member.email })}>
                          {activeAction === `member:${member.id}:resend` ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
                        </button>
                      )}
                      {member.state === 'pending_invite' && (
                        <button type="button" disabled={!!activeAction} onClick={() => changeMemberState(member, 'revoked', t('teamAccess.confirm.revokeInvitation', { email: member.email }))} title={t('teamAccess.revokeInvitation')} aria-label={t('teamAccess.revokeInvitationFor', { email: member.email })}><Ban size={16} /></button>
                      )}
                      {member.state === 'active' && (
                        <>
                          <button type="button" disabled={!!activeAction} onClick={() => requestPasswordReset(member)} title={t('teamAccess.passwordReset')} aria-label={t('teamAccess.passwordResetFor', { email: member.email })}>
                            {activeAction === `member:${member.id}:password-reset` ? <Loader2 className="spin" size={16} /> : <KeyRound size={16} />}
                          </button>
                          <button type="button" disabled={!!activeAction} onClick={() => changeMemberState(member, 'disabled', t('teamAccess.confirm.disableMember', { email: member.email }))} title={t('teamAccess.disableMember')} aria-label={t('teamAccess.disableEmail', { email: member.email })}><Power size={16} /></button>
                        </>
                      )}
                      {member.state === 'disabled' && (
                        <button type="button" disabled={!!activeAction} onClick={() => changeMemberState(member, 'active')} title={t('teamAccess.enableMember')} aria-label={t('teamAccess.enableEmail', { email: member.email })}><Check size={16} /></button>
                      )}
                      <button type="button" className="danger" disabled={!!activeAction} onClick={() => changeMemberState(member, 'deleted', t('teamAccess.confirm.removeMember', { email: member.email }))} title={t('teamAccess.removeMember')} aria-label={t('teamAccess.removeEmail', { email: member.email })}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {!filteredMembers.length && <tr><td colSpan="5" className="ta-empty">{t('teamAccess.noMembers')}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      ) : tab === 'roles' ? (
        <section className="ta-section">
          <div className="ta-toolbar">
            <label className="ta-search">
              <Search size={17} />
              <input value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} placeholder={t('teamAccess.searchRoles')} />
            </label>
            <button className="ta-primary-button" onClick={() => openRoleDialog()}><Plus size={17} /> {t('teamAccess.newRole')}</button>
          </div>
          <div className="ta-role-list">
            {filteredRoles.map((role) => (
              <article key={role.id} className="ta-role-row">
                <div className="ta-role-icon"><ShieldCheck size={20} /></div>
                <div className="ta-role-copy">
                  <div><strong>{role.name}</strong>{!role.isActive && <span className="ta-status disabled">{t('common.inactive')}</span>}</div>
                  <p>{role.description || t('teamAccess.noDescription')}</p>
                </div>
                <div className="ta-role-count"><strong>{role.memberCount}</strong><span>{t('teamAccess.members')}</span></div>
                <div className="ta-role-count"><strong>{role.permissions?.length || 0}</strong><span>{t('teamAccess.permissions')}</span></div>
                <div className="ta-role-actions">
                  <button type="button" className="ta-icon-button" onClick={() => openRoleDialog(role)} title={t('teamAccess.editRole')} aria-label={t('teamAccess.editRoleName', { name: role.name })}><Edit3 size={16} /></button>
                  <button type="button" className="ta-icon-button" disabled={!!activeAction || (role.isActive && role.memberCount > 0)} onClick={() => toggleRoleState(role)} title={role.isActive && role.memberCount > 0 ? t('teamAccess.reassignBeforeDeactivate') : role.isActive ? t('teamAccess.deactivateRole') : t('teamAccess.activateRole')} aria-label={t(role.isActive ? 'teamAccess.deactivateRoleName' : 'teamAccess.activateRoleName', { name: role.name })}>
                    {activeAction === `role:${role.id}:state` ? <Loader2 className="spin" size={16} /> : <Power size={16} />}
                  </button>
                  <button type="button" className="ta-icon-button danger" disabled={!!activeAction || role.memberCount > 0} onClick={() => deleteRole(role)} title={role.memberCount > 0 ? t('teamAccess.reassignBeforeDelete') : t('teamAccess.deleteRole')} aria-label={t('teamAccess.deleteRoleName', { name: role.name })}>
                    {activeAction === `role:${role.id}:delete` ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                  </button>
                </div>
              </article>
            ))}
            {!filteredRoles.length && <div className="ta-empty">{t('teamAccess.noRoles')}</div>}
          </div>
        </section>
      ) : (
        <section className="ta-section">
          <div className="ta-table-wrap">
            <table className="ta-table">
              <thead><tr><th>{t('teamAccess.audit.time')}</th><th>{t('teamAccess.audit.actor')}</th><th>{t('teamAccess.audit.action')}</th><th>{t('teamAccess.audit.resource')}</th><th>{t('teamAccess.audit.outcome')}</th><th>{t('teamAccess.audit.request')}</th></tr></thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.createdAt, t('teamAccess.never'))}</td>
                    <td>{log.actorUserId ? t('teamAccess.audit.user', { id: log.actorUserId }) : t('teamAccess.audit.system')}<span>{log.actorRole || t('teamAccess.audit.service')}</span></td>
                    <td><code>{log.action}</code></td>
                    <td>{log.resourceType}<span>{log.resourceId || '-'}</span></td>
                    <td><span className={`ta-status ${log.outcome}`}>{log.outcome}</span></td>
                    <td><code>{log.requestId}</code></td>
                  </tr>
                ))}
                {!auditLogs.length && <tr><td colSpan="6" className="ta-empty">{t('teamAccess.audit.empty')}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {memberDialog && (
        <div className="ta-modal-backdrop" role="presentation">
          <form className="ta-modal" onSubmit={submitMember} aria-label={editingMember ? t('teamAccess.editSubAdmin') : t('teamAccess.addSubAdmin')}>
            <div className="ta-modal-header"><div><UserCog size={20} /><h2>{editingMember ? t('teamAccess.editSubAdmin') : t('teamAccess.addSubAdmin')}</h2></div><button type="button" onClick={() => setMemberDialog(false)} aria-label={t('common.close')}><X size={18} /></button></div>
            <div className="ta-form-grid">
              <label>{t('teamAccess.form.firstName')}<input required minLength="2" value={memberForm.firstName} onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })} /></label>
              <label>{t('teamAccess.form.lastName')}<input required minLength="2" value={memberForm.lastName} onChange={(e) => setMemberForm({ ...memberForm, lastName: e.target.value })} /></label>
              <label className="wide">{t('teamAccess.form.email')}<input required disabled={!!editingMember} type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} /></label>
              <label>{t('teamAccess.form.phone')}<input value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} /></label>
              <label>{t('teamAccess.form.role')}<select required value={memberForm.accessRoleId} onChange={(e) => setMemberForm({ ...memberForm, accessRoleId: e.target.value })}><option value="">{t('teamAccess.form.selectRole')}</option>{roles.filter((role) => role.isActive).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            </div>
            <div className="ta-modal-actions"><button type="button" className="ta-secondary-button" onClick={() => setMemberDialog(false)}>{t('common.cancel')}</button><button className="ta-primary-button" disabled={saving}>{saving && <Loader2 className="spin" size={16} />} {editingMember ? t('teamAccess.saveChanges') : t('teamAccess.createInvite')}</button></div>
          </form>
        </div>
      )}

      {roleDialog && (
        <div className="ta-modal-backdrop" role="presentation">
          <form className="ta-modal ta-role-modal" onSubmit={submitRole} aria-label={t('teamAccess.roleEditor')}>
            <div className="ta-modal-header"><div><ShieldCheck size={20} /><h2>{editingRole ? t('teamAccess.editRole') : t('teamAccess.newAccessRole')}</h2></div><button type="button" onClick={() => setRoleDialog(false)} aria-label={t('common.close')}><X size={18} /></button></div>
            <div className="ta-form-grid">
              <label>{t('teamAccess.form.name')}<input required minLength="2" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} /></label>
              <label className="wide">{t('teamAccess.form.description')}<textarea rows="2" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} /></label>
            </div>
            <div className="ta-permission-toolbar">
              <label className="ta-search">
                <Search size={17} />
                <input value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} placeholder={t('teamAccess.searchPermissions')} />
              </label>
              <span className="ta-muted">{t('teamAccess.selected', { count: roleForm.permissions.length })}</span>
            </div>
            <div className="ta-permissions">
              {permissionGroups.map(([module, items]) => (
                <fieldset key={module}>
                  <legend>{module.replaceAll('_', ' ')}</legend>
                  <button type="button" className="ta-group-toggle" onClick={() => togglePermissionGroup(items)}>
                    {items.every((permission) => roleForm.permissions.includes(permission.key)) ? t('teamAccess.clearGroup') : t('teamAccess.selectGroup')}
                  </button>
                  {items.map((permission) => (
                    <label key={permission.key} title={permission.description}>
                      <input type="checkbox" checked={roleForm.permissions.includes(permission.key)} onChange={() => togglePermission(permission.key)} />
                      <span><strong>{permission.name}</strong><small>{permission.key}</small></span>
                    </label>
                  ))}
                </fieldset>
              ))}
              {!permissionGroups.length && <div className="ta-empty">{t('teamAccess.noPermissions')}</div>}
            </div>
            <div className="ta-modal-actions"><button type="button" className="ta-secondary-button" onClick={() => setRoleDialog(false)}>{t('common.cancel')}</button><button className="ta-primary-button" disabled={saving}>{saving && <Loader2 className="spin" size={16} />} {t('teamAccess.saveRole')}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

export default TeamAccessPage;
