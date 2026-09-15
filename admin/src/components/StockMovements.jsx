import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  TablePagination,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  Assignment,
  LocalShipping,
  AttachMoney
} from '@mui/icons-material';
import { BACKEND_ORIGIN } from '../config/backend';
import { useTranslation } from 'react-i18next';

const StockMovements = () => {
  const { t } = useTranslation();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filters
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  // Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    product_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    quantity: '',
    reason: '',
    notes: ''
  });
  const [transfering, setTransfering] = useState(false);
  const [costEstimate, setCostEstimate] = useState(null);

  // Data lists
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [costAnalysis, setCostAnalysis] = useState([]);

  const API_URL = BACKEND_ORIGIN;

  // Fetch movements
  const fetchMovements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: rowsPerPage,
        offset: page * rowsPerPage
      });

      if (filterWarehouse) params.append('warehouse_id', filterWarehouse);
      if (filterType) params.append('movement_type', filterType);
      if (filterProduct) params.append('product_id', filterProduct);

      const response = await fetch(`${API_URL}/api/stock-movements?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error(t('stockMovements.errors.fetch'));

      const data = await response.json();
      setMovements(data.movements || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching movements:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch warehouses
  const fetchWarehouses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/inventory/warehouses/all`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  };

  // Fetch cost analysis
  const fetchCostAnalysis = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stock-movements/costs/analysis?months=3`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCostAnalysis(data);
      }
    } catch (err) {
      console.error('Error fetching cost analysis:', err);
    }
  };

  // Fetch products (simplified - just basic list)
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products?limit=1000`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  useEffect(() => {
    fetchMovements();
    fetchWarehouses();
    fetchProducts();
    fetchCostAnalysis();
  }, [page, rowsPerPage, filterWarehouse, filterType, filterProduct]);

  // Handle transfer
  const handleTransfer = async () => {
    try {
      setTransfering(true);
      const response = await fetch(`${API_URL}/api/stock-movements/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(transferData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('stockMovements.errors.transfer'));
      }

      const result = await response.json();
      toast.success(t('stockMovements.transferSuccess', { cost: result.transfer.costBreakdown.totalCost.toFixed(2) }));
      setTransferOpen(false);
      setTransferData({
        product_id: '',
        from_warehouse_id: '',
        to_warehouse_id: '',
        quantity: '',
        reason: '',
        notes: ''
      });
      fetchMovements();
    } catch (err) {
      toast.error(t('stockMovements.transferFailed', { message: err.message }));
    } finally {
      setTransfering(false);
    }
  };

  // Estimate cost
  const estimateCost = async () => {
    if (!transferData.product_id || !transferData.from_warehouse_id ||
      !transferData.to_warehouse_id || !transferData.quantity) {
      return;
    }

    try {
      // This would call a cost estimation endpoint
      // For now, we'll just show it after transfer
      setCostEstimate({ estimating: true });
    } catch (err) {
      console.error('Error estimating cost:', err);
    }
  };

  // Movement type icon
  const getMovementIcon = (type) => {
    switch (type) {
      case 'in':
      case 'return':
      case 'released':
        return <TrendingUp color="success" />;
      case 'out':
      case 'damaged':
      case 'reserved':
        return <TrendingDown color="error" />;
      case 'transfer_in':
      case 'transfer_out':
        return <SwapHoriz color="info" />;
      case 'adjustment':
        return <Assignment color="warning" />;
      default:
        return <Assignment />;
    }
  };

  // Movement type color
  const getMovementColor = (type) => {
    switch (type) {
      case 'in':
      case 'return':
      case 'released':
      case 'transfer_in':
        return 'success';
      case 'out':
      case 'damaged':
        return 'error';
      case 'transfer_out':
      case 'reserved':
        return 'warning';
      case 'adjustment':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading && movements.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">{t('stockMovements.title')}</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<LocalShipping />}
          onClick={() => setTransferOpen(true)}
        >
          {t('stockMovements.transferStock')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Cost Analysis Summary */}
      {costAnalysis.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <AttachMoney /> {t('stockMovements.costAnalysis')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  {t('stockMovements.totalCosts')}
                </Typography>
                <Typography variant="h5">
                  {costAnalysis
                    .reduce((sum, item) => sum + (parseFloat(item.total_transfer_cost) || 0), 0)
                    .toFixed(2)} DZD
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  {t('stockMovements.totalMovements')}
                </Typography>
                <Typography variant="h5">
                  {costAnalysis.reduce((sum, item) => sum + (parseInt(item.movement_count) || 0), 0)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  {t('stockMovements.averageCost')}
                </Typography>
                <Typography variant="h5">
                  {(costAnalysis
                    .reduce((sum, item) => sum + (parseFloat(item.avg_transfer_cost) || 0), 0) /
                    costAnalysis.length).toFixed(2)} DZD
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('stockMovements.warehouse')}</InputLabel>
                <Select
                  value={filterWarehouse}
                  onChange={(e) => setFilterWarehouse(e.target.value)}
                  label={t('stockMovements.warehouse')}
                >
                  <MenuItem value="">{t('stockMovements.allWarehouses')}</MenuItem>
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.warehouse_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('stockMovements.movementType')}</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label={t('stockMovements.movementType')}
                >
                  <MenuItem value="">{t('stockMovements.types.all')}</MenuItem>
                  <MenuItem value="in">{t('stockMovements.types.in')}</MenuItem>
                  <MenuItem value="out">{t('stockMovements.types.out')}</MenuItem>
                  <MenuItem value="transfer_in">{t('stockMovements.types.transfer_in')}</MenuItem>
                  <MenuItem value="transfer_out">{t('stockMovements.types.transfer_out')}</MenuItem>
                  <MenuItem value="adjustment">{t('stockMovements.types.adjustment')}</MenuItem>
                  <MenuItem value="return">{t('stockMovements.types.return')}</MenuItem>
                  <MenuItem value="damaged">{t('stockMovements.types.damaged')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setFilterWarehouse('');
                  setFilterType('');
                  setFilterProduct('');
                }}
              >
                {t('stockMovements.clearFilters')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('stockMovements.columns.date')}</TableCell>
              <TableCell>{t('stockMovements.columns.type')}</TableCell>
              <TableCell>{t('stockMovements.columns.product')}</TableCell>
              <TableCell>{t('stockMovements.columns.warehouse')}</TableCell>
              <TableCell align="right">{t('stockMovements.columns.quantity')}</TableCell>
              <TableCell align="right">{t('stockMovements.columns.before')}</TableCell>
              <TableCell align="right">{t('stockMovements.columns.after')}</TableCell>
              <TableCell>{t('stockMovements.columns.transfer')}</TableCell>
              <TableCell align="right">{t('stockMovements.columns.cost')}</TableCell>
              <TableCell>{t('stockMovements.columns.reason')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell>
                  {new Date(movement.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getMovementIcon(movement.movement_type)}
                    label={t(`stockMovements.types.${movement.movement_type}`, { defaultValue: movement.movement_type.replace('_', ' ').toUpperCase() })}
                    color={getMovementColor(movement.movement_type)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{movement.product_name}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {movement.sku}
                  </Typography>
                </TableCell>
                <TableCell>{movement.warehouse_name}</TableCell>
                <TableCell align="right">
                  <strong>{movement.quantity}</strong>
                </TableCell>
                <TableCell align="right">{movement.quantity_before}</TableCell>
                <TableCell align="right">{movement.quantity_after}</TableCell>
                <TableCell>
                  {movement.from_warehouse_name && movement.to_warehouse_name && (
                    <Typography variant="caption">
                      {movement.from_warehouse_name} → {movement.to_warehouse_name}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  {movement.transfer_cost > 0 && (
                    <Typography variant="body2">
                      {parseFloat(movement.transfer_cost).toFixed(2)} DZD
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{movement.reason}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={-1}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('stockMovements.dialogTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('stockMovements.productRequired')}</InputLabel>
                  <Select
                    value={transferData.product_id}
                    onChange={(e) => setTransferData({ ...transferData, product_id: e.target.value })}
                    label={t('stockMovements.productRequired')}
                  >
                    {products.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.product_name} ({p.sku})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('stockMovements.fromWarehouse')}</InputLabel>
                  <Select
                    value={transferData.from_warehouse_id}
                    onChange={(e) => setTransferData({ ...transferData, from_warehouse_id: e.target.value })}
                    label={t('stockMovements.fromWarehouse')}
                  >
                    {warehouses.map((w) => (
                      <MenuItem key={w.id} value={w.id}>
                        {w.warehouse_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('stockMovements.toWarehouse')}</InputLabel>
                  <Select
                    value={transferData.to_warehouse_id}
                    onChange={(e) => setTransferData({ ...transferData, to_warehouse_id: e.target.value })}
                    label={t('stockMovements.toWarehouse')}
                  >
                    {warehouses.map((w) => (
                      <MenuItem key={w.id} value={w.id}>
                        {w.warehouse_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('stockMovements.quantityRequired')}
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({ ...transferData, quantity: e.target.value })}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('stockMovements.reason')}
                  value={transferData.reason}
                  onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                  placeholder={t('stockMovements.reasonPlaceholder')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label={t('stockMovements.notes')}
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferOpen(false)}>{t('common.cancel')}</Button>
          <Button
            onClick={handleTransfer}
            variant="contained"
            disabled={transfering || !transferData.product_id || !transferData.from_warehouse_id ||
              !transferData.to_warehouse_id || !transferData.quantity}
          >
            {transfering ? <CircularProgress size={24} /> : t('stockMovements.transfer')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockMovements;
