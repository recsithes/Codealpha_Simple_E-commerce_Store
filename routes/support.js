const express = require('express');
const router = express.Router();
const db = require('../database');

// 1. Submit Support Ticket / Contact Inquiry
router.post('/tickets', (req, res) => {
    const { name, email, subject, message, userId } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'Name, email, subject, and message are required.' });
    }

    const stmt = db.prepare(`
        INSERT INTO support_tickets (user_id, name, email, subject, message, status)
        VALUES (?, ?, ?, ?, ?, 'Open')
    `);

    stmt.run([userId || null, name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim()], function(err) {
        if (err) {
            console.error('Error saving support ticket:', err);
            return res.status(500).json({ error: 'Database error saving support inquiry.' });
        }
        res.status(201).json({
            message: 'Support request received! Our engineering team will respond within 2-4 hours.',
            ticketId: this.lastID
        });
    });
    stmt.finalize();
});

// 2. Public Tracking Code Lookup (No login required)
router.get('/track/:trackingCode', (req, res) => {
    const trackingCode = req.params.trackingCode.trim().toUpperCase();

    const sql = `
        SELECT id, status, total_price, shipping, created_at, tracking_code, shipping_address
        FROM orders 
        WHERE UPPER(tracking_code) = ?
    `;

    db.get(sql, [trackingCode], (err, order) => {
        if (err) return res.status(500).json({ error: 'Database error looking up shipment.' });
        if (!order) return res.status(404).json({ error: 'No shipment found with tracking code: ' + trackingCode });

        // Fetch ordered items
        db.all(`
            SELECT oi.quantity, oi.price, p.name, p.image_url, p.category 
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [order.id], (err, items) => {
            if (err) return res.status(500).json({ error: 'Database error fetching shipment items.' });

            let address = null;
            try {
                address = JSON.parse(order.shipping_address);
            } catch (e) {
                address = { name: 'Customer', street: order.shipping_address };
            }

            // Generate timeline checkpoints based on order status
            const orderDate = new Date(order.created_at);
            const now = new Date();
            
            const checkpoints = [
                {
                    title: 'Order Verified & Packed',
                    time: orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: orderDate.toLocaleDateString(),
                    done: true,
                    location: 'Austin Local Fulfillment Hub'
                },
                {
                    title: 'Dispatched with Carrier',
                    time: '04:15 PM',
                    date: orderDate.toLocaleDateString(),
                    done: ['Confirmed', 'Shipped', 'Delivered'].includes(order.status),
                    location: 'Austin Metro Logistics Facility'
                },
                {
                    title: 'In Transit / Out for Delivery',
                    time: '08:30 AM',
                    date: new Date(orderDate.getTime() + 86400000).toLocaleDateString(),
                    done: ['Shipped', 'Delivered'].includes(order.status),
                    location: 'Local Destination Depot'
                },
                {
                    title: 'Delivered & Handed to Recipient',
                    time: '02:00 PM',
                    date: new Date(orderDate.getTime() + 172800000).toLocaleDateString(),
                    done: order.status === 'Delivered',
                    location: address.city || 'Austin, TX'
                }
            ];

            res.json({
                orderId: order.id,
                status: order.status,
                trackingCode: order.tracking_code,
                createdAt: order.created_at,
                shippingAddress: address,
                items: items,
                checkpoints: checkpoints,
                carrier: 'AERO Precision Rapid Freight (Local)',
                estimatedDelivery: '2 Business Days'
            });
        });
    });
});

// 3. Interactive FAQ endpoint
router.get('/faq', (req, res) => {
    const faq = [
        {
            category: "Local Fulfillment",
            question: "How fast does local delivery operate?",
            answer: "All in-stock hardware orders placed before 3:00 PM CST are packaged and dispatched same-day from our Austin fulfillment center. Local ground shipping takes 1 to 2 business days."
        },
        {
            category: "Returns & Guarantee",
            question: "What is your 30-day return policy?",
            answer: "We stand behind every precision hardware instrument. If you are not completely satisfied within 30 days of receipt, generate a return label directly from your account for a 100% refund."
        },
        {
            category: "Hardware Warranty",
            question: "What does the 2-Year Precision Warranty cover?",
            answer: "Our 2-year warranty covers all mechanical failures, acoustic driver degradation, PCB soldering defects, and titanium bolt-action mechanism tolerances. Normal cosmetic wear is excluded."
        },
        {
            category: "Offline & Local First",
            question: "Does this store work completely offline?",
            answer: "Yes! The entire catalog, cart, SQLite database, and product artwork are bundled locally. You can browse, checkout, and test end-to-end functionality without relying on third-party cloud services."
        },
        {
            category: "Payment Methods",
            question: "Which payment options are supported?",
            answer: "We support simulated Instant Encrypted Cards, Local UPI/QR transfers, Bank Wire, and Cash on Local Pickup."
        }
    ];

    res.json(faq);
});

module.exports = router;
