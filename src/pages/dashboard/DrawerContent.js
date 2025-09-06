import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Avatar, Divider, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  RestaurantMenu as RestaurantMenuIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Kitchen as KitchenIcon,
  Logout as LogoutIcon,
  Insights as InsightsIcon
} from '@mui/icons-material';
import { ThemeProvider } from '@mui/material/styles';
import createMuiTheme from './theme';

const DrawerContent = ({ tenant, userRole, navigate, setDrawerOpen }) => {
  const muiTheme = createMuiTheme(tenant);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    navigate('/');
    setDrawerOpen(false);
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ width: 280, p: 3, bgcolor: '#fff', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Avatar
            src={tenant.logo_url ? `https://restaurant-backend-mmxx.onrender.com${tenant.logo_url}` : 'https://via.placeholder.com/40'}
            alt={tenant.name}
            sx={{ width: 48, height: 48, mr: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
          />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{tenant.name}</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <List>
          {[
            { to: '/dashboard', icon: <DashboardIcon />, text: 'Dashboard' },
            { to: '/menu', icon: <RestaurantMenuIcon />, text: 'Menu Management' },
            ...(userRole === 'manager' ? [
              { to: '/settings', icon: <SettingsIcon />, text: 'Settings' },
              { to: '/order-history', icon: <HistoryIcon />, text: 'Order History' },
              { to: '/kitchen', icon: <KitchenIcon />, text: 'Kitchen Display' },
              { to: '/reports', icon: <InsightsIcon />, text: 'Reports & Analytics' },
            ] : []),
            { action: handleLogout, icon: <LogoutIcon />, text: 'Logout' },
          ].map((item, index) => (
            <ListItem
              key={index}
              button
              component={item.to ? Link : 'button'}
              to={item.to}
              onClick={(e) => {
                if (item.action) item.action();
                setDrawerOpen(false);
              }}
              sx={{
                borderRadius: 8,
                mb: 1,
                '&:hover': { 
                  bgcolor: muiTheme.palette.primary.main + '10',
                  transform: 'translateX(4px)',
                  transition: 'all 0.2s ease-in-out'
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Box>
    </ThemeProvider>
  );
};

export default DrawerContent;