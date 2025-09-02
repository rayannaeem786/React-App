const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const crypto = require('crypto');
require('dotenv').config();

const orderRoutes = require('./orders'); // Import order routes

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Serve static files (logos)
const uploadsDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/Uploads', express.static(uploadsDir));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.tenantId}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only .jpg, .jpeg, .png files are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// MySQL connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'restaurant_software',
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// WebSocket server setup
const wss = new WebSocket.Server({ port: 8080 });
const clients = new Map(); // For staff: tenantId -> Set<ws>
const orderClients = new Map(); // For customers: orderId -> Set<ws>

wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const tenantId = urlParams.get('tenantId');
  const token = urlParams.get('token');
  const orderId = urlParams.get('orderId');
  const customerPhone = urlParams.get('customerPhone');

  console.log('WebSocket connection attempt:', { tenantId, token: token ? 'provided' : 'missing', orderId, customerPhone });

  if (token) {
    // Staff connection logic
    if (!tenantId) {
      console.error('WebSocket connection rejected: Missing tenantId');
      ws.close(1008, 'Tenant ID required');
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.tenantId !== tenantId || !['manager', 'kitchen', 'rider'].includes(decoded.role)) {
        console.error('WebSocket connection rejected: Unauthorized', { tenantId, role: decoded.role });
        ws.close(1008, 'Unauthorized');
        return;
      }

      if (!clients.has(tenantId)) {
        clients.set(tenantId, new Set());
      }
      clients.get(tenantId).add(ws);
      console.log('WebSocket staff client connected:', { tenantId, role: decoded.role });

      ws.on('close', () => {
        console.log('WebSocket staff client disconnected:', { tenantId });
        clients.get(tenantId)?.delete(ws);
        if (clients.get(tenantId)?.size === 0) {
          clients.delete(tenantId);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket staff error:', { tenantId, error: error.message });
      });
    } catch (error) {
      console.error('WebSocket connection rejected: Invalid token', { error: error.message });
      ws.close(1008, 'Invalid token');
    }
  } else if (tenantId && orderId && customerPhone) {
    // Public customer connection logic
    (async () => {
      try {
        const [orders] = await pool.query(
          'SELECT order_id FROM orders WHERE order_id = ? AND tenant_id = ? AND customer_phone = ?',
          [orderId, tenantId, customerPhone]
        );
        if (orders.length === 0) {
          console.error('WebSocket public connection rejected: Invalid order or phone', { tenantId, orderId });
          ws.close(1008, 'Invalid order or phone');
          return;
        }

        const fullOrderId = orders[0].order_id;

        if (!orderClients.has(fullOrderId)) {
          orderClients.set(fullOrderId, new Set());
        }
        orderClients.get(fullOrderId).add(ws);
        console.log('WebSocket public client connected:', { tenantId, orderId });

        ws.on('close', () => {
          console.log('WebSocket public client disconnected:', { tenantId, orderId });
          orderClients.get(fullOrderId)?.delete(ws);
          if (orderClients.get(fullOrderId)?.size === 0) {
            orderClients.delete(fullOrderId);
          }
        });

        ws.on('error', (error) => {
          console.error('WebSocket public error:', { tenantId, orderId, error: error.message });
        });
      } catch (error) {
        console.error('Error verifying public WebSocket:', { error: error.message });
        ws.close(1008, 'Server error');
      }
    })();
  } else {
    console.error('WebSocket connection rejected: Missing parameters');
    ws.close(1008, 'Tenant ID, and either token or (orderId and customerPhone) required');
  }
});

