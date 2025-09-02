// File: src/pages/dashboard/StyledComponents.js
import { styled } from '@mui/material/styles';
import { alpha } from '@mui/material';
import { motion } from 'framer-motion';
import Card from '@mui/material/Card';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';

export const GradientCard = styled(motion(Card))(({ theme }) => ({
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

export const StyledTableRow = styled(motion(TableRow))(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.06),
    transition: 'background-color 0.2s ease-in-out',
  },
}));

export const StyledPaper = styled(motion(Paper))(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 3,
  boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
  padding: theme.spacing(3),
  background: '#fff',
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  overflow: 'hidden',
}));

export const ModernButton = styled(motion(Button))(({ theme }) => ({
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

export const SearchTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    paddingRight: 8,
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
    },
    '&.Mui-focused': {
      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
  },
  '& .MuiInputAdornment-root': {
    color: theme.palette.text.secondary,
  },
}));

export const StatusChip = styled(motion(Chip))(({ theme, status }) => {
  const statusColors = {
    pending: theme.palette.warning.main,
    preparing: theme.palette.info.main,
    completed: theme.palette.success.main,
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

export const AnimatedGridItem = styled(motion(Grid))(({ theme }) => ({
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-6px)',
  },
}));