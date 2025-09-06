import React from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Menu, Divider,
  Avatar, useTheme, alpha
} from '@mui/material';
import { Menu as MenuIcon, Group as GroupIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function Header({ tenant, userRole, toggleDrawer, profileAnchor, setProfileAnchor, muiTheme }) {
  const navigate = useNavigate();

  const handleProfileOpen = (event) => {
    setProfileAnchor(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchor(null);
  };

  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: 'transparent', mb: 4 }}>
      <Toolbar>
        <IconButton edge="start" color="black" onClick={toggleDrawer(true)} sx={{ mr: 2 }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{ 
              backgroundColor: alpha(muiTheme.palette.primary.main, 0.1),
              color: muiTheme.palette.primary.main,
              fontWeight: 600,
              borderRadius: 20,
              padding: '4px 12px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }} 
            onClick={handleProfileOpen}
          >
            <GroupIcon sx={{ mr: 0.5, fontSize: 18 }} />
            {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          </Box>
        </Box>
        
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={handleProfileClose}
          PaperProps={{
            sx: {
              mt: 1.5,
              borderRadius: 12,
              boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
              minWidth: 200,
            }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>Signed in as</Typography>
            <Typography variant="body1" fontWeight={600}>Staff User</Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ p: 1, '&:hover': { bgcolor: 'action.hover', borderRadius: 8 } }} onClick={handleProfileClose}>
              Profile
            </Box>
            <Box sx={{ p: 1, '&:hover': { bgcolor: 'action.hover', borderRadius: 8 } }} onClick={handleProfileClose}>
              Settings
            </Box>
            <Box sx={{ p: 1, '&:hover': { bgcolor: 'action.hover', borderRadius: 8 } }} onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('tenantId');
              localStorage.removeItem('role');
              localStorage.removeItem('userId');
              navigate('/');
            }}>
              Logout
            </Box>
          </Box>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default Header;