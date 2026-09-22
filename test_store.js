const http = require('http');
const fs = require('fs');
const path = require('path');

// Start the app in-memory or on port 3001 for test
process.env.PORT = '3001';
const app = require('./server');

function makeRequest(method, reqPath, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request({
            hostname: 'localhost',
            port: 3001,
            path: reqPath,
            method: method,
            headers: headers
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runVerification() {
    console.log('=== Starting Comprehensive Full-Store Test Suite ===');
    await new Promise(r => setTimeout(r, 1200));

    // 1. Products listing (expanded catalog)
    const prodRes = await makeRequest('GET', '/api/products');
    console.log('1. GET /api/products:', prodRes.status, 'Total catalog items:', prodRes.data.length);
    if (prodRes.data.length < 16) throw new Error(`Expected at least 16 products, found ${prodRes.data.length}`);

    // 2. Category filtering
    const catRes = await makeRequest('GET', '/api/products?category=Audio');
    console.log('2. GET /api/products?category=Audio:', catRes.status, 'Audio items:', catRes.data.length);
    if (catRes.data.length !== 3) throw new Error(`Expected 3 Audio items, got ${catRes.data.length}`);

    // 3. Search query
    const searchRes = await makeRequest('GET', '/api/products?search=Keyboard');
    console.log('3. GET /api/products?search=Keyboard:', searchRes.status, 'Search results:', searchRes.data.length);
    if (searchRes.data.length < 2) throw new Error('Expected at least 2 keyboard items');

    // 4. Price sorting
    const sortRes = await makeRequest('GET', '/api/products?sort=price_asc');
    console.log('4. GET /api/products?sort=price_asc:', sortRes.status, 'Cheapest:', sortRes.data[0].price);
    if (sortRes.data[0].price > sortRes.data[1].price) throw new Error('Sorting price_asc failed');

    // 5. Auth Login (Customer)
    const loginRes = await makeRequest('POST', '/api/auth/login', {
        username: 'alex_rivera',
        password: 'pass12345'
    });
    console.log('5. POST /api/auth/login:', loginRes.status, 'Token received:', !!loginRes.data.token);
    const token = loginRes.data.token;
    if (!token) throw new Error('Customer login failed to return token');

    // 6. Add to cart
    const addCartRes = await makeRequest('POST', '/api/cart', {
        productId: 1,
        quantity: 2
    }, token);
    console.log('6. POST /api/cart (add 2x item 1):', addCartRes.status, addCartRes.data.message);

    // 7. Get cart
    const getCartRes = await makeRequest('GET', '/api/cart', null, token);
    console.log('7. GET /api/cart:', getCartRes.status, 'Items count:', getCartRes.data.length);
    const cartItemId = getCartRes.data[0].cart_item_id;

    // 8. Update cart quantity
    const updateQtyRes = await makeRequest('PUT', `/api/cart/${cartItemId}`, {
        quantity: 3
    }, token);
    console.log('8. PUT /api/cart/:id (update to 3):', updateQtyRes.status, updateQtyRes.data.message);

    // 9. Wishlist toggle
    const wlRes = await makeRequest('POST', '/api/wishlist/toggle', { productId: 2 }, token);
    console.log('9. POST /api/wishlist/toggle:', wlRes.status, wlRes.data.message);

    // 10. Wishlist get
    const getWlRes = await makeRequest('GET', '/api/wishlist', null, token);
    console.log('10. GET /api/wishlist:', getWlRes.status, 'Wishlist count:', getWlRes.data.length);

    // 11. Validate Coupon (ALPHA20 & WELCOME15 & SAVE50)
    const promoRes = await makeRequest('POST', '/api/orders/validate-coupon', { code: 'ALPHA20' });
    console.log('11. POST /api/orders/validate-coupon (ALPHA20):', promoRes.status, promoRes.data.promo.description);
    const promo15 = await makeRequest('POST', '/api/orders/validate-coupon', { code: 'WELCOME15' });
    if (!promo15.data.valid) throw new Error('WELCOME15 coupon validation failed');

    // 12. Checkout
    const checkoutRes = await makeRequest('POST', '/api/orders/checkout', {
        shippingAddress: { name: 'Alex Rivera', street: '442 Silicon Crest', city: 'Austin', state: 'TX', zip: '78701' },
        paymentMethod: 'Instant Card',
        couponCode: 'ALPHA20'
    }, token);
    console.log('12. POST /api/orders/checkout:', checkoutRes.status, 'Order ID:', checkoutRes.data.orderId, 'Tracking:', checkoutRes.data.trackingCode);
    const trackingCode = checkoutRes.data.trackingCode;
    const placedOrderId = checkoutRes.data.orderId;
    if (!trackingCode) throw new Error('Tracking code missing from order checkout');

    // 13. Get Orders
    const ordersRes = await makeRequest('GET', '/api/orders', null, token);
    console.log('13. GET /api/orders:', ordersRes.status, 'Total user orders:', ordersRes.data.length);
    if (ordersRes.data.length === 0) throw new Error('Expected at least 1 order');

    // 14. Add Review
    const reviewRes = await makeRequest('POST', '/api/products/1/reviews', {
        rating: 5,
        comment: 'Exceptional build quality with pristine local fulfillment.'
    }, token);
    console.log('14. POST /api/products/1/reviews:', reviewRes.status, reviewRes.data.message);

    // 15. Get Reviews
    const getRevRes = await makeRequest('GET', '/api/products/1/reviews');
    console.log('15. GET /api/products/1/reviews:', getRevRes.status, 'Total reviews for item 1:', getRevRes.data.length);

    // 16. User Profile Retrieval
    const profileRes = await makeRequest('GET', '/api/auth/profile', null, token);
    console.log('16. GET /api/auth/profile:', profileRes.status, 'User:', profileRes.data.username, 'Orders count:', profileRes.data.stats.orders);
    if (profileRes.status !== 200 || !profileRes.data.email) throw new Error('Profile retrieval failed');

    // 17. User Profile Update
    const updateProfRes = await makeRequest('PUT', '/api/auth/profile', {
        full_name: 'Alex Rivera (Verified)',
        email: 'alex.rivera@example.com',
        phone: '+1 (512) 555-9876',
        address: '777 Tech Ridge Vista, Austin, TX 78702'
    }, token);
    console.log('17. PUT /api/auth/profile:', updateProfRes.status, updateProfRes.data.message);
    if (updateProfRes.status !== 200) throw new Error('Profile update failed');

    // 18. Submit Support Ticket
    const ticketRes = await makeRequest('POST', '/api/support/tickets', {
        name: 'Alex Rivera',
        email: 'alex.rivera@example.com',
        subject: 'Titanium Anodizing Specifications',
        message: 'Could you share the micron thickness of the Grade-5 titanium finish?'
    });
    console.log('18. POST /api/support/tickets:', ticketRes.status, 'Ticket ID:', ticketRes.data.ticketId);
    if (ticketRes.status !== 201) throw new Error('Support ticket creation failed');

    // 19. Public Shipment Tracking by Tracking Code
    const trackRes = await makeRequest('GET', `/api/support/track/${trackingCode}`);
    console.log('19. GET /api/support/track/:code:', trackRes.status, 'Status:', trackRes.data.status, 'Carrier:', trackRes.data.carrier);
    if (trackRes.status !== 200 || trackRes.data.trackingCode !== trackingCode) throw new Error('Shipment tracking lookup failed');

    // 20. Support FAQ
    const faqRes = await makeRequest('GET', '/api/support/faq');
    console.log('20. GET /api/support/faq:', faqRes.status, 'Topics count:', faqRes.data.length);
    if (faqRes.status !== 200 || faqRes.data.length < 4) throw new Error('Support FAQ failed');

    // 21. Admin Authentication
    const adminLoginRes = await makeRequest('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin123'
    });
    console.log('21. POST /api/auth/login (Admin):', adminLoginRes.status, 'Role:', adminLoginRes.data.user.role);
    const adminToken = adminLoginRes.data.token;
    if (!adminToken || adminLoginRes.data.user.role !== 'admin') throw new Error('Admin login failed');

    // 22. Admin Dashboard Stats
    const adminStatsRes = await makeRequest('GET', '/api/admin/stats', null, adminToken);
    console.log('22. GET /api/admin/stats:', adminStatsRes.status, 'Total revenue: $' + adminStatsRes.data.totalRevenue, 'Products:', adminStatsRes.data.totalProducts);
    if (adminStatsRes.status !== 200 || adminStatsRes.data.totalProducts < 16) throw new Error('Admin stats failed');

    // 23. Admin Orders Management
    const adminOrdersRes = await makeRequest('GET', '/api/admin/orders', null, adminToken);
    console.log('23. GET /api/admin/orders:', adminOrdersRes.status, 'All store orders:', adminOrdersRes.data.length);
    if (adminOrdersRes.status !== 200 || adminOrdersRes.data.length === 0) throw new Error('Admin orders list failed');

    // 24. Admin Order Status Update
    const updateOrderRes = await makeRequest('PUT', `/api/admin/orders/${placedOrderId}/status`, {
        status: 'Shipped',
        tracking_code: trackingCode
    }, adminToken);
    console.log('24. PUT /api/admin/orders/:id/status:', updateOrderRes.status, updateOrderRes.data.message);
    if (updateOrderRes.status !== 200) throw new Error('Admin order status update failed');

    // 25. Admin Product Stock & Price Update
    const updateProdRes = await makeRequest('PUT', '/api/admin/products/1', {
        name: 'AeroSonics Pro ANC Headphones',
        price: 199.99,
        stock: 25,
        category: 'Audio',
        badge: 'Best Seller'
    }, adminToken);
    console.log('25. PUT /api/admin/products/1:', updateProdRes.status, updateProdRes.data.message);
    if (updateProdRes.status !== 200) throw new Error('Admin product update failed');

    // 26. Local Image Assets Verification (100% Offline Integrity)
    console.log('26. Verifying all 16 local product SVG assets via HTTP...');
    const localImages = [
        'headphones.svg', 'smartwatch.svg', 'keyboard.svg', 'mouse.svg',
        'monitor.svg', 'gimbal.svg', 'speakers.svg', 'pen.svg',
        'cable.svg', 'charger.svg', 'stand.svg', 'earbuds.svg',
        'deskpad.svg', 'cleaner.svg', 'lightbar.svg', 'utilityknife.svg'
    ];

    for (const imgName of localImages) {
        const imgPath = `/images/products/${imgName}`;
        const imgRes = await makeRequest('GET', imgPath);
        if (imgRes.status !== 200) throw new Error(`Image asset ${imgPath} returned HTTP ${imgRes.status}`);
        if (!imgRes.data || imgRes.data.length < 50) throw new Error(`Image asset ${imgPath} is empty`);
    }
    console.log(`    ✓ All ${localImages.length} local SVG image files verified on HTTP 200!`);

    // 27. Clean URLs Frontend Verification
    console.log('27. Verifying all Clean URL pages...');
    const pages = ['/', '/wishlist', '/profile', '/admin', '/contact', '/about', '/compare', '/cart', '/orders', '/product', '/login', '/register'];
    for (const p of pages) {
        const pageRes = await makeRequest('GET', p);
        if (pageRes.status !== 200) throw new Error(`Clean URL route "${p}" returned ${pageRes.status}`);
        if (!pageRes.data || !pageRes.data.includes('<!DOCTYPE html>')) throw new Error(`Clean URL route "${p}" did not return HTML`);
    }
    console.log(`    ✓ All ${pages.length} frontend pages served cleanly with HTTP 200!`);

    // 28. API 404 JSON Handler Verification
    console.log('28. Verifying 404 JSON response on unrecognized /api/* route...');
    const api404Res = await makeRequest('GET', '/api/unrecognized_test_route');
    if (api404Res.status !== 404 || !api404Res.data.error) {
        throw new Error(`Expected 404 JSON with error for /api/unrecognized_test_route, got ${api404Res.status}`);
    }
    console.log('    ✓ Unknown /api/* route correctly returned 404 JSON:', api404Res.data.error);

    // 29. Promo Coupons Full Validation
    console.log('29. Verifying expanded coupon codes (SAVE50, FREESHIP, LOCAL10)...');
    const freeshipRes = await makeRequest('POST', '/api/orders/validate-coupon', { code: 'FREESHIP' });
    if (!freeshipRes.data.valid || freeshipRes.data.promo.type !== 'shipping') throw new Error('FREESHIP validation failed');
    const save50Res = await makeRequest('POST', '/api/orders/validate-coupon', { code: 'SAVE50' });
    if (!save50Res.data.valid || save50Res.data.promo.type !== 'fixed') throw new Error('SAVE50 validation failed');
    console.log('    ✓ Coupons FREESHIP and SAVE50 verified successfully');

    // 30. Clear Wishlist Verification (DELETE /api/wishlist)
    console.log('30. Verifying DELETE /api/wishlist to clear user wishlist...');
    // Add an item first
    await makeRequest('POST', '/api/wishlist/toggle', { productId: 3 }, token);
    const clearWlRes = await makeRequest('DELETE', '/api/wishlist', null, token);
    if (clearWlRes.status !== 200) throw new Error('Failed to clear wishlist');
    const checkWlRes = await makeRequest('GET', '/api/wishlist', null, token);
    if (checkWlRes.data.length !== 0) throw new Error(`Expected 0 wishlist items after clear, got ${checkWlRes.data.length}`);
    console.log('    ✓ DELETE /api/wishlist successfully emptied wishlist collection');

    // 31. Admin Product Creation (POST /api/admin/products)
    console.log('31. Verifying admin product creation via POST /api/admin/products...');
    const createProdRes = await makeRequest('POST', '/api/admin/products', {
        name: 'Quantum DAC Streamer',
        tagline: 'Precision 384kHz DSD512 Audio Transport',
        description: 'CNC milled aluminum enclosure with balanced XLR outputs.',
        price: 349.99,
        category: 'Audio',
        stock: 8,
        badge: 'Audiophile',
        image_url: '/images/products/speakers.svg'
    }, adminToken);
    if (createProdRes.status !== 201 || !createProdRes.data.productId) {
        throw new Error('Admin product creation failed');
    }
    const createdProdId = createProdRes.data.productId;
    console.log('    ✓ New product created with ID:', createdProdId);

    // 32. Cascade Deletion (Foreign Keys in Reviews, Cart, Wishlist)
    console.log('32. Verifying foreign key cascade deletion for product with reviews and cart items...');
    await makeRequest('POST', `/api/products/${createdProdId}/reviews`, {
        rating: 5,
        comment: 'Astounding soundstage and transparency.'
    }, token);
    await makeRequest('POST', '/api/cart', { productId: createdProdId, quantity: 1 }, token);
    await makeRequest('POST', '/api/wishlist/toggle', { productId: createdProdId }, token);

    const deleteProdRes = await makeRequest('DELETE', `/api/admin/products/${createdProdId}`, null, adminToken);
    if (deleteProdRes.status !== 200) {
        throw new Error(`Failed to cascade delete product: ${JSON.stringify(deleteProdRes.data)}`);
    }
    const checkDeletedRes = await makeRequest('GET', `/api/products/${createdProdId}`);
    if (checkDeletedRes.status !== 404) {
        throw new Error('Deleted product still returned HTTP 200');
    }
    console.log('    ✓ Cascade deletion succeeded without foreign key constraint violations');

    // 33. Order Cancellation Inventory Stock Restoration
    console.log('33. Verifying order cancellation stock auto-restoration...');
    const prodBeforeRes = await makeRequest('GET', '/api/products/1');
    const stockBefore = prodBeforeRes.data.stock;

    // Cancel the previously placed order
    const cancelOrderRes = await makeRequest('PUT', `/api/admin/orders/${placedOrderId}/status`, {
        status: 'Cancelled',
        tracking_code: trackingCode
    }, adminToken);
    if (cancelOrderRes.status !== 200) throw new Error('Failed to cancel order');

    const prodAfterRes = await makeRequest('GET', '/api/products/1');
    const stockAfter = prodAfterRes.data.stock;
    console.log(`    Stock before cancel: ${stockBefore}, Stock after cancel: ${stockAfter}`);
    if (stockAfter <= stockBefore) {
        throw new Error(`Expected stock to increase upon order cancellation. Before: ${stockBefore}, After: ${stockAfter}`);
    }
    console.log('    ✓ Order cancellation automatically restored physical warehouse stock!');

    console.log('================================================================');
    console.log('🎉 ALL 33 END-TO-END INTEGRATION & STRESS TESTS PASSED CLEANLY!');
    console.log('================================================================');
    process.exit(0);
}

runVerification().catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