const broadcastOrderNotification = async (tenantId, order, messageType = 'new_order') => {
  console.log('Broadcasting order notification:', { tenantId, messageType, orderId: order.order_id });
  try {
    const [rows] = await pool.query('SELECT item_id, name, price FROM menu_items WHERE tenant_id = ?', [tenantId]);
    const menuItems = rows.reduce((acc, item) => {
      acc[item.item_id] = { name: item.name, price: parseFloat(item.price) };
      return acc;
    }, {});

    const orderDetails = order.items.map(item => ({
      item_id: item.item_id,
      name: menuItems[item.item_id]?.name || item.name || 'Unknown Item', // Changed from item to name
      quantity: item.quantity,
      price: menuItems[item.item_id]?.price || parseFloat(item.price),
    }));

    const message = JSON.stringify({
      type: messageType,
      order: {
        order_id: order.order_id,
        items: orderDetails,
        total_price: parseFloat(order.total_price),
        status: order.status,
        customer_name: order.customer_name || 'N/A',
        customer_phone: order.customer_phone || 'N/A',
        preparation_start_time: order.preparation_start_time || null,
        preparation_end_time: order.preparation_end_time || null,
        delivery_start_time: order.delivery_start_time || null,
        delivery_end_time: order.delivery_end_time || null,
        is_delivery: order.is_delivery,
        customer_location: order.customer_location || null,
        rider_id: order.rider_id || null,
      },
    });

    // Send to staff
    if (clients.has(tenantId)) {
      clients.get(tenantId).forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } else {
      console.log('No staff WebSocket clients for tenant:', tenantId);
    }

    // Send to customer(s) for this order
    if (orderClients.has(order.order_id)) {
      orderClients.get(order.order_id).forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } else {
      console.log('No customer WebSocket clients for order:', order.order_id);
    }
  } catch (error) {
    console.error('Error broadcasting order notification:', { error: error.message, tenantId, orderId: order.order_id });
  }
};

// Middleware to verify JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.error('Authentication failed: No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification error:', { error: error.message, token });
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to restrict to managers
const restrictToManager = (req, res, next) => {
  if (req.user.role !== 'manager') {
    console.error('Access denied: Manager role required', { user: req.user });
    return res.status(403).json({ error: 'Manager access required' });
  }
  next();
};

// Middleware to restrict to superadmin
const restrictToSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    console.error('Access denied: Superadmin role required', { user: req.user });
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
};

// Middleware to restrict to managers or kitchen staff
const restrictToManagerOrKitchen = (req, res, next) => {
  if (!['manager', 'kitchen'].includes(req.user.role)) {
    console.error('Access denied: Manager or kitchen role required', { user: req.user });
    return res.status(403).json({ error: 'Manager or kitchen access required' });
  }
  next();
};

// Middleware to restrict to riders
const restrictToRider = (req, res, next) => {
  if (req.user.role !== 'rider') {
    console.error('Access denied: Rider role required', { user: req.user });
    return res.status(403).json({ error: 'Rider access required' });
  }
  next();
};

// Middleware to restrict to managers, kitchen, or authorized riders
const restrictToManagerKitchenOrRider = async (req, res, next) => {
  const { tenantId, orderId } = req.params;
  const { status } = req.body;

  if (!['manager', 'kitchen', 'rider'].includes(req.user.role)) {
    console.error('Access denied: Manager, kitchen, or rider role required', { user: req.user });
    return res.status(403).json({ error: 'Manager, kitchen, or rider access required' });
  }

  if (req.user.role === 'rider') {
    try {
      const [orders] = await pool.query(
        'SELECT rider_id, status FROM orders WHERE order_id = ? AND tenant_id = ?',
        [orderId, tenantId]
      );
      if (orders.length === 0) {
        console.error('Order not found:', { tenantId, orderId });
        return res.status(404).json({ error: 'Order not found' });
      }
      const order = orders[0];

      // Allow riders to update to 'enroute' for unassigned 'completed' orders or their own orders
      if (status === 'enroute' && order.status === 'completed' && (!order.rider_id || order.rider_id === req.user.userId)) {
        return next();
      }
      // Allow riders to update to 'delivered' for orders they are assigned to
      if (status === 'delivered' && order.status === 'enroute' && order.rider_id === req.user.userId) {
        return next();
      }
      console.error('Access denied: Rider not authorized for this action', {
        tenantId,
        orderId,
        userId: req.user.userId,
        currentStatus: order.status,
        requestedStatus: status,
        riderId: order.rider_id,
      });
      return res.status(403).json({ error: 'Rider not authorized to update this order' });
    } catch (error) {
      console.error('Error checking rider permissions:', { error: error.message, tenantId, orderId });
      return res.status(500).json({ error: 'Server error checking permissions', details: error.message });
    }
  }

  // Allow managers and kitchen staff to proceed
  next();
};

