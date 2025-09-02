import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Box, Snackbar, Alert, CircularProgress, Paper, AppBar, Toolbar,
  styled, Fade, Tooltip, alpha, Chip
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  RestaurantMenu as RestaurantMenuIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Custom styled components
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

function SuperAdmin() {
  const [tenants, setTenants] = useState([]);
  const [newTenantName, setNewTenantName] = useState('');
  const [newManagerUsername, setNewManagerUsername] = useState('');
  const [newManagerPassword, setNewManagerPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const navigate = useNavigate();

  // Theme
  const muiTheme = createTheme({
    palette: {
      primary: { main: '#1976d2' }, // Default primary color
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
    },
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    if (!token) {
      setError('No token found. Please log in again.');
      navigate('/');
      return;
    }
    setLoading(true);
    try {
      console.log('Fetching tenants from:', 'http://localhost:5000/api/tenants');
      const response = await axios.get('http://localhost:5000/api/tenants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Tenants response:', response.data);
      setTenants(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (error) {
      console.error('Error fetching tenants:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setError(error.response?.data?.error || 'Failed to fetch tenants');
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    if (!newTenantName || !newManagerUsername || !newManagerPassword) {
      setError('Tenant name, manager username, and password are required.');
      return;
    }
    if (newTenantName.trim().length < 2) {
      setError('Tenant name must be at least 2 characters.');
      return;
    }
    if (newManagerUsername.trim().length < 3) {
      setError('Manager username must be at least 3 characters.');
      return;
    }
    if (newManagerPassword.length < 6) {
      setError('Manager password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating tenant with data:', {
        name: newTenantName,
        managerUsername: newManagerUsername,
        managerPassword: newManagerPassword,
      });
      const response = await axios.post('http://localhost:5000/api/tenants', {
        name: newTenantName.trim(),
        managerUsername: newManagerUsername.trim(),
        managerPassword: newManagerPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Create tenant response:', response.data);
      setNewTenantName('');
      setNewManagerUsername('');
      setNewManagerPassword('');
      setSuccess('Tenant created successfully!');
      setError('');
      fetchTenants();
    } catch (error) {
      console.error('Error creating tenant:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setError(error.response?.data?.error || 'Failed to create tenant');
      setSuccess('');
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBlockTenant = async (tenantId, blocked) => {
    setLoading(true);
    try {
      console.log(`Updating tenant ID ${tenantId} to blocked: ${blocked}`);
      const response = await axios.put(`http://localhost:5000/api/tenants/${tenantId}/block`, { blocked }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Block tenant response:', response.data);
      setSuccess(`Tenant ${blocked ? 'blocked' : 'unblocked'} successfully!`);
      setError('');
      fetchTenants();
    } catch (error) {
      console.error('Error updating tenant:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setError(error.response?.data?.error || 'Failed to update tenant');
      setSuccess('');
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setSuccess('');
    setError('');
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <AppBar 
          position="static" 
          elevation={0} 
          sx={{ 
            bgcolor: 'transparent', 
            mb: 4,
            background: `linear-gradient(180deg, ${alpha(muiTheme.palette.primary.main, 0.1)} 0%, transparent 100%)`,
          }}
        >
          <Toolbar sx={{ px: { xs: 2, md: 4 } }}>
            <Typography 
              variant="h4" 
              sx={{ 
                flexGrow: 1, 
                fontWeight: 800,
                background: `linear-gradient(45deg, ${muiTheme.palette.primary.main}, ${muiTheme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Super Admin Dashboard
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip 
                icon={<RestaurantMenuIcon />}
                label={userRole.charAt(0).toUpperCase() + userRole.slice(1)} 
                sx={{ 
                  background: `linear-gradient(45deg, ${alpha(muiTheme.palette.primary.main, 0.2)}, ${alpha(muiTheme.palette.secondary.main, 0.2)})`,
                  color: muiTheme.palette.text.primary,
                  fontWeight: 600,
                  borderRadius: 24,
                  px: 1,
                  py: 2,
                }} 
              />
              <Tooltip title="Logout" enterDelay={500}>
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
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  sx={{ borderColor: alpha(muiTheme.palette.text.primary, 0.2) }}
                >
                  Logout
                </ModernButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl">
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

          <StyledPaper initial="hidden" animate="visible" variants={fadeIn}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, letterSpacing: -0.3 }}>
              Create New Tenant
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
                label="Tenant Name"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                fullWidth
                margin="normal"
                required
                variant="outlined"
                error={newTenantName && newTenantName.trim().length < 2}
                helperText={newTenantName && newTenantName.trim().length < 2 ? 'Name must be at least 2 characters.' : ''}
                InputProps={{
                  sx: { 
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': { boxShadow: `0 0 0 2px ${alpha(muiTheme.palette.primary.main, 0.1)}` },
                  }
                }}
              />
              <TextField
                label="Manager Username"
                value={newManagerUsername}
                onChange={(e) => setNewManagerUsername(e.target.value)}
                fullWidth
                margin="normal"
                required
                variant="outlined"
                error={newManagerUsername && newManagerUsername.trim().length < 3}
                helperText={newManagerUsername && newManagerUsername.trim().length < 3 ? 'Username must be at least 3 characters.' : ''}
                InputProps={{
                  sx: { 
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': { boxShadow: `0 0 0 2px ${alpha(muiTheme.palette.primary.main, 0.1)}` },
                  }
                }}
              />
              <TextField
                label="Manager Password"
                type="password"
                value={newManagerPassword}
                onChange={(e) => setNewManagerPassword(e.target.value)}
                fullWidth
                margin="normal"
                required
                variant="outlined"
                error={newManagerPassword && newManagerPassword.length < 6}
                helperText={newManagerPassword && newManagerPassword.length < 6 ? 'Password must be at least 6 characters.' : ''}
                InputProps={{
                  sx: { 
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': { boxShadow: `0 0 0 2px ${alpha(muiTheme.palette.primary.main, 0.1)}` },
                  }
                }}
              />
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Tooltip title="Create new tenant" enterDelay={500}>
                  <ModernButton
                    variant="contained"
                    onClick={handleCreateTenant}
                    disabled={loading || !newTenantName || !newManagerUsername || !newManagerPassword}
                    startIcon={<RestaurantMenuIcon />}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Create Tenant'}
                  </ModernButton>
                </Tooltip>
              </Box>
            </Box>
          </StyledPaper>

          <StyledPaper initial="hidden" animate="visible" variants={fadeIn} sx={{ mt: 4 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, letterSpacing: -0.3 }}>
              Tenants List
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
                <CircularProgress size={36} />
                <Typography sx={{ ml: 2, color: 'text.secondary', fontWeight: 500 }}>
                  Loading tenants...
                </Typography>
              </Box>
            ) : tenants.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                  No tenants available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create a new tenant using the form above.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 16, bgcolor: 'background.default', maxHeight: 600 }}>
                <Table stickyHeader size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 3 }}>Tenant ID</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 3 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 3 }}>Blocked</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 3 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <AnimatePresence>
                      {tenants.map((tenant) => (
                        <StyledTableRow 
                          key={tenant.tenant_id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                        >
                          <TableCell sx={{ py: 2.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              #{tenant.tenant_id}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{tenant.name}</Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2.5 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 500,
                                color: tenant.blocked ? 'error.main' : 'text.primary',
                              }}
                            >
                              {tenant.blocked ? 'Yes' : 'No'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2.5 }}>
                            <Tooltip title={tenant.blocked ? 'Unblock this tenant' : 'Block this tenant'} enterDelay={500}>
                              <ModernButton
                                variant="outlined"
                                color={tenant.blocked ? 'success' : 'error'}
                                onClick={() => handleBlockTenant(tenant.tenant_id, !tenant.blocked)}
                                disabled={loading}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                sx={{ minWidth: 100 }}
                              >
                                {tenant.blocked ? 'Unblock' : 'Block'}
                              </ModernButton>
                            </Tooltip>
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
            open={success || error} 
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
              {success || error}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default SuperAdmin;