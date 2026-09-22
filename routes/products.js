const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');

// Get distinct categories with counts
router.get('/categories', (req, res) => {
    db.all('SELECT category, COUNT(*) as count FROM products GROUP BY category', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json(rows);
    });
});

// Get all products with search, category filtering, and sorting
router.get('/', (req, res) => {
    const { search, category, sort, minPrice, maxPrice } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category.toLowerCase() !== 'all') {
        query += ' AND LOWER(category) = LOWER(?)';
        params.push(category);
    }

    if (search && search.trim() !== '') {
        query += ' AND (name LIKE ? OR description LIKE ? OR tagline LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
    }

    if (minPrice && !isNaN(minPrice)) {
        query += ' AND price >= ?';
        params.push(Number(minPrice));
    }

    if (maxPrice && !isNaN(maxPrice)) {
        query += ' AND price <= ?';
        params.push(Number(maxPrice));
    }

    // Sorting
    switch (sort) {
        case 'price_asc':
            query += ' ORDER BY price ASC';
            break;
        case 'price_desc':
            query += ' ORDER BY price DESC';
            break;
        case 'rating':
            query += ' ORDER BY rating DESC';
            break;
        case 'newest':
            query += ' ORDER BY created_at DESC';
            break;
        default:
            query += ' ORDER BY id ASC';
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error querying products:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json(rows);
    });
});

// Get single product
router.get('/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!product) return res.status(404).json({ error: 'Product not found.' });

        // Parse gallery and specs if JSON strings
        try {
            if (product.gallery && typeof product.gallery === 'string') {
                product.gallery = JSON.parse(product.gallery);
            }
        } catch (e) {
            product.gallery = [product.image_url];
        }

        try {
            if (product.specs && typeof product.specs === 'string') {
                product.specs = JSON.parse(product.specs);
            }
        } catch (e) {
            product.specs = {};
        }

        res.json(product);
    });
});

// Get product reviews
router.get('/:id/reviews', (req, res) => {
    const id = req.params.id;
    db.all('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC', [id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json(rows);
    });
});

// Submit product review (logged in users)
router.post('/:id/reviews', authenticateToken, (req, res) => {
    const productId = req.params.id;
    const userId = req.user.userId;
    const username = req.user.username;
    const { rating, comment } = req.body;

    if (!rating || !comment) {
        return res.status(400).json({ error: 'Rating and review comment are required.' });
    }

    const numRating = Math.max(1, Math.min(5, parseInt(rating, 10)));

    const insertStmt = db.prepare('INSERT INTO reviews (product_id, user_id, author_name, rating, comment) VALUES (?, ?, ?, ?, ?)');
    insertStmt.run([productId, userId, username, numRating, comment.trim()], function(err) {
        if (err) {
            console.error('Error adding review:', err);
            return res.status(500).json({ error: 'Database error adding review.' });
        }

        // Recalculate average rating for the product
        db.all('SELECT rating FROM reviews WHERE product_id = ?', [productId], (err, rows) => {
            if (!err && rows && rows.length > 0) {
                const total = rows.reduce((acc, r) => acc + r.rating, 0);
                const avg = (total / rows.length).toFixed(2);
                db.run('UPDATE products SET rating = ?, review_count = ? WHERE id = ?', [avg, rows.length, productId]);
            }
        });

        res.status(201).json({ message: 'Review submitted successfully!' });
    });
    insertStmt.finalize();
});

// Create a new product (for custom user addition / catalog expansion)
router.post('/', (req, res) => {
    const { name, tagline, description, price, original_price, category, stock, badge, image_url, gallery, specs } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: 'Product name and price are required.' });
    }

    const fallbackImg = '/images/placeholder.svg';
    const resolvedImg = (image_url && image_url.trim()) ? image_url.trim() : fallbackImg;
    const galleryJson = Array.isArray(gallery) ? JSON.stringify(gallery) : (gallery ? JSON.stringify([gallery]) : JSON.stringify([resolvedImg]));
    const specsJson = typeof specs === 'object' ? JSON.stringify(specs) : (specs || '{}');

    const stmt = db.prepare(`
        INSERT INTO products (name, tagline, description, price, original_price, category, rating, review_count, stock, badge, image_url, gallery, specs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
        name.trim(),
        tagline ? tagline.trim() : '',
        description ? description.trim() : '',
        parseFloat(price),
        original_price ? parseFloat(original_price) : null,
        category ? category.trim() : 'General',
        5.0,
        1,
        stock ? parseInt(stock, 10) : 15,
        badge ? badge.trim() : 'New',
        resolvedImg,
        galleryJson,
        specsJson
    ], function(err) {
        if (err) {
            console.error('Error inserting product:', err);
            return res.status(500).json({ error: 'Database error adding product.' });
        }
        res.status(201).json({ message: 'Product created successfully', productId: this.lastID });
    });
    stmt.finalize();
});

module.exports = router;
