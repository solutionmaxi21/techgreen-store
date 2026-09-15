
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import {
  Users,
  Search,
  Download,
  MoreVertical,
  Trash2,
  Eye,
  UserPlus,
  Shield,
  User as UserIcon,
  ChevronRight,
  Mail,
  Calendar,
  Filter, // Added Filter
  Edit, // Added Edit
  CheckCircle, // Added CheckCircle
  XCircle // Added XCircle
} from 'lucide-react';
import { userApi } from '../services/apiService';
import { formatCurrency, formatDate } from '../utils/formatters';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import './UsersListPage.css';
import { sanitizeRichHtml } from '../utils/sanitizeHtml';

function UsersListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const { confirm, prompt, ConfirmationDialog } = useConfirmation();
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: ''
  });

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await userApi.getAll(filters);

      // Backend returns { users: [...], total, page, limit, totalPages }
      const userData = response.users || (Array.isArray(response) ? response : (response.data || []));
      setUsers(userData);
    } catch (error) {
      console.error('Failed to load users:', error);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSort = (key, direction) => {
    const sorted = [...users].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];

      if (key === 'createdAt' || key === 'joinDate') {
        valA = new Date(a.createdAt || a.joinDate).getTime();
        valB = new Date(b.createdAt || b.joinDate).getTime();
      }

      if (direction === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });
    setUsers(sorted);
  };

  const handleRowClick = (user) => {
    navigate(`/users/${user.id}`);
  };

  const handleDelete = async (userId, e) => {
    e.stopPropagation();
    if (!userId) {
      toast.error(t('common.error'));
      return;
    }

    const confirmed = await confirm({
      title: t('users.list.deleteUser'),
      message: t('users.list.confirmDelete'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDangerous: true
    });

    if (!confirmed) return;

    const typed = await prompt({
      title: t('users.list.deleteUser'),
      message: t('users.list.confirmDelete') + ' — Type DELETE to confirm.',
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDangerous: true,
      placeholder: 'DELETE'
    });

    if (typed === null) return;

    if (String(typed).trim().toUpperCase() !== 'DELETE') {
      toast.error(t('users.list.confirmationMismatch'));
      return;
    }

    try {
      await userApi.delete(userId);
      toast.success(t('common.deleted') || 'Deleted');
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(t('common.error'));
    }
  };

  const handleVerifyEmail = async (userId) => {
    const confirmed = await confirm({
      title: t('users.list.verifyEmail', 'Verify Email'),
      message: t('users.list.confirmVerifyEmail', "Verify this user's email?"),
      confirmText: t('common.confirm', 'Confirm'),
    });
    if (!confirmed) return;

    try {
      await userApi.verifyEmail(userId);
      toast.success(t('users.list.verifyEmailSuccess', 'Email verified'));
      loadUsers();
    } catch (error) {
      console.error('Failed to verify email:', error);
      toast.error(t('users.list.verifyEmailFailed', 'Failed to verify email'));
    }
  };

  const handleExport = () => {
    if (!users.length) return;
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Created'];
    const rows = users.map(u => [
      u.id,
      u.fullName || u.name || '',
      u.email || '',
      u.role || '',
      u.is_active === false ? 'Inactive' : 'Active',
      u.createdAt || u.joinDate || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const columns = [
    {
      key: 'name',
      label: t('table.customer'),
      sortable: true,
      render: (value, row) => (
        <div className="user-profile-cell">
          <div className={`user - avatar color - ${(row.id % 5) + 1} `}>
            {getInitials(value || row.fullName)}
          </div>
          <div className="user-info">
            <div className="user-name">{value || row.fullName || t('common.na')}</div>
            <div className="user-email-row">
              <Mail size={12} />
              <span>{row.email}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: t('users.list.role'),
      sortable: true,
      width: '120px',
      render: (value) => (
        <div className="role-wrapper">
          {value === 'admin' ? <Shield size={14} className="role-icon admin" /> : <UserIcon size={14} className="role-icon" />}
          <StatusBadge status={value} type="role" />
        </div>
      )
    },
    {
      key: 'total_orders',
      label: t('dashboard.orders'),
      sortable: true,
      width: '100px',
      render: (value) => <span className="order-count-badge">{value || 0}</span>
    },
    {
      key: 'total_spent',
      label: t('users.detail.lifetimeSpent'),
      sortable: true,
      width: '150px',
      render: (value) => <span className="ltv-value">{formatCurrency(value || 0)}</span>
    },
    {
      key: 'created_at',
      label: t('table.placed_on'),
      sortable: true,
      width: '150px',
      render: (value) => (
        <div className="join-date">
          <Calendar size={14} />
          <span>{formatDate(value)}</span>
        </div>
      )
    },
    {
      key: 'is_active',
      label: t('users.list.status'),
      width: '120px',
      render: (value) => (
        <StatusBadge status={value === false ? 'inactive' : 'active'} type="status" />
      )
    },
    {
      key: 'email_verified',
      label: t('users.list.emailStatus'),
      width: '120px',
      render: (value, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <StatusBadge
            status={value ? 'verified' : 'unverified'}
            type="verification"
          />
          {!value && (
            <Can permission="customers.verify_email">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleVerifyEmail(row.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                color: 'hsl(var(--primary))',
                fontSize: '12px'
              }}
                title={t('users.list.verifyEmail')}
            >
              ✓
            </button>
            </Can>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      render: (_, user) => (
        <div className="action-cell">
          <Can superAdminOnly>
            <button className="btn-icon-minimal" title={t('common.delete')} onClick={(e) => handleDelete(user.id, e)}>
              <Trash2 size={16} />
            </button>
          </Can>
          <ChevronRight size={18} color="var(--gray-400)" style={{ transform: i18n.dir() === 'rtl' ? 'rotate(180deg)' : 'none' }} />
        </div>
      )
    }
  ];

  return (
    <div className="users-list-page">
      <ConfirmationDialog />
      <div className="page-header">
        <div>
          <h1>{t('users.list.title')}</h1>
          <p className="page-subtitle">{t('users.list.subtitle')}</p>
        </div>
        <div className="header-actions">
          <Can superAdminOnly>
            <button className="btn-secondary" onClick={handleExport}>
              <Download size={18} />
              {t('users.list.export')}
            </button>
          </Can>
          <Can superAdminOnly>
            <button className="btn-primary" onClick={() => navigate('/users/add')}>
              <UserPlus size={18} />
              {t('users.list.add')}
            </button>
          </Can>
        </div>
      </div>

      <div className="filters-section-pro">
        <div className="search-box-pro">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={t('users.list.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label>{t('users.list.role')}</label>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="pro-select-minimal"
            >
              <option value="">{t('users.list.allRoles')}</option>
              <option value="customer">{t('users.list.customer')}</option>
              <option value="admin">{t('users.list.admin')}</option>
            </select>
          </div>

          <div className="filter-group">
            <label>{t('users.list.status')}</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="pro-select-minimal"
            >
              <option value="">{t('users.list.allStatuses')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-meta">
        <span dangerouslySetInnerHTML={{
          __html: sanitizeRichHtml(t('users.list.found', { count: users.length }))
        }} />
      </div>

      {loadError ? <ResourceError error={loadError} onRetry={loadUsers} /> : <DataTable
        columns={columns}
        data={users}
        onSort={handleSort}
        onRowClick={handleRowClick}
        loading={loading}
        emptyMessage={t('users.list.empty')}
      />}
    </div>
  );
}

export default UsersListPage;
