import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Box, Avatar, Chip, Snackbar, Alert, CircularProgress, Paper, AppBar, Toolbar,
  useTheme, Divider, styled, Fade, Tooltip, alpha, Card
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  RestaurantMenu as RestaurantMenuIcon,
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

function KitchenDisplay() {
  const [orders, setOrders] = useState([]);
  const [tenant, setTenant] = useState({ name: '', logo_url: '', primary_color: '#1976d2' });
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'kitchen');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '' });
  const [loading, setLoading] = useState(false);
  const tenantId = localStorage.getItem('tenantId');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const theme = useTheme();

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

  useEffect(() => {
    let ws = null;
    let wsReconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    const connectWebSocket = () => {
      if (userRole !== 'kitchen' && userRole !== 'manager' || !tenantId || !token) {
        setError('Unauthorized access. Please log in as kitchen staff or manager.');
        navigate('/');
        return;
      }

      if (wsReconnectAttempts >= maxReconnectAttempts) {
        setError('WebSocket connection failed after multiple attempts.');
        return;
      }

      ws = new WebSocket(`ws://localhost:8080?tenantId=${tenantId}&token=${token}`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        wsReconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_order' || data.type === 'order_updated') {
            const { order } = data;
            const itemsString = order.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
            setNotification({
              open: true,
              message: `${data.type === 'new_order' ? 'New' : 'Updated'} Order #${order.order_id}: ${itemsString} (${order.status})`,
            });
            fetchOrders();
          }
        } catch (error) {
          setError('Failed to process WebSocket update');
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        wsReconnectAttempts++;
        if (wsReconnectAttempts < maxReconnectAttempts) {
          setTimeout(connectWebSocket, 5000);
        } else {
          setError('WebSocket connection disabled after max retries.');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error. Retrying...');
      };
    };

    const fetchTenant = async () => {
      try {
        const response = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTenant({
          name: response.data.name || `Tenant ${tenantId}`,
          logo_url: response.data.logo_url || '',
          primary_color: response.data.primary_color || '#1976d2',
        });
        setError('');
      } catch (error) {
        console.error('Error fetching tenant:', error);
        setError('Failed to load tenant data');
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate('/');
        }
      }
    };

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Filter for preparation stages (pending and preparing)
        setOrders(response.data.filter(o => ['pending', 'preparing'].includes(o.status)));
        setError('');
      } catch (error) {
        console.error('Error fetching orders:', error);
        setError(error.response?.data?.error || 'Failed to load orders');
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };

    if (tenantId && token) {
      fetchTenant();
      fetchOrders();
      connectWebSocket();
    } else {
      setError('Please log in to view the kitchen display');
      navigate('/');
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [tenantId, token, navigate, userRole]);

  const handleStatusChange = async (orderId, newStatus) => {
    if (!tenantId || !token) {
      setError('No tenant ID or token found. Please log in again.');
      navigate('/');
      return;
    }

    const order = orders.find(o => o.order_id === orderId);
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
      customer_location: order.customer_location || null,
    };

    try {
      const response = await axios.put(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/orders/${orderId}`, orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        const updatedOrders = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(updatedOrders.data.filter(o => ['pending', 'preparing'].includes(o.status)));
        setNotification({
          open: true,
          message: `Order #${orderId} updated to ${newStatus}`,
        });
        setError('');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update status: ' + (error.response?.data?.error || error.message));
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const calculatePreparationTime = (start, end) => {
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
              Kitchen Display
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                icon={<RestaurantMenuIcon />}
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
                src={tenant.logo_url ? `https://restaurant-backend-mmxx.onrender.com${tenant.logo_url}` : 'https://via.placeholder.com/40'}
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
                Kitchen Orders
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
                  No orders found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Waiting for new orders in pending or preparing status
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
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Preparation Time</TableCell>
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
                            <StatusChip
                              status={order.status}
                              label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <AccessTimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                              <Typography variant="body2">
                                {order.status === 'completed' 
                                  ? calculatePreparationTime(order.preparation_start_time, order.preparation_end_time) 
                                  : 'N/A'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {order.status === 'pending' && (
                                <Tooltip title="Start preparing order">
                                  <ModernButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => handleStatusChange(order.order_id, 'preparing')}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    Start Preparing
                                  </ModernButton>
                                </Tooltip>
                              )}
                              {order.status === 'preparing' && (
                                <Tooltip title="Mark order as completed">
                                  <ModernButton
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleStatusChange(order.order_id, 'completed')}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    Mark Completed
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

export default KitchenDisplay;