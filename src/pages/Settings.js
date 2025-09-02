import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Button, Box, TextField, FormControl, InputLabel, Select, MenuItem,
  Snackbar, Alert, CircularProgress, Paper, AppBar, Toolbar, Avatar, useTheme, styled,
  Fade, Tooltip, alpha, Card, Chip
} from '@mui/material';
import { MuiColorInput } from 'mui-color-input';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  RestaurantMenu as RestaurantMenuIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Custom styled components
const GradientCard = styled(motion(Card))(({ theme }) => ({
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 48px rgba(0,0,0,0.12)',
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
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  padding: theme.spacing(3),
  background: '#fff',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  overflow: 'hidden',
  width: '100%',
  boxSizing: 'border-box',
}));

const ModernButton = styled(motion(Button))(({ theme }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  padding: theme.spacing(1, 3),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
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

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 48,
  height: 48,
  border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
  },
}));

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

function Settings() {
  const [tenant, setTenant] = useState({ name: '', logo_url: '', primary_color: '#1976d2' });
  const [primaryColor, setPrimaryColor] = useState('#1976d2');
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const tenantId = localStorage.getItem('tenantId');
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const navigate = useNavigate();

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
      h4: { fontWeight: 700, color: '#1e293b', letterSpacing: -0.4 },
      h5: { fontWeight: 600, color: '#1e293b', letterSpacing: -0.2 },
      h6: { fontWeight: 500, color: '#1e293b' },
      subtitle1: { color: '#475569', fontWeight: 500 },
      body2: { color: '#475569', fontSize: '0.875rem' },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
            padding: '8px 24px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
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
    const fetchTenant = async () => {
      if (!tenantId || !token) {
        setError('No tenant ID or token found. Please log in again.');
        navigate('/');
        return;
      }
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:5000/api/tenants/${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTenant({
          name: response.data.name || '',
          logo_url: response.data.logo_url || '',
          primary_color: response.data.primary_color || '#1976d2',
        });
        setPrimaryColor(response.data.primary_color || '#1976d2');
        setError('');
      } catch (error) {
        console.error('Error fetching tenant:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        setError(error.response?.data?.error || 'Failed to load tenant settings');
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, [tenantId, token, navigate]);

  const handleUpdateSettings = async () => {
    if (userRole !== 'manager') {
      setError('Only managers can update settings.');
      return;
    }
    if (!tenantId || !token) {
      setError('No tenant ID or token found. Please log in again.');
      navigate('/');
      return;
    }

    const formData = new FormData();
    formData.append('name', tenant.name);
    formData.append('primary_color', primaryColor);
    formData.append('logo_url', tenant.logo_url || '');
    if (logoFile) {
      formData.append('logo', logoFile);
    }

    setLoading(true);
    try {
      const response = await axios.put(`http://localhost:5000/api/tenants/${tenantId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.data.success) {
        setSuccess('Settings updated successfully!');
        setError('');
        const tenantResponse = await axios.get(`http://localhost:5000/api/tenants/${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTenant({
          name: tenantResponse.data.name || '',
          logo_url: tenantResponse.data.logo_url || '',
          primary_color: tenantResponse.data.primary_color || '#1976d2',
        });
        setPrimaryColor(tenantResponse.data.primary_color || '#1976d2');
        setLogoFile(null);
        document.querySelector('input[type="file"]').value = '';
      }
    } catch (error) {
      console.error('Error updating settings:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setError(error.response?.data?.error || 'Failed to update settings');
      setSuccess('');
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
    }
  };

  const handleCloseNotification = () => {
    setSuccess('');
    setError('');
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: 'background.default', 
        py: 2, 
        px: { xs: 1, sm: 2 }, 
        overflowX: 'hidden',
        width: '100vw',
        boxSizing: 'border-box',
      }}>
        <AppBar 
          position="static" 
          elevation={0} 
          sx={{ 
            bgcolor: 'transparent', 
            mb: 2,
            background: `linear-gradient(180deg, ${alpha(muiTheme.palette.primary.main, 0.08)} 0%, transparent 100%)`,
          }}
        >
          <Toolbar sx={{ px: { xs: 1, sm: 2, md: 3 }, justifyContent: 'space-between', minHeight: 56 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                background: `linear-gradient(45deg, ${muiTheme.palette.primary.main}, ${muiTheme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: { xs: '1.5rem', sm: '2rem' },
              }}
            >
              Settings
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                icon={<RestaurantMenuIcon />}
                label={userRole.charAt(0).toUpperCase() + userRole.slice(1)} 
                sx={{ 
                  background: `linear-gradient(45deg, ${alpha(muiTheme.palette.primary.main, 0.15)}, ${alpha(muiTheme.palette.secondary.main, 0.15)})`,
                  color: muiTheme.palette.text.primary,
                  fontWeight: 600,
                  borderRadius: 16,
                  px: 1,
                  py: 0.5,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
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
                  sx={{ 
                    borderColor: alpha(muiTheme.palette.text.primary, 0.2), 
                    minWidth: { xs: 80, sm: 100 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}
                >
                  Logout
                </ModernButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="md" sx={{ px: { xs: 1, sm: 2 } }}>
          <GradientCard sx={{ mb: 2, p: 2 }} initial="hidden" animate="visible" variants={fadeIn}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexDirection: { xs: 'column', sm: 'row' }, 
              gap: 1.5,
              py: 1,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {tenant.logo_url && (
                  <StyledAvatar src={`http://localhost:5000${tenant.logo_url}`} alt={tenant.name} />
                )}
                <Typography variant="h5" sx={{ 
                  fontWeight: 600, 
                  letterSpacing: -0.2,
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                }}>
                  {tenant.name || `Tenant ${tenantId}`}
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                gap: 1, 
                flexWrap: 'wrap', 
                justifyContent: { xs: 'center', sm: 'flex-end' },
                maxWidth: '100%',
              }}>
                <Tooltip title="Back to Dashboard" enterDelay={500}>
                  <ModernButton
                    variant="outlined"
                    component={Link}
                    to="/dashboard"
                    startIcon={<DashboardIcon />}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    sx={{ 
                      minWidth: { xs: 100, sm: 120 },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    }}
                  >
                    Dashboard
                  </ModernButton>
                </Tooltip>
                {userRole === 'manager' && (
                  <>
                    <Tooltip title="Go to Menu" enterDelay={500}>
                      <ModernButton
                        variant="outlined"
                        component={Link}
                        to="/menu"
                        startIcon={<RestaurantMenuIcon />}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        sx={{ 
                          minWidth: { xs: 100, sm: 120 },
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        }}
                      >
                        Menu
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
                        sx={{ 
                          minWidth: { xs: 100, sm: 120 },
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        }}
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
                        sx={{ 
                          minWidth: { xs: 100, sm: 120 },
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        }}
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
                  mb: 2, 
                  borderRadius: 12, 
                  boxShadow: '0 2px  Hunan: 12px rgba(0,0,0,0.1)',
                  alignItems: 'center',
                  background: `linear-gradient(45deg, ${alpha(muiTheme.palette.error.main, 0.08)}, ${alpha(muiTheme.palette.error.main, 0.04)})`,
                  width: '100%',
                  boxSizing: 'border-box',
                }} 
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            </Fade>
          )}

          {userRole === 'manager' ? (
            <StyledPaper initial="hidden" animate="visible" variants={fadeIn}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, letterSpacing: -0.2, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                Update Theme Settings
              </Typography>
              <Box 
                component="form" 
                sx={{ 
                  mb: 2, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2,
                  width: '100%',
                }}
              >
                <Box sx={{ width: '100%', maxWidth: 500 }}>
                  <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    Restaurant Name
                  </Typography>
                  <TextField
                    value={tenant.name}
                    onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                    fullWidth
                    margin="none"
                    required
                    variant="outlined"
                    error={tenant.name && tenant.name.trim().length < 2}
                    helperText={tenant.name && tenant.name.trim().length < 2 ? 'Name must be at least 2 characters.' : ''}
                    InputProps={{
                      sx: { 
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': { boxShadow: `0 0 0 2px ${alpha(muiTheme.palette.primary.main, 0.1)}` },
                        borderRadius: 10,
                      }
                    }}
                    sx={{ maxWidth: '100%' }}
                  />
                </Box>
                <Box sx={{ width: '100%', maxWidth: 500 }}>
                  <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    Primary Color
                  </Typography>
                  <MuiColorInput
                    format="hex"
                    value={primaryColor}
                    onChange={(newColor) => setPrimaryColor(newColor)}
                    fullWidth
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 10,
                        backgroundColor: alpha('#f8fafc', 0.5),
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          backgroundColor: '#f8fafc',
                          boxShadow: `0 0 0 2px ${alpha(muiTheme.palette.primary.main, 0.1)}`,
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: '#475569',
                        fontWeight: 500,
                      },
                      maxWidth: '100%',
                    }}
                  />
                </Box>
                <Box sx={{ width: '100%', maxWidth: 500 }}>
                  <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    Logo Upload (Optional)
                  </Typography>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    style={{ 
                      marginBottom: '8px', 
                      padding: '8px', 
                      borderRadius: '10px', 
                      border: `1px solid ${alpha(muiTheme.palette.divider, 0.2)}`,
                      backgroundColor: alpha('#f8fafc', 0.5),
                      width: '100%',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease-in-out',
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Optional: Upload a new logo to replace the current one.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: '100%' }}>
                  <Tooltip title="Update settings" enterDelay={500}>
                    <ModernButton
                      variant="contained"
                      onClick={handleUpdateSettings}
                      disabled={loading || !tenant.name || !primaryColor}
                      startIcon={<SettingsIcon />}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      sx={{ 
                        minWidth: { xs: 140, sm: 160 },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      }}
                    >
                      {loading ? <CircularProgress size={20} /> : 'Update Settings'}
                    </ModernButton>
                  </Tooltip>
                </Box>
              </Box>
            </StyledPaper>
          ) : (
            <Fade in={true}>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2, 
                  borderRadius: 12, 
                  boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                  alignItems: 'center',
                  background: `linear-gradient(45deg, ${alpha(muiTheme.palette.error.main, 0.08)}, ${alpha(muiTheme.palette.error.main, 0.04)})`,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                Only managers can update theme settings.
              </Alert>
            </Fade>
          )}

          <Snackbar 
            open={success || error} 
            autoHideDuration={6000} 
            onClose={handleCloseNotification}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            TransitionComponent={Fade}
            sx={{ maxWidth: '90vw' }}
          >
            <Alert
              onClose={handleCloseNotification}
              severity={error ? 'error' : 'success'}
              elevation={6}
              variant="filled"
              sx={{ 
                borderRadius: 12, 
                alignItems: 'center',
                boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                minWidth: { xs: 240, sm: 280 },
                maxWidth: '100%',
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

export default Settings;