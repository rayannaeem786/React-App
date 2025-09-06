import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Box, FormControl, InputLabel, Select, MenuItem, Snackbar,
  Alert, CircularProgress, Paper, useTheme, styled, Fade, Tooltip, alpha, Card, Chip
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  RestaurantMenu as RestaurantMenuIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AddCircle as AddCircleIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Custom styled components
const GradientCard = styled(motion(Card))(({ theme }) => ({
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
  borderRadius: theme.shape.borderRadius * 4,
  boxShadow: '0 12px 48px rgba(0,0,0,0.08)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: '0 16px 64px rgba(0,0,0,0.12)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  },
}));

const StyledTableRow = styled(motion(TableRow))(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: alpha(theme.palette.primary.main, 0.03),
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    transition: 'background-color 0.2s ease-in-out',
  },
  transition: 'all 0.2s ease-in-out',
}));

const StyledPaper = styled(motion(Paper))(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 4,
  boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
  padding: theme.spacing(4),
  background: '#fff',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  overflow: 'hidden',
}));

const ModernButton = styled(motion(Button))(({ theme }) => ({
  borderRadius: 16,
  textTransform: 'none',
  fontWeight: 600,
  padding: theme.spacing(1.5, 4),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.4)}, transparent)`,
    transition: 'left 0.6s ease-in-out',
  },
  '&:hover::before': {
    left: '100%',
  },
}));

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

function Menu() {
  const [menuItems, setMenuItems] = useState([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newItem, setNewItem] = useState({ 
    name: '', 
    category: '', 
    price: '', 
    stock_quantity: '', 
    low_stock_threshold: '5'
  });
  const [editItem, setEditItem] = useState(null);
  const [restockItemId, setRestockItemId] = useState(null);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [tenant, setTenant] = useState({ name: '', primary_color: '#1976d2' });
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'staff');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '' });
  const [loading, setLoading] = useState(false);
  const tenantId = localStorage.getItem('tenantId');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const formRef = useRef(null);

  // Theme
  const muiTheme = createTheme({
    palette: {
      primary: { main: tenant.primary_color || '#1976d2' },
      secondary: { main: '#ff4081' },
      background: { default: '#f5f7fa', paper: '#ffffff' },
      text: { primary: '#1e293b', secondary: '#475569' },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      h4: { fontWeight: 800, color: '#1e293b', letterSpacing: -0.5 },
      h5: { fontWeight: 700, color: '#1e293b', letterSpacing: -0.3 },
      h6: { fontWeight: 600, color: '#1e293b' },
      subtitle1: { color: '#475569', fontWeight: 500 },
      body2: { color: '#475569', fontSize: '0.9rem' },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            textTransform: 'none',
            fontWeight: 600,
            padding: '12px 28px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            background: '#fff',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              backgroundColor: alpha('#f8fafc', 0.5),
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: '#f8fafc',
              },
            },
            '& .MuiInputLabel-root': {
              color: '#475569',
              fontWeight: 500,
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: alpha('#f8fafc', 0.5),
            '&:hover': {
              backgroundColor: '#f8fafc',
            },
          },
        },
      },
    },
  });

  // Fetch tenant and menu data
  useEffect(() => {
    const fetchTenant = async () => {
      if (!tenantId || !token) {
        setError('No tenant ID or token found. Please log in again.');
        navigate('/');
        return;
      }
      try {
        console.log('Fetching tenant from:', `https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}`);
        const response = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Tenant response:', response.data);
        setTenant({
          name: response.data.name || 'Unknown Tenant',
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

    const fetchMenuItems = async () => {
      if (!tenantId || !token) {
        setError('No tenant ID or token found. Please log in again.');
        navigate('/');
        return;
      }
      setLoading(true);
      try {
        console.log('Fetching menu items from:', `https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/menu-items`);
        const response = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/menu-items`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Menu items response:', response.data);
        const items = Array.isArray(response.data) ? response.data : [];
        setMenuItems(items);
        setFilteredMenuItems(items);
        setError('');
      } catch (error) {
        console.error('Error fetching menu items:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        setError(error.response?.data?.error || 'Failed to load menu items');
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };

    if (tenantId && token) {
      fetchTenant();
      fetchMenuItems();
    } else {
      setError('No tenant ID or token found. Please log in again.');
      navigate('/');
    }
  }, [tenantId, token, navigate]);

  // Real-time search filtering
  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (lowercasedQuery === '') {
      setFilteredMenuItems(menuItems);
    } else {
      const filtered = menuItems.filter(
        (item) =>
          item.name.toLowerCase().includes(lowercasedQuery) ||
          item.category.toLowerCase().includes(lowercasedQuery)
      );
      setFilteredMenuItems(filtered);
    }
  }, [searchQuery, menuItems]);

  const handleAddItem = async () => {
    if (userRole !== 'manager') {
      setError('Only managers can add menu items.');
      return;
    }
    if (!tenantId || !token) {
      setError('No tenant ID or token found. Please log in again.');
      navigate('/');
      return;
    }

    const itemData = {
      name: newItem.name.trim(),
      category: newItem.category.trim(),
      price: parseFloat(newItem.price),
      stock_quantity: parseInt(newItem.stock_quantity) || 0,
      low_stock_threshold: parseInt(newItem.low_stock_threshold) || 5,
    };

    if (!newItem.name || !newItem.category) {
      setError('Item name and category are required.');
      return;
    }
    if (isNaN(parseFloat(newItem.price)) || parseFloat(newItem.price) < 0) {
      setError('Price must be a non-negative number.');
      return;
    }
    if (parseInt(newItem.stock_quantity) < 0 || parseInt(newItem.low_stock_threshold) < 0) {
      setError('Stock quantity and low stock threshold must be non-negative.');
      return;
    }

    setLoading(true);
    try {
      console.log('Adding menu item with data:', itemData);
      const response = await axios.post(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/menu-items`, itemData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      console.log('Add menu item response:', response.data);
      if (response.data.success) {
        const updatedItems = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/menu-items`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMenuItems(updatedItems.data || []);
        setFilteredMenuItems(updatedItems.data || []);
        setNewItem({ name: '', category: '', price: '', stock_quantity: '', low_stock_threshold: '5' });
        setError('');
        setNotification({ open: true, message: `Menu item "${newItem.name}" added successfully` });
      }
    } catch (error) {
      console.error('Error adding menu item:', {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message,
      });
      setError(`Failed to add menu item: ${error.response?.data?.error || error.message} ${error.response?.data?.details || ''}`);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item) => {
    if (userRole !== 'manager') {
      setError('Only managers can edit menu items.');
      return;
    }
    setEditItem(item);
    setNewItem({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      stock_quantity: item.stock_quantity.toString(),
      low_stock_threshold: item.low_stock_threshold.toString(),
    });
    setError('');
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleUpdateItem = async () => {
    if (userRole !== 'manager') {
      setError('Only managers can edit menu items.');
      return;
    }
    if (!tenantId || !token || !editItem) {
      setError('No tenant ID, token, or item selected. Please try again.');
      navigate('/');
      return;
    }

    const itemData = {
      name: newItem.name.trim(),
      category: newItem.category.trim(),
      price: parseFloat(newItem.price),
      stock_quantity: parseInt(newItem.stock_quantity) || 0,
      low_stock_threshold: parseInt(newItem.low_stock_threshold) || 5,
    };

    if (!newItem.name || !newItem.category) {
      setError('Item name and category are required.');
      return;
    }
    if (isNaN(parseFloat(newItem.price)) || parseFloat(newItem.price) < 0) {
      setError('Price must be a non-negative number.');
      return;
    }
    if (parseInt(newItem.stock_quantity) < 0 || parseInt(newItem.low_stock_threshold) < 0) {
      setError('Stock quantity and low stock threshold must be non-negative.');
      return;
    }

    setLoading(true);
    try {
      console.log('Updating menu item with data:', itemData);
      const response = await axios.put(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/menu-items/${editItem.item_id}`, itemData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      console.log('Update menu item response:', response.data);
      if (response.data.success) {
        const updatedItems = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/menu-items`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMenuItems(updatedItems.data || []);
        setFilteredMenuItems(updatedItems.data || []);
        setNewItem({ name: '', category: '', price: '', stock_quantity: '', low_stock_threshold: '5' });
        setEditItem(null);
        setError('');
        setNotification({ open: true, message: `Menu item "${newItem.name}" updated successfully` });
      }
    } catch (error) {
      console.error('Error updating menu item:', {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message,
      });
      setError(`Failed to update menu item: ${error.response?.data?.error || error.message} ${error.response?.data?.details || ''}`);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (userRole !== 'manager') {
      setError('Only managers can delete menu items.');
      return;
    }
    if (!tenantId || !token) {
      setError('No tenant ID or token found. Please log in again.');
      navigate('/');
      return;
    }

    setLoading(true);
    try {
      console.log('Deleting menu item ID:', itemId);
      const response = await axios.delete(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/menu-items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Delete menu item response:', response.data);
      if (response.data.success) {
        const updatedItems = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/menu-items`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMenuItems(updatedItems.data || []);
        setFilteredMenuItems(updatedItems.data || []);
        setError('');
        setNotification({ open: true, message: `Menu item ID ${itemId} deleted successfully` });
      }
    } catch (error) {
      console.error('Error deleting menu item:', {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message,
      });
      setError(`Failed to delete menu item: ${error.response?.data?.error || error.message} ${error.response?.data?.details || ''}`);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (itemId) => {
    if (userRole !== 'manager') {
      setError('Only managers can restock items.');
      return;
    }
    if (!tenantId || !token) {
      setError('No tenant ID or token found. Please log in again.');
      navigate('/');
      return;
    }
    if (!restockQuantity || parseInt(restockQuantity) <= 0) {
      setError('Restock quantity must be a positive number.');
      return;
    }

    setLoading(true);
    try {
      console.log('Restocking menu item ID:', itemId, 'with quantity:', restockQuantity);
      const response = await axios.patch(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/menu-items/${itemId}/restock`, 
        { quantity: parseInt(restockQuantity) }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Restock response:', response.data);
      if (response.data.success) {
        const updatedItems = await axios.get(`https://restaurant-backend-mmxx.onrender.com/api/tenants/${tenantId}/menu-items`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMenuItems(updatedItems.data || []);
        setFilteredMenuItems(updatedItems.data || []);
        setRestockItemId(null);
        setRestockQuantity('');
        setError('');
        setNotification({ open: true, message: `Menu item ID ${itemId} restocked successfully` });
      }
    } catch (error) {
      console.error('Error restocking menu item:', {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message,
      });
      setError(`Failed to restock: ${error.response?.data?.error || error.message} ${error.response?.data?.details || ''}`);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
    setError('');
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="xl">
          <GradientCard sx={{ mb: 4, p: 3 }} initial="hidden" animate="visible" variants={fadeIn}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: 2 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <RestaurantMenuIcon sx={{ fontSize: 40, color: muiTheme.palette.primary.main }} />
                <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: -0.3 }}>
                  {tenant.name || `Tenant ${tenantId}`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Tooltip title="Back to Dashboard" enterDelay={500}>
                  <ModernButton
                    variant="outlined"
                    component={Link}
                    to="/dashboard"
                    startIcon={<DashboardIcon />}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    sx={{ minWidth: 140 }}
                  >
                    Dashboard
                  </ModernButton>
                </Tooltip>
                {userRole === 'manager' && (
                  <>
                    <Tooltip title="Go to Settings" enterDelay={500}>
                      <ModernButton
                        variant="outlined"
                        component={Link}
                        to="/settings"
                        startIcon={<SettingsIcon />}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        sx={{ minWidth: 140 }}
                      >
                        Settings
                      </ModernButton>
                    </Tooltip>
                    <Tooltip title="Go to Order History" enterDelay={500}>
                      <ModernButton
                        variant="outlined"
                        component={Link}
                        to="/order-history"
                        startIcon={<HistoryIcon />}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        sx={{ minWidth: 140 }}
                      >
                        Order History
                      </ModernButton>
                    </Tooltip>
                    <Tooltip title="Go to Kitchen Display" enterDelay={500}>
                      <ModernButton
                        variant="outlined"
                        component={Link}
                        to="/kitchen"
                        startIcon={<RestaurantMenuIcon />}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        sx={{ minWidth: 140 }}
                      >
                        Kitchen
                      </ModernButton>
                    </Tooltip>
                  </>
                )}
              </Box>
            </Box>
          </GradientCard>

          {error && (
            <Fade in={error}>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 4, 
                  borderRadius: 16, 
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  alignItems: 'center',
                  background: `linear-gradient(45deg, ${alpha(muiTheme.palette.error.main, 0.1)}, ${alpha(muiTheme.palette.error.main, 0.05)})`,
                }} 
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            </Fade>
          )}

          {userRole === 'manager' ? (
            <>
              <StyledPaper ref={formRef} initial="hidden" animate="visible" variants={fadeIn}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, letterSpacing: -0.3 }}>
                  {editItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                </Typography>
                <Box 
                  component="form" 
                  sx={{ 
                    mb: 4, 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
                    gap: 2 
                  }}
                >
                  <TextField
                    label="Item Name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    fullWidth
                    margin="normal"
                    required
                    variant="outlined"
                    error={newItem.name && newItem.name.trim().length < 2}
                    helperText={newItem.name && newItem.name.trim().length < 2 ? 'Name must be at least 2 characters.' : ''}
                    InputProps={{
                      sx: { 
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': { boxShadow: `0 0 0 2px ${alpha(muiTheme.palette.primary.main, 0.1)}` },
                      }
                    }}
                  />
                  <FormControl fullWidth margin="normal">
                    <InputLabel sx={{ fontWeight: 500 }}>Category</InputLabel>
                    <Select
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      label="Category"
                      required
                      sx={{ 
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': { boxShadow: `0 0 0 2px ${alpha(muiTheme.palette.primary.main, 0.1)}` },
                      }}
                    >
                      <MenuItem value="Food">Food</MenuItem>
                      <MenuItem value="Beverage">Beverage</MenuItem>
                      <MenuItem value="Dessert">Dessert</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Price"
                    type="number"
                    step="0.01"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    fullWidth
                    margin="normal"
                    required
                    variant="outlined"
                    inputProps={{ min: 0 }}
                    error={newItem.price && (isNaN(parseFloat(newItem.price)) || parseFloat(newItem.price) < 0)}
                    helperText={newItem.price && (isNaN(parseFloat(newItem.price)) || parseFloat(newItem.price) < 0) ? 'Price must be a non-negative number.' : ''}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>$</Typography>,
                      sx: { 
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': { boxShadow: `0 0 0 2px ${alpha(muiTheme.palette.primary.main, 0.1)}` },
                      }
                    }}
                  />
                  <TextField
                    label="Stock Quantity"
                    type="number"
                    value={newItem.stock_quantity}
                    onChange={(e) => setNewItem({ ...newItem, stock_quantity: e.target.value })}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    inputProps={{ min: 0 }}
                    error={newItem.stock_quantity && (isNaN(parseInt(newItem.stock_quantity)) || parseInt(newItem.stock_quantity) < 0)}
                    helperText={newItem.stock_quantity && (isNaN(parseInt(newItem.stock_quantity)) || parseInt(newItem.stock_quantity) < 0) ? 'Stock quantity must be non-negative.' : ''}
                    InputProps={{
                      sx: { 
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': { boxShadow: `0 0 0 2px ${alpha(muiTheme.palette.primary.main, 0.1)}` },
                      }
                    }}
                  />
                  <TextField
                    label="Low Stock Threshold"
                    type="number"
                    value={newItem.low_stock_threshold}
                    onChange={(e) => setNewItem({ ...newItem, low_stock_threshold: e.target.value })}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    inputProps={{ min: 0 }}
                    error={newItem.low_stock_threshold && (isNaN(parseInt(newItem.low_stock_threshold)) || parseInt(newItem.low_stock_threshold) < 0)}
                    helperText={newItem.low_stock_threshold && (isNaN(parseInt(newItem.low_stock_threshold)) || parseInt(newItem.low_stock_threshold) < 0) ? 'Threshold must be non-negative.' : ''}
                    InputProps={{
                      sx: { 
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': { boxShadow: `0 0 0 2px ${alpha(muiTheme.palette.primary.main, 0.1)}` },
                      }
                    }}
                  />
                  <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    {editItem ? (
                      <>
                        <Tooltip title="Update the menu item" enterDelay={500}>
                          <ModernButton
                            variant="contained"
                            onClick={handleUpdateItem}
                            disabled={loading || !newItem.name || !newItem.category || !newItem.price || newItem.stock_quantity < 0 || newItem.low_stock_threshold < 0}
                            startIcon={<EditIcon />}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {loading ? <CircularProgress size={24} /> : 'Update Menu Item'}
                          </ModernButton>
                        </Tooltip>
                        <Tooltip title="Cancel editing" enterDelay={500}>
                          <ModernButton
                            variant="outlined"
                            color="secondary"
                            onClick={() => {
                              setNewItem({ name: '', category: '', price: '', stock_quantity: '', low_stock_threshold: '5' });
                              setEditItem(null);
                              setError('');
                            }}
                            disabled={loading}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Cancel
                          </ModernButton>
                        </Tooltip>
                      </>
                    ) : (
                      <Tooltip title="Add a new menu item" enterDelay={500}>
                        <ModernButton
                          variant="contained"
                          onClick={handleAddItem}
                          disabled={loading || !newItem.name || !newItem.category || !newItem.price || newItem.stock_quantity < 0 || newItem.low_stock_threshold < 0}
                          startIcon={<AddCircleIcon />}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {loading ? <CircularProgress size={24} /> : 'Add Menu Item'}
                        </ModernButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </StyledPaper>

              <StyledPaper initial="hidden" animate="visible" variants={fadeIn} sx={{ mt: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: -0.3 }}>
                    Menu Items
                  </Typography>
                  <Box sx={{ width: { xs: '100%', sm: 320 } }}>
                    <TextField
                      label="Search Items"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      fullWidth
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <SearchIcon sx={{ color: 'text.secondary', mr: 1.5, fontSize: 24 }} />
                        ),
                        sx: { 
                          borderRadius: 12,
                          backgroundColor: alpha('#f8fafc', 0.5),
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': { backgroundColor: '#f8fafc' },
                        }
                      }}
                      placeholder="Search by name or category"
                    />
                  </Box>
                </Box>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
                    <CircularProgress size={36} />
                    <Typography sx={{ ml: 2, color: 'text.secondary', fontWeight: 500 }}>
                      Loading menu items...
                    </Typography>
                  </Box>
                ) : filteredMenuItems.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 10 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                      {searchQuery ? 'No matching items found' : 'No menu items available'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchQuery ? 'Try adjusting your search query.' : 'Add a new item using the form above.'}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 16, bgcolor: 'background.default', maxHeight: 600 }}>
                    <Table stickyHeader size="medium">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 3 }}>Item ID</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 3 }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 3 }}>Category</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 3 }}>Price</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 3 }}>Stock</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 3 }}>Low Stock Threshold</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 3 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <AnimatePresence>
                          {filteredMenuItems.map((item) => (
                            <StyledTableRow 
                              key={item.item_id}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.4, ease: 'easeInOut' }}
                            >
                              <TableCell sx={{ py: 2.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                  #{item.item_id}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.name}</Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2.5 }}>
                                <Chip 
                                  label={item.category} 
                                  size="small" 
                                  sx={{ 
                                    background: alpha(muiTheme.palette.secondary.main, 0.1), 
                                    color: muiTheme.palette.secondary.main,
                                    fontWeight: 500,
                                  }} 
                                />
                              </TableCell>
                              <TableCell sx={{ py: 2.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                  {typeof item.price === 'number' && !isNaN(item.price)
                                    ? `$${item.price.toFixed(2)}`
                                    : 'N/A'}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2.5 }}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 500,
                                    color: item.stock_quantity <= item.low_stock_threshold ? 'error.main' : 'text.primary',
                                  }}
                                >
                                  {item.stock_quantity}
                                  {item.stock_quantity <= item.low_stock_threshold && (
                                    <Tooltip title="Low stock alert">
                                      <Typography 
                                        component="span" 
                                        sx={{ ml: 1, color: 'error.main', fontSize: '0.75rem' }}
                                      >
                                        ⚠
                                      </Typography>
                                    </Tooltip>
                                  )}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.low_stock_threshold}</Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2.5 }}>
                                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                  <Tooltip title="Edit this menu item" enterDelay={500}>
                                    <ModernButton
                                      variant="outlined"
                                      onClick={() => handleEditItem(item)}
                                      disabled={userRole !== 'manager' || loading}
                                      startIcon={<EditIcon />}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      sx={{ minWidth: 100 }}
                                    >
                                      Edit
                                    </ModernButton>
                                  </Tooltip>
                                  <Tooltip title="Delete this menu item" enterDelay={500}>
                                    <ModernButton
                                      variant="outlined"
                                      color="error"
                                      onClick={() => handleDeleteItem(item.item_id)}
                                      disabled={userRole !== 'manager' || loading}
                                      startIcon={<DeleteIcon />}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      sx={{ minWidth: 100 }}
                                    >
                                      Delete
                                    </ModernButton>
                                  </Tooltip>
                                  <Tooltip title="Restock this menu item" enterDelay={500}>
                                    <ModernButton
                                      variant="outlined"
                                      onClick={() => setRestockItemId(item.item_id)}
                                      disabled={userRole !== 'manager' || loading}
                                      startIcon={<AddCircleIcon />}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      sx={{ minWidth: 100 }}
                                    >
                                      Restock
                                    </ModernButton>
                                  </Tooltip>
                                </Box>
                                {restockItemId === item.item_id && userRole === 'manager' && (
                                  <Box sx={{ mt: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                    <TextField
                                      label="Restock Quantity"
                                      type="number"
                                      value={restockQuantity}
                                      onChange={(e) => setRestockQuantity(e.target.value)}
                                      size="small"
                                      sx={{ width: 140 }}
                                      inputProps={{ min: 1 }}
                                      error={restockQuantity && (isNaN(parseInt(restockQuantity)) || parseInt(restockQuantity) <= 0)}
                                      helperText={restockQuantity && (isNaN(parseInt(restockQuantity)) || parseInt(restockQuantity) <= 0) ? 'Must be positive' : ''}
                                      InputProps={{
                                        sx: { 
                                          borderRadius: 10,
                                          backgroundColor: alpha('#f8fafc', 0.5),
                                          transition: 'all 0.2s ease-in-out',
                                          '&:hover': { backgroundColor: '#f8fafc' },
                                        }
                                      }}
                                    />
                                    <Tooltip title="Confirm restock quantity" enterDelay={500}>
                                      <ModernButton
                                        variant="contained"
                                        onClick={() => handleRestock(item.item_id)}
                                        disabled={loading || !restockQuantity || parseInt(restockQuantity) <= 0}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        sx={{ minWidth: 100 }}
                                      >
                                        Confirm
                                      </ModernButton>
                                    </Tooltip>
                                    <Tooltip title="Cancel restocking" enterDelay={500}>
                                      <ModernButton
                                        variant="outlined"
                                        color="secondary"
                                        onClick={() => {
                                          setRestockItemId(null);
                                          setRestockQuantity('');
                                          setError('');
                                        }}
                                        disabled={loading}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        sx={{ minWidth: 100 }}
                                      >
                                        Cancel
                                      </ModernButton>
                                    </Tooltip>
                                  </Box>
                                )}
                              </TableCell>
                            </StyledTableRow>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </StyledPaper>
            </>
          ) : (
            <Fade in={true}>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 4, 
                  borderRadius: 16, 
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  alignItems: 'center',
                  background: `linear-gradient(45deg, ${alpha(muiTheme.palette.error.main, 0.1)}, ${alpha(muiTheme.palette.error.main, 0.05)})`,
                }}
              >
                Only managers can access menu management.
              </Alert>
            </Fade>
          )}

          <Snackbar 
            open={notification.open || !!error} 
            autoHideDuration={6000} 
            onClose={handleCloseNotification}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            TransitionComponent={Fade}
          >
            <Alert
              onClose={handleCloseNotification}
              severity={error ? 'error' : 'success'}
              elevation={6}
              variant="filled"
              sx={{ 
                borderRadius: 16, 
                alignItems: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                minWidth: 300,
              }}
            >
              {notification.message || error}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default Menu;