import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Box, Avatar, Chip, Snackbar, Alert, CircularProgress, Paper, AppBar, Toolbar,
  useTheme, Divider, styled, Fade, Tooltip, alpha, Card
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  DeliveryDining as DeliveryDiningIcon,
  Logout as LogoutIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Custom styled components with enhanced animations (from Dashboard.js)
const GradientCard = styled(motion(Card))(({ theme }) => ({
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
  borderRadius: theme.shape.borderRadius * 3,
  boxShadow: '0 12px 40px rgba(0,0,0,0.05)',
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  overflow: 'hidden',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 16px 56px rgba(0,0,0,0.1)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  },
}));

const StyledTableRow = styled(motion(TableRow))(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.06),
    transition: 'background-color 0.2s ease-in-out',
  },
}));

const StyledPaper = styled(motion(Paper))(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 3,
  boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
  padding: theme.spacing(3),
  background: '#fff',
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  overflow: 'hidden',
}));

const ModernButton = styled(motion(Button))(({ theme }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  padding: theme.spacing(1, 3),
  transition: 'all 0.3s ease-in-out',
  boxShadow: 'none',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.3)}, transparent)`,
    transition: 'left 0.7s ease-in-out',
  },
  '&:hover::before': {
    left: '100%',
  },
}));

const StatusChip = styled(motion(Chip))(({ theme, status }) => {
  const statusColors = {
    pending: theme.palette.warning.main,
    preparing: theme.palette.info.main,
    completed: theme.palette.success.main,
    assigned: theme.palette.secondary.main,
    enroute: theme.palette.primary.main,
    delivered: theme.palette.success.dark,
    canceled: theme.palette.error.main,
  };
  
  return {
    backgroundColor: alpha(statusColors[status] || theme.palette.default.main, 0.12),
    color: statusColors[status] || theme.palette.text.primary,
    fontWeight: 700,
    borderRadius: 20,
    border: `1px solid ${alpha(statusColors[status] || theme.palette.default.main, 0.2)}`,
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: `0 4px 12px ${alpha(statusColors[status] || theme.palette.default.main, 0.25)}`,
    },
  };
});

// Animation variants (from Dashboard.js)
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

function RiderDisplay() {
  const [orders, setOrders] = useState([]);
  const [tenant, setTenant] = useState({ name: '', logo_url: '', primary_color: '#1976d2' });
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'rider');
  const [userId, setUserId] = useState(localStorage.getItem('userId'));
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '' });
  const [loading, setLoading] = useState(false);
  const tenantId = localStorage.getItem('tenantId');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const theme = useTheme();

  // Log localStorage values for debugging
  console.log('localStorage values:', { tenantId, token, userId, userRole });

  // Check if the rider has an active (enroute) order
  const hasActiveOrder = useMemo(() => {
    return orders.some((order) => order.status === 'enroute' && order.rider_id === parseInt(userId));
  }, [orders, userId]);

  // Enhanced modern theme (from Dashboard.js)
  const muiTheme = createTheme({
    palette: {
      primary: { main: tenant.primary_color || '#1976d2' },
      secondary: { main: '#ff4081' },
      background: { default: '#f8fafc', paper: '#ffffff' },
      text: { primary: '#1e293b', secondary: '#64748b' },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      h4: { fontWeight: 800, color: '#1e293b' },
      h5: { fontWeight: 700, color: '#1e293b' },
      h6: { fontWeight: 700, color: '#1e293b' },
      subtitle1: { color: '#64748b' },
      body2: { color: '#64748b', fontSize: '0.875rem' },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
            padding: '10px 24px',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            background: '#fff',
          },
        },
      },
    },
  });

  const fetchOrders = async (retryCount = 0) => {
    if (!tenantId || !token || userRole !== 'rider') {
      setError('Unauthorized access. Please log in as a rider.');
      console.error('Auth check failed:', { tenantId, token, userRole });
      navigate('/');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching orders from:', `http://localhost:5000/api/tenants/${tenantId}/orders`);
      const response = await axios.get(`http://localhost:5000/api/tenants/${tenantId}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Raw API response:', response.data);
      // Filter for delivery orders only
      const filteredOrders = response.data.filter((o) => {
        const isDelivery = o.is_delivery === 1 || o.is_delivery === '1' || o.is_delivery === true;
        // Include orders where rider_id is null or matches userId
        const validRider = !o.rider_id || o.rider_id === parseInt(userId) || o.rider_id === userId;
        console.log('Order filter check:', { order: o, isDelivery, validRider });
        return isDelivery && validRider;
      });
      console.log('Filtered orders:', filteredOrders);
      setOrders(filteredOrders || []);
      setError('');
    } catch (error) {
      console.error('Error fetching orders:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Unauthorized access. Please log in again.');
        navigate('/');
      } else if (retryCount < 2) {
        console.log(`Retrying fetchOrders (${retryCount + 1}/2)...`);
        setTimeout(() => fetchOrders(retryCount + 1), 1000);
      } else {
        setError('Failed to load orders. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ws = null;
    let wsReconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    const connectWebSocket = () => {
      if (wsReconnectAttempts >= maxReconnectAttempts) {
        setError('WebSocket connection failed after multiple attempts.');
        console.log('Max WebSocket reconnect attempts reached. Disabling WebSocket.');
        return;
      }

      if (userRole !== 'rider' || !tenantId || !token) {
        setError('Unauthorized access. Please log in as rider.');
        console.error('WebSocket auth check failed:', { tenantId, token, userRole });
        navigate('/');
        return;
      }

      console.log('Connecting WebSocket to:', `ws://localhost:8080?tenantId=${tenantId}&token=${token}`);
      ws = new WebSocket(`ws://localhost:8080?tenantId=${tenantId}&token=${token}`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        wsReconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          if (data.type === 'new_order' || data.type === 'order_updated') {
            const { order } = data;
            const itemsString = order.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
            setNotification({
              open: true,
              message: `${data.type === 'new_order' ? 'New' : 'Updated'} Delivery Order #${order.order_id}: ${itemsString} (${order.status})`,
            });
            fetchOrders();
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setError('Failed to process WebSocket update');
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...');
        wsReconnectAttempts++;
        if (wsReconnectAttempts < maxReconnectAttempts) {
          setTimeout(connectWebSocket, 5000);
        } else {
          setError('WebSocket connection disabled after max retries.');
          console.log('WebSocket disabled after max reconnect attempts.');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error. Retrying...');
      };
    };

    const fetchTenant = async () => {
      try {
        console.log('Fetching tenant from:', `http://localhost:5000/api/tenants/${tenantId}`);
        const response = await axios.get(`http://localhost:5000/api/tenants/${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Tenant response:', response.data);
        setTenant({
          name: response.data.name || 'Unknown Tenant',
          logo_url: response.data.logo_url || '',
          primary_color: response.data.primary_color || '#1976d2',
        });
        setError('');
      } catch (error) {
        console.error('Error fetching tenant:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        setError('Failed to load tenant data');
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate('/');
        }
      }
    };

    if (tenantId && token) {
      fetchTenant();
      fetchOrders();
      connectWebSocket();
    } else {
      setError('Please log in to view the rider display');
      console.error('Initial auth check failed:', { tenantId, token });
      navigate('/');
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [tenantId, token, navigate, userRole, userId]);

  const handleStatusChange = async (orderId, newStatus) => {
    const order = orders.find((o) => o.order_id === orderId);
    if (!order) {
      setError('Order not found');
      console.error('Order not found:', { orderId });
      return;
    }

    // Prevent starting a new delivery if the rider has an active order
    if (newStatus === 'enroute' && hasActiveOrder) {
      setError('You must complete your current delivery before starting a new one.');
      setNotification({
        open: true,
        message: 'Cannot start new delivery. Complete your current delivery first.',
      });
      return;
    }

    // Include rider_id in the orderData for enroute status
    const orderData = {
      items: order.items.map(item => ({
        item_id: item.item_id,
        quantity: item.quantity,
        price: item.price,
      })),
      status: newStatus,
      customerName: order.customer_name || null,
      customerPhone: order.customer_phone || null,
      is_delivery: order.is_delivery,
      customer_location: order.customer_location,
      rider_id: newStatus === 'enroute' ? parseInt(userId) : order.rider_id,
    };

    try {
      console.log('Updating order status:', { orderId, newStatus, orderData });
      const response = await axios.put(
        `http://localhost:5000/api/tenants/${tenantId}/orders/${orderId}`,
        orderData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('Update status response:', response.data);
      if (response.data.success) {
        // Update local orders to reflect the new status and rider_id
        setOrders((prevOrders) =>
          prevOrders.map((o) =>
            o.order_id === orderId ? { ...o, status: newStatus, rider_id: newStatus === 'enroute' ? parseInt(userId) : o.rider_id } : o
          )
        );
        fetchOrders();
        setNotification({ open: true, message: `Order #${orderId} updated to ${newStatus}` });
        setError('');
      }
    } catch (error) {
      console.error('Error updating status:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setError(error.response?.data?.error || 'Failed to update status');
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const calculateDeliveryTime = (start, end) => {
    if (!start || !end) return 'N/A';
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime - startTime;
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'preparing': return 'info';
      case 'completed': return 'success';
      case 'assigned': return 'secondary';
      case 'enroute': return 'primary';
      case 'delivered': return 'success';
      case 'canceled': return 'error';
      default: return 'default';
    }
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'transparent', mb: 4 }}>
          <Toolbar>
            <Typography variant="h4" sx={{ flexGrow: 1, fontWeight: 700 }}>
              Rider Display
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                icon={<DeliveryDiningIcon />}
                label={userRole.charAt(0).toUpperCase() + userRole.slice(1)} 
                sx={{ 
                  backgroundColor: alpha(muiTheme.palette.primary.main, 0.1),
                  color: muiTheme.palette.primary.main,
                  fontWeight: 600,
                  borderRadius: 20
                }} 
              />
              <Tooltip title="Logout">
                <ModernButton
                  variant="outlined"
                  onClick={() => {
                    console.log('Logging out, clearing localStorage');
                    localStorage.removeItem('token');
                    localStorage.removeItem('tenantId');
                    localStorage.removeItem('role');
                    localStorage.removeItem('userId');
                    navigate('/');
                  }}
                  startIcon={<LogoutIcon />}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Logout
                </ModernButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl">
          <GradientCard sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Avatar
                src={tenant.logo_url ? `http://localhost:5000${tenant.logo_url}` : 'https://via.placeholder.com/40'}
                alt={tenant.name}
                sx={{ width: 48, height: 48, mr: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
              />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {tenant.name || `Tenant ${tenantId}`}
              </Typography>
            </Box>
          </GradientCard>

          {error && (
            <Fade in={error}>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 4, 
                  borderRadius: 12, 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  alignItems: 'center'
                }} 
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            </Fade>
          )}

          <StyledPaper initial="hidden" animate="visible" variants={fadeIn}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5">
                Delivery Orders
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2, color: 'text.secondary' }}>Loading orders...</Typography>
              </Box>
            ) : orders.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No delivery orders found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Waiting for new delivery orders
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 12, bgcolor: 'background.default', maxHeight: 600 }}>
                <Table stickyHeader size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Rider ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Delivery Time</TableCell>
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
                                  ${item.price.toFixed(2)}
                                </Typography>
                              </Box>
                            ))}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>{order.customer_name || 'N/A'}</Typography>
                              <Typography variant="body2" color="text.secondary">{order.customer_phone || 'N/A'}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {order.customer_location ? (
                              <a
                                href={order.customer_location}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: muiTheme.palette.primary.main,
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                }}
                                aria-label={`Open location for order ${order.order_id} in Google Maps`}
                              >
                                View Location
                              </a>
                            ) : (
                              <Typography variant="body2" color="text.secondary">N/A</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusChip
                              status={order.status}
                              label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{order.rider_id || 'N/A'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <AccessTimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                              <Typography variant="body2">
                                {order.status === 'delivered' 
                                  ? calculateDeliveryTime(order.delivery_start_time, order.delivery_end_time) 
                                  : 'N/A'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {order.status === 'completed' && !hasActiveOrder && (
                                <Tooltip title="Start delivering order">
                                  <ModernButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => handleStatusChange(order.order_id, 'enroute')}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    Start Delivery
                                  </ModernButton>
                                </Tooltip>
                              )}
                              {order.status === 'enroute' && order.rider_id === parseInt(userId) && (
                                <Tooltip title="Mark order as delivered">
                                  <ModernButton
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleStatusChange(order.order_id, 'delivered')}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    Complete Delivery
                                  </ModernButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </StyledTableRow>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </StyledPaper>

          <Snackbar 
            open={notification.open} 
            autoHideDuration={6000} 
            onClose={handleCloseNotification}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            TransitionComponent={Fade}
          >
            <Alert
              onClose={handleCloseNotification}
              severity="info"
              elevation={6}
              variant="filled"
              sx={{ borderRadius: 12, alignItems: 'center' }}
            >
              {notification.message}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default RiderDisplay;