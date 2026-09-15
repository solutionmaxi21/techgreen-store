
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import {
  ChevronLeft,
  Mail,
  Phone,
  Calendar,
  Shield,
  User as UserIcon,
  ShoppingBag,
  CreditCard,
  Clock,
  MapPin,
  Trash2,
  AlertCircle,
  TrendingUp,
  Star,
  Heart,
  CheckCircle,
  XCircle,
  Edit2
} from 'lucide-react';
import { userApi } from '../services/apiService';
import { formatCurrency, formatDate } from '../utils/formatters';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Can from '../components/Can';
import './UserDetailPage.css';

function UserDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { confirm, ConfirmationDialog } = useConfirmation();

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const data = await userApi.getById(id);
      const userData = data.data || data;
      const normalizedStatus = userData.status || userData.account_status || null;

      // Transform backend field names to match frontend expectations
      const transformedUser = {
        id: userData.userId || userData.id,
        fullName: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''} `.trim() || userData.name,
        name: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''} `.trim() || userData.name,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        is_active: normalizedStatus ? normalizedStatus === 'active' : (userData.isActive !== undefined ? userData.isActive : userData.is_active),
        status: normalizedStatus || (userData.isActive !== undefined ? (userData.isActive ? 'active' : 'inactive') : (userData.is_active ? 'active' : 'inactive')),
        total_orders: userData.orderCount || userData.total_orders || 0,
        total_spent: userData.totalSpent || userData.total_spent || 0,
        reviews: userData.reviews || [],
        orders: userData.orders || [],
        wishlistCount: userData.wishlistCount || 0,
        address: userData.address,
        addresses: userData.addresses || [],
        lastLogin: userData.lastLogin || userData.last_login,
        createdAt: userData.createdAt || userData.created_at
      };

      setUser(transformedUser);
    } catch (error) {
      console.error('Failed to load user:', error);
      toast.error(t('users.detail.notFound'));
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (newRole) => {
    if (!await confirm({
      title: t('users.detail.changeRole'),
      message: t('users.detail.confirmRole', { role: t(`users.list.${newRole} `) }),
      confirmText: t('common.update'),
    })) {
      return;
    }

    setUpdating(true);
    try {
      await userApi.updateRole(id, newRole);
      await loadUser();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error(t('common.error'));
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const confirmKey = newStatus === 'active' ? 'users.detail.confirmActivate' : 'users.detail.confirmDeactivate';
    if (!await confirm({
      title: t('users.detail.changeStatus'),
      message: t(confirmKey),
      confirmText: t('common.update'),
      isDangerous: newStatus !== 'active'
    })) {
      return;
    }

    setUpdating(true);
    try {
      if (newStatus === 'active') {
        await userApi.activate(id);
      } else {
        await userApi.deactivate(id);
      }
      await loadUser();
    } catch (error) {
      console.error(`Failed to handle status toggle: `, error);
      toast.error(t('common.error'));
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!await confirm({
      title: t('users.detail.deleteAccount'),
      message: t('users.detail.confirmDelete') || t('common.confirmDelete'),
      confirmText: t('common.delete'),
      isDangerous: true
    })) {
      return;
    }

    setUpdating(true);
    try {
      await userApi.delete(id);
      toast.success(t('users.detail.deleted') || t('common.deleted'));
      navigate('/users');
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(error.message || t('common.error'));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="user-detail-page">
      <div className="loading">
        <Clock className="rotate" size={24} />
        <span>{t('users.detail.loading')}</span>
      </div>
    </div>
  );

  if (!user) return (
    <div className="user-detail-page">
      <div className="not-found">{t('users.detail.notFound')}</div>
    </div>
  );

  const orderColumns = [
    {
      key: 'orderNumber',
      label: t('orders.id'),
      width: '140px',
      render: (val) => <span className="order-id-link">#{val}</span>
    },
    {
      key: 'createdAt',
      label: t('table.placed_on'),
      width: '140px',
      render: (value) => formatDate(value)
    },
    {
      key: 'total',
      label: t('orders.total'),
      width: '120px',
      render: (value) => <span className="font-bold">{formatCurrency(value)}</span>
    },
    {
      key: 'status',
      label: t('orders.status'),
      width: '120px',
      render: (value) => <StatusBadge status={value} type="order" />
    }
  ];

  return (
    <div className="user-detail-page">
      <div className="page-header no-print">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/users')} title={t('users.detail.back')}>
            <ChevronLeft size={20} />
          </button>
          <div className="title-group">
            <div className="user-title-row">
              <h1>{user.fullName || user.name}</h1>
              <StatusBadge status={user.is_active === false ? 'inactive' : 'active'} type="status" />
            </div>
            <p className="page-subtitle">{t('users.detail.id', { id })}</p>
          </div>
        </div>
        <div className="header-actions">
          <Can permission="customers.update">
            <button className="btn-secondary" onClick={() => navigate(`/users/${id}/edit`)}>
              <Edit2 size={18} />
              {t('common.edit')}
            </button>
          </Can>
        </div >
      </div >

      <div className="user-content">
        <div className="main-column">
          {/* Key Metrics */}
          <div className="stats-dashboard">
            <div className="stat-card-pro">
              <div className="stat-icon orders">
                <ShoppingBag size={20} />
              </div>
              <div className="stat-info">
                <label>{t('users.detail.totalOrders')}</label>
                <div className="value">{user.total_orders || 0}</div>
              </div>
            </div>
            <div className="stat-card-pro">
              <div className="stat-icon revenue">
                <TrendingUp size={20} />
              </div>
              <div className="stat-info">
                <label>{t('users.detail.lifetimeSpent')}</label>
                <div className="value">{formatCurrency(user.total_spent || 0)}</div>
              </div>
            </div>
            <div className="stat-card-pro">
              <div className="stat-icon avg">
                <Star size={20} />
              </div>
              <div className="stat-info">
                <label>{t('users.detail.reviews')}</label>
                <div className="value">{user.reviews?.length || 0}</div>
              </div>
            </div>
            <div className="stat-card-pro">
              <div className="stat-icon join">
                <Heart size={20} />
              </div>
              <div className="stat-info">
                <label>{t('users.detail.wishlist')}</label>
                <div className="value">{user.wishlistCount || 0}</div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card">
            <div className="card-header-pro">
              <div className="header-title">
                <ShoppingBag size={18} />
                <h2>{t('users.detail.orderHistory')}</h2>
                <span className="badge-count">{user.orders?.length || 0}</span>
              </div>
              <button className="btn-text">{t('users.detail.viewAll')}</button>
            </div>
            <div className="card-body">
              {user.orders?.length > 0 ? (
                <DataTable
                  columns={orderColumns}
                  data={user.orders}
                  onRowClick={(order) => navigate(`/orders/${order.id}`)}
                />
              ) : (
                <div className="empty-card-state">
                  <ShoppingBag size={48} className="empty-icon" />
                  <p>{t('users.detail.noOrders')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Reviews */}
          <div className="card">
            <div className="card-header-pro">
              <div className="header-title">
                <Star size={18} />
                <h2>{t('users.detail.reviews')}</h2>
                <span className="badge-count">{user.reviews?.length || 0}</span>
              </div>
              <button className="btn-text">{t('users.detail.viewAll')}</button>
            </div>
            <div className="card-body">
              {user.reviews?.length > 0 ? (
                <div className="reviews-list">
                  {user.reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="review-item">
                      <div className="review-header">
                        <div className="rating-stars">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i < review.rating ? 'star-filled' : 'star-empty'}
                              fill={i < review.rating ? 'currentColor' : 'none'}
                            />
                          ))}
                        </div>
                        <StatusBadge status={review.status} type="review" />
                      </div>
                      <p className="review-text">{review.comment || t('common.na')}</p>
                      <div className="review-meta">
                        <span>{formatDate(review.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-card-state">
                  <Star size={48} className="empty-icon" />
                  <p>{t('users.detail.noReviews')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="side-column">
          {/* Profile Details */}
          <div className="card">
            <div className="card-header-pro">
              <div className="header-title">
                <UserIcon size={18} />
                <h2>{t('users.detail.profileDetails')}</h2>
              </div>
            </div>
            <div className="info-grid-pro">
              <div className="info-item-pro">
                <Mail size={16} />
                <div className="info-content">
                  <label>{t('users.detail.email')}</label>
                  <div className="value">{user.email}</div>
                </div>
              </div>
              <div className="info-item-pro">
                <Phone size={16} />
                <div className="info-content">
                  <label>{t('users.detail.phone')}</label>
                  <div className="value">{user.phone || t('users.detail.notProvided')}</div>
                </div>
              </div>
              <div className="info-item-pro">
                <Shield size={16} />
                <div className="info-content">
                  <label>{t('users.detail.accountRole')}</label>
                  <div className="value">
                    <StatusBadge status={user.role} type="role" />
                  </div>
                </div>
              </div>
              <div className="info-item-pro">
                <Clock size={16} />
                <div className="info-content">
                  <label>{t('users.detail.lastLogin')}</label>
                  <div className="value">{user.lastLogin ? formatDate(user.lastLogin) : t('users.detail.today')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Address */}
          <div className="card">
            <div className="card-header-pro">
              <div className="header-title">
                <MapPin size={18} />
                <h2>{t('users.detail.primaryAddress')}</h2>
              </div>
            </div>
            <div className="address-display">
              {user.address ? (
                <>
                  <div className="addr-line">{user.address.street}</div>
                  <div className="addr-line">{user.address.city}, {user.address.state} {user.address.postalCode || user.address.zipCode}</div>
                  <div className="addr-line country">{user.address.country || t('orders.detail.algeria')}</div>
                </>
              ) : (
                <div className="empty-substate">{t('users.detail.noAddress')}</div>
              )}
            </div>
          </div>

          {/* All Addresses */}
          {user.addresses && user.addresses.length > 1 && (
            <div className="card">
              <div className="card-header-pro">
                <div className="header-title">
                  <MapPin size={18} />
                  <h2>{t('users.detail.allAddresses')}</h2>
                  <span className="badge-count">{user.addresses.length}</span>
                </div>
              </div>
              <div className="card-body">
                <div className="addresses-list">
                  {user.addresses.map((addr) => (
                    <div key={addr.id} className={`address-item ${addr.isDefault ? 'default' : ''}`}>
                      {addr.isDefault && <span className="default-badge">{t('common.default')}</span>}
                      <div className="addr-line">{addr.street}</div>
                      <div className="addr-line">{addr.city}, {addr.state} {addr.postalCode}</div>
                      <div className="addr-line">{addr.country}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Administrative Actions */}
          <div className="card security-card">
            <div className="card-header-pro">
              <div className="header-title">
                <AlertCircle size={18} />
                <h2>{t('users.detail.controls')}</h2>
              </div>
            </div>
            <div className="actions-stack">
              <div className="action-row">
                <div className="action-info">
                  <div className="action-name">{t('users.detail.changeRole')}</div>
                  <div className="action-desc">{t('users.detail.changeRoleDesc')}</div>
                </div>
                <Can superAdminOnly fallback={<StatusBadge status={user.role} type="role" />}>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="pro-select-sm"
                    disabled={updating}
                  >
                    <option value="customer">{t('users.list.customer')}</option>
                    <option value="admin">{t('users.list.admin')}</option>
                  </select>
                </Can>
              </div>

              <div className="action-row">
                <div className="action-info">
                  <div className="action-name">{t('users.detail.accountStatus')}</div>
                  <div className="action-desc">{t('users.detail.accountStatusDesc')}</div>
                </div>
                <Can permission="customers.status.update">
                  <button
                    className={`btn-toggle ${user.is_active === false ? 'inactive' : 'active'}`}
                    onClick={() => handleStatusChange(user.is_active === false ? 'active' : 'inactive')}
                    disabled={updating}
                  >
                    {user.is_active === false ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {user.is_active === false ? t('users.detail.activate') : t('users.detail.deactivate')}
                  </button>
                </Can>
              </div>

              <Can superAdminOnly>
                <button className="btn-destructive-full" onClick={handleDelete} disabled={updating}>
                  <Trash2 size={16} />
                  {t('users.detail.deleteAccount')}
                </button>
              </Can>
            </div>
          </div>
        </div>
      </div>
      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </div >
  );
}

export default UserDetailPage;

