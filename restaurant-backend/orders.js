const express = require('express');
const { Parser } = require('json2csv');

const router = express.Router({ mergeParams: true });

module.exports = ({ pool, authenticateToken, restrictToManager, restrictToManagerKitchenOrRider, broadcastOrderNotification }) => {
  // Create order (authenticated)
  router.post('/orders', authenticateToken, async (req, res) => {
    const { tenantId } = req.params;
    const { items, status, customerName, customerPhone, is_delivery, customer_location, rider_id } = req.body;
    if (req.user.tenantId !== tenantId) {
      console.error('Unauthorized tenant access:', { tenantId, user: req.user });
      return res.status(403).json({ error: 'Unauthorized tenant' });
    }

    console.log('Received order creation request:', { tenantId, items, status, customerName, customerPhone, is_delivery, customer_location, rider_id });

    try {
      // Validate input
      if (!Array.isArray(items) || items.length === 0) {
        console.error('Invalid order data: Items array missing or empty', { tenantId });
        return res.status(400).json({ error: 'Items must be a non-empty array' });
      }
      for (const item of items) {
        if (!item.item_id || !Number.isInteger(item.item_id) || item.item_id <= 0) {
          console.error('Invalid order data: Invalid item_id', { tenantId, item });
          return res.status(400).json({ error: 'Each item must have a valid item_id' });
        }
        if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity <= 0) {
          console.error('Invalid order data: Invalid quantity', { tenantId, item });
          return res.status(400).json({ error: 'Each item must have a positive integer quantity' });
        }
        if (!item.price || isNaN(item.price) || item.price < 0) {
          console.error('Invalid order data: Invalid price', { tenantId, item });
          return res.status(400).json({ error: 'Each item must have a non-negative price' });
        }
      }
      const validStatuses = ['pending', 'preparing', 'completed', 'enroute', 'delivered', 'canceled'];
      if (status && !validStatuses.includes(status)) {
        console.error('Invalid order data: Status invalid', { tenantId, status });
        return res.status(400).json({ error: 'Invalid status. Must be pending, preparing, completed, enroute, delivered, or canceled' });
      }
      if (customerName && typeof customerName !== 'string') {
        console.error('Invalid order data: Customer name invalid', { tenantId, customerName });
        return res.status(400).json({ error: 'Customer name must be a string' });
      }
      if (customerPhone && typeof customerPhone !== 'string') {
        console.error('Invalid order data: Customer phone invalid', { tenantId, customerPhone });
        return res.status(400).json({ error: 'Customer phone must be a string' });
      }
      if (is_delivery && !customer_location) {
        console.error('Invalid order data: Location required for delivery', { tenantId });
        return res.status(400).json({ error: 'Customer location is required for delivery orders' });
      }
      if (is_delivery && !rider_id && ['manager', 'kitchen'].includes(req.user.role)) {
        console.error('Invalid order data: Rider ID required for delivery', { tenantId });
        return res.status(400).json({ error: 'Rider ID is required for delivery orders' });
      }

      // Check if tenant exists
      const [tenants] = await pool.query('SELECT tenant_id FROM tenants WHERE tenant_id = ?', [tenantId]);
      if (tenants.length === 0) {
        console.error('Tenant not found:', { tenantId });
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Check if items exist and have sufficient stock
      for (const item of items) {
        const [menuItems] = await pool.query(
          'SELECT item_id, name, price, stock_quantity FROM menu_items WHERE tenant_id = ? AND item_id = ?',
          [tenantId, item.item_id]
        );
        if (menuItems.length === 0) {
          console.error('Menu item not found:', { tenantId, item_id: item.item_id });
          return res.status(404).json({ error: `Menu item with ID ${item.item_id} not found` });
        }
        const menuItem = menuItems[0];
        if (menuItem.stock_quantity < item.quantity) {
          console.error('Insufficient stock:', { tenantId, item_id: item.item_id, stock_quantity: menuItem.stock_quantity, requested_quantity: item.quantity });
          return res.status(400).json({ error: `Insufficient stock for ${menuItem.name}. Available: ${menuItem.stock_quantity}` });
        }
        // Ensure price and name match menu
        item.price = parseFloat(menuItem.price);
        item.name = menuItem.name; // Store name for history and order_items
      }

      // Validate rider_id for delivery orders
      let assignedRiderId = null;
      if (is_delivery && rider_id && ['manager', 'kitchen'].includes(req.user.role)) {
        const [riders] = await pool.query(
          'SELECT user_id FROM users WHERE tenant_id = ? AND role = ? AND user_id = ?',
          [tenantId, 'rider', rider_id]
        );
        if (riders.length === 0) {
          console.error('Invalid rider ID:', { tenantId, rider_id });
          return res.status(400).json({ error: 'Invalid rider ID' });
        }
        const [activeOrders] = await pool.query(
          'SELECT order_id FROM orders WHERE tenant_id = ? AND rider_id = ? AND status = ?',
          [tenantId, rider_id, 'enroute']
        );
        if (activeOrders.length > 0) {
          console.error('Rider is already enroute:', { tenantId, rider_id, activeOrders });
          return res.status(400).json({ error: 'Selected rider is currently enroute on another order' });
        }
        assignedRiderId = rider_id;
      }

      // Calculate total price
      const totalPrice = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

      // Start transaction
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Update stock
        for (const item of items) {
          await connection.query(
            'UPDATE menu_items SET stock_quantity = stock_quantity - ? WHERE item_id = ? AND tenant_id = ?',
            [item.quantity, item.item_id, tenantId]
          );
        }

        // Insert order
        const preparationStartTime = status === 'preparing' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
        const [result] = await connection.query(
          'INSERT INTO orders (tenant_id, total_price, status, customer_name, customer_phone, preparation_start_time, is_delivery, customer_location, rider_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [tenantId, totalPrice, status || 'pending', customerName || null, customerPhone || null, preparationStartTime, is_delivery || 0, customer_location || null, assignedRiderId]
        );

        // Insert order items with name
        for (const item of items) {
          await connection.query(
            'INSERT INTO order_items (order_id, tenant_id, item_id, quantity, price, name) VALUES (?, ?, ?, ?, ?, ?)',
            [result.insertId, tenantId, item.item_id, item.quantity, item.price, item.name]
          );
        }

        // Insert order history
        const orderDetails = items.map(item => ({
          item_id: item.item_id,
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price),
        }));
        await connection.query(
          'INSERT INTO order_history (history_id, order_id, tenant_id, action, details, changed_by) VALUES (UUID(), ?, ?, ?, ?, ?)',
          [
            result.insertId,
            tenantId,
            'created',
            JSON.stringify({
              items: orderDetails,
              total_price: totalPrice,
              status: status || 'pending',
              customerName,
              customerPhone,
              preparation_start_time: preparationStartTime,
              is_delivery,
              customer_location,
              rider_id: assignedRiderId,
            }),
            req.user.username,
          ]
        );

        await connection.commit();

        // Broadcast notification
        const newOrder = {
          order_id: result.insertId,
          items: orderDetails,
          total_price: totalPrice,
          status: status || 'pending',
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          preparation_start_time: preparationStartTime,
          preparation_end_time: null,
          delivery_start_time: null,
          delivery_end_time: null,
          is_delivery,
          customer_location,
          rider_id: assignedRiderId,
        };
        broadcastOrderNotification(tenantId, newOrder);

        console.log('Order created successfully:', { tenantId, order_id: result.insertId });
        res.json({ success: true, orderId: result.insertId, customerName, customerPhone });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error creating order:', { error: error.message, tenantId, requestBody: req.body });
      res.status(500).json({ error: 'Failed to create order', details: error.message });
    }
  });

  // Create order (public)
  router.post('/public/orders', async (req, res) => {
    const { tenantId } = req.params;
    const { items, customerName, customerPhone, is_delivery, customer_location } = req.body;

    console.log('Received public order creation request:', { tenantId, items, customerName, customerPhone, is_delivery, customer_location });

    try {
      // Validate input
      if (!Array.isArray(items) || items.length === 0) {
        console.error('Invalid order data: Items array missing or empty', { tenantId });
        return res.status(400).json({ error: 'Items must be a non-empty array' });
      }
      for (const item of items) {
        if (!item.item_id || !Number.isInteger(item.item_id) || item.item_id <= 0) {
          console.error('Invalid order data: Invalid item_id', { tenantId, item });
          return res.status(400).json({ error: 'Each item must have a valid item_id' });
        }
        if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity <= 0) {
          console.error('Invalid order data: Invalid quantity', { tenantId, item });
          return res.status(400).json({ error: 'Each item must have a positive integer quantity' });
        }
        if (!item.price || isNaN(item.price) || item.price < 0) {
          console.error('Invalid order data: Invalid price', { tenantId, item });
          return res.status(400).json({ error: 'Each item must have a non-negative price' });
        }
      }
      if (!customerName || typeof customerName !== 'string' || !customerPhone || typeof customerPhone !== 'string') {
        console.error('Invalid order data: Customer details invalid', { tenantId, customerName, customerPhone });
        return res.status(400).json({ error: 'Customer name and phone are required and must be strings' });
      }
      if (is_delivery && !customer_location) {
        console.error('Invalid order data: Location required for delivery', { tenantId });
        return res.status(400).json({ error: 'Customer location is required for delivery orders' });
      }

      // Check if tenant exists
      const [tenants] = await pool.query('SELECT tenant_id FROM tenants WHERE tenant_id = ?', [tenantId]);
      if (tenants.length === 0) {
        console.error('Tenant not found:', { tenantId });
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Check if items exist and have sufficient stock
      for (const item of items) {
        const [menuItems] = await pool.query(
          'SELECT item_id, name, price, stock_quantity FROM menu_items WHERE tenant_id = ? AND item_id = ?',
          [tenantId, item.item_id]
        );
        if (menuItems.length === 0) {
          console.error('Menu item not found:', { tenantId, item_id: item.item_id });
          return res.status(404).json({ error: `Menu item with ID ${item.item_id} not found` });
        }
        const menuItem = menuItems[0];
        if (menuItem.stock_quantity < item.quantity) {
          console.error('Insufficient stock:', { tenantId, item_id: item.item_id, stock_quantity: menuItem.stock_quantity, requested_quantity: item.quantity });
          return res.status(400).json({ error: `Insufficient stock for ${menuItem.name}. Available: ${menuItem.stock_quantity}` });
        }
        // Ensure price and name match menu
        item.price = parseFloat(menuItem.price);
        item.name = menuItem.name; // Store name for history and order_items
      }

      // Calculate total price
      const totalPrice = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

      // Start transaction
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Update stock
        for (const item of items) {
          await connection.query(
            'UPDATE menu_items SET stock_quantity = stock_quantity - ? WHERE item_id = ? AND tenant_id = ?',
            [item.quantity, item.item_id, tenantId]
          );
        }

        // Insert order
        const [result] = await connection.query(
          'INSERT INTO orders (tenant_id, total_price, status, customer_name, customer_phone, is_delivery, customer_location) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [tenantId, totalPrice, 'pending', customerName, customerPhone, is_delivery || 0, customer_location || null]
        );

        // Insert order items with name
        for (const item of items) {
          await connection.query(
            'INSERT INTO order_items (order_id, tenant_id, item_id, quantity, price, name) VALUES (?, ?, ?, ?, ?, ?)',
            [result.insertId, tenantId, item.item_id, item.quantity, item.price, item.name]
          );
        }

        // Insert order history
        const orderDetails = items.map(item => ({
          item_id: item.item_id,
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price),
        }));
        await connection.query(
          'INSERT INTO order_history (history_id, order_id, tenant_id, action, details, changed_by) VALUES (UUID(), ?, ?, ?, ?, ?)',
          [
            result.insertId,
            tenantId,
            'created',
            JSON.stringify({
              items: orderDetails,
              total_price: totalPrice,
              status: 'pending',
              customerName,
              customerPhone,
              is_delivery,
              customer_location,
            }),
            'customer',
          ]
        );

        await connection.commit();

        // Broadcast notification
        const newOrder = {
          order_id: result.insertId,
          items: orderDetails,
          total_price: totalPrice,
          status: 'pending',
          customer_name: customerName,
          customer_phone: customerPhone,
          preparation_start_time: null,
          preparation_end_time: null,
          delivery_start_time: null,
          delivery_end_time: null,
          is_delivery,
          customer_location,
          rider_id: null,
        };
        broadcastOrderNotification(tenantId, newOrder);

        console.log('Public order created successfully:', { tenantId, order_id: result.insertId });
        res.json({ success: true, orderId: result.insertId, customerName, customerPhone });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error creating public order:', { error: error.message, tenantId, requestBody: req.body });
      res.status(500).json({ error: 'Failed to create order', details: error.message });
    }
  });

  // Get order status (public)
  router.get('/public/orders/:orderId/status', async (req, res) => {
    const { tenantId, orderId } = req.params;
    const { customerPhone } = req.query;

    console.log('Received order status request:', { tenantId, orderId, customerPhone });

    try {
      // Validate input
      if (!customerPhone || typeof customerPhone !== 'string') {
        console.error('Invalid customer phone:', { tenantId, orderId, customerPhone });
        return res.status(400).json({ error: 'Customer phone is required and must be a string' });
      }

      // Check if tenant exists
      const [tenants] = await pool.query('SELECT tenant_id FROM tenants WHERE tenant_id = ?', [tenantId]);
      if (tenants.length === 0) {
        console.error('Tenant not found:', { tenantId });
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Fetch order
      const [orders] = await pool.query(
        'SELECT order_id, total_price, status, customer_name, customer_phone, preparation_start_time, preparation_end_time, delivery_start_time, delivery_end_time, is_delivery, customer_location FROM orders WHERE tenant_id = ? AND order_id = ? AND customer_phone = ?',
        [tenantId, orderId, customerPhone]
      );
      if (orders.length === 0) {
        console.error('Order not found or phone mismatch:', { tenantId, orderId, customerPhone });
        return res.status(404).json({ error: 'Order not found or phone number does not match' });
      }
      const order = orders[0];

      // Fetch order items
      const [items] = await pool.query(
        'SELECT item_id, name, quantity, price FROM order_items WHERE order_id = ? AND tenant_id = ?',
        [orderId, tenantId]
      );
      const formattedItems = items.map(item => ({
        item_id: parseInt(item.item_id),
        name: item.name,
        quantity: parseInt(item.quantity),
        price: parseFloat(item.price),
      }));

      console.log('Order status fetched:', { tenantId, orderId, status: order.status });
      res.json({
        order_id: parseInt(order.order_id),
        items: formattedItems,
        total_price: parseFloat(order.total_price),
        status: order.status,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        preparation_start_time: order.preparation_start_time,
        preparation_end_time: order.preparation_end_time,
        delivery_start_time: order.delivery_start_time,
        delivery_end_time: order.delivery_end_time,
        is_delivery: parseInt(order.is_delivery),
        customer_location: order.customer_location,
      });
    } catch (error) {
      console.error('Error fetching order status:', { error: error.message, tenantId, orderId });
      res.status(500).json({ error: 'Failed to fetch order status', details: error.message });
    }
  });

  // Update order
  router.put('/orders/:orderId', authenticateToken, restrictToManagerKitchenOrRider, async (req, res) => {
    const { tenantId, orderId } = req.params;
    const { items, status, customerName, customerPhone, is_delivery, customer_location, rider_id } = req.body;
    if (req.user.tenantId !== tenantId) {
      console.error('Unauthorized tenant access:', { tenantId, user: req.user });
      return res.status(403).json({ error: 'Unauthorized tenant' });
    }

    console.log('Received order update request:', { tenantId, orderId, items, status, customerName, customerPhone, is_delivery, customer_location, rider_id, user: req.user });

    try {
      // Validate input
      if (!Array.isArray(items) || items.length === 0) {
        console.error('Invalid order data: Items array missing or empty', { tenantId, orderId });
        return res.status(400).json({ error: 'Items must be a non-empty array' });
      }
      for (const item of items) {
        if (!item.item_id || !Number.isInteger(item.item_id) || item.item_id <= 0) {
          console.error('Invalid order data: Invalid item_id', { tenantId, orderId, item });
          return res.status(400).json({ error: 'Each item must have a valid item_id' });
        }
        if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity <= 0) {
          console.error('Invalid order data: Invalid quantity', { tenantId, orderId, item });
          return res.status(400).json({ error: 'Each item must have a positive integer quantity' });
        }
        if (!item.price || isNaN(item.price) || item.price < 0) {
          console.error('Invalid order data: Invalid price', { tenantId, orderId, item });
          return res.status(400).json({ error: 'Each item must have a non-negative price' });
        }
      }
      const validStatuses = ['pending', 'preparing', 'completed', 'enroute', 'delivered', 'canceled'];
      if (!validStatuses.includes(status)) {
        console.error('Invalid order data: Status invalid', { tenantId, orderId, status });
        return res.status(400).json({ error: 'Invalid status. Must be pending, preparing, completed, enroute, delivered, or canceled' });
      }
      if (is_delivery && !customer_location) {
        console.error('Invalid order data: Location required for delivery', { tenantId, orderId });
        return res.status(400).json({ error: 'Customer location is required for delivery orders' });
      }

      // Check if order exists
      const [orders] = await pool.query('SELECT * FROM orders WHERE order_id = ? AND tenant_id = ?', [orderId, tenantId]);
      if (orders.length === 0) {
        console.error('Order not found:', { tenantId, orderId });
        return res.status(404).json({ error: 'Order not found' });
      }
      const existingOrder = orders[0];

      // Prevent updates if order is delivered
      if (existingOrder.status === 'delivered') {
        console.error('Order update denied: Order is delivered and locked', { tenantId, orderId });
        return res.status(403).json({ error: 'Order is delivered and cannot be modified' });
      }

      // Check if items exist and calculate stock adjustments
      const stockAdjustments = new Map();
      for (const item of items) {
        const [menuItems] = await pool.query(
          'SELECT item_id, name, price, stock_quantity FROM menu_items WHERE tenant_id = ? AND item_id = ?',
          [tenantId, item.item_id]
        );
        if (menuItems.length === 0) {
          console.error('Menu item not found:', { tenantId, orderId, item_id: item.item_id });
          return res.status(404).json({ error: `Menu item with ID ${item.item_id} not found` });
        }
        const menuItem = menuItems[0];
        item.price = parseFloat(menuItem.price);
        item.name = menuItem.name;

        // Get existing quantity for this item in the order
        const [existingItems] = await pool.query(
          'SELECT quantity FROM order_items WHERE order_id = ? AND item_id = ? AND tenant_id = ?',
          [orderId, item.item_id, tenantId]
        );
        const existingQuantity = existingItems.length > 0 ? existingItems[0].quantity : 0;
        const quantityDifference = item.quantity - existingQuantity;
        stockAdjustments.set(item.item_id, (stockAdjustments.get(item.item_id) || 0) + quantityDifference);

        if (quantityDifference > 0 && menuItem.stock_quantity < quantityDifference) {
          console.error('Insufficient stock:', { tenantId, orderId, item_id: item.item_id, stock_quantity: menuItem.stock_quantity, requested_quantity: quantityDifference });
          return res.status(400).json({ error: `Insufficient stock for ${menuItem.name}. Available: ${menuItem.stock_quantity}` });
        }
      }

      // Start transaction
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Update stock
        for (const [itemId, quantityDifference] of stockAdjustments) {
          if (quantityDifference !== 0) {
            await connection.query(
              'UPDATE menu_items SET stock_quantity = stock_quantity - ? WHERE item_id = ? AND tenant_id = ?',
              [quantityDifference, itemId, tenantId]
            );
          }
        }

        // Set rider_id
        let assignedRiderId = existingOrder.rider_id;
        if (status === 'enroute' && !existingOrder.rider_id && req.user.role === 'rider') {
          assignedRiderId = req.user.userId;
          console.log('Assigning rider to order:', { tenantId, orderId, rider_id: assignedRiderId });
        } else if (is_delivery && rider_id && ['manager', 'kitchen'].includes(req.user.role)) {
          const [riders] = await pool.query(
            'SELECT user_id FROM users WHERE tenant_id = ? AND role = ? AND user_id = ?',
            [tenantId, 'rider', rider_id]
          );
          if (riders.length === 0) {
            console.error('Invalid rider ID:', { tenantId, orderId, rider_id });
            throw new Error('Invalid rider ID');
          }
          const [activeOrders] = await pool.query(
            'SELECT order_id FROM orders WHERE tenant_id = ? AND rider_id = ? AND status = ? AND order_id != ?',
            [tenantId, rider_id, 'enroute', orderId]
          );
          if (activeOrders.length > 0) {
            console.error('Rider is already enroute:', { tenantId, orderId, rider_id, activeOrders });
            throw new Error('Selected rider is currently enroute on another order');
          }
          assignedRiderId = rider_id;
        }

        // Calculate total price
        const totalPrice = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

        // Update order
        const preparationStartTime = status === 'preparing' && existingOrder.status !== 'preparing' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : existingOrder.preparation_start_time;
        const preparationEndTime = status === 'completed' && existingOrder.status !== 'completed' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : existingOrder.preparation_end_time;
        const deliveryStartTime = status === 'enroute' && existingOrder.status !== 'enroute' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : existingOrder.delivery_start_time;
        const deliveryEndTime = status === 'delivered' && existingOrder.status !== 'delivered' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : existingOrder.delivery_end_time;

        await connection.query(
          'UPDATE orders SET total_price = ?, status = ?, customer_name = ?, customer_phone = ?, preparation_start_time = ?, preparation_end_time = ?, is_delivery = ?, customer_location = ?, delivery_start_time = ?, delivery_end_time = ?, rider_id = ? WHERE order_id = ? AND tenant_id = ?',
          [totalPrice, status, customerName || null, customerPhone || null, preparationStartTime, preparationEndTime, is_delivery || existingOrder.is_delivery, customer_location || existingOrder.customer_location, deliveryStartTime, deliveryEndTime, assignedRiderId, orderId, tenantId]
        );

        // Update order items (delete existing and insert new)
        await connection.query('DELETE FROM order_items WHERE order_id = ? AND tenant_id = ?', [orderId, tenantId]);
        for (const item of items) {
          await connection.query(
            'INSERT INTO order_items (order_id, tenant_id, item_id, quantity, price, name) VALUES (?, ?, ?, ?, ?, ?)',
            [orderId, tenantId, item.item_id, item.quantity, item.price, item.name]
          );
        }

        // Insert order history
        const orderDetails = items.map(item => ({
          item_id: item.item_id,
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price),
        }));
        await connection.query(
          'INSERT INTO order_history (history_id, order_id, tenant_id, action, details, changed_by) VALUES (UUID(), ?, ?, ?, ?, ?)',
          [
            orderId,
            tenantId,
            'updated',
            JSON.stringify({
              items: orderDetails,
              total_price: totalPrice,
              status,
              customerName,
              customerPhone,
              preparation_start_time: preparationStartTime,
              preparation_end_time: preparationEndTime,
              delivery_start_time: deliveryStartTime,
              delivery_end_time: deliveryEndTime,
              is_delivery,
              customer_location,
              rider_id: assignedRiderId,
            }),
            req.user.username,
          ]
        );

        await connection.commit();

        // Broadcast notification
        const updatedOrder = {
          order_id: parseInt(orderId),
          items: orderDetails,
          total_price: totalPrice,
          status,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          preparation_start_time: preparationStartTime,
          preparation_end_time: preparationEndTime,
          delivery_start_time: deliveryStartTime,
          delivery_end_time: deliveryEndTime,
          is_delivery,
          customer_location,
          rider_id: assignedRiderId,
        };
        broadcastOrderNotification(tenantId, updatedOrder, 'order_updated');

        console.log('Order updated successfully:', { tenantId, orderId, rider_id: assignedRiderId });
        res.json({ success: true });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error updating order:', { error: error.message, tenantId, orderId });
      res.status(500).json({ error: 'Failed to update order', details: error.message });
    }
  });

  // Delete order
  router.delete('/orders/:orderId', authenticateToken, restrictToManager, async (req, res) => {
    const { tenantId, orderId } = req.params;
    if (req.user.tenantId !== tenantId) {
      console.error('Unauthorized tenant access:', { tenantId, user: req.user });
      return res.status(403).json({ error: 'Unauthorized tenant' });
    }

    console.log('Received order deletion request:', { tenantId, orderId, username: req.user.username });

    try {
      // Check if order exists
      const [orders] = await pool.query('SELECT * FROM orders WHERE order_id = ? AND tenant_id = ?', [orderId, tenantId]);
      if (orders.length === 0) {
        console.error('Order not found:', { tenantId, orderId });
        return res.status(404).json({ error: 'Order not found' });
      }
      const order = orders[0];

      // Prevent deletion if order is delivered
      if (order.status === 'delivered') {
        console.error('Order deletion denied: Order is delivered and locked', { tenantId, orderId });
        return res.status(403).json({ error: 'Order is delivered and cannot be deleted' });
      }

      // Fetch order items
      const [items] = await pool.query(
        'SELECT item_id, name, quantity, price FROM order_items WHERE order_id = ? AND tenant_id = ?',
        [orderId, tenantId]
      );

      // Start transaction
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Restore stock
        for (const item of items) {
          await connection.query(
            'UPDATE menu_items SET stock_quantity = stock_quantity + ? WHERE item_id = ? AND tenant_id = ?',
            [item.quantity, item.item_id, tenantId]
          );
        }

        // Insert order history
        const orderDetails = items.map(item => ({
          item_id: item.item_id,
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price),
        }));
        await connection.query(
          'INSERT INTO order_history (history_id, order_id, tenant_id, action, details, changed_by) VALUES (UUID(), ?, ?, ?, ?, ?)',
          [
            orderId,
            tenantId,
            'canceled',
            JSON.stringify({
              items: orderDetails,
              total_price: parseFloat(order.total_price),
              status: 'canceled',
              customerName: order.customer_name,
              customerPhone: order.customer_phone,
              is_delivery: order.is_delivery,
              customer_location: order.customer_location,
              rider_id: order.rider_id,
            }),
            req.user.username,
          ]
        );

        // Delete order (cascade will remove order_items)
        await connection.query('DELETE FROM orders WHERE order_id = ? AND tenant_id = ?', [orderId, tenantId]);

        await connection.commit();

        // Broadcast notification
        const canceledOrder = {
          order_id: parseInt(orderId),
          items: orderDetails,
          total_price: parseFloat(order.total_price),
          status: 'canceled',
          customer_name: order.customer_name || null,
          customer_phone: order.customer_phone || null,
          preparation_start_time: order.preparation_start_time || null,
          preparation_end_time: order.preparation_end_time || null,
          delivery_start_time: order.delivery_start_time || null,
          delivery_end_time: order.delivery_end_time || null,
          is_delivery: order.is_delivery,
          customer_location: order.customer_location || null,
          rider_id: order.rider_id || null,
        };
        broadcastOrderNotification(tenantId, canceledOrder, 'order_updated');

        console.log('Order canceled successfully:', { tenantId, orderId });
        res.json({ success: true });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error canceling order:', { error: error.message, tenantId, orderId });
      res.status(500).json({ error: 'Failed to cancel order', details: error.message });
    }
  });

  // Get orders
  router.get('/orders', authenticateToken, async (req, res) => {
    const { tenantId } = req.params;
    const { status, sortBy = 'created_at', sortOrder = 'DESC', search } = req.query;
    if (req.user.tenantId !== tenantId) {
      console.error('Unauthorized tenant access:', { tenantId, user: req.user });
      return res.status(403).json({ error: 'Unauthorized tenant' });
    }

    console.log('Fetching orders for tenant:', { tenantId, status, sortBy, sortOrder, search });

    try {
      let query = 'SELECT order_id, total_price, status, customer_name, customer_phone, created_at, preparation_start_time, preparation_end_time, delivery_start_time, delivery_end_time, is_delivery, customer_location, rider_id FROM orders WHERE tenant_id = ?';
      const params = [tenantId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (customer_name LIKE ? OR customer_phone LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (['order_id', 'total_price', 'created_at'].includes(sortBy)) {
        query += ` ORDER BY ${sortBy} ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
      } else {
        query += ' ORDER BY created_at DESC';
      }

      const [orders] = await pool.query(query, params);
      const formattedOrders = [];
      for (const order of orders) {
        const [items] = await pool.query(
          'SELECT item_id, name, quantity, price FROM order_items WHERE order_id = ? AND tenant_id = ?',
          [order.order_id, tenantId]
        );
        const formattedItems = items.map(item => ({
          item_id: parseInt(item.item_id),
          name: item.name,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price),
        }));
        formattedOrders.push({
          order_id: parseInt(order.order_id),
          items: formattedItems,
          total_price: parseFloat(order.total_price),
          status: order.status,
          customer_name: order.customer_name || null,
          customer_phone: order.customer_phone || null,
          created_at: order.created_at,
          preparation_start_time: order.preparation_start_time,
          preparation_end_time: order.preparation_end_time,
          delivery_start_time: order.delivery_start_time,
          delivery_end_time: order.delivery_end_time,
          is_delivery: parseInt(order.is_delivery),
          customer_location: order.customer_location,
          rider_id: parseInt(order.rider_id) || null,
        });
      }
      console.log('Orders fetched:', { tenantId, count: formattedOrders.length });
      res.json(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', { error: error.message, tenantId });
      res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
    }
  });

  // Export orders to CSV
  router.get('/orders/export', authenticateToken, restrictToManager, async (req, res) => {
    const { tenantId } = req.params;
    const { status, sortBy = 'created_at', sortOrder = 'DESC', search } = req.query;
    if (req.user.tenantId !== tenantId) {
      console.error('Unauthorized tenant access:', { tenantId, user: req.user });
      return res.status(403).json({ error: 'Unauthorized tenant' });
    }

    console.log('Exporting orders for tenant:', { tenantId, status, sortBy, sortOrder, search });

    try {
      let query = 'SELECT order_id, total_price, status, customer_name, customer_phone, created_at, preparation_start_time, preparation_end_time, delivery_start_time, delivery_end_time, is_delivery, customer_location, rider_id FROM orders WHERE tenant_id = ?';
      const params = [tenantId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (customer_name LIKE ? OR customer_phone LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (['order_id', 'total_price', 'created_at'].includes(sortBy)) {
        query += ` ORDER BY ${sortBy} ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
      } else {
        query += ' ORDER BY created_at DESC';
      }

      const [orders] = await pool.query(query, params);
      const formattedOrders = [];
      for (const order of orders) {
        const [items] = await pool.query(
          'SELECT item_id, name, quantity, price FROM order_items WHERE order_id = ? AND tenant_id = ?',
          [order.order_id, tenantId]
        );
        const itemsString = items.map(item => `${item.name} (Qty: ${item.quantity}, Price: ${item.price})`).join('; ');
        formattedOrders.push({
          order_id: parseInt(order.order_id),
          total_price: parseFloat(order.total_price),
          status: order.status,
          customer_name: order.customer_name || 'N/A',
          customer_phone: order.customer_phone || 'N/A',
          created_at: order.created_at,
          preparation_start_time: order.preparation_start_time || 'N/A',
          preparation_end_time: order.preparation_end_time || 'N/A',
          delivery_start_time: order.delivery_start_time || 'N/A',
          delivery_end_time: order.delivery_end_time || 'N/A',
          is_delivery: order.is_delivery ? 'Yes' : 'No',
          customer_location: order.customer_location || 'N/A',
          rider_id: order.rider_id || 'N/A',
          items: itemsString,
        });
      }

      if (formattedOrders.length === 0) {
        console.log('No orders to export:', { tenantId });
        return res.status(404).json({ error: 'No orders found' });
      }

      const fields = [
        'order_id',
        'total_price',
        'status',
        'customer_name',
        'customer_phone',
        'created_at',
        'preparation_start_time',
        'preparation_end_time',
        'delivery_start_time',
        'delivery_end_time',
        'is_delivery',
        'customer_location',
        'rider_id',
        'items',
      ];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(formattedOrders);

      res.header('Content-Type', 'text/csv');
      res.attachment(`orders_${tenantId}_${new Date().toISOString().slice(0, 10)}.csv`);
      console.log('Orders exported to CSV:', { tenantId, count: formattedOrders.length });
      res.send(csv);
    } catch (error) {
      console.error('Error exporting orders:', { error: error.message, tenantId });
      res.status(500).json({ error: 'Failed to export orders', details: error.message });
    }
  });

  return router;
};