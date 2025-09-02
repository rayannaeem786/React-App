import React from 'react';
import {
  Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Box, Avatar, Card, CardContent, CircularProgress, IconButton, Paper, Grid,
  LinearProgress, alpha
} from '@mui/material';
import { 
  Download as DownloadIcon, Refresh as RefreshIcon, Receipt as ReceiptIcon,
  AttachMoney as AttachMoneyIcon, Speed as SpeedIcon, EmojiEvents as EmojiEventsIcon,
  Inventory as InventoryIcon, CalendarToday as CalendarTodayIcon, TrendingUp as TrendingUpIcon,
  Star as StarIcon, Insights as InsightsIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { GradientCard, StyledTableRow, AnimatedGridItem } from './StyledComponents';
import { staggerChildren } from './Animations';
import createMuiTheme from './theme';
import { ThemeProvider } from '@mui/material/styles';

const AnalyticsOverview = ({ userRole, analytics, analyticsLoading, handleExportOrders, fetchAnalytics, tenant }) => {
  const muiTheme = createMuiTheme(tenant);

  return (
    <ThemeProvider theme={muiTheme}>
      {userRole === 'manager' && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ marginBottom: 32 }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              Analytics Overview
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <motion.button
                variant="outlined"
                size="small"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  border: `1px solid ${muiTheme.palette.primary.main}`,
                  borderRadius: 12,
                  padding: '6px 16px',
                  fontWeight: 600,
                  textTransform: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  color: muiTheme.palette.primary.main,
                }}
                onClick={handleExportOrders}
              >
                <DownloadIcon sx={{ mr: 0.5, fontSize: 18 }} />
                Export
              </motion.button>
              <IconButton onClick={fetchAnalytics} size="small">
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>
          
          {analyticsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
              <CircularProgress size={32} />
              <Typography sx={{ ml: 2, color: 'text.secondary' }}>Loading analytics...</Typography>
            </Box>
          ) : analytics.totalOrders === 0 && analytics.totalRevenue === 0 && analytics.lowStockItems.length === 0 ? (
            <Typography color="text.secondary">No data available. Complete orders to see analytics.</Typography>
          ) : (
            <>
              <motion.div variants={staggerChildren}>
                <Grid container sx={{ columnGap: { xs: '24px', md: '18px' }, rowGap: { xs: 3, md: 3 }, mb: 4, flexWrap: 'wrap' }}>
                  <AnimatedGridItem 
                    item 
                    xs={12} 
                    sx={{ width: { xs: '100%', md: '300px' } }}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GradientCard sx={{ width: '100%' }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ flexGrow: 1, height: 133 }}>
                          <Typography variant="subtitle1" color="text.secondary" gutterBottom>Total Orders</Typography>
                          <Typography variant="h3" fontWeight={800} color="primary.main">{analytics.totalOrders || 0}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5, color: 'success.main' }} />
                            <Typography variant="caption" color="success.main" fontWeight={600}>
                              +12% from last week
                            </Typography>
                          </Box>
                        </Box>
                        <Avatar sx={{ bgcolor: alpha(muiTheme.palette.primary.main, 0.1), color: muiTheme.palette.primary.main, width: 56, height: 56 }}>
                          <ReceiptIcon />
                        </Avatar>
                      </CardContent>
                    </GradientCard>
                  </AnimatedGridItem>
                  
                  <AnimatedGridItem 
                    item 
                    xs={12} 
                    sx={{ width: { xs: '100%', md: '452px' } }}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GradientCard sx={{ width: '100%' }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ flexGrow: 1, height: 133 }}>
                          <Typography variant="subtitle1" color="text.secondary" gutterBottom>Total Revenue</Typography>
                          <Typography variant="h3" fontWeight={800} color="success.main">Rs {(analytics.totalRevenue || 0).toFixed(2)}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5, color: 'success.main' }} />
                            <Typography variant="caption" color="success.main" fontWeight={600}>
                              +8% from last week
                            </Typography>
                          </Box>
                        </Box>
                        <Avatar sx={{ bgcolor: alpha(muiTheme.palette.success.main, 0.1), color: muiTheme.palette.success.main, width: 56, height: 56 }}>
                          <AttachMoneyIcon />
                        </Avatar>
                      </CardContent>
                    </GradientCard>
                  </AnimatedGridItem>
                  
                  <AnimatedGridItem 
                    item 
                    xs={12} 
                    sx={{ width: { xs: '100%', md: '300px' } }}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GradientCard sx={{ width: '100%' }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ flexGrow: 1, height: 133 }}>
                          <Typography variant="subtitle1" color="text.secondary" gutterBottom>Completion Rate</Typography>
                          <Typography variant="h3" fontWeight={800} color="info.main">{analytics.completionRate}%</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <SpeedIcon sx={{ fontSize: 16, mr: 0.5, color: 'info.main' }} />
                            <Typography variant="caption" color="info.main" fontWeight={600}>
                              Orders completed
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={analytics.completionRate} 
                            sx={{ 
                              mt: 1, 
                              borderRadius: 4, 
                              height: 6,
                              bgcolor: alpha(muiTheme.palette.info.main, 0.1),
                              '& .MuiLinearProgress-bar': {
                                bgcolor: muiTheme.palette.info.main
                              }
                            }}
                          />
                        </Box>
                        <Avatar sx={{ bgcolor: alpha(muiTheme.palette.info.main, 0.1), color: muiTheme.palette.info.main, width: 56, height: 56 }}>
                          <EmojiEventsIcon />
                        </Avatar>
                      </CardContent>
                    </GradientCard>
                  </AnimatedGridItem>

                  <AnimatedGridItem 
                    item 
                    xs={12} 
                    sx={{ width: { xs: '100%', md: '300px' } }}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GradientCard sx={{ width: '100%' }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ flexGrow: 1, height: 133 }}>
                          <Typography variant="subtitle1" color="text.secondary" gutterBottom>Daily Average</Typography>
                          <Typography variant="h3" fontWeight={800} color="warning.main">{analytics.dailyAverage || 0}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <CalendarTodayIcon sx={{ fontSize: 16, mr: 0.5, color: 'warning.main' }} />
                            <Typography variant="caption" color="warning.main" fontWeight={600}>
                              Orders per day
                            </Typography>
                          </Box>
                        </Box>
                        <Avatar sx={{ bgcolor: alpha(muiTheme.palette.warning.main, 0.1), color: muiTheme.palette.warning.main, width: 56, height: 56 }}>
                          <InsightsIcon />
                        </Avatar>
                      </CardContent>
                    </GradientCard>
                  </AnimatedGridItem>
                </Grid>
              </motion.div>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Typography variant="h6" gutterBottom>
                    Popular Items
                  </Typography>
                  {analytics.popularItems.length > 0 ? (
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 12, bgcolor: 'background.default' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Orders</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Revenue</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Rating</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analytics.popularItems.map((item, index) => (
                            <StyledTableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.orderCount}</TableCell>
                              <TableCell>${item.revenue?.toFixed(2)}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex' }}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <StarIcon key={star} sx={{ fontSize: 16, color: star <= item.rating ? 'warning.main' : 'action.disabled' }} />
                                  ))}
                                </Box>
                              </TableCell>
                            </StyledTableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography color="text.secondary">No popular items data.</Typography>
                  )}
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Typography variant="h6" gutterBottom>
                    Low Stock Alert
                  </Typography>
                  {analytics.lowStockItems.length > 0 ? (
                    <Box>
                      {analytics.lowStockItems.slice(0, 3).map((item) => (
                        <Card key={item.item_id} sx={{ mb: 2, borderRadius: 12, bgcolor: alpha(muiTheme.palette.error.main, 0.1) }}>
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <InventoryIcon sx={{ fontSize: 16, mr: 1, color: 'error.main' }} />
                              <Typography variant="body2" color="error.main">
                                Only {item.stock_quantity} left
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={(item.stock_quantity / item.low_stock_threshold) * 100} 
                              sx={{ mt: 1, borderRadius: 4, height: 6 }}
                              color="error"
                            />
                          </CardContent>
                        </Card>
                      ))}
                      {analytics.lowStockItems.length > 3 && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
                          +{analytics.lowStockItems.length - 3} more items
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography color="text.secondary">No low stock items.</Typography>
                  )}
                </Grid>
              </Grid>
            </>
          )}
        </motion.div>
      )}
    </ThemeProvider>
  );
};

export default AnalyticsOverview;