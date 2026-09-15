import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { getLocalizedText } from '../utils/localization';
import './DashboardCharts.css'; // Make sure this file exists

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

export const SalesChart = ({ data, period, onPeriodChange, loading }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  if (loading) return <div className="chart-loading">{t('charts.loading')}</div>;

  // Fill missing dates with 0 values to create a complete timeline
  const fillMissingDates = (data, period) => {
    const now = new Date();
    const filled = [];
    
    // Handle empty data - create timeline with zeros
    if (!data || data.length === 0) {
      if (period === 'week') {
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          filled.push({ date: date.toISOString(), orders: 0, revenue: 0 });
        }
      } else if (period === 'month') {
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          filled.push({ date: date.toISOString(), orders: 0, revenue: 0 });
        }
      } else if (period === 'year') {
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          filled.push({ date: date.toISOString(), orders: 0, revenue: 0 });
        }
      } else if (period === 'all') {
        // For all time with no data, show last 12 months
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          filled.push({ date: date.toISOString(), orders: 0, revenue: 0 });
        }
      }
      return filled;
    }

    // Fill gaps in existing data
    if (period === 'week') {
      const dataMap = new Map(data.map(item => [
        new Date(item.date).toDateString(), 
        item
      ]));
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const key = date.toDateString();
        filled.push(dataMap.get(key) || { 
          date: date.toISOString(), 
          orders: 0, 
          revenue: 0 
        });
      }
    } else if (period === 'month') {
      const dataMap = new Map(data.map(item => [
        new Date(item.date).toDateString(), 
        item
      ]));
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const key = date.toDateString();
        filled.push(dataMap.get(key) || { 
          date: date.toISOString(), 
          orders: 0, 
          revenue: 0 
        });
      }
    } else if (period === 'year') {
      // Fill all 12 months for year view
      const dataMap = new Map(data.map(item => {
        const d = new Date(item.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        return [key, item];
      }));
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        filled.push(dataMap.get(key) || { 
          date: date.toISOString(), 
          orders: 0, 
          revenue: 0 
        });
      }
    } else if (period === 'all') {
      // For all time, fill from earliest data to now
      const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      if (sortedData.length > 0) {
        const dataMap = new Map(sortedData.map(item => {
          const d = new Date(item.date);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          return [key, item];
        }));
        
        const startDate = new Date(sortedData[0].date);
        const endDate = new Date(now);
        
        const currentDate = new Date(startDate);
        currentDate.setDate(1); // Start from first day of month
        
        while (currentDate <= endDate) {
          const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
          filled.push(dataMap.get(key) || { 
            date: currentDate.toISOString(), 
            orders: 0, 
            revenue: 0 
          });
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }
    }
    
    return filled;
  };

  const filledData = fillMissingDates(data, period);

  // Format data for chart - convert date to readable format based on period
  const formattedData = filledData.map(item => {
    const date = new Date(item.date);
    let formattedDate;
    
    if (period === 'year' || period === 'all') {
      // Show month name for yearly view
      formattedDate = date.toLocaleDateString(i18n.language === 'ar' ? 'ar-DZ' : 'fr-FR', { 
        month: 'short',
        year: period === 'all' ? '2-digit' : undefined
      });
    } else if (period === 'day') {
      // Show hour for daily view
      formattedDate = date.toLocaleTimeString(i18n.language === 'ar' ? 'ar-DZ' : 'fr-FR', { 
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      // Show day and month for week/month view
      formattedDate = date.toLocaleDateString(i18n.language === 'ar' ? 'ar-DZ' : 'fr-FR', { 
        day: 'numeric',
        month: 'short'
      });
    }
    
    return {
      ...item,
      date: formattedDate,
      amount: item.revenue || 0
    };
  });

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>{t('charts.revenue_overview')}</h3>
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="chart-select"
        >
          <option value="week">{t('charts.last_7_days')}</option>
          <option value="month">{t('charts.last_30_days')}</option>
          <option value="year">{t('charts.this_year')}</option>
          <option value="all">{t('charts.all_time')}</option>
        </select>
      </div>

      <div className="chart-container" style={{ direction: 'ltr' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(value), t('dashboard.total_revenue')]}
              cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const CategoryPieChart = ({ data, loading }) => {
  const { t, i18n } = useTranslation();
  if (loading) return <div className="chart-loading"><div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full"></div>{t('charts.loading')}</div>;
  if (!data || data.length === 0) return <div className="chart-empty">{t('charts.no_data')}</div>;

  // Localize data names before rendering
  const localizedData = data.map(item => ({
    ...item,
    name: getLocalizedText(item.name, i18n.language)
  }));

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>{t('charts.sales_by_category')}</h3>
      </div>
      <div className="chart-container" style={{ flex: '1 1 auto', minHeight: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
           <Pie
             data={localizedData}
             cx="50%"
             cy="50%"
             innerRadius="40%"
             outerRadius="70%"
             paddingAngle={3}
             dataKey="value"
           >
             {data.map((entry, index) => (
               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
             ))}
           </Pie>
           <Tooltip
             formatter={(value) => formatCurrency(value)}
           />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="category-legend">
        {localizedData.map((entry, index) => (
          <div key={index} className="category-legend-item">
            <span className="category-legend-dot" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="category-legend-label">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};