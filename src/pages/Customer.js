import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Container, Typography, Box, Button, TextField, FormControlLabel, Checkbox, Avatar,
  Alert, CircularProgress, Card, CardContent, List, ListItem, ListItemText,
  ListItemSecondaryAction, IconButton, Grid, Paper, Divider, AppBar, Toolbar,
  useTheme, styled, Fade, Tooltip, alpha, Chip, InputAdornment
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as ShoppingCartIcon,
  MyLocation as MyLocationIcon,
  Clear as ClearIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { debounce } from 'lodash';

// Custom styled components with enhanced animations
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

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

function Customer() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState({ name: '', logo_url: '', primary_color: '#1976d2' });
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isDelivery, setIsDelivery] = useState(false);
  const [customerLocation, setCustomerLocation] = useState('');
  const [orderStatus, setOrderStatus] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000); // Start with 1s delay

  // Enhanced modern theme
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
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
            },
          },
        },
      },
    },
  });

  // Load orderStatus from localStorage on mount
  useEffect(() => {
    const savedOrderStatus = localStorage.getItem(`orderStatus_${tenantId}`);
    if (savedOrderStatus) {
      setOrderStatus(JSON.parse(savedOrderStatus));
    }
  }, [tenantId]);

  // Save orderStatus to localStorage whenever it changes
  useEffect(() => {
    if (orderStatus) {
      localStorage.setItem(`orderStatus_${tenantId}`, JSON.stringify(orderStatus));
    }
  }, [orderStatus, tenantId]);

  // Fetch tenant and menu data
  useEffect(() => {
    if (!tenantId || tenantId === 'undefined') {
      setError('Invalid tenant ID. Please check the URL.');
      navigate('/');
      return;
    }

    const fetchTenant = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/tenants/${tenantId}`);
        setTenant({
          name: response.data.name || 'Unknown Tenant',
          logo_url: response.data.logo_url || '',
          primary_color: response.data.primary_color || '#1976d2',
        });
        setError('');
      } catch (error) {
        const message = error.response?.data?.error || error.response?.status === 404
          ? 'Tenant not found. Please check the URL.'
          : 'Failed to load tenant data. Please try again.';
        setError(message);
      }
    };

    const fetchMenu = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:5000/api/tenants/${tenantId}/public/menu`);
        setMenuItems(Array.isArray(response.data) ? response.data : []);
        setError('');
      } catch (error) {
        const message = error.response?.data?.error || error.response?.status === 404
          ? 'Menu not found for this tenant.'
          : 'Failed to load menu. Please try again.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
    fetchMenu();
  }, [tenantId, navigate]);

  // Refetch orderStatus if available
  useEffect(() => {
    if (orderStatus && !wsRef.current) {
      const refetchOrderStatus = async () => {
        try {
          const response = await axios.get(
            `http://localhost:5000/api/tenants/${tenantId}/orders/${orderStatus.order_id}?customerPhone=${encodeURIComponent(orderStatus.customer_phone)}`
          );
          setOrderStatus(response.data);
        } catch (error) {
          setError(error.response?.data?.error || 'Failed to refetch order status.');
        }
      };
      refetchOrderStatus();
    }
  }, [orderStatus, tenantId]);

  // WebSocket connection with reconnection logic
  useEffect(() => {
    if (orderStatus) {
      const connectWebSocket = () => {
        wsRef.current = new WebSocket(
          `ws://localhost:8080?tenantId=${tenantId}&orderId=${orderStatus.order_id}&customerPhone=${encodeURIComponent(orderStatus.customer_phone)}`
        );

        wsRef.current.onopen = () => {
          reconnectAttempts.current = 0;
          reconnectDelay.current = 1000; // Reset delay on successful connection
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'order_updated' && data.order.order_id === orderStatus.order_id) {
              setOrderStatus({
                ...orderStatus,
                status: data.order.status,
                preparation_start_time: data.order.preparation_start_time,
                preparation_end_time: data.order.preparation_end_time,
                delivery_start_time: data.order.delivery_start_time,
                delivery_end_time: data.order.delivery_end_time,
                rider_id: data.order.rider_id,
              });
            }
          } catch (err) {
            setError('Failed to process WebSocket update.');
          }
        };

        wsRef.current.onclose = () => {
          if (reconnectAttempts.current < maxReconnectAttempts) {
            setTimeout(() => {
              reconnectAttempts.current += 1;
              reconnectDelay.current = Math.min(reconnectDelay.current * 2, 16000); // Exponential backoff, max 16s
              connectWebSocket();
            }, reconnectDelay.current);
          } else {
            setError('Failed to connect to real-time updates after multiple attempts.');
          }
        };

        wsRef.current.onerror = () => {
          setError('WebSocket connection error. Retrying...');
        };
      };

      connectWebSocket();

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [orderStatus, tenantId]);

  const addToCart = (item) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.item_id === item.item_id);
      if (existingItem) {
        if (existingItem.quantity + 1 > item.stock_quantity) {
          setError(`Cannot add more ${item.name}. Only ${item.stock_quantity} in stock.`);
          return prevCart;
        }
        return prevCart.map((cartItem) =>
          cartItem.item_id === item.item_id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      if (item.stock_quantity < 1) {
        setError(`${item.name} is out of stock.`);
        return prevCart;
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
    setSuccess(`Added ${item.name} to cart.`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const removeFromCart = (itemId) => {
    setCart((prevCart) => prevCart.filter((item) => item.item_id !== itemId));
    setSuccess('Item removed from cart.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const debouncedUpdateQuantity = useMemo(
    () =>
      debounce((itemId, value) => {
        if (isNaN(value) || value < 1) {
          removeFromCart(itemId);
          return;
        }
        const item = menuItems.find((menuItem) => menuItem.item_id === itemId);
        if (item && value > item.stock_quantity) {
          setError(`Cannot set quantity to ${value}. Only ${item.stock_quantity} in stock.`);
          return;
        }
        setCart((prevCart) =>
          prevCart.map((item) =>
            item.item_id === itemId ? { ...item, quantity: value } : item
          )
        );
      }, 300),
    [menuItems]
  );

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setCustomerLocation(googleMapsLink);
        setLocationLoading(false);
        setSuccess('Location retrieved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location access denied. Please allow location access to proceed.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information is unavailable. Please try again.';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'The request to get location timed out. Please try again.';
        }
        setError(errorMessage);
        setLocationLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleClearLocation = () => {
    setCustomerLocation('');
    setSuccess('Location cleared successfully.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleClearData = () => {
    localStorage.removeItem(`orderStatus_${tenantId}`);
    setOrderStatus(null);
    setSuccess('Order data cleared successfully.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError('Cart is empty. Add items to place an order.');
      return;
    }
    if (!customerName) {
      setError('Customer name is required.');
      return;
    }
    if (!/^[a-zA-Z\s-]{2,}$/.test(customerName)) {
      setError('Customer name must be at least 2 characters long and contain only letters, spaces, or hyphens.');
      return;
    }
    if (!customerPhone) {
      setError('Customer phone is required.');
      return;
    }
    if (!/^\+?\d{10,15}$/.test(customerPhone)) {
      setError('Please enter a valid phone number (10-15 digits).');
      return;
    }
    if (isDelivery && !customerLocation) {
      setError('Delivery location is required for delivery orders. Please get your current location.');
      return;
    }

    const orderData = {
      items: cart.map((item) => ({
        item_id: item.item_id,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
      })),
      customerName,
      customerPhone,
      is_delivery: isDelivery ? 1 : 0,
      customer_location: isDelivery ? customerLocation : null,
    };

    delete orderData.status;

    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:5000/api/tenants/${tenantId}/public/orders`,
        orderData
      );

      const newOrderStatus = {
        order_id: response.data.orderId,
        items: cart.map((item) => ({
          item_id: item.item_id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        total_price: totalPrice,
        status: 'pending',
        customer_name: customerName,
        customer_phone: customerPhone,
        is_delivery: isDelivery ? 1 : 0,
        customer_location: isDelivery ? customerLocation : null,
      };

      setOrderStatus(newOrderStatus);
      setSuccess(`Order placed successfully! Your order ID is ${response.data.orderId}.`);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerLocation('');
      setIsDelivery(false);
      setSearchQuery('');
      setError('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      const message = error.response?.data?.error || error.response?.status === 400
        ? 'Invalid order data. Please check your inputs.'
        : 'Failed to place order. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Filter menu items based on search query
  const filteredMenuItems = useMemo(() => {
    if (!searchQuery) return menuItems;
    const lowerQuery = searchQuery.toLowerCase();
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery)
    );
  }, [menuItems, searchQuery]);

  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.price, 0),
    [cart]
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'transparent', mb: 4 }}>
          <Toolbar>
            <Typography variant="h4" sx={{ flexGrow: 1, fontWeight: 700 }}>
              Place Your Order
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                icon={<ShoppingCartIcon />}
                label="Customer" 
                sx={{ 
                  backgroundColor: alpha(muiTheme.palette.primary.main, 0.1),
                  color: muiTheme.palette.primary.main,
                  fontWeight: 600,
                  borderRadius: 20
                }} 
              />
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl">
          {/* Alerts */}
          <Box sx={{ position: 'relative', minHeight: '64px', mb: 4, width: '100%' }}>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert
                    severity="error"
                    sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    onClose={() => setError('')}
                  >
                    {error}
                  </Alert>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert
                    severity="success"
                    sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    onClose={() => setSuccess('')}
                  >
                    {success}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>

          <GradientCard sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Avatar
                src={tenant.logo_url ? `http://localhost:5000${tenant.logo_url}` : 'https://placehold.co/40x40'}
                alt={tenant.name}
                sx={{ width: 48, height: 48, mr: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                onError={(e) => {
                  e.target.src = 'https://placehold.co/40x40';
                }}
              />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {tenant.name || `Welcome To ${tenantId}`}
              </Typography>
            </Box>
          </GradientCard>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
            {/* Menu Section */}
            <Box sx={{ flex: { md: 1 } }}>
              <StyledPaper initial="hidden" animate="visible" variants={fadeIn}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Menu
                  </Typography>
                  <TextField
                    placeholder="Search menu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                    variant="outlined"
                    size="small"
                    sx={{ width: { xs: '100%', sm: 300 } }}
                  />
                </Box>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                    <Typography sx={{ ml: 2, color: 'text.secondary' }}>Loading menu...</Typography>
                  </Box>
                ) : filteredMenuItems.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      {searchQuery ? 'No matching items found' : 'No menu items available'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchQuery ? 'Try adjusting your search.' : 'Check back later for available items.'}
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    <AnimatePresence>
                      {filteredMenuItems.map((item) => (
                        <Grid item xs={12} sm={6} md={4} key={item.item_id}>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Card
                              sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: 16,
                                transition: 'transform 0.3s, box-shadow 0.3s',
                                '&:hover': {
                                  transform: 'translateY(-8px)',
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                },
                              }}
                            >
                              <CardContent sx={{ p: 3, flexGrow: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                  {item.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  {item.category}
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main', mb: 2 }}>
                                  Rs {item.price.toFixed(2)}
                                </Typography>
                                <Typography color={item.stock_quantity > 0 ? 'text.secondary' : 'error.main'}>
                                  {item.stock_quantity > 0 ? `In Stock: ${item.stock_quantity}` : 'Out of Stock'}
                                </Typography>
                                <Tooltip title={item.stock_quantity > 0 ? `Add ${item.name} to cart` : 'Item out of stock'}>
                                  <span>
                                    <ModernButton
                                      variant="contained"
                                      startIcon={<AddIcon />}
                                      onClick={() => addToCart(item)}
                                      disabled={item.stock_quantity === 0}
                                      sx={{ mt: 2 }}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                    >
                                      Add to Cart
                                    </ModernButton>
                                  </span>
                                </Tooltip>
                              </CardContent>
                            </Card>
                          </motion.div>
                        </Grid>
                      ))}
                    </AnimatePresence>
                  </Grid>
                )}
              </StyledPaper>

              {/* Order Status Display - Shows after order is placed */}
              {orderStatus && (
                <StyledPaper initial="hidden" animate="visible" variants={fadeIn} sx={{ mt: 4 }}>
                  <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                    Order Details
                  </Typography>
                  <GradientCard>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                        Order ID: #{orderStatus.order_id}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Items:</Typography>
                      <List>
                        {orderStatus.items.map((item) => (
                          <ListItem key={item.item_id} sx={{ py: 1 }}>
                            <ListItemText
                              primary={`${item.name} (x${item.quantity})`}
                              secondary={`$${item.price.toFixed(2)} each`}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              Rs {(item.quantity * item.price).toFixed(2)}
                            </Typography>
                          </ListItem>
                        ))}
                      </List>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                        Total Price: Rs {orderStatus.total_price.toFixed(2)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>Status:</Typography>
                        <StatusChip
                          status={orderStatus.status}
                          label={orderStatus.status.charAt(0).toUpperCase() + orderStatus.status.slice(1)}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Customer Name:</strong> {orderStatus.customer_name}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Customer Phone:</strong> {orderStatus.customer_phone}
                      </Typography>
                      {orderStatus.is_delivery ? (
                        <>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Delivery Location:</strong>{' '}
                            {orderStatus.customer_location ? (
                              <a
                                href={orderStatus.customer_location}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: muiTheme.palette.primary.main,
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                }}
                                aria-label={`Open delivery location for order ${orderStatus.order_id} in Google Maps`}
                              >
                                View Location
                              </a>
                            ) : (
                              'N/A'
                            )}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Delivery Status:</strong>{' '}
                            {orderStatus.status === 'delivered' ? 'Delivered' : orderStatus.status === 'enroute' ? 'On the way' : 'Pending'}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2"><strong>Order Type:</strong> Pickup</Typography>
                      )}
                      {(orderStatus.status === 'completed' || orderStatus.status === 'delivered') && (
                        <Tooltip title="Clear order data to place a new order">
                          <ModernButton
                            variant="outlined"
                            color="error"
                            onClick={handleClearData}
                            sx={{ mt: 2 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            aria-label="Clear order data"
                          >
                            Clear Order Data
                          </ModernButton>
                        </Tooltip>
                      )}
                    </CardContent>
                  </GradientCard>
                </StyledPaper>
              )}
            </Box>

            {/* Sidebar Checkout Section */}
            <Box
              sx={{
                width: { xs: '100%', md: 400 },
                flexShrink: 0,
              }}
            >
              {/* Cart */}
              <StyledPaper initial="hidden" animate="visible" variants={fadeIn}>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                  <ShoppingCartIcon sx={{ mr: 1, color: 'primary.main' }} />
                  Your Cart
                </Typography>
                {cart.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Your cart is empty
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add items from the menu to get started.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <List>
                      <AnimatePresence>
                        {cart.map((item) => (
                          <motion.div
                            key={item.item_id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <ListItem sx={{ py: 2, borderBottom: '1px solid #eee' }}>
                              <ListItemText
                                primary={
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                                }
                                secondary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      ${item.price.toFixed(2)} x
                                    </Typography>
                                    <TextField
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        debouncedUpdateQuantity(item.item_id, value);
                                      }}
                                      inputProps={{ min: 1, step: 1 }}
                                      size="small"
                                      sx={{ width: 60 }}
                                    />
                                  </Box>
                                }
                              />
                              <ListItemSecondaryAction>
                                <Tooltip title={`Remove ${item.name} from cart`}>
                                  <IconButton
                                    onClick={() => removeFromCart(item.item_id)}
                                    color="error"
                                    aria-label={`Remove ${item.name} from cart`}
                                  >
                                    <RemoveIcon />
                                  </IconButton>
                                </Tooltip>
                              </ListItemSecondaryAction>
                            </ListItem>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </List>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Total: Rs{totalPrice.toFixed(2)}
                    </Typography>
                  </>
                )}
              </StyledPaper>

              {/* Order Form */}
              <StyledPaper initial="hidden" animate="visible" variants={fadeIn} sx={{ mt: 3 }}>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                  Place Order
                </Typography>
                <Box component="form" onSubmit={handlePlaceOrder}>
                  <TextField
                    label="Your Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    variant="outlined"
                    sx={{ mb: 2 }}
                    error={customerName && !/^[a-zA-Z\s-]{2,}$/.test(customerName)}
                    helperText={
                      customerName && !/^[a-zA-Z\s-]{2,}$/.test(customerName)
                        ? 'Name must be at least 2 characters and contain only letters, spaces, or hyphens.'
                        : ''
                    }
                  />
                  <TextField
                    label="Your Phone Number"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    variant="outlined"
                    sx={{ mb: 2 }}
                    error={customerPhone && !/^\+?\d{10,15}$/.test(customerPhone)}
                    helperText={
                      customerPhone && !/^\+?\d{10,15}$/.test(customerPhone)
                        ? 'Phone number must be 10-15 digits.'
                        : ''
                    }
                  />
                  <FormControlLabel
                    control={<Checkbox checked={isDelivery} onChange={(e) => setIsDelivery(e.target.checked)} />}
                    label="Delivery Order"
                    sx={{ mb: 2 }}
                  />
                  {isDelivery && (
                    <>
                      <TextField
                        label="Delivery Location"
                        value={customerLocation || 'No location set'}
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        InputProps={{ readOnly: true }}
                        sx={{ mb: 2 }}
                      />
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Tooltip title="Get your current location">
                          <ModernButton
                            variant="outlined"
                            onClick={handleGetCurrentLocation}
                            disabled={locationLoading}
                            startIcon={locationLoading ? <CircularProgress size={20} /> : <MyLocationIcon />}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            aria-label="Get current location"
                          >
                            {locationLoading ? 'Fetching Location...' : 'Get Current Location'}
                          </ModernButton>
                        </Tooltip>
                        {customerLocation && (
                          <Tooltip title="Clear the selected location">
                            <ModernButton
                              variant="outlined"
                              color="error"
                              onClick={handleClearLocation}
                              startIcon={<ClearIcon />}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              aria-label="Clear current location"
                            >
                              Clear Location
                            </ModernButton>
                          </Tooltip>
                        )}
                      </Box>
                    </>
                  )}
                  <Tooltip title={cart.length === 0 ? 'Add items to cart to place an order' : 'Place your order'}>
                    <span>
                      <ModernButton
                        type="submit"
                        variant="contained"
                        disabled={
                          loading ||
                          cart.length === 0 ||
                          !customerName ||
                          !/^[a-zA-Z\s-]{2,}$/.test(customerName) ||
                          !customerPhone ||
                          !/^\+?\d{10,15}$/.test(customerPhone) ||
                          (isDelivery && !customerLocation)
                        }
                        sx={{ mt: 2, width: '100%' }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Place Order'}
                      </ModernButton>
                    </span>
                  </Tooltip>
                </Box>
              </StyledPaper>
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default Customer;