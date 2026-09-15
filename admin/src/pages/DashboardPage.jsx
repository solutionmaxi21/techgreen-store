import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardApi } from '../services/apiService';
import {
  DollarSign, ShoppingCart, Users, Package,
  TrendingUp, TrendingDown, Plus
} from 'lucide-react';
import { SalesChart, CategoryPieChart } from '../components/DashboardCharts';
import { getLocalizedText } from '../utils/localization';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import './DashboardPage.css';

const DashboardPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [chartError, setChartError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [chartReloadToken, setChartReloadToken] = useState(0);
  const [chartPeriod, setChartPeriod] = useState('year'); // Default to year to show historical data

  useEffect(() => {
    const loadGeneralData = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const [mainStats, recentOrders, topProducts, categoryData] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getRecentOrders(10),
          dashboardApi.getTopProducts(5, 'all'),
          dashboardApi.getCategorySales('all'),
        ]);

        setStats({ ...mainStats, recentOrders, topProducts, categoryData });
      } catch (error) {
        console.error('Stats Error:', error);
        setLoadError(error);
      } finally {
        setLoading(false);
      }
    };
    loadGeneralData();
  }, [reloadToken]);

  useEffect(() => {
    const loadSalesChart = async () => {
      try {
        setChartError(null);
        const data = await dashboardApi.getSalesChart(chartPeriod);
        setSalesData(data || []);
      } catch (error) {
        console.error("Chart Error:", error);
        setChartError(error);
      }
    };
    loadSalesChart();
  }, [chartPeriod, chartReloadToken]);

  if (loading) return (
    <div className="flex items-center justify-center h-full w-full" style={{ minHeight: '80vh' }}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
  );
  if (loadError) {
    return <ResourceError error={loadError} onRetry={() => setReloadToken((value) => value + 1)} />;
  }

  // Calculate trends
  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return { value: '0%', isUp: true };
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
      isUp: change >= 0
    };
  };

  const revenueTrend = calculateTrend(
    parseFloat(stats?.revenue?.monthly || 0),
    parseFloat(stats?.revenue?.prevMonthly || 0)
  );

  const ordersTrend = calculateTrend(
    parseInt(stats?.orders?.monthly || 0),
    parseInt(stats?.orders?.prevMonthly || 0)
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>{t('dashboard.title')}</h1>
          <p className="text-muted">{t('dashboard.subtitle')}</p>
        </div>
        <div className="dashboard-actions">
          <Can permission="products.create">
            <button className="btn btn-primary" onClick={() => navigate('/products/add')}>
              <Plus size={18} style={{ [isRTL ? 'marginLeft' : 'marginRight']: '8px' }} />
              {t('dashboard.add_product')}
            </button>
          </Can>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title={t('dashboard.total_revenue')}
          value={`${parseFloat(stats?.revenue?.total || 0).toLocaleString()} DA`}
          subtitle={`${parseFloat(stats?.revenue?.monthly || 0).toLocaleString()} DA ${t('dashboard.this_month')}`}
          icon={DollarSign}
          trend={revenueTrend.value}
          trendUp={revenueTrend.isUp}
          color="blue"
        />
        <StatCard
          title={t('dashboard.orders')}
          value={stats?.orders?.total || 0}
          subtitle={`${stats?.orders?.monthly || 0} ${t('dashboard.this_month')}`}
          icon={ShoppingCart}
          trend={ordersTrend.value}
          trendUp={ordersTrend.isUp}
          color="orange"
        />
        <StatCard
          title={t('dashboard.customers')}
          value={stats?.customers?.total}
          subtitle={t('dashboard.all_time')}
          icon={Users}
          trend={`+${stats?.customers?.newThisMonth || 0} ${t('dashboard.this_month')}`}
          trendUp={true}
          color="green"
        />
        <StatCard
          title={t('dashboard.products')}
          value={stats?.products?.active}
          subtitle={`${t('dashboard.of')} ${stats?.products?.total} ${t('dashboard.total_products')}`}
          icon={Package}
          trend={stats?.products?.lowStock > 0 ? `${stats.products.lowStock} ${t('dashboard.low_stock')}` : t('dashboard.healthy_stock')}
          trendUp={stats?.products?.lowStock === 0}
          color="purple"
        />
      </div>

      <div className="charts-grid">
        <div className="card chart-card">
          {chartError ? (
            <ResourceError
              error={chartError}
              onRetry={() => setChartReloadToken((value) => value + 1)}
            />
          ) : (
            <SalesChart
              data={salesData}
              period={chartPeriod}
              onPeriodChange={setChartPeriod}
            />
          )}
        </div>
        <div className="card chart-card">
          <CategoryPieChart data={stats?.categoryData} />
        </div>
      </div>

      <div className="activity-grid">
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <h3>{t('dashboard.recent_orders')}</h3>
            <Can permission="orders.read">
              <button className="btn-link" onClick={() => navigate('/orders')}>{t('dashboard.view_all')}</button>
            </Can>
          </div>
          <div className="table-responsive">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>{t('table.order_id')}</th>
                  <th>{t('table.customer')}</th>
                  <th>{t('table.amount')}</th>
                  <th>{t('table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentOrders?.map(order => (
                  <tr key={order.id} onClick={() => navigate(`/orders/${order.id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>#{order.orderNumber}</td>
                    <td>{order.customerName}</td>
                    <td style={{ fontWeight: 600 }}>{Number(order.total).toLocaleString()} DA</td>
                    <td><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
                {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>{t('dashboard.no_orders')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="card-header">
            <h3>{t('dashboard.top_products')}</h3>
          </div>
          <div className="top-products-list">
            {stats?.topProducts?.map((product, index) => (
              <div key={index} className="top-product-item">
                <div className="rank">#{index + 1}</div>
                <div className="product-info">
                  <span className="product-name">{getLocalizedText(product.name, i18n.language)}</span>
                  <div className="product-meta">
                    <span className="product-sales">{product.salesCount} {t('dashboard.units_sold')}</span>
                    <span className="product-price">{Number(product.revenue).toLocaleString()} DA</span>
                  </div>
                </div>
              </div>
            ))}
            {/* RESTORED EMPTY STATE */}
            {(!stats?.topProducts || stats.topProducts.length === 0) && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'gray' }}>{t('dashboard.no_data')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub Components ---

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendUp, color }) => {
  const { t } = useTranslation(); // Fixed: Added useTranslation here
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-content">
        <div className="stat-info">
          <span className="stat-title">{title}</span>
          <h2 className="stat-value">{value}</h2>
          {subtitle && <span className="stat-subtitle">{subtitle}</span>}
        </div>
        <div className="stat-icon">
          <Icon size={24} />
        </div>
      </div>
      <div className="stat-footer">
        <span className={`trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
          {trendUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {trend}
        </span>
        {!subtitle && <span className="stat-period">{t('dashboard.vs_last_month')}</span>}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const colors = {
    pending: 'yellow',
    processing: 'blue',
    shipped: 'purple',
    delivered: 'green',
    cancelled: 'red'
  };
  const color = colors[status?.toLowerCase()] || 'gray';

  return (
    <span className={`badge badge-${color}`}>
      {t(`status.${status?.toLowerCase()}`)}
    </span>
  );
};

export default DashboardPage;
