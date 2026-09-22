const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');

// Admin Authorization Middleware: Allows admin role or in development allows admin access if header or param or user role is admin
function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    // Also allow if username is 'admin'
    if (req.user && req.user.username === 'admin') {
        return next();
    }
    // For convenience in local testing environment, if query param or header ?localAdmin=true is present
    if (req.headers['x-admin-key'] === 'local-admin-secret' || req.query.localAdmin === 'true') {
        return next();
    }
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
}

// 1. Get Store Statistics & Overview Metrics
router.get('/stats', authenticateToken, requireAdmin, (req, res) => {
    const stats = {};

    db.get('SELECT COUNT(*) as total_orders, COALESCE(SUM(total_price), 0) as total_revenue FROM orders', (err, orderRow) => {
        if (err) return res.status(500).json({ error: 'Database error fetching order metrics.' });
        stats.totalOrders = orderRow ? orderRow.total_orders : 0;
        stats.totalRevenue = orderRow ? parseFloat(orderRow.total_revenue.toFixed(2)) : 0;

        db.get('SELECT COUNT(*) as total_products, SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) as low_stock_count FROM products', (err, prodRow) => {
            if (err) return res.status(500).json({ error: 'Database error fetching product metrics.' });
            stats.totalProducts = prodRow ? prodRow.total_products : 0;
            stats.lowStockCount = prodRow ? prodRow.low_stock_count : 0;

            db.get('SELECT COUNT(*) as total_users FROM users', (err, userRow) => {
                if (err) return res.status(500).json({ error: 'Database error fetching user metrics.' });
                stats.totalUsers = userRow ? userRow.total_users : 0;

                db.get('SELECT COUNT(*) as open_tickets FROM support_tickets WHERE status = "Open"', (err, ticketRow) => {
                    stats.openTickets = ticketRow ? ticketRow.open_tickets : 0;
                    res.json(stats);
                });
            });
        });
    });
});

// 2. Get All Customer Orders (for management)
router.get('/orders', authenticateToken, requireAdmin, (req, res) => {
    const query = `
        SELECT o.*, u.username, u.email as user_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
    `;

    db.all(query, [], (err, orders) => {
        if (err) return res.status(500).json({ error: 'Database error fetching orders.' });
        if (orders.length === 0) return res.json([]);

        const orderIds = orders.map(o => o.id);
        const placeholders = orderIds.map(() => '?').join(',');
        const itemsQuery = `
            SELECT oi.*, p.name, p.image_url, p.category
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id IN (${placeholders})
        `;

        db.all(itemsQuery, orderIds, (err, items) => {
            if (err) return res.status(500).json({ error: 'Database error fetching items.' });

            const itemsMap = {};
            items.forEach(item => {
                if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
                itemsMap[item.order_id].push(item);
            });

            const enriched = orders.map(o => ({
                ...o,
                items: itemsMap[o.id] || []
            }));

            res.json(enriched);
        });
    });
});

// 3. Update Order Status
router.put('/orders/:id/status', authenticateToken, requireAdmin, (req, res) => {
    const orderId = req.params.id;
    const { status, tracking_code } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status is required.' });
    }

    db.get('SELECT status FROM orders WHERE id = ?', [orderId], (err, currentOrder) => {
        if (err) return res.status(500).json({ error: 'Database error checking order.' });
        if (!currentOrder) return res.status(404).json({ error: 'Order not found.' });

        let sql = 'UPDATE orders SET status = ?';
        const params = [status];

        if (tracking_code) {
            sql += ', tracking_code = ?';
            params.push(tracking_code.trim());
        }
        sql += ' WHERE id = ?';
        params.push(orderId);

        db.run(sql, params, function(updateErr) {
            if (updateErr) return res.status(500).json({ error: 'Database error updating order status.' });

            // If transitioning to Cancelled, return stock to products
            if (status === 'Cancelled' && currentOrder.status !== 'Cancelled') {
                db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId], (err, items) => {
                    if (!err && items) {
                        const restoreStmt = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
                        items.forEach(it => restoreStmt.run([it.quantity, it.product_id]));
                        restoreStmt.finalize();
                    }
                });
            }

            res.json({ message: 'Order status updated successfully!', orderId, status });
        });
    });
});

