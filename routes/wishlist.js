const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');

// Get all wishlist items for logged in user
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const query = `
        SELECT w.id as wishlist_id, w.created_at, p.*
        FROM wishlist_items w
        JOIN products p ON w.product_id = p.id
        WHERE w.user_id = ?
        ORDER BY w.created_at DESC
    `;

    db.all(query, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error fetching wishlist.' });
        res.json(rows);
    });
});

// Toggle product in wishlist (Add if not present, remove if already present)
router.post('/toggle', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.body;

    if (!productId) {
        return res.status(400).json({ error: 'Product ID required.' });
    }

    db.get('SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?', [userId, productId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error.' });

        if (row) {
            // Remove from wishlist
            db.run('DELETE FROM wishlist_items WHERE id = ?', [row.id], function(err) {
                if (err) return res.status(500).json({ error: 'Database error removing from wishlist.' });
                res.json({ inWishlist: false, message: 'Removed from wishlist' });
            });
        } else {
            // Add to wishlist
            db.run('INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?)', [userId, productId], function(err) {
                if (err) return res.status(500).json({ error: 'Database error adding to wishlist.' });
                res.status(201).json({ inWishlist: true, message: 'Saved to wishlist!' });
            });
        }
    });
});

// Clear entire wishlist
router.delete('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    db.run('DELETE FROM wishlist_items WHERE user_id = ?', [userId], function(err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json({ message: 'Wishlist cleared' });
    });
});

// Remove item from wishlist
router.delete('/:productId', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const productId = req.params.productId;

    db.run('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?', [userId, productId], function(err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json({ message: 'Removed from wishlist' });
    });
});

module.exports = router;
