import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Snackbar, Alert, useMediaQuery, Fab, CircularProgress,
  Drawer, Fade
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';
import DrawerContent from './dashboard/DrawerContent';
import OrderDialog from './dashboard/OrderDialog';
import AnalyticsOverview from './dashboard/AnalyticsOverview';
import OrdersTable from './dashboard/OrdersTable';
import createMuiTheme from './dashboard/theme';
import Header from './dashboard/Header';

function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [riders, setRiders] = useState([]);
  const [newOrder, setNewOrder] = useState({
    items: [{ item_id: '', quantity: 1 }],
    customerName: '',
    customerPhone: '',
    status: 'pending',
    is_delivery: false,
    customer_location: '',
    rider_id: '',
  });
  const [editOrder, setEditOrder] = useState(null);
  const [tenant, setTenant] = useState(null); // Changed to null to indicate loading state
  const [tenantLoading, setTenantLoading] = useState(true); // New loading state
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'staff');
  const [analytics, setAnalytics] = useState({ 
    totalOrders: 0, 
    totalRevenue: 0, 
    lowStockItems: [],
    popularItems: [],
    dailyAverage: 0,
    completionRate: 0
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '' });
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const tenantId = localStorage.getItem('tenantId');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');

  const muiTheme = createMuiTheme(tenant || { primary_color: '#1976d2' }); // Fallback tenant object

  // Calculate completion rate from current orders
  const calculateCompletionRate = (ordersData) => {
    if (!ordersData || ordersData.length === 0) return 0;
    
    const completedOrders = ordersData.filter(order => 
      order.status === 'delivered' || order.status === 'completed'
    ).length;
    
    const totalOrders = ordersData.length;
    return totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  };

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (filterStatus) count++;
    if (searchQuery) count++;
    if (sortBy !== 'created_at' || sortOrder !== 'DESC') count++;
    setActiveFilters(count);
  }, [filterStatus, searchQuery, sortBy, sortOrder]);

  const fetchAnalytics = async (retryCount = 0) => {
    if (userRole !== 'manager') {
      setAnalytics({ 
        totalOrders: 0, 
        totalRevenue: 0, 
        lowStockItems: [],
        popularItems: [],
        dailyAverage: 0,
        completionRate: 0
      });
      return;
    }
    if (!tenantId || !token) {
      setError('No tenant ID or token found. Please log in again.');
      navigate('/');
      return;
    }

    setAnalyticsLoading(true);
    try {
      const response = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const ordersResponse = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1000 }
      });
      
      const allOrders = ordersResponse.data || [];
      const calculatedCompletionRate = calculateCompletionRate(allOrders);
      
      const { totalOrders, totalRevenue, lowStockItems, popularItems, dailyAverage } = response.data;
      
      setAnalytics({
        totalOrders: parseInt(totalOrders) || 0,
        totalRevenue: parseFloat(totalRevenue) || 0,
        lowStockItems: lowStockItems.map(item => ({
          item_id: parseInt(item.item_id) || 0,
          name: item.name || 'Unknown',
          stock_quantity: parseInt(item.stock_quantity) || 0,
          low_stock_threshold: parseInt(item.low_stock_threshold) || 0,
        })),
        popularItems: popularItems || [],
        dailyAverage: dailyAverage || 0,
        completionRate: calculatedCompletionRate
      });
      setError('');
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Unauthorized access. Please log in as a manager.');
        navigate('/');
      } else if (retryCount < 2) {
        setTimeout(() => fetchAnalytics(retryCount + 1), 3000);
      } else {
        setError('Failed to load analytics.');
        setAnalytics({ 
          totalOrders: 0, 
          totalRevenue: 0, 
          lowStockItems: [],
          popularItems: [],
          dailyAverage: 0,
          completionRate: 0
        });
      }
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchRiders = async () => {
    if (!['manager', 'kitchen'].includes(userRole)) {
      setRiders([]);
      return;
    }
    if (!tenantId || !token) {
      setError('No tenant ID or token found. Please log in again.');
      navigate('/');
      return;
    }

    try {
      const response = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/riders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRiders(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to load riders');
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { status: filterStatus, sortBy, sortOrder, search: searchQuery };
      const response = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      const ordersData = Array.isArray(response.data) ? response.data : [];
      setOrders(ordersData);
      
      if (userRole === 'manager') {
        setAnalytics(prev => ({
          ...prev,
          completionRate: calculateCompletionRate(ordersData)
        }));
      }
      
      setError('');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to load orders');
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId && token) {
      fetchOrders();
    }
  }, [tenantId, token, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tenantId && token) {
        fetchOrders();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let ws = null;
    let wsReconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    const connectWebSocket = () => {
      if (wsReconnectAttempts >= maxReconnectAttempts) {
        setError('WebSocket connection failed after multiple attempts.');
        return;
      }

      ws = new WebSocket(`ws://localhost:8080?tenantId=${tenantId}&token=${token}`);

      ws.onopen = () => {
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
              message: `${data.type === 'new_order' ? 'New' : 'Updated'} Order #${order.order_id}: ${itemsString}`,
            });
            fetchOrders();
            if (userRole === 'manager') fetchAnalytics();
            if (['manager', 'kitchen'].includes(userRole)) fetchRiders();
          }
        } catch (error) {
          setError('Failed to process WebSocket update');
        }
      };

      ws.onclose = () => {
        wsReconnectAttempts++;
        if (wsReconnectAttempts < maxReconnectAttempts) {
          setTimeout(connectWebSocket, 5000);
        } else {
          setError('WebSocket connection disabled after max retries.');
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection error. Retrying...');
      };
    };

    const fetchTenant = async () => {
      setTenantLoading(true);
      try {
        const response = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Tenant API response:', response.data); // Debug log
        setTenant({
          name: response.data.name || 'Unknown Tenant',
          logo_url: response.data.logo_url || '',
          primary_color: response.data.primary_color || '#1976d2',
        });
        setError('');
      } catch (error) {
        console.error('Tenant fetch error:', error.response?.data || error.message); // Debug log
        setError('Failed to load tenant data');
        setTenant({ name: 'Unknown Tenant', logo_url: '', primary_color: '#1976d2' }); // Fallback tenant
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate('/');
        }
      } finally {
        setTenantLoading(false);
      }
    };

    const fetchMenuItems = async () => {
      try {
        const response = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/menu-items`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMenuItems(Array.isArray(response.data) ? response.data : []);
        setError('');
      } catch (error) {
        setError(error.response?.data?.error || 'Failed to load menu items');
      }
    };

    if (tenantId && token) {
      fetchTenant();
      fetchMenuItems();
      if (['manager', 'kitchen', 'rider'].includes(userRole)) connectWebSocket();
      if (['manager', 'kitchen'].includes(userRole)) fetchRiders();
      if (userRole === 'manager') fetchAnalytics();
    } else {
      setError('Please log in to view the dashboard');
      setTenantLoading(false);
      navigate('/');
    }

    return () => {
      if (ws) ws.close();
    };
  }, [tenantId, token, navigate, userRole]);

  const handleAddOrder = async () => {
    if (!tenantId || !token) {
      setError('No tenant ID or token found. Please log in again.');
      navigate('/');
      return;
    }

    if (!newOrder.items.every(item => item.item_id && item.quantity > 0)) {
      setError('All items must have a valid selection and quantity greater than 0');
      return;
    }

    if (newOrder.is_delivery && !newOrder.customer_location) {
      setError('Customer location is required for delivery orders');
      return;
    }

    if (newOrder.is_delivery && !newOrder.rider_id && ['manager', 'kitchen'].includes(userRole)) {
      setError('Rider selection is required for delivery orders');
      return;
    }

    const orderData = {
      items: newOrder.items.map(item => ({
        item_id: parseInt(item.item_id),
        quantity: parseInt(item.quantity),
        price: parseFloat(menuItems.find(menuItem => menuItem.item_id === parseInt(item.item_id))?.price || 0),
      })),
      status: newOrder.status,
      customerName: newOrder.customerName ? newOrder.customerName.trim() : null,
      customerPhone: newOrder.customerPhone ? newOrder.customerPhone.trim() : null,
      is_delivery: newOrder.is_delivery ? 1 : 0,
      customer_location: newOrder.is_delivery ? newOrder.customer_location : null,
      rider_id: newOrder.is_delivery && ['manager', 'kitchen'].includes(userRole) ? parseInt(newOrder.rider_id) : null,
    };

    try {
      const response = await axios.post(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/orders`, orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        await fetchOrders();
        setNewOrder({ items: [{ item_id: '', quantity: 1 }], customerName: '', customerPhone: '', status: 'pending', is_delivery: false, customer_location: '', rider_id: '' });
        setError('');
        setNotification({ open: true, message: `Order #${response.data.orderId} created successfully` });
        if (userRole === 'manager') await fetchAnalytics();
        if (['manager', 'kitchen'].includes(userRole)) await fetchRiders();
        setOrderDialogOpen(false);
      }
    } catch (error) {
      setError(`Failed to add order: ${error.response?.data?.error || error.message}`);
      if (error.response?.status === 401 || error.response?.status === 403) navigate('/');
    }
  };

  const handleEditOrder = (order) => {
    if (userRole !== 'manager' && userRole !== 'kitchen') {
      setError('Only managers or kitchen staff can edit orders.');
      return;
    }
    setEditOrder(order);
    setNewOrder({
      items: order.items.map(item => ({
        item_id: item.item_id.toString(),
        quantity: item.quantity,
      })),
      customerName: order.customer_name || '',
      customerPhone: order.customer_phone || '',
      status: order.status || 'pending',
      is_delivery: order.is_delivery,
      customer_location: order.customer_location || '',
      rider_id: order.rider_id ? order.rider_id.toString() : '',
    });
    setOrderDialogOpen(true);
  };

  const handleUpdateOrder = async () => {
    if (!tenantId || !token || !editOrder) {
      setError('No tenant ID, token, or order selected. Please try again.');
      navigate('/');
      return;
    }

    if (!newOrder.items.every(item => item.item_id && item.quantity > 0)) {
      setError('All items must have a valid selection and quantity greater than 0');
      return;
    }

    if (newOrder.is_delivery && !newOrder.customer_location) {
      setError('Customer location is required for delivery orders');
      return;
    }

    if (newOrder.is_delivery && !newOrder.rider_id && ['manager', 'kitchen'].includes(userRole) && newOrder.status === 'completed') {
      setError('Rider selection is required for delivery orders when marking as completed');
      return;
    }

    const orderData = {
      items: newOrder.items.map(item => ({
        item_id: parseInt(item.item_id),
        quantity: parseInt(item.quantity),
        price: parseFloat(menuItems.find(menuItem => menuItem.item_id === parseInt(item.item_id))?.price || 0),
      })),
      status: newOrder.status,
      customerName: newOrder.customerName ? newOrder.customerName.trim() : null,
      customerPhone: newOrder.customerPhone ? newOrder.customerPhone.trim() : null,
      is_delivery: newOrder.is_delivery ? 1 : 0,
      customer_location: newOrder.is_delivery ? newOrder.customer_location : null,
      rider_id: newOrder.is_delivery && ['manager', 'kitchen'].includes(userRole) ? parseInt(newOrder.rider_id) : null,
    };

    try {
      const response = await axios.put(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/orders/${editOrder.order_id}`, orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        await fetchOrders();
        setNewOrder({ items: [{ item_id: '', quantity: 1 }], customerName: '', customerPhone: '', status: 'pending', is_delivery: false, customer_location: '', rider_id: '' });
        setEditOrder(null);
        setError('');
        setNotification({ open: true, message: `Order #${editOrder.order_id} updated successfully` });
        if (userRole === 'manager') await fetchAnalytics();
        if (['manager', 'kitchen'].includes(userRole)) await fetchRiders();
        setOrderDialogOpen(false);
      }
    } catch (error) {
      setError(`Failed to update order: ${error.response?.data?.error || error.message}`);
      if (error.response?.status === 401 || error.response?.status === 403) navigate('/');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    if (userRole !== 'manager' && userRole !== 'kitchen' && userRole !== 'rider') {
      setError('Only managers, kitchen staff, or riders can change order status.');
      return;
    }
    if (!tenantId || !token) {
      setError('No tenant ID or token found. Please log in again.');
      navigate('/');
      return;
    }

    const order = orders.find(o => o.order_id === orderId);
    if (newStatus === 'enroute' && !order.rider_id && userRole === 'rider') {
      setError('Rider must be assigned before marking as enroute.');
      return;
    }

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
      rider_id: newStatus === 'enroute' && userRole === 'rider' ? parseInt(localStorage.getItem('userId')) : order.rider_id,
    };

    try {
      const response = await axios.put(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/orders/${orderId}`, orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        await fetchOrders();
        setError('');
        setNotification({ open: true, message: `Order #${orderId} status updated to ${newStatus}` });
        if (userRole === 'manager') await fetchAnalytics();
        if (['manager', 'kitchen'].includes(userRole)) fetchRiders();
      }
    } catch (error) {
      setError(`Failed to update status: ${error.response?.data?.error || error.message}`);
      if (error.response?.status === 401 || error.response?.status === 403) navigate('/');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (userRole !== 'manager') {
      setError('Only managers can cancel orders.');
      return;
    }
    if (!tenantId || !token) {
      setError('No tenant ID or token found. Please log in again.');
      navigate('/');
      return;
    }

    try {
      const response = await axios.put(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/orders/${orderId}`, {
        status: 'canceled',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        await fetchOrders();
        setError('');
        setNotification({ open: true, message: `Order #${orderId} canceled successfully` });
        if (userRole === 'manager') await fetchAnalytics();
        if (['manager', 'kitchen'].includes(userRole)) fetchRiders();
      }
    } catch (error) {
      setError(`Failed to cancel order: ${error.response?.data?.error || error.message}`);
      if (error.response?.status === 401 || error.response?.status === 403) navigate('/');
    }
  };

  const handleExportOrders = async () => {
    if (userRole !== 'manager') {
      setError('Only managers can export orders.');
      return;
    }
    if (!tenantId || !token) {
      setError('No tenant ID or token found. Please log in again.');
      navigate('/');
      return;
    }

    try {
      const params = { status: filterStatus, sortBy, sortOrder, search: searchQuery };
      const response = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/orders/export`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders_${tenantId}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setError('');
      setNotification({ open: true, message: 'Orders exported successfully' });
    } catch (error) {
      setError(`Failed to export orders: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleAddItem = () => {
    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, { item_id: '', quantity: 1 }],
    });
  };

  const handleRemoveItem = (index) => {
    if (newOrder.items.length === 1) {
      setError('Order must have at least one item');
      return;
    }
    setNewOrder({
      ...newOrder,
      items: newOrder.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...newOrder.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setNewOrder({ ...newOrder, items: updatedItems });
  };

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  if (tenantLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading tenant data...</Typography>
      </Box>
    );
  }

  if (!tenant) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography color="error">Failed to load tenant data. Please try again.</Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={toggleDrawer(false)}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 310,
              borderRight: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              transition: 'transform 0.3s ease-in-out',
            },
          }}
        >
          <DrawerContent
            tenant={tenant}
            userRole={userRole}
            navigate={navigate}
            setDrawerOpen={setDrawerOpen}
          />
        </Drawer>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 4 },
            width: '100%',
          }}
        >
          <Header
            tenant={tenant}
            userRole={userRole}
            toggleDrawer={toggleDrawer}
            notificationsAnchor={notificationsAnchor}
            setNotificationsAnchor={setNotificationsAnchor}
            profileAnchor={profileAnchor}
            setProfileAnchor={setProfileAnchor}
            muiTheme={muiTheme}
          />
          
          <Container maxWidth="xl">
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
            
            <AnalyticsOverview
              userRole={userRole}
              analytics={analytics}
              analyticsLoading={analyticsLoading}
              handleExportOrders={handleExportOrders}
              fetchAnalytics={fetchAnalytics}
              tenant={tenant}
            />
            
            <OrdersTable
              orders={orders}
              loading={loading}
              userRole={userRole}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              activeFilters={activeFilters}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              handleStatusChange={handleStatusChange}
              handleEditOrder={handleEditOrder}
              handleCancelOrder={handleCancelOrder}
              setOrderDialogOpen={setOrderDialogOpen}
              setEditOrder={setEditOrder}
              setNewOrder={setNewOrder}
              tenant={tenant}
            />
            
            <OrderDialog
              open={orderDialogOpen}
              onClose={() => setOrderDialogOpen(false)}
              editOrder={editOrder}
              newOrder={newOrder}
              setNewOrder={setNewOrder}
              menuItems={menuItems}
              userRole={userRole}
              riders={riders}
              handleAddItem={handleAddItem}
              handleRemoveItem={handleRemoveItem}
              handleItemChange={handleItemChange}
              handleAddOrder={handleAddOrder}
              handleUpdateOrder={handleUpdateOrder}
              tenant={tenant}
            />
            
            <Fab
              color="primary"
              aria-label="add"
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                display: { xs: 'flex', md: 'none' }
              }}
              onClick={() => {
                setEditOrder(null);
                setNewOrder({ items: [{ item_id: '', quantity: 1 }], customerName: '', customerPhone: '', status: 'pending', is_delivery: false, customer_location: '', rider_id: '' });
                setOrderDialogOpen(true);
              }}
            >
              <AddIcon />
            </Fab>
            
            <Snackbar 
              open={notification.open} 
              autoHideDuration={6000} 
              onClose={handleCloseNotification}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              TransitionComponent={Fade}
            >
              <Alert
                onClose={handleCloseNotification}
                severity="success"
                elevation={6}
                variant="filled"
                sx={{ borderRadius: 12, alignItems: 'center' }}
              >
                {notification.message}
              </Alert>
            </Snackbar>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default Dashboard;