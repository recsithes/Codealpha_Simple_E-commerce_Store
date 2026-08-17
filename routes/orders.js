const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');

// Create an order (Checkout)
router.post('/checkout', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    // 1. Get all items in user's cart
    db.all(`
        SELECT c.id as cart_item_id, c.quantity, p.id as product_id, p.price 
        FROM cart_items c 
        JOIN products p ON c.product_id = p.id 
        WHERE c.user_id = ?
    `, [userId], (err, cartItems) => {
        if (err) return res.status(500).json({ error: 'Database error fetching cart items.' });
        if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty.' });

        // 2. Calculate total price
        let totalPrice = 0;
        cartItems.forEach(item => {
            totalPrice += item.price * item.quantity;
        });

        // 3. Create the order
        db.run('INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, ?)', [userId, totalPrice, 'Pending'], function(err) {
            if (err) return res.status(500).json({ error: 'Database error creating order.' });
            
            const orderId = this.lastID;

            // 4. Move items to order_items
            const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
            cartItems.forEach(item => {
                stmt.run([orderId, item.product_id, item.quantity, item.price]);
            });
            stmt.finalize();

            // 5. Clear the cart
            db.run('DELETE FROM cart_items WHERE user_id = ?', [userId], (err) => {
                if (err) console.error('Error clearing cart after order', err);
                // Proceed anyway, order was created
                res.status(201).json({ message: 'Order placed successfully', orderId: orderId });
            });
        });
    });
});

// Get user's orders
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json(rows);
    });
});

module.exports = router;
