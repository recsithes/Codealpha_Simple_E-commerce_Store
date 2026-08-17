const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');

// Get cart items for logged in user
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const query = `
        SELECT c.id as cart_item_id, c.quantity, p.*
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `;
    db.all(query, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json(rows);
    });
});

// Add item to cart
router.post('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Valid product ID and quantity required.' });
    }

    // Check if product already in cart
    db.get('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error.' });

        if (row) {
            // Update quantity
            const newQty = row.quantity + quantity;
            db.run('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, row.id], function(err) {
                if (err) return res.status(500).json({ error: 'Database error.' });
                res.json({ message: 'Cart updated successfully' });
            });
        } else {
            // Insert new cart item
            db.run('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', [userId, productId, quantity], function(err) {
                if (err) return res.status(500).json({ error: 'Database error.' });
                res.status(201).json({ message: 'Item added to cart' });
            });
        }
    });
});

// Remove item from cart
router.delete('/:id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const cartItemId = req.params.id;

    db.run('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [cartItemId, userId], function(err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (this.changes === 0) return res.status(404).json({ error: 'Item not found in cart.' });
        res.json({ message: 'Item removed from cart' });
    });
});

// Clear cart
router.delete('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    db.run('DELETE FROM cart_items WHERE user_id = ?', [userId], function(err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json({ message: 'Cart cleared' });
    });
});

module.exports = router;
