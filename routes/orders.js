const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');

// Available coupon codes
const PROMO_CODES = {
    'ALPHA20': { type: 'percent', value: 0.20, description: '20% Off Storewide' },
    'FREESHIP': { type: 'shipping', value: 1.0, description: 'Free Express Shipping' },
    'LOCAL10': { type: 'percent', value: 0.10, description: '10% Local Discount' },
    'WELCOME15': { type: 'percent', value: 0.15, description: '15% Welcome Discount' },
    'SAVE50': { type: 'fixed', value: 50.00, minSubtotal: 200, description: '$50 Off Orders Over $200' }
};

// Checkout
router.post('/checkout', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { shippingAddress, paymentMethod, couponCode } = req.body;

    // 1. Fetch current cart items
    const cartQuery = `
        SELECT c.id as cart_item_id, c.quantity, p.id as product_id, p.name, p.price, p.stock 
        FROM cart_items c 
        JOIN products p ON c.product_id = p.id 
        WHERE c.user_id = ?
    `;

    db.all(cartQuery, [userId], (err, cartItems) => {
        if (err) return res.status(500).json({ error: 'Database error fetching cart.' });
        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty. Add items before checking out.' });
        }

        // 2. Validate stock and calculate subtotal
        let subtotal = 0;
        for (const item of cartItems) {
            if (item.stock !== undefined && item.quantity > item.stock) {
                return res.status(400).json({ error: `Insufficient stock for "${item.name}". Only ${item.stock} left.` });
            }
            subtotal += item.price * item.quantity;
        }

        // 3. Calculate discounts & shipping
        let discount = 0;
        let shipping = subtotal >= 100 ? 0 : 9.99;

        const code = couponCode ? couponCode.trim().toUpperCase() : null;
        if (code && PROMO_CODES[code]) {
            const promo = PROMO_CODES[code];
            if (promo.type === 'percent') {
                discount = subtotal * promo.value;
            } else if (promo.type === 'shipping') {
                shipping = 0;
            } else if (promo.type === 'fixed') {
                if (!promo.minSubtotal || subtotal >= promo.minSubtotal) {
                    discount = Math.min(subtotal, promo.value);
                }
            }
        }

        const taxableAmount = Math.max(0, subtotal - discount);
        const tax = parseFloat((taxableAmount * 0.0825).toFixed(2));
        const totalPrice = parseFloat((taxableAmount + shipping + tax).toFixed(2));

        const trackingCode = `TRK-${Math.floor(100000 + Math.random() * 900000)}-LOCAL`;
        const addressJson = typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : (shippingAddress || 'Local Pickup');
        const payment = paymentMethod || 'Standard Card';

        // 4. Create Order
        const insertOrderSql = `
            INSERT INTO orders (user_id, total_price, subtotal, discount, shipping, tax, status, shipping_address, payment_method, tracking_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(insertOrderSql, [
            userId,
            totalPrice,
            subtotal,
            discount,
            shipping,
            tax,
            'Confirmed',
            addressJson,
            payment,
            trackingCode
        ], function(err) {
            if (err) {
                console.error('Error creating order:', err);
                return res.status(500).json({ error: 'Database error creating order.' });
            }

            const orderId = this.lastID;

            // 5. Insert order items & reduce stock
            const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
            const stockStmt = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');

            cartItems.forEach(item => {
                itemStmt.run([orderId, item.product_id, item.quantity, item.price]);
                stockStmt.run([item.quantity, item.product_id]);
            });

            itemStmt.finalize();
            stockStmt.finalize();

            // 6. Clear user cart
            db.run('DELETE FROM cart_items WHERE user_id = ?', [userId], (err) => {
                if (err) console.error('Error clearing cart:', err);

                res.status(201).json({
                    message: 'Order placed successfully!',
                    orderId: orderId,
                    totalPrice: totalPrice,
                    trackingCode: trackingCode,
                    estimatedDelivery: '2-3 Business Days'
                });
            });
        });
    });
});

// Validate coupon endpoint
router.post('/validate-coupon', (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Promo code required' });

    const cleanCode = code.trim().toUpperCase();
    if (PROMO_CODES[cleanCode]) {
        res.json({ valid: true, promo: PROMO_CODES[cleanCode] });
    } else {
        res.status(404).json({ valid: false, error: 'Invalid or expired coupon code' });
    }
});

// Get user orders with items summary
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    const ordersQuery = `
        SELECT * FROM orders 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    `;

    db.all(ordersQuery, [userId], (err, orders) => {
        if (err) return res.status(500).json({ error: 'Database error fetching orders.' });
        if (orders.length === 0) return res.json([]);

        // Fetch items for all user orders
        const orderIds = orders.map(o => o.id);
        const placeholders = orderIds.map(() => '?').join(',');
        const itemsQuery = `
            SELECT oi.*, p.name, p.image_url 
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id IN (${placeholders})
        `;

        db.all(itemsQuery, orderIds, (err, items) => {
            if (err) return res.status(500).json({ error: 'Database error fetching order items.' });

            const itemsByOrder = {};
            items.forEach(item => {
                if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
                itemsByOrder[item.order_id].push(item);
            });

            const enrichedOrders = orders.map(o => ({
                ...o,
                items: itemsByOrder[o.id] || []
            }));

            res.json(enrichedOrders);
        });
    });
});

// Get single order details
router.get('/:id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const orderId = req.params.id;

    db.get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId], (err, order) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        const itemsQuery = `
            SELECT oi.*, p.name, p.image_url, p.category 
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `;

        db.all(itemsQuery, [orderId], (err, items) => {
            if (err) return res.status(500).json({ error: 'Database error.' });
            order.items = items;
            res.json(order);
        });
    });
});

module.exports = router;
