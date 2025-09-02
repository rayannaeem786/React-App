import React, { useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, FormControl, InputLabel,
  Select, MenuItem, TextField, FormControlLabel, Checkbox, Button, IconButton,
  Box, Typography, Divider, Tooltip, Paper, alpha
} from '@mui/material';
import {
  Person as PersonIcon, Phone as PhoneIcon, LocationOn as LocationOnIcon,
  TwoWheeler as TwoWheelerIcon, LocalShipping as LocalShippingIcon,
  Add as AddIcon, Remove as RemoveIcon, ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';
import { ThemeProvider } from '@mui/material/styles';
import { ModernButton, StatusChip, GradientCard } from './StyledComponents';
import { Transition } from './Transitions';
import { motion } from 'framer-motion';
import createMuiTheme from './theme';

const OrderDialog = ({
  open, onClose, editOrder, newOrder, setNewOrder, menuItems, userRole, riders,
  handleAddItem, handleRemoveItem, handleItemChange, handleAddOrder, handleUpdateOrder,
  tenant
}) => {
  const muiTheme = createMuiTheme(tenant);
  const statusOptions = ['pending', 'preparing', 'completed', 'enroute', 'delivered', 'canceled'];

  // Calculate total price dynamically
  const totalPrice = useMemo(() => {
    return newOrder.items.reduce((total, item) => {
      const menuItem = menuItems.find(menuItem => menuItem.item_id === parseInt(item.item_id));
      return total + (menuItem ? menuItem.price * item.quantity : 0);
    }, 0).toFixed(2);
  }, [newOrder.items, menuItems]);

  return (
    <ThemeProvider theme={muiTheme}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        TransitionComponent={Transition}
        PaperProps={{
          sx: {
            borderRadius: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            background: muiTheme.palette.background.paper,
            overflow: 'hidden',
            maxWidth: 800,
          }
        }}
      >
        <DialogTitle sx={{
          bgcolor: `linear-gradient(135deg, ${muiTheme.palette.primary.main}, ${muiTheme.palette.secondary.main})`,
          color: 'white',
          py: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <ShoppingCartIcon sx={{ fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {editOrder ? `Edit Order #${editOrder.order_id}` : 'Create New Order'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 4, bgcolor: muiTheme.palette.background.default }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Order Items Section */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 1 }}>
              Order Items
            </Typography>
            <GradientCard sx={{ p: 3, mb: 3 }}>
              {newOrder.items.map((item, index) => (
                <Grid container spacing={2} alignItems="center" key={index} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required sx={{ width: { xs: '100%', sm: 317 } }}>
                      <InputLabel>Item</InputLabel>
                      <Select
                        value={item.item_id}
                        onChange={(e) => handleItemChange(index, 'item_id', e.target.value)}
                        label="Item"
                        sx={{
                          borderRadius: 12,
                          '&:hover': { bgcolor: alpha(muiTheme.palette.primary.main, 0.05) }
                        }}
                      >
                        <MenuItem value="" disabled>Select item</MenuItem>
                        {menuItems.map((menuItem) => (
                          <MenuItem key={menuItem.item_id} value={menuItem.item_id.toString()}>
                            {menuItem.name} (Rs {menuItem.price?.toFixed(2) || '0.00'})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={8} sm={4}>
                    <TextField
                      label="Quantity"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      fullWidth
                      inputProps={{ min: 1 }}
                      required
                      sx={{
                        borderRadius: 12,
                        '& .MuiOutlinedInput-root': {
                          '&:hover': { bgcolor: alpha(muiTheme.palette.primary.main, 0.05) }
                        }
                      }}
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>#</Typography>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={4} sm={2}>
                    <Tooltip title={newOrder.items.length === 1 ? "At least one item required" : "Remove item"}>
                      <span>
                        <IconButton
                          onClick={() => handleRemoveItem(index)}
                          disabled={newOrder.items.length === 1}
                          sx={{
                            color: muiTheme.palette.error.main,
                            bgcolor: alpha(muiTheme.palette.error.main, 0.1),
                            '&:hover': { bgcolor: alpha(muiTheme.palette.error.main, 0.2) }
                          }}
                        >
                          <RemoveIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    {index === newOrder.items.length - 1 && (
                      <Tooltip title="Add another item">
                        <IconButton
                          onClick={handleAddItem}
                          sx={{
                            color: muiTheme.palette.primary.main,
                            bgcolor: alpha(muiTheme.palette.primary.main, 0.1),
                            '&:hover': { bgcolor: alpha(muiTheme.palette.primary.main, 0.2) }
                          }}
                        >
                          <AddIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Grid>
                </Grid>
              ))}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: muiTheme.palette.primary.main }}>
                  Total: Rs {totalPrice}
                </Typography>
              </Box>
            </GradientCard>

            {/* Customer Details Section */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Customer Details
            </Typography>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Customer Name"
                  value={newOrder.customerName}
                  onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                  fullWidth
                  sx={{
                    borderRadius: 12,
                    '& .MuiOutlinedInput-root': {
                      '&:hover': { bgcolor: alpha(muiTheme.palette.primary.main, 0.05) }
                    }
                  }}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Customer Phone"
                  type="tel"
                  value={newOrder.customerPhone}
                  onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                  fullWidth
                  sx={{
                    borderRadius: 12,
                    '& .MuiOutlinedInput-root': {
                      '&:hover': { bgcolor: alpha(muiTheme.palette.primary.main, 0.05) }
                    }
                  }}
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
            </Grid>

            {/* Delivery Options Section */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Delivery Options
            </Typography>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={newOrder.is_delivery}
                      onChange={(e) => setNewOrder({ ...newOrder, is_delivery: e.target.checked, customer_location: '', rider_id: '' })}
                      color="primary"
                      sx={{ '& .MuiSvgIcon-root': { fontSize: 28 } }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocalShippingIcon sx={{ mr: 1, fontSize: 24, color: muiTheme.palette.primary.main }} />
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Delivery Order
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
              {newOrder.is_delivery && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      label="Customer Location"
                      value={newOrder.customer_location}
                      onChange={(e) => setNewOrder({ ...newOrder, customer_location: e.target.value })}
                      fullWidth
                      required
                      sx={{
                        borderRadius: 12,
                        '& .MuiOutlinedInput-root': {
                          '&:hover': { bgcolor: alpha(muiTheme.palette.primary.main, 0.05) }
                        }
                      }}
                      InputProps={{
                        startAdornment: <LocationOnIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>
                  {['manager', 'kitchen'].includes(userRole) && (
                    <Grid item xs={12}>
                      <FormControl fullWidth required sx={{ width: { xs: '100%', sm: 317 } }}>
                        <InputLabel>Rider</InputLabel>
                        <Select
                          value={newOrder.rider_id}
                          onChange={(e) => setNewOrder({ ...newOrder, rider_id: e.target.value })}
                          label="Rider"
                          sx={{
                            borderRadius: 12,
                            '&:hover': { bgcolor: alpha(muiTheme.palette.primary.main, 0.05) }
                          }}
                          renderValue={(selected) => {
                            const rider = riders.find(r => r.user_id.toString() === selected);
                            return rider ? `${rider.username} (${rider.is_available ? 'Available' : 'Busy'})` : 'Select rider';
                          }}
                        >
                          <MenuItem value="" disabled>Select rider</MenuItem>
                          {riders.map((rider) => (
                            <MenuItem
                              key={rider.user_id}
                              value={rider.user_id.toString()}
                              disabled={!rider.is_available}
                            >
                              {rider.username} ({rider.is_available ? 'Available' : 'Busy'})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                </>
              )}
            </Grid>

            {/* Status Section (for managers/kitchen) */}
            {['manager', 'kitchen'].includes(userRole) && (
              <>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Order Status
                </Typography>
                <FormControl fullWidth sx={{ width: { xs: '100%', sm: 317 } }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={newOrder.status}
                    onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value })}
                    label="Status"
                    sx={{
                      borderRadius: 12,
                      '&:hover': { bgcolor: alpha(muiTheme.palette.primary.main, 0.05) }
                    }}
                    renderValue={(selected) => (
                      <StatusChip
                        status={selected}
                        label={selected.charAt(0).toUpperCase() + selected.slice(1)}
                        size="medium"
                      />
                    )}
                  >
                    {statusOptions.map((status) => (
                      <MenuItem key={status} value={status}>
                        <StatusChip
                          status={status}
                          label={status.charAt(0).toUpperCase() + status.slice(1)}
                          size="medium"
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </motion.div>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: muiTheme.palette.background.paper, borderTop: `1px solid ${alpha(muiTheme.palette.divider, 0.1)}` }}>
          <ModernButton
            variant="outlined"
            onClick={onClose}
            sx={{ color: muiTheme.palette.text.primary, borderColor: muiTheme.palette.divider }}
          >
            Cancel
          </ModernButton>
          {editOrder ? (
            <Tooltip title={
              !newOrder.items.every(item => item.item_id && item.quantity > 0) ? "All items must be selected with valid quantities" :
              newOrder.is_delivery && !newOrder.customer_location ? "Customer location is required for delivery" :
              newOrder.is_delivery && !newOrder.rider_id && ['manager', 'kitchen'].includes(userRole) && newOrder.status === 'completed' ? "Rider is required for completed delivery orders" :
              ""
            }>
              <span>
                <ModernButton
                  variant="contained"
                  onClick={handleUpdateOrder}
                  disabled={
                    !newOrder.items.every(item => item.item_id && item.quantity > 0) ||
                    !['manager', 'kitchen'].includes(userRole) ||
                    (newOrder.is_delivery && !newOrder.customer_location) ||
                    (newOrder.is_delivery && !newOrder.rider_id && ['manager', 'kitchen'].includes(userRole) && newOrder.status === 'completed')
                  }
                >
                  Update Order
                </ModernButton>
              </span>
            </Tooltip>
          ) : (
            <Tooltip title={
              !newOrder.items.every(item => item.item_id && item.quantity > 0) ? "All items must be selected with valid quantities" :
              newOrder.is_delivery && !newOrder.customer_location ? "Customer location is required for delivery" :
              newOrder.is_delivery && !newOrder.rider_id && ['manager', 'kitchen'].includes(userRole) ? "Rider is required for delivery orders" :
              ""
            }>
              <span>
                <ModernButton
                  variant="contained"
                  onClick={handleAddOrder}
                  disabled={
                    !newOrder.items.every(item => item.item_id && item.quantity > 0) ||
                    (newOrder.is_delivery && !newOrder.customer_location) ||
                    (newOrder.is_delivery && !newOrder.rider_id && ['manager', 'kitchen'].includes(userRole))
                  }
                >
                  Create Order
                </ModernButton>
              </span>
            </Tooltip>
          )}
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};

export default OrderDialog;