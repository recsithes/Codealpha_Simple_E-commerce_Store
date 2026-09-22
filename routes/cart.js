const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');

// Get cart items for logged in user with enriched product details
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const query = `
        SELECT 
            c.id as cart_item_id, 
            c.quantity, 
            p.id as product_id,
            p.name,
            p.tagline,
            p.price,
            p.original_price,
            p.image_url,
            p.category,
            p.stock,
            p.badge
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
        ORDER BY c.id DESC
    `;
    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Error fetching cart:', err);
            return res.status(500).json({ error: 'Database error fetching cart.' });
        }
        res.json(rows);
    });
});

// Add item to cart
router.post('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { productId, quantity } = req.body;
    const qty = parseInt(quantity, 10) || 1;

    if (!productId || qty <= 0) {
        return res.status(400).json({ error: 'Valid product ID and positive quantity required.' });
    }

    // Verify product exists and check stock
    db.get('SELECT stock, name FROM products WHERE id = ?', [productId], (err, prod) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!prod) return res.status(404).json({ error: 'Product not found.' });

        // Check if item already exists in user's cart
        db.get('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId], (err, row) => {
            if (err) return res.status(500).json({ error: 'Database error.' });

            if (row) {
                const newQty = row.quantity + qty;
                if (prod.stock !== undefined && newQty > prod.stock) {
                    return res.status(400).json({ error: `Only ${prod.stock} units available in stock.` });
                }

                db.run('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, row.id], function(err) {
                    if (err) return res.status(500).json({ error: 'Database error.' });
                    res.json({ message: 'Cart updated successfully', quantity: newQty });
                });
            } else {
                if (prod.stock !== undefined && qty > prod.stock) {
                    return res.status(400).json({ error: `Only ${prod.stock} units available in stock.` });
                }

                db.run('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', [userId, productId, qty], function(err) {
                    if (err) return res.status(500).json({ error: 'Database error.' });
                    res.status(201).json({ message: 'Item added to cart', cartItemId: this.lastID });
                });
            }
        });
    });
});

// Update cart item quantity (+ / - or direct change)
router.put('/:id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const cartItemId = req.params.id;
    const { quantity } = req.body;
    const newQty = parseInt(quantity, 10);

    if (isNaN(newQty)) {
        return res.status(400).json({ error: 'Valid quantity number required.' });
    }

    if (newQty <= 0) {
        // Delete item if quantity <= 0
        db.run('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [cartItemId, userId], function(err) {
            if (err) return res.status(500).json({ error: 'Database error.' });
            return res.json({ message: 'Item removed from cart', removed: true });
        });
    } else {
        // Check product stock
        const checkQuery = `
            SELECT p.stock 
            FROM cart_items c
            JOIN products p ON c.product_id = p.id
            WHERE c.id = ? AND c.user_id = ?
        `;
        db.get(checkQuery, [cartItemId, userId], (err, row) => {
            if (err) return res.status(500).json({ error: 'Database error.' });
            if (!row) return res.status(404).json({ error: 'Cart item not found.' });

            if (row.stock !== undefined && newQty > row.stock) {
                return res.status(400).json({ error: `Maximum available stock is ${row.stock}.` });
            }

            db.run('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?', [newQty, cartItemId, userId], function(err) {
                if (err) return res.status(500).json({ error: 'Database error.' });
                res.json({ message: 'Cart updated', quantity: newQty });
            });
        });
    }
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
