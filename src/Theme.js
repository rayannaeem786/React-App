import { createTheme } from '@mui/material/styles';

const createTenantTheme = (primaryColor) => createTheme({
  palette: {
    primary: {
      main: primaryColor || '#1976d2', // Fallback to default blue
    },
  },
});

export default createTenantTheme;