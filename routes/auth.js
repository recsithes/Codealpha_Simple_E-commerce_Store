const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');
const authenticateToken = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
    const { username, password, email, full_name, phone, address } = req.body;
    
    if (!username || !password || !email) {
        return res.status(400).json({ error: 'Username, password and email are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const stmt = db.prepare('INSERT INTO users (username, password, email, role, full_name, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)');
        stmt.run([
            username.trim(), 
            hashedPassword, 
            email.trim().toLowerCase(), 
            'customer', 
            full_name ? full_name.trim() : username.trim(), 
            phone ? phone.trim() : '', 
            address ? address.trim() : ''
        ], function(err) {
            if (err) {
                if (err.message && err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username or email already exists.' });
                }
                return res.status(500).json({ error: 'Database error registering account.' });
            }
            res.status(201).json({ message: 'User registered successfully!', userId: this.lastID });
        });
        stmt.finalize();
    } catch (error) {
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required.' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username.trim()], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid username or password.' });

        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role || 'customer' 
            }, 
            req.app.get('jwt-secret'), 
            { expiresIn: '24h' }
        );

        res.json({ 
            message: 'Logged in successfully', 
            token, 
            user: { 
                id: user.id, 
                username: user.username,
                email: user.email,
                role: user.role || 'customer',
                full_name: user.full_name || user.username,
                phone: user.phone || '',
                address: user.address || ''
            } 
        });
    });
});

// Get User Profile & Statistics
router.get('/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    db.get('SELECT id, username, email, role, full_name, phone, address, created_at FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error fetching profile.' });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        // Get aggregate statistics
        db.get('SELECT COUNT(*) as order_count, COALESCE(SUM(total_price), 0) as total_spent FROM orders WHERE user_id = ?', [userId], (err, orderStats) => {
            db.get('SELECT COUNT(*) as wishlist_count FROM wishlist_items WHERE user_id = ?', [userId], (err, wlStats) => {
                res.json({
                    ...user,
                    stats: {
                        orders: orderStats ? orderStats.order_count : 0,
                        spent: orderStats ? parseFloat(orderStats.total_spent.toFixed(2)) : 0,
                        wishlist: wlStats ? wlStats.wishlist_count : 0
                    }
                });
            });
        });
    });
});

// Update User Profile Details
router.put('/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { full_name, email, phone, address } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
    }

    const sql = `
        UPDATE users 
        SET full_name = ?, email = ?, phone = ?, address = ? 
        WHERE id = ?
    `;

    db.run(sql, [full_name || '', email.trim().toLowerCase(), phone || '', address || '', userId], function(err) {
        if (err) {
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Email address is already in use.' });
            }
            return res.status(500).json({ error: 'Database error updating profile.' });
        }

        db.get('SELECT id, username, email, role, full_name, phone, address, created_at FROM users WHERE id = ?', [userId], (err, updatedUser) => {
            res.json({ message: 'Profile updated successfully!', user: updatedUser });
        });
    });
});

// Change Password
router.put('/password', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (new_password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    db.get('SELECT password FROM users WHERE id = ?', [userId], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const match = await bcrypt.compare(current_password, user.password);
        if (!match) return res.status(400).json({ error: 'Current password is incorrect.' });

        const newHash = await bcrypt.hash(new_password, 10);
        db.run('UPDATE users SET password = ? WHERE id = ?', [newHash, userId], function(err) {
            if (err) return res.status(500).json({ error: 'Failed to update password.' });
            res.json({ message: 'Password changed successfully!' });
        });
    });
});

module.exports = router;