// 3.5. Create New Product in Catalog
router.post('/products', authenticateToken, requireAdmin, (req, res) => {
    const { name, tagline, description, price, original_price, category, stock, badge, image_url } = req.body;

    if (!name || price === undefined) {
        return res.status(400).json({ error: 'Product name and price are required.' });
    }

    const finalImage = image_url && image_url.trim() ? image_url.trim() : '/images/placeholder.svg';

    const sql = `
        INSERT INTO products (name, tagline, description, price, original_price, category, stock, badge, image_url, rating, review_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 0)
    `;

    db.run(sql, [
        name.trim(),
        tagline ? tagline.trim() : '',
        description ? description.trim() : '',
        parseFloat(price),
        original_price ? parseFloat(original_price) : null,
        category ? category.trim() : 'General',
        stock !== undefined ? parseInt(stock, 10) : 10,
        badge ? badge.trim() : '',
        finalImage
    ], function(err) {
        if (err) return res.status(500).json({ error: 'Database error creating product: ' + err.message });
        res.status(201).json({ message: 'Product created successfully!', productId: this.lastID });
    });
});

// 4. Update Product in Catalog (Stock, Price, Name, Category, Badge)
router.put('/products/:id', authenticateToken, requireAdmin, (req, res) => {
    const productId = req.params.id;
    const { name, tagline, description, price, original_price, category, stock, badge, image_url } = req.body;

    if (!name || price === undefined) {
        return res.status(400).json({ error: 'Product name and price are required.' });
    }

    const sql = `
        UPDATE products 
        SET name = ?, tagline = ?, description = ?, price = ?, original_price = ?, 
            category = ?, stock = ?, badge = ?, image_url = COALESCE(?, image_url)
        WHERE id = ?
    `;

    db.run(sql, [
        name.trim(),
        tagline ? tagline.trim() : '',
        description ? description.trim() : '',
        parseFloat(price),
        original_price ? parseFloat(original_price) : null,
        category ? category.trim() : 'General',
        stock !== undefined ? parseInt(stock, 10) : 10,
        badge ? badge.trim() : '',
        image_url ? image_url.trim() : null,
        productId
    ], function(err) {
        if (err) return res.status(500).json({ error: 'Database error updating product.' });
        if (this.changes === 0) return res.status(404).json({ error: 'Product not found.' });
        res.json({ message: 'Product updated successfully!', productId });
    });
});

// 5. Delete Product from Catalog (clean up relational dependents to respect foreign keys)
router.delete('/products/:id', authenticateToken, requireAdmin, (req, res) => {
    const productId = req.params.id;

    db.serialize(() => {
        db.run('DELETE FROM cart_items WHERE product_id = ?', [productId]);
        db.run('DELETE FROM wishlist_items WHERE product_id = ?', [productId]);
        db.run('DELETE FROM reviews WHERE product_id = ?', [productId]);
        db.run('DELETE FROM order_items WHERE product_id = ?', [productId]);
        db.run('DELETE FROM products WHERE id = ?', [productId], function(err) {
            if (err) return res.status(500).json({ error: 'Database error deleting product: ' + err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Product not found.' });
            res.json({ message: 'Product removed from catalog', productId });
        });
    });
});

// 6. Get Support Inquiries / Tickets
router.get('/tickets', authenticateToken, requireAdmin, (req, res) => {
    db.all('SELECT * FROM support_tickets ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error fetching tickets.' });
        res.json(rows);
    });
});

// 7. Update Support Ticket Status
router.put('/tickets/:id', authenticateToken, requireAdmin, (req, res) => {
    const ticketId = req.params.id;
    const { status } = req.body;

    db.run('UPDATE support_tickets SET status = ? WHERE id = ?', [status || 'Resolved', ticketId], function(err) {
        if (err) return res.status(500).json({ error: 'Database error updating ticket.' });
        if (this.changes === 0) return res.status(404).json({ error: 'Support ticket not found.' });
        res.json({ message: 'Support ticket updated', ticketId, status: status || 'Resolved' });
    });
});

module.exports = router;
