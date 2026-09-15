import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import {
  Refresh,
  FileDownload,
  FilterList,
  Assessment
} from '@mui/icons-material';
import { BACKEND_ORIGIN } from '../config/backend';
import { useTranslation } from 'react-i18next';

const StockMovementLogs = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lines, setLines] = useState(100);
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = BACKEND_ORIGIN;

  // Fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/stock-movements/logs/recent?lines=${lines}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error(t('stockLogs.errors.fetch'));
      
      const data = await response.json();
      setLogs(data.logs || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stock-movements/logs/stats`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    const isActive = () => !document.hidden && document.hasFocus();

    const refresh = () => {
      if (!isActive()) return;
      fetchLogs();
      fetchStats();
    };

    refresh();

    // Auto-refresh every 2 minutes (only when active)
    const interval = setInterval(refresh, 120000);

    const handleVisibilityChange = () => {
      if (isActive()) refresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [lines]);

  // Export logs
  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `stock-movements-logs-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filterType && log.movement_type !== filterType) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return JSON.stringify(log).toLowerCase().includes(searchLower);
    }
    return true;
  });

  // Get log color
  const getLogColor = (type) => {
    switch (type) {
      case 'transfer': return 'info';
      case 'adjustment': return 'warning';
      case 'in': return 'success';
      case 'out': return 'error';
      case 'reservation': return 'primary';
      case 'release': return 'default';
      default: return 'default';
    }
  };

  if (loading && logs.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">{t('stockLogs.title')}</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => { fetchLogs(); fetchStats(); }}
            sx={{ mr: 1 }}
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="contained"
            startIcon={<FileDownload />}
            onClick={exportLogs}
            disabled={logs.length === 0}
          >
            {t('common.export')}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Card */}
      {stats && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Assessment /> {t('stockLogs.statistics')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">
                  {t('stockLogs.fileSize')}
                </Typography>
                <Typography variant="h6">
                  {stats.sizeFormatted || '0 KB'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">
                  {t('stockLogs.totalEntries')}
                </Typography>
                <Typography variant="h6">
                  {stats.lines || 0}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">
                  {t('stockLogs.lastModified')}
                </Typography>
                <Typography variant="h6">
                  {stats.lastModified ? new Date(stats.lastModified).toLocaleString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">
                  {t('common.status')}
                </Typography>
                <Chip 
                  label={stats.exists ? t('common.active') : t('common.inactive')} 
                  color={stats.exists ? 'success' : 'default'}
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('stockLogs.lines')}</InputLabel>
                <Select
                  value={lines}
                  onChange={(e) => setLines(e.target.value)}
                  label={t('stockLogs.lines')}
                >
                  <MenuItem value={50}>{t('stockLogs.lastCount', { count: 50 })}</MenuItem>
                  <MenuItem value={100}>{t('stockLogs.lastCount', { count: 100 })}</MenuItem>
                  <MenuItem value={250}>{t('stockLogs.lastCount', { count: 250 })}</MenuItem>
                  <MenuItem value={500}>{t('stockLogs.lastCount', { count: 500 })}</MenuItem>
                  <MenuItem value={1000}>{t('stockLogs.lastCount', { count: 1000 })}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>
                  <FilterList fontSize="small" /> {t('stockLogs.filterType')}
                </InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label={t('stockLogs.filterType')}
                >
                  <MenuItem value="">{t('stockLogs.types.all')}</MenuItem>
                  <MenuItem value="transfer">{t('stockLogs.types.transfer')}</MenuItem>
                  <MenuItem value="adjustment">{t('stockLogs.types.adjustment')}</MenuItem>
                  <MenuItem value="in">{t('stockLogs.types.in')}</MenuItem>
                  <MenuItem value="out">{t('stockLogs.types.out')}</MenuItem>
                  <MenuItem value="reservation">{t('stockLogs.types.reservation')}</MenuItem>
                  <MenuItem value="release">{t('stockLogs.types.release')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('stockLogs.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('stockLogs.searchPlaceholder')}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('stockLogs.columns.timestamp')}</TableCell>
              <TableCell>{t('stockLogs.columns.type')}</TableCell>
              <TableCell>{t('stockLogs.columns.action')}</TableCell>
              <TableCell>{t('stockLogs.columns.product')}</TableCell>
              <TableCell>{t('stockLogs.columns.warehouse')}</TableCell>
              <TableCell align="right">{t('stockLogs.columns.quantity')}</TableCell>
              <TableCell>{t('stockLogs.columns.details')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.map((log, index) => (
              <TableRow key={index} hover>
                <TableCell>
                  <Typography variant="caption">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={t(`stockLogs.types.${log.movement_type}`, { defaultValue: log.movement_type || t('common.unknown') })}
                    color={getLogColor(log.movement_type)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {log.action || log.msg || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {log.product_name && (
                    <Typography variant="body2">{log.product_name}</Typography>
                  )}
                  {log.product_id && (
                    <Typography variant="caption" color="textSecondary">
                      ID: {log.product_id}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {log.warehouse_name || log.from_warehouse_name || log.to_warehouse_name ? (
                    <>
                      {log.from_warehouse_name && log.to_warehouse_name ? (
                        <Typography variant="caption">
                          {log.from_warehouse_name} → {log.to_warehouse_name}
                        </Typography>
                      ) : (
                        <Typography variant="body2">
                          {log.warehouse_name}
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Typography variant="caption" color="textSecondary">
                      {log.warehouse_id || 'N/A'}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold">
                    {log.quantity || log.adjustment || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.transfer_cost && (
                      <Typography variant="caption" display="block">
                        {t('stockLogs.cost', { amount: log.transfer_cost })}
                      </Typography>
                    )}
                    {log.reason && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        {log.reason}
                      </Typography>
                    )}
                    {log.user_id && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        {t('stockLogs.user', { id: log.user_id })}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredLogs.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography color="textSecondary">
            {t('stockLogs.empty')}
          </Typography>
        </Box>
      )}

      <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="textSecondary">
          {t('stockLogs.showing', { shown: filteredLogs.length, total: logs.length })}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {t('stockLogs.autoRefresh')}
        </Typography>
      </Box>
    </Box>
  );
};

export default StockMovementLogs;
