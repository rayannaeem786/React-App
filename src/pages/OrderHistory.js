import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Box, Avatar, Chip, Snackbar, Alert, CircularProgress, Paper,
  useTheme, styled, Fade, Tooltip, alpha, Card, TextField, Pagination
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  History as HistoryIcon,
  Dashboard as DashboardIcon,
  RestaurantMenu as RestaurantMenuIcon,
  Settings as SettingsIcon
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

function OrderHistory() {
  const [history, setHistory] = useState([]);
  const [tenant, setTenant] = useState({ name: '', logo_url: '', primary_color: '#1976d2' });
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '' });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10); // Number of items per page
  const [searchQuery, setSearchQuery] = useState(''); // Search query state
  const tenantId = localStorage.getItem('tenantId');
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role') || 'staff';
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

  useEffect(() => {
    const fetchTenant = async () => {
      if (!tenantId || !token) {
        setError('No tenant ID or token found. Please log in again.');
        navigate('/');
        return;
      }
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

    const fetchHistory = async () => {
      if (!tenantId || !token) {
        setError('No tenant ID or token found. Please log in again.');
        navigate('/');
        return;
      }
      setLoading(true);
      try {
        console.log('Fetching order history from:', `http://localhost:5000/api/tenants/${tenantId}/order-history`);
        const response = await axios.get(`http://localhost:5000/api/tenants/${tenantId}/order-history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Order history response:', response.data);
        setHistory(Array.isArray(response.data) ? response.data : []);
        setError('');
      } catch (error) {
        console.error('Error fetching order history:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        setError(error.response?.data?.error || 'Failed to load order history');
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };

    if (tenantId && token && userRole === 'manager') {
      fetchTenant();
      fetchHistory();
    } else {
      setError('Only managers can access order history.');
      navigate('/dashboard');
    }
  }, [tenantId, token, userRole, navigate]);

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
    setError('');
  };

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  // Handle search query change
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setPage(1); // Reset to first page when search changes
  };

  // Filter history based on search query
  const filteredHistory = history.filter((entry) => {
    try {
      let parsed;
      if (typeof entry.details === 'string') {
        parsed = JSON.parse(entry.details);
      } else if (typeof entry.details === 'object' && entry.details !== null) {
        parsed = entry.details;
      } else {
        return false;
      }

      const searchLower = searchQuery.toLowerCase();
      const customerName = parsed.customerName?.toLowerCase() || '';
      const customerPhone = parsed.customerPhone?.toLowerCase() || '';
      const orderId = entry.order_id?.toString().toLowerCase() || '';

      return (
        customerName.includes(searchLower) ||
        customerPhone.includes(searchLower) ||
        orderId.includes(searchLower)
      );
    } catch (error) {
      console.error('Error parsing details for search:', { error: error.message, details: entry.details });
      return false;
    }
  });

  // Calculate the start and end indices for the current page
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredHistory.length / rowsPerPage);

  // Function to format details JSON for display
  const formatDetails = (details) => {
    try {
      let parsed;
      let items;

      if (typeof details === 'string') {
        parsed = JSON.parse(details);
      } else if (typeof details === 'object' && details !== null) {
        parsed = details;
      } else {
        throw new Error('Invalid details format');
      }

      // Handle both array and object formats
      if (Array.isArray(parsed)) {
        items = parsed; // details is an array of items
      } else if (parsed.items && Array.isArray(parsed.items)) {
        items = parsed.items; // details is an object with items array
      } else {
        items = [];
      }

      // Log items for debugging
      console.log('Parsed items for details:', items);

      return (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Items:</Typography>
          {items.length > 0 ? (
            items.map((item, index) => {
              // Try different possible field names for item name
              const itemName = item.item || item.name || item.itemName || item.title || item.product_name || 'Unknown Item';
              return (
                <Box key={index} sx={{ mb: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">
                    {itemName} (x{item.quantity || 0})
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    ${typeof item.price === 'number' ? item.price.toFixed(2) : 'N/A'}
                  </Typography>
                </Box>
              );
            })
          ) : (
            <Typography variant="body2" color="text.secondary">No items specified</Typography>
          )}
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
            Total Price: {typeof parsed.total_price === 'number' ? `$${parsed.total_price.toFixed(2)}` : 'N/A'}
          </Typography>
          {parsed.status && (
            <StatusChip
              status={parsed.status}
              label={parsed.status.charAt(0).toUpperCase() + parsed.status.slice(1)}
              size="small"
              sx={{ mt: 1 }}
            />
          )}
          {parsed.customerName && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Customer: {parsed.customerName}
            </Typography>
          )}
          {parsed.customerPhone && (
            <Typography variant="body2">
              Phone: {parsed.customerPhone}
            </Typography>
          )}
          {parsed.is_delivery && (
            <Typography variant="body2">
              Delivery: {parsed.is_delivery === true || parsed.is_delivery === '1' || parsed.is_delivery === 1 ? 'Yes' : 'No'}
            </Typography>
          )}
          {parsed.customer_location && (
            <Typography variant="body2">
              Location: 
              <a
                href={parsed.customer_location}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: muiTheme.palette.primary.main,
                  textDecoration: 'underline',
                  marginLeft: 4,
                }}
                aria-label="Open customer location in Google Maps"
              >
                View Location
              </a>
            </Typography>
          )}
          {parsed.preparation_start_time && (
            <Typography variant="body2">
              Prep Start: {new Date(parsed.preparation_start_time).toLocaleString()}
            </Typography>
          )}
          {parsed.preparation_end_time && (
            <Typography variant="body2">
              Prep End: {new Date(parsed.preparation_end_time).toLocaleString()}
            </Typography>
          )}
          {parsed.delivery_start_time && (
            <Typography variant="body2">
              Delivery Start: {new Date(parsed.delivery_start_time).toLocaleString()}
            </Typography>
          )}
          {parsed.delivery_end_time && (
            <Typography variant="body2">
              Delivery End: {new Date(parsed.delivery_end_time).toLocaleString()}
            </Typography>
          )}
        </Box>
      );
    } catch (error) {
      console.error('Error parsing details:', { error: error.message, details });
      return <Typography color="error" variant="body2">Invalid details format</Typography>;
    }
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
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

          {userRole === 'manager' ? (
            <StyledPaper initial="hidden" animate="visible" variants={fadeIn}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">
                  Order History
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Tooltip title="Back to Dashboard">
                    <ModernButton
                      variant="outlined"
                      component={Link}
                      to="/dashboard"
                      startIcon={<DashboardIcon />}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Dashboard
                    </ModernButton>
                  </Tooltip>
                  <Tooltip title="Go to Menu Management">
                    <ModernButton
                      variant="outlined"
                      component={Link}
                      to="/menu"
                      startIcon={<RestaurantMenuIcon />}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Menu
                    </ModernButton>
                  </Tooltip>
                  <Tooltip title="Go to Settings">
                    <ModernButton
                      variant="outlined"
                      component={Link}
                      to="/settings"
                      startIcon={<SettingsIcon />}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Settings
                    </ModernButton>
                  </Tooltip>
                  <Tooltip title="Go to Kitchen Display">
                    <ModernButton
                      variant="outlined"
                      component={Link}
                      to="/kitchen"
                      startIcon={<RestaurantMenuIcon />}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Kitchen
                    </ModernButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <TextField
                  label="Search by Customer Name, Phone, or Order ID"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  fullWidth
                  variant="outlined"
                  sx={{ maxWidth: '500px', borderRadius: 12 }}
                />
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <CircularProgress />
                  <Typography sx={{ ml: 2, color: 'text.secondary' }}>Loading order history...</Typography>
                </Box>
              ) : filteredHistory.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No order history found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No order history matches your search criteria.
                  </Typography>
                </Box>
              ) : (
                <>
                  <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 12, bgcolor: 'background.default', maxHeight: 600 }}>
                    <Table stickyHeader size="medium">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>History ID</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Changed By</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <AnimatePresence>
                          {paginatedHistory.map((entry) => (
                            <StyledTableRow 
                              key={entry.history_id}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <TableCell>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  #{entry.history_id}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  #{entry.order_id}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{entry.action}</Typography>
                              </TableCell>
                              <TableCell>{formatDetails(entry.details)}</TableCell>
                              <TableCell>
                                <Typography variant="body2">{entry.changed_by || 'N/A'}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{new Date(entry.change_timestamp).toLocaleString()}</Typography>
                              </TableCell>
                            </StyledTableRow>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 4 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={handlePageChange}
                      color="primary"
                      sx={{ '& .MuiPaginationItem-root': { fontSize: '1rem', borderRadius: 8 } }}
                    />
                  </Box>
                </>
              )}
            </StyledPaper>
          ) : (
            <Fade in={true}>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 4, 
                  borderRadius: 12, 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  alignItems: 'center'
                }}
              >
                Only managers can access order history.
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
              sx={{ borderRadius: 12, alignItems: 'center' }}
            >
              {notification.message || error}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default OrderHistory;