// Login endpoint
app.post('/api/login', async (req, res) => {
  let { tenantId, username, password } = req.body;
  console.log('Login attempt:', { tenantId, username });
  try {
    // Check if tenant is blocked when tenantId is provided
    if (tenantId) {
      const [tenants] = await pool.query('SELECT tenant_id, blocked FROM tenants WHERE tenant_id = ?', [tenantId]);
      if (tenants.length === 0) {
        console.error('Login failed: Tenant not found', { tenantId, username });
        return res.status(404).json({ error: 'Tenant not found' });
      }
      const tenant = tenants[0];
      if (tenant.blocked === 1) {
        console.error('Login failed: Tenant is blocked', { tenantId, username });
        return res.status(403).json({ error: 'Your Account Is Suspended By SuperAdmin So Please Contact The Administration.' });
      }
      console.log('Tenant check passed:', { tenantId, blocked: tenant.blocked });
    }

    // Query user based on tenantId and username
    let users;
    if (tenantId) {
      [users] = await pool.query('SELECT user_id, tenant_id, username, password, role FROM users WHERE tenant_id = ? AND username = ?', [tenantId, username]);
    } else {
      [users] = await pool.query('SELECT user_id, tenant_id, username, password, role FROM users WHERE tenant_id IS NULL AND username = ?', [username]);
    }

    if (users.length === 0) {
      console.error('Login failed: User not found', { tenantId, username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    console.log('User found:', { tenantId, username, role: user.role });

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error('Login failed: Incorrect password', { tenantId, username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, tenantId: user.tenant_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('Login successful:', { tenantId: user.tenant_id, username, role: user.role });
    res.json({ token, role: user.role, userId: user.user_id });
  } catch (error) {
    console.error('Login error:', { error: error.message, tenantId, username });
    res.status(500).json({ error: 'Server error during login', details: error.message });
  }
});

// Superadmin: List all tenants
app.get('/api/tenants', authenticateToken, restrictToSuperAdmin, async (req, res) => {
  try {
    const [tenants] = await pool.query('SELECT tenant_id, name, logo_url, primary_color, blocked, created_at FROM tenants');
    res.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch tenants', details: error.message });
  }
});

// Superadmin: Create new tenant
app.post('/api/tenants', authenticateToken, restrictToSuperAdmin, async (req, res) => {
  const { name, managerUsername, managerPassword } = req.body;
  if (!name || !managerUsername || !managerPassword) {
    return res.status(400).json({ error: 'Name, manager username, and password are required' });
  }

  const tenantId = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash(managerPassword, 10);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      'INSERT INTO tenants (tenant_id, name) VALUES (?, ?)',
      [tenantId, name]
    );
    await connection.query(
      'INSERT INTO users (tenant_id, username, password, role) VALUES (?, ?, ?, ?)',
      [tenantId, managerUsername, hashedPassword, 'manager']
    );
    await connection.commit();
    res.json({ success: true, tenantId });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating tenant:', { error: error.message });
    res.status(500).json({ error: 'Failed to create tenant', details: error.message });
  } finally {
    connection.release();
  }
});

// Superadmin: Block/Unblock tenant
app.put('/api/tenants/:tenantId/block', authenticateToken, restrictToSuperAdmin, async (req, res) => {
  const { tenantId } = req.params;
  const { blocked } = req.body;
  if (typeof blocked !== 'boolean') {
    return res.status(400).json({ error: 'Blocked must be a boolean' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE tenants SET blocked = ? WHERE tenant_id = ?',
      [blocked ? 1 : 0, tenantId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating tenant block status:', { error: error.message, tenantId });
    res.status(500).json({ error: 'Failed to update tenant', details: error.message });
  }
});

// Get tenant details
app.get('/api/tenants/:tenantId', authenticateToken, async (req, res) => {
  const { tenantId } = req.params;
  if (req.user.tenantId !== tenantId) {
    console.error('Unauthorized tenant access:', { tenantId, user: req.user });
    return res.status(403).json({ error: 'Unauthorized tenant' });
  }

  try {
    const [tenants] = await pool.query('SELECT name, logo_url, primary_color FROM tenants WHERE tenant_id = ?', [tenantId]);
    if (tenants.length === 0) {
      console.error('Tenant not found:', { tenantId });
      return res.status(404).json({ error: 'Tenant not found' });
    }
    console.log('Tenant fetched:', { tenantId, data: tenants[0] });
    res.json(tenants[0]);
  } catch (error) {
    console.error('Error fetching tenant:', { error: error.message, tenantId });
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get available riders
app.get('/api/tenants/:tenantId/riders', authenticateToken, restrictToManagerOrKitchen, async (req, res) => {
  const { tenantId } = req.params;
  if (req.user.tenantId !== tenantId) {
    console.error('Unauthorized tenant access:', { tenantId, user: req.user });
    return res.status(403).json({ error: 'Unauthorized tenant' });
  }

  console.log('Fetching riders for tenant:', { tenantId });
  try {
    const [riders] = await pool.query(
      'SELECT u.user_id, u.username, COUNT(o.order_id) as active_orders ' +
      'FROM users u ' +
      'LEFT JOIN orders o ON u.user_id = o.rider_id AND o.tenant_id = ? AND o.status = ? ' +
      'WHERE u.tenant_id = ? AND u.role = ? ' +
      'GROUP BY u.user_id, u.username',
      [tenantId, 'enroute', tenantId, 'rider']
    );
    const formattedRiders = riders.map(rider => ({
      user_id: parseInt(rider.user_id),
      username: rider.username,
      is_available: rider.active_orders === 0,
    }));
    console.log('Riders fetched:', { tenantId, count: formattedRiders.length });
    res.json(formattedRiders);
  } catch (error) {
    console.error('Error fetching riders:', { error: error.message, tenantId });
    res.status(500).json({ error: 'Failed to fetch riders', details: error.message });
  }
});

// Get menu items (authenticated)
app.get('/api/tenants/:tenantId/menu-items', authenticateToken, async (req, res) => {
  const { tenantId } = req.params;
  if (req.user.tenantId !== tenantId) {
    console.error('Unauthorized tenant access:', { tenantId, user: req.user });
    return res.status(403).json({ error: 'Unauthorized tenant' });
  }

  console.log('Fetching menu items for tenant:', { tenantId });
  try {
    const [items] = await pool.query(
      'SELECT item_id, name, category, price, stock_quantity, low_stock_threshold, created_at FROM menu_items WHERE tenant_id = ?',
      [tenantId]
    );
    const formattedItems = items.map(item => ({
      item_id: parseInt(item.item_id),
      name: item.name,
      category: item.category,
      price: parseFloat(item.price),
      stock_quantity: parseInt(item.stock_quantity),
      low_stock_threshold: parseInt(item.low_stock_threshold),
      created_at: item.created_at,
    }));
    console.log('Menu items fetched:', { tenantId, count: formattedItems.length });
    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching menu items:', { error: error.message, tenantId });
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get menu items (public)
app.get('/api/tenants/:tenantId/public/menu', async (req, res) => {
  const { tenantId } = req.params;
  console.log('Fetching public menu for tenant:', { tenantId });
  try {
    const [items] = await pool.query(
      'SELECT item_id, name, category, price, stock_quantity FROM menu_items WHERE tenant_id = ?',
      [tenantId]
    );
    const formattedItems = items.map(item => ({
      item_id: parseInt(item.item_id),
      name: item.name,
      category: item.category,
      price: parseFloat(item.price),
      stock_quantity: parseInt(item.stock_quantity),
    }));
    console.log('Public menu items fetched:', { tenantId, count: formattedItems.length });
    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching public menu:', { error: error.message, tenantId });
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Create menu item (manager only)
app.post('/api/tenants/:tenantId/menu-items', authenticateToken, restrictToManager, async (req, res) => {
  const { tenantId } = req.params;
  const { name, category, price, stock_quantity, low_stock_threshold } = req.body;
  if (req.user.tenantId !== tenantId) {
    console.error('Unauthorized tenant access:', { tenantId, user: req.user });
    return res.status(403).json({ error: 'Unauthorized tenant' });
  }

  console.log('Creating menu item:', { tenantId, name, category, price, stock_quantity, low_stock_threshold });
  try {
    if (!name || !category || price === undefined || price < 0) {
      console.error('Invalid menu item data:', { tenantId, name, category, price });
      return res.status(400).json({ error: 'Name, category, and non-negative price are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO menu_items (tenant_id, name, category, price, stock_quantity, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?)',
      [tenantId, name, category, parseFloat(price), parseInt(stock_quantity || 0), parseInt(low_stock_threshold || 5)]
    );
    console.log('Menu item created:', { tenantId, itemId: result.insertId });
    res.json({ success: true, itemId: result.insertId });
  } catch (error) {
    console.error('Error creating menu item:', { error: error.message, tenantId });
    res.status(500).json({ error: 'Failed to create menu item', details: error.message });
  }
});

// Update menu item (manager only)
app.put('/api/tenants/:tenantId/menu-items/:itemId', authenticateToken, restrictToManager, async (req, res) => {
  const { tenantId, itemId } = req.params;
  const { name, category, price, stock_quantity, low_stock_threshold } = req.body;
  if (req.user.tenantId !== tenantId) {
    console.error('Unauthorized tenant access:', { tenantId, user: req.user });
    return res.status(403).json({ error: 'Unauthorized tenant' });
  }

  console.log('Updating menu item:', { tenantId, itemId, name, category, price, stock_quantity, low_stock_threshold });
  try {
    if (!name || !category || price === undefined || price < 0) {
      console.error('Invalid menu item data:', { tenantId, itemId, name, category, price });
      return res.status(400).json({ error: 'Name, category, and non-negative price are required' });
    }
    const [result] = await pool.query(
      'UPDATE menu_items SET name = ?, category = ?, price = ?, stock_quantity = ?, low_stock_threshold = ? WHERE item_id = ? AND tenant_id = ?',
      [name, category, parseFloat(price), parseInt(stock_quantity || 0), parseInt(low_stock_threshold || 5), parseInt(itemId), tenantId]
    );
    if (result.affectedRows === 0) {
      console.error('Menu item not found or unauthorized:', { tenantId, itemId });
      return res.status(404).json({ error: 'Menu item not found or not authorized' });
    }
    console.log('Menu item updated:', { tenantId, itemId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating menu item:', { error: error.message, tenantId, itemId });
    res.status(500).json({ error: 'Failed to update menu item', details: error.message });
  }
});

// Delete menu item (manager only)
app.delete('/api/tenants/:tenantId/menu-items/:itemId', authenticateToken, restrictToManager, async (req, res) => {
  const { tenantId, itemId } = req.params;
  if (req.user.tenantId !== tenantId) {
    console.error('Unauthorized tenant access:', { tenantId, user: req.user });
    return res.status(403).json({ error: 'Unauthorized tenant' });
  }

  console.log('Deleting menu item:', { tenantId, itemId });
  try {
    const [result] = await pool.query(
      'DELETE FROM menu_items WHERE item_id = ? AND tenant_id = ?',
      [parseInt(itemId), tenantId]
    );
    if (result.affectedRows === 0) {
      console.error('Menu item not found or unauthorized:', { tenantId, itemId });
      return res.status(404).json({ error: 'Menu item not found or not authorized' });
    }
    console.log('Menu item deleted:', { tenantId, itemId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', { error: error.message, tenantId, itemId });
    res.status(500).json({ error: 'Failed to delete menu item', details: error.message });
  }
});

// Restock menu item (manager only)
app.patch('/api/tenants/:tenantId/menu-items/:itemId/restock', authenticateToken, restrictToManager, async (req, res) => {
  const { tenantId, itemId } = req.params;
  const { quantity } = req.body;
  if (req.user.tenantId !== tenantId) {
    console.error('Unauthorized tenant access:', { tenantId, user: req.user });
    return res.status(403).json({ error: 'Unauthorized tenant' });
  }
  if (!quantity || quantity < 0) {
    console.error('Invalid restock quantity:', { tenantId, itemId, quantity });
    return res.status(400).json({ error: 'Invalid restock quantity' });
  }

  console.log('Restocking menu item:', { tenantId, itemId, quantity });
  try {
    const [result] = await pool.query(
      'UPDATE menu_items SET stock_quantity = stock_quantity + ? WHERE item_id = ? AND tenant_id = ?',
      [parseInt(quantity), parseInt(itemId), tenantId]
    );
    if (result.affectedRows === 0) {
      console.error('Menu item not found or unauthorized:', { tenantId, itemId });
      return res.status(404).json({ error: 'Menu item not found or not authorized' });
    }
    console.log('Menu item restocked:', { tenantId, itemId, quantity });
    res.json({ success: true });
  } catch (error) {
    console.error('Error restocking menu item:', { error: error.message, tenantId, itemId });
    res.status(500).json({ error: 'Failed to restock menu item', details: error.message });
  }
});

// Update tenant settings
app.put('/api/tenants/:tenantId', authenticateToken, restrictToManager, upload.single('logo'), async (req, res) => {
  const { tenantId } = req.params;
  const { name, primary_color } = req.body;
  if (req.user.tenantId !== tenantId) {
    console.error('Unauthorized tenant access:', { tenantId, user: req.user });
    return res.status(403).json({ error: 'Unauthorized tenant' });
  }

  console.log('Updating tenant settings:', { tenantId, name, primary_color, logo: req.file ? req.file.filename : 'none' });

  try {
    let logo_url = req.body.logo_url;
    if (req.file) {
      logo_url = `/Uploads/${req.file.filename}`;
      console.log('Logo uploaded:', { tenantId, logo_url });
    }

    const [result] = await pool.query(
      'UPDATE tenants SET name = ?, logo_url = ?, primary_color = ? WHERE tenant_id = ?',
      [name || 'Default Tenant', logo_url || null, primary_color || '#1976d2', tenantId]
    );
    if (result.affectedRows === 0) {
      console.error('Tenant not found:', { tenantId });
      return res.status(404).json({ error: 'Tenant not found' });
    }
    console.log('Tenant settings updated:', { tenantId, logo_url });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating tenant:', { error: error.message, tenantId });
    res.status(500).json({ error: 'Failed to update tenant', details: error.message });
  }
});

// Get order history
app.get('/api/tenants/:tenantId/order-history', authenticateToken, restrictToManager, async (req, res) => {
  const { tenantId } = req.params;
  if (req.user.tenantId !== tenantId) {
    console.error('Unauthorized tenant access:', { tenantId, user: req.user });
    return res.status(403).json({ error: 'Unauthorized tenant' });
  }

  console.log('Fetching order history for tenant:', { tenantId });
  try {
    const [history] = await pool.query(
      'SELECT history_id, order_id, action, details, changed_by, change_timestamp FROM order_history WHERE tenant_id = ? ORDER BY change_timestamp DESC',
      [tenantId]
    );
    const formattedHistory = history.map(h => {
      let parsedDetails;
      try {
        parsedDetails = JSON.parse(h.details);
      } catch (error) {
        console.error('Error parsing order history details:', { history_id: h.history_id, error: error.message });
        parsedDetails = { items: [], error: 'Invalid JSON' };
      }
      return {
        history_id: h.history_id,
        order_id: parseInt(h.order_id),
        action: h.action,
        details: parsedDetails,
        changed_by: h.changed_by,
        change_timestamp: h.change_timestamp,
      };
    });
    console.log('Order history fetched:', { tenantId, count: formattedHistory.length });
    res.json(formattedHistory);
  } catch (error) {
    console.error('Error fetching order history:', { error: error.message, tenantId });
    res.status(500).json({ error: 'Failed to fetch order history', details: error.message });
  }
});

// Get analytics
app.get('/api/tenants/:tenantId/analytics', authenticateToken, restrictToManager, async (req, res) => {
  const { tenantId } = req.params;
  if (req.user.tenantId !== tenantId) {
    console.error('Unauthorized tenant access:', { tenantId, user: req.user });
    return res.status(403).json({ error: 'Unauthorized tenant' });
  }

  try {
    const [orderStats] = await pool.query(
      'SELECT COUNT(DISTINCT o.order_id) as totalOrders, SUM(oi.quantity * oi.price) as totalRevenue ' +
      'FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.tenant_id = ? AND o.status != ?',
      [tenantId, 'canceled']
    );
    const [lowStockItems] = await pool.query(
      'SELECT item_id, name, stock_quantity, low_stock_threshold FROM menu_items WHERE tenant_id = ? AND stock_quantity <= low_stock_threshold',
      [tenantId]
    );
    console.log('Analytics query results:', {
      tenantId,
      orderStats: orderStats[0],
      lowStockItemsCount: lowStockItems.length,
    });
    res.json({
      totalOrders: parseInt(orderStats[0].totalOrders) || 0,
      totalRevenue: parseFloat(orderStats[0].totalRevenue) || 0,
      lowStockItems: lowStockItems.map(item => ({
        item_id: parseInt(item.item_id),
        name: item.name,
        stock_quantity: parseInt(item.stock_quantity),
        low_stock_threshold: parseInt(item.low_stock_threshold),
      })),
    });
  } catch (error) {
    console.error('Error fetching analytics:', { error: error.message, tenantId });
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

// Use order routes
app.use('/api/tenants/:tenantId', orderRoutes({
  pool,
  authenticateToken,
  restrictToManager,
  restrictToManagerKitchenOrRider,
  broadcastOrderNotification,
}));

// Start server
app.listen(5000, () => console.log('Backend running on http://localhost:5000'));
console.log('WebSocket server running on ws://localhost:8080');