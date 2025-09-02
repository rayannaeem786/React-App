import React from 'react';
import {
  Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Box, Select, MenuItem, Chip, FormControl, InputLabel, CircularProgress,
  Grid, Tabs, Tab, Tooltip, IconButton, Paper, useMediaQuery
} from '@mui/material';
import { 
  Add as AddIcon, Search as SearchIcon, FilterList as FilterListIcon, Sort as SortIcon,
  Close as CloseIcon, Edit as EditIcon, Cancel as CancelIcon,
  LocalShipping as LocalShippingIcon, CalendarToday as CalendarTodayIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { AnimatePresence } from 'framer-motion';
import { StyledTableRow, ModernButton, SearchTextField, StatusChip } from './StyledComponents';
import { fadeIn } from './Animations';
import createMuiTheme from './theme';
import { ThemeProvider } from '@mui/material/styles';

const OrdersTable = ({
  orders, loading, userRole, filterStatus, setFilterStatus, searchQuery, setSearchQuery,
  sortBy, setSortBy, sortOrder, setSortOrder, activeFilters, activeTab, setActiveTab,
  handleStatusChange, handleEditOrder, handleCancelOrder, setOrderDialogOpen, setEditOrder, setNewOrder, tenant
}) => {
  const muiTheme = createMuiTheme(tenant);
  const sortOptions = [
    { value: 'order_id', label: 'Order ID' },
    { value: 'total_price', label: 'Total Price' },
    { value: 'created_at', label: 'Date' },
  ];

  const isMobile = useMediaQuery('(max-width:600px)');

  const clearFilters = () => {
    setFilterStatus('');
    setSearchQuery('');
    setSortBy('created_at');
    setSortOrder('DESC');
    setActiveTab(0);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 0) {
      setFilterStatus('');
    } else if (newValue === 1) {
      setFilterStatus('pending');
    } else if (newValue === 2) {
      setFilterStatus('preparing');
    } else if (newValue === 3) {
      setFilterStatus('enroute');
    } else if (newValue === 4) {
      setFilterStatus('delivered');
    }
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <Box component={Paper} elevation={0} initial="hidden" animate="visible" variants={fadeIn} sx={{ mb: 4, borderRadius: 16, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5">
            Orders
          </Typography>
          <ModernButton
            variant="contained"
            onClick={() => {
              setEditOrder(null);
              setNewOrder({ items: [{ item_id: '', quantity: 1 }], customerName: '', customerPhone: '', status: 'pending', is_delivery: false, customer_location: '', rider_id: '' });
              setOrderDialogOpen(true);
            }}
            startIcon={<AddIcon />}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            New Order
          </ModernButton>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="order status tabs">
            <Tab label="All Orders" />
            <Tab label="Pending" />
            <Tab label="Preparing" />
            <Tab label="En Route" />
            <Tab label="Completed" />
          </Tabs>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <SearchTextField
              label="Search by Name, Phone, or Order ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl sx={{ width: 125 }}>
              <InputLabel>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FilterListIcon sx={{ fontSize: 18, mr: 0.5 }} /> Status
                </Box>
              </InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Status"
                sx={{ borderRadius: 12 }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {['pending', 'preparing', 'completed', 'enroute', 'delivered', 'canceled'].map((status) => (
                  <MenuItem key={status} value={status}>
                    <StatusChip 
                      status={status} 
                      label={status.charAt(0).toUpperCase() + status.slice(1)} 
                      size="small" 
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl sx={{ width: 125 }}>
              <InputLabel>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SortIcon sx={{ fontSize: 18, mr: 0.5 }} /> Sort By
                </Box>
              </InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
                sx={{ borderRadius: 12 }}
              >
                {sortOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {activeFilters > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              Active filters: {activeFilters}
            </Typography>
            <ModernButton
              variant="outlined"
              size="small"
              onClick={clearFilters}
              startIcon={<CloseIcon />}
            >
              Clear Filters
            </ModernButton>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No orders found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {filterStatus || searchQuery ? 'Try adjusting your filters or search query' : 'Get started by creating your first order'}
            </Typography>
            <ModernButton
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => {
                setEditOrder(null);
                setNewOrder({ items: [{ item_id: '', quantity: 1 }], customerName: '', customerPhone: '', status: 'pending', is_delivery: false, customer_location: '', rider_id: '' });
                setOrderDialogOpen(true);
              }}
              startIcon={<AddIcon />}
            >
              Create Order
            </ModernButton>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 12, bgcolor: 'background.default', maxHeight: 600 }}>
            <Table stickyHeader size="medium">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Delivery</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <AnimatePresence>
                  {orders.map((order) => (
                    <StyledTableRow 
                      key={order.order_id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          #{order.order_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {order.items.map(item => (
                          <Box key={item.item_id} sx={{ mb: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">
                              {item.name} (x{item.quantity})
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              Rs {item.price.toFixed(2)}
                            </Typography>
                          </Box>
                        ))}
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Rs {order.total_price?.toFixed(2) || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {['manager', 'kitchen', 'rider'].includes(userRole) ? (
                          <Select
                            value={order.status || 'pending'}
                            onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                            size="small"
                            disabled={
                              (userRole === 'rider' && !['enroute', 'delivered'].includes(order.status)) ||
                              (userRole === 'rider' && order.status === 'enroute' && order.rider_id !== parseInt(localStorage.getItem('userId')))
                            }
                            sx={{ borderRadius: 8, minWidth: 120 }}
                            renderValue={(selected) => (
                              <StatusChip 
                                status={selected} 
                                label={selected.charAt(0).toUpperCase() + selected.slice(1)} 
                                size="small" 
                              />
                            )}
                          >
                            {['pending', 'preparing', 'completed', 'enroute', 'delivered', 'canceled'].map((status) => (
                              <MenuItem key={status} value={status}>
                                <StatusChip 
                                  status={status} 
                                  label={status.charAt(0).toUpperCase() + status.slice(1)} 
                                  size="small" 
                                />
                              </MenuItem>
                            ))}
                          </Select>
                        ) : (
                          <StatusChip
                            status={order.status}
                            label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{order.customer_name || 'N/A'}</Typography>
                          <Typography variant="body2" color="text.secondary">{order.customer_phone || 'N/A'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {order.is_delivery ? (
                          <Chip 
                            icon={<LocalShippingIcon />} 
                            label="Delivery" 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                        ) : (
                          <Chip label="Pickup" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                            <CalendarTodayIcon sx={{ fontSize: 14, mr: 0.5 }} />
                            {new Date(order.created_at).toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                            <AccessTimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                            {new Date(order.created_at).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                          <Tooltip title={['manager', 'kitchen'].includes(userRole) ? 'Edit order' : 'Editing restricted'}>
                            <span>
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => handleEditOrder(order)}
                                disabled={!['manager', 'kitchen'].includes(userRole)}
                              >
                                <EditIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={userRole === 'manager' ? 'Cancel order' : 'Cancellation restricted'}>
                            <span>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleCancelOrder(order.order_id)}
                                disabled={userRole !== 'manager'}
                              >
                                <CancelIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </StyledTableRow>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default OrdersTable;