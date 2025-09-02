import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Container, Typography, Button, Box, Alert, CircularProgress, Paper, List, ListItem, ListItemText } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import axios from 'axios';
import createTenantTheme from '../Theme';

const OrderConfirmation = () => {
  const { tenantId, orderId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(state?.order || null);
  const [status, setStatus] = useState(state?.order?.status || 'pending');
  const [tenant, setTenant] = useState({ name: `Tenant ${tenantId}`, logo_url: '', primary_color: '#1976d2' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!state?.order && orderId);

  useEffect(() => {
    // Fetch tenant details (optional, falls back to defaults)
    const fetchTenant = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/tenants/${tenantId}`);
        setTenant({
          name: response.data.name || `Tenant ${tenantId}`,
          logo_url: response.data.logo_url || '',
          primary_color: response.data.primary_color || '#1976d2',
        });
      } catch (error) {
        console.error('Error fetching tenant:', error.response?.data?.error || error.message);
        setTenant({
          name: `Tenant ${tenantId}`,
          logo_url: '',
          primary_color: '#1976d2',
        });
      }
    };

    // Fetch order status
    const fetchOrderStatus = async () => {
      if (!order?.customer_phone) {
        setError('Order details missing. Please provide the phone number used to place the order.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:5000/api/tenants/${tenantId}/public/orders/${orderId}/status`,
          { params: { customerPhone: order.customer_phone } }
        );
        setOrder({
          order_id: response.data.order_id,
          items: response.data.items,
          total_price: response.data.total_price,
          customer_name: response.data.customer_name,
          customer_phone: response.data.customer_phone,
          status: response.data.status,
          is_delivery: response.data.is_delivery,
          customer_location: response.data.customer_location,
          preparation_start_time: response.data.preparation_start_time,
          preparation_end_time: response.data.preparation_end_time,
          delivery_start_time: response.data.delivery_start_time,
          delivery_end_time: response.data.delivery_end_time,
        });
        setStatus(response.data.status);
        setError('');
      } catch (error) {
        console.error('Error fetching order status:', error);
        setError(error.response?.data?.error || 'Failed to fetch order status');
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
    if (!order && orderId) {
      fetchOrderStatus();
    } else if (order?.customer_phone) {
      fetchOrderStatus(); // Fetch latest status even if order is provided
    }

    // Poll for status updates every 10 seconds
    const interval = setInterval(() => {
      if (order?.customer_phone) {
        fetchOrderStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [tenantId, orderId, order?.customer_phone]);

  const handleCheckStatus = async () => {
    if (!order?.customer_phone) {
      setError('Please provide the phone number used to place the order');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/api/tenants/${tenantId}/public/orders/${orderId}/status`,
        { params: { customerPhone: order.customer_phone } }
      );
      setOrder({
        order_id: response.data.order_id,
        items: response.data.items,
        total_price: response.data.total_price,
        customer_name: response.data.customer_name,
        customer_phone: response.data.customer_phone,
        status: response.data.status,
        is_delivery: response.data.is_delivery,
        customer_location: response.data.customer_location,
        preparation_start_time: response.data.preparation_start_time,
        preparation_end_time: response.data.preparation_end_time,
        delivery_start_time: response.data.delivery_start_time,
        delivery_end_time: response.data.delivery_end_time,
      });
      setStatus(response.data.status);
      setError('');
    } catch (error) {
      console.error('Error checking order status:', error);
      setError(error.response?.data?.error || 'Failed to check order status');
    } finally {
      setLoading(false);
    }
  };

  const theme = createTenantTheme(tenant.primary_color);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Container sx={{ mt: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading order details...
          </Typography>
        </Container>
      </ThemeProvider>
    );
  }

  if (!order || Object.keys(order).length === 0) {
    return (
      <ThemeProvider theme={theme}>
        <Container sx={{ mt: 4 }}>
          <Alert severity="error">{error || 'No order details available. Please try placing the order again.'}</Alert>
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate(`/customer/${tenantId}`)}
            >
              Place Another Order
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => navigate('/')}
            >
              Go to Login
            </Button>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Container sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {tenant.logo_url && (
            <img src={tenant.logo_url} alt={tenant.name} style={{ width: 60, height: 60, marginRight: 16 }} />
          )}
          <Typography variant="h4" gutterBottom>
            Order Confirmation - {tenant.name}
          </Typography>
        </Box>
        <Typography variant="h6" gutterBottom>
          Thank you for your order!
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Order Details
          </Typography>
          <Typography variant="body1">
            <strong>Order ID:</strong> {order.order_id}
          </Typography>
          <Typography variant="body1">
            <strong>Items:</strong>
          </Typography>
          <List>
            {order.items.map((item) => (
              <ListItem key={item.item_id}>
                <ListItemText
                  primary={`${item.name} (x${item.quantity})`}
                  secondary={`$${item.price.toFixed(2)} each`}
                />
              </ListItem>
            ))}
          </List>
          <Typography variant="body1">
            <strong>Total Price:</strong> ${order.total_price.toFixed(2)}
          </Typography>
          <Typography variant="body1">
            <strong>Customer Name:</strong> {order.customer_name}
          </Typography>
          <Typography variant="body1">
            <strong>Customer Phone:</strong> {order.customer_phone}
          </Typography>
          <Typography variant="body1">
            <strong>Delivery:</strong> {order.is_delivery ? 'Yes' : 'No'}
          </Typography>
          {order.is_delivery && (
            <Typography variant="body1">
              <strong>Location:</strong> {order.customer_location}
            </Typography>
          )}
          <Typography variant="body1">
            <strong>Status:</strong> {status}
          </Typography>
          {status === 'pending' && (
            <Typography color="textSecondary" sx={{ mt: 1 }}>
              Your order is waiting to be processed.
            </Typography>
          )}
          {status === 'preparing' && (
            <Typography color="textSecondary" sx={{ mt: 1 }}>
              Your order is being prepared.
            </Typography>
          )}
          {status === 'completed' && (
            <Typography color="success.main" sx={{ mt: 1 }}>
              Your order is ready for pickup or delivery!
            </Typography>
          )}
          {status === 'enroute' && (
            <Typography color="textSecondary" sx={{ mt: 1 }}>
              Your order is on the way.
            </Typography>
          )}
          {status === 'delivered' && (
            <Typography color="success.main" sx={{ mt: 1 }}>
              Your order has been delivered!
            </Typography>
          )}
          {status === 'canceled' && (
            <Typography color="error" sx={{ mt: 1 }}>
              Your order has been canceled.
            </Typography>
          )}
        </Paper>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCheckStatus}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Refresh Status'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(`/customer/${tenantId}`)}
          >
            Place Another Order
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => navigate('/')}
          >
            Go to Login
          </Button>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default OrderConfirmation;