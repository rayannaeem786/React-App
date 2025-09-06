import React, { useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  OutlinedInput,
  FormControl,
  InputLabel,
  Avatar,
  Fade,
  Grow,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import BusinessIcon from '@mui/icons-material/Business';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Create a luxurious theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#d4af37', // Gold for buttons and accents
    },
    secondary: {
      main: '#7b1fa2', // Soft purple for secondary elements
    },
    background: {
      default: '#121212', // Dark background for luxury
    },
    text: {
      primary: '#ffffff', // White text for contrast
      secondary: '#b0bec5', // Light gray for secondary text
    },
  },
  typography: {
    fontFamily: '"DM Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 600,
      color: '#ffffff',
      letterSpacing: '0.5px',
    },
    body2: {
      color: '#b0bec5',
      fontSize: '0.9rem',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.1)', // Glassmorphism effect
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(212, 175, 55, 0.3)', // Gold border
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          padding: '32px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          padding: '14px 28px',
          fontSize: '1.1rem',
          fontWeight: 600,
          background: 'linear-gradient(45deg, #d4af37, #ffca28)', // Gold gradient
          color: '#121212',
          transition: 'transform 0.3s, box-shadow 0.3s',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: '0 4px 20px rgba(212, 175, 55, 0.5)', // Glow effect
          },
          '&:disabled': {
            background: 'rgba(212, 175, 55, 0.3)',
            color: '#b0bec5',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(212, 175, 55, 0.5)', // Gold border
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d4af37',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d4af37',
            borderWidth: '2px',
          },
        },
        input: {
          color: '#ffffff',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#b0bec5',
          '&.Mui-focused': {
            color: '#d4af37',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(212, 175, 55, 0.3)',
          background: 'rgba(255, 75, 75, 0.1)', // Subtle red for errors
          color: '#ffffff',
          borderRadius: 8,
        },
      },
    },
  },
});

function Login() {
  const [tenantId, setTenantId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
const response = await axios.post('https://restaurant-backend-mmxx.onrender.com/api/login', {
          tenantId: tenantId.trim() || undefined, // Send undefined if empty
        username: username.trim(),
        password,
      });
      if (response.data.token && response.data.role && response.data.userId) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('tenantId', tenantId.trim() || '');
        localStorage.setItem('role', response.data.role);
        localStorage.setItem('userId', response.data.userId);
        console.log('Login successful:', { userId: response.data.userId, tenantId, role: response.data.role });
        if (response.data.role === 'superadmin') {
          navigate('/superadmin');
        } else if (response.data.role === 'rider') {
          navigate('/rider');
        } else if (response.data.role === 'kitchen') {
          navigate('/kitchen');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error || 'Failed to connect to the server. Please try again.';
      setError(errorMessage);
      localStorage.removeItem('token');
      localStorage.removeItem('tenantId');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && username && password && !loading) {
      handleLogin();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container
        maxWidth={false}
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a237e 0%, #311b92 100%)', // Luxurious gradient
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative background element */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%)',
            zIndex: 0,
          }}
        />
        <Fade in timeout={800}>
          <Paper elevation={0} sx={{ maxWidth: 400, width: '100%', zIndex: 1 }}>
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Avatar
                src="https://via.placeholder.com/80?text=Logo" // Replace with actual logo
                alt="Restaurant Logo"
                sx={{
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2,
                  border: '2px solid #d4af37',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                }}
              />
              <Typography variant="h3" gutterBottom>
                Restaurant Software
              </Typography>
              <Typography variant="body2" sx={{ mb: 4 }}>
                Sign in to access premium restaurant management
              </Typography>
              <Box component="form" onKeyPress={handleKeyPress} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Grow in timeout={1000}>
                  <FormControl variant="outlined" fullWidth>
                    <InputLabel htmlFor="tenant-id">Tenant ID (optional for superadmin)</InputLabel>
                    <OutlinedInput
                      id="tenant-id"
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value.trim())}
                      startAdornment={
                        <InputAdornment position="start">
                          <BusinessIcon sx={{ color: '#d4af37' }} />
                        </InputAdornment>
                      }
                      label="Tenant ID (optional for superadmin)"
                      aria-label="Tenant ID"
                      autoFocus
                    />
                  </FormControl>
                </Grow>
                <Grow in timeout={1200}>
                  <FormControl variant="outlined" fullWidth>
                    <InputLabel htmlFor="username">Username</InputLabel>
                    <OutlinedInput
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.trim())}
                      startAdornment={
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: '#d4af37' }} />
                        </InputAdornment>
                      }
                      label="Username"
                      aria-label="Username"
                      required
                    />
                  </FormControl>
                </Grow>
                <Grow in timeout={1400}>
                  <FormControl variant="outlined" fullWidth>
                    <InputLabel htmlFor="password">Password</InputLabel>
                    <OutlinedInput
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      startAdornment={
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: '#d4af37' }} />
                        </InputAdornment>
                      }
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            edge="end"
                            sx={{ color: '#d4af37' }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      }
                      label="Password"
                      aria-label="Password"
                      required
                    />
                  </FormControl>
                </Grow>
                {error && (
                  <Fade in timeout={400}>
                    <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 8 }}>
                      {error}
                    </Alert>
                  </Fade>
                )}
                <Button
                  variant="contained"
                  onClick={handleLogin}
                  disabled={!username || !password || loading}
                  aria-label="Sign in to restaurant software"
                >
                  {loading ? <CircularProgress size={24} sx={{ color: '#121212' }} /> : 'Sign In'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </ThemeProvider>
  );
}

export default Login;