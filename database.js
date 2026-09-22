const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Initialize and migrate tables
        db.serialize(() => {
            // Enable foreign keys
            db.run('PRAGMA foreign_keys = ON');

            // 1. Users Table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                email TEXT UNIQUE,
                role TEXT DEFAULT 'customer',
                full_name TEXT,
                phone TEXT,
                address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            const userColumnsToAdd = [
                { name: 'role', type: 'TEXT DEFAULT "customer"' },
                { name: 'full_name', type: 'TEXT' },
                { name: 'phone', type: 'TEXT' },
                { name: 'address', type: 'TEXT' },
                { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
            ];

            userColumnsToAdd.forEach(col => {
                db.run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`, () => {});
            });

            // 2. Products Table
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                tagline TEXT,
                description TEXT,
                price REAL NOT NULL,
                original_price REAL,
                category TEXT DEFAULT 'General',
                rating REAL DEFAULT 4.8,
                review_count INTEGER DEFAULT 12,
                stock INTEGER DEFAULT 20,
                badge TEXT,
                image_url TEXT,
                gallery TEXT,
                specs TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            const columnsToAdd = [
                { name: 'tagline', type: 'TEXT' },
                { name: 'original_price', type: 'REAL' },
                { name: 'category', type: 'TEXT DEFAULT "General"' },
                { name: 'rating', type: 'REAL DEFAULT 4.8' },
                { name: 'review_count', type: 'INTEGER DEFAULT 12' },
                { name: 'stock', type: 'INTEGER DEFAULT 20' },
                { name: 'badge', type: 'TEXT' },
                { name: 'gallery', type: 'TEXT' },
                { name: 'specs', type: 'TEXT' },
                { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
            ];

            columnsToAdd.forEach(col => {
                db.run(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`, () => {});
            });

            // 3. Orders Table
            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                total_price REAL,
                subtotal REAL,
                discount REAL DEFAULT 0,
                shipping REAL DEFAULT 0,
                tax REAL DEFAULT 0,
                status TEXT DEFAULT 'Processing',
                shipping_address TEXT,
                payment_method TEXT DEFAULT 'Card',
                tracking_code TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            const orderColumnsToAdd = [
                { name: 'subtotal', type: 'REAL' },
                { name: 'discount', type: 'REAL DEFAULT 0' },
                { name: 'shipping', type: 'REAL DEFAULT 0' },
                { name: 'tax', type: 'REAL DEFAULT 0' },
                { name: 'shipping_address', type: 'TEXT' },
                { name: 'payment_method', type: 'TEXT DEFAULT "Card"' },
                { name: 'tracking_code', type: 'TEXT' }
            ];

            orderColumnsToAdd.forEach(col => {
                db.run(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`, () => {});
            });

            // 4. Order Items Table
            db.run(`CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER,
                product_id INTEGER,
                quantity INTEGER,
                price REAL,
                FOREIGN KEY (order_id) REFERENCES orders (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`);

            // 5. Cart Table
            db.run(`CREATE TABLE IF NOT EXISTS cart_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                product_id INTEGER,
                quantity INTEGER,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`);

            // 6. Wishlist Table
            db.run(`CREATE TABLE IF NOT EXISTS wishlist_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                product_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, product_id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`);

            // 7. Reviews Table
            db.run(`CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER,
                user_id INTEGER,
                author_name TEXT,
                rating INTEGER DEFAULT 5,
                comment TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // 8. Support Tickets Table
            db.run(`CREATE TABLE IF NOT EXISTS support_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT DEFAULT 'Open',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // 16 Rich Products Catalog with 100% Local Offline SVG Assets
            const seedCatalog = [
                {
                    id: 1,
                    name: "AeroSonics Pro ANC Headphones",
                    tagline: "Studio acoustics with active ambient soundstage",
                    description: "Engineered with 40mm bio-cellulose drivers, hybrid active noise cancellation, and ultra-plush memory foam earpads for 45 hours of immersive high-fidelity playback.",
                    price: 199.99,
                    original_price: 249.99,
                    category: "Audio",
                    rating: 4.9,
                    review_count: 86,
                    stock: 14,
                    badge: "Best Seller",
                    image_url: "/images/products/headphones.svg",
                    gallery: JSON.stringify([
                        "/images/products/headphones.svg",
                        "/images/products/speakers.svg",
                        "/images/products/earbuds.svg"
                    ]),
                    specs: JSON.stringify({
                        "Battery Life": "45 Hours (ANC On)",
                        "Driver Size": "40mm Bio-Cellulose",
                        "Connectivity": "Bluetooth 5.3 + 3.5mm Aux",
                        "Weight": "260g",
                        "Charging": "USB-C Fast Charge (10 min = 5 hrs)"
                    })
                },
                {
                    id: 2,
                    name: "Chronos Apex Titanium Smartwatch",
                    tagline: "Grade-5 titanium casing with sapphire crystal glass",
                    description: "Aerospace-grade titanium chassis loaded with continuous dual-sensor PPG heart rate tracking, VO2 max estimation, offline topological mapping, and 14-day battery reserve.",
                    price: 249.50,
                    original_price: 299.00,
                    category: "Wearables",
                    rating: 4.85,
                    review_count: 64,
                    stock: 9,
                    badge: "Staff Pick",
                    image_url: "/images/products/smartwatch.svg",
                    gallery: JSON.stringify([
                        "/images/products/smartwatch.svg",
                        "/images/products/charger.svg"
                    ]),
                    specs: JSON.stringify({
                        "Material": "Grade-5 Titanium + Sapphire Glass",
                        "Water Resistance": "10 ATM (100m)",
                        "Battery": "14 Days Typical Use",
                        "Display": "1.43\" AMOLED 466x466 1000 nits",
                        "Sensors": "Dual-wavelength SpO2, Heart Rate, Compass"
                    })
                },
                {
                    id: 3,
                    name: "KeyCraft Horizon 75% Custom Keyboard",
                    tagline: "Gasket-mounted CNC aluminum with hot-swap switches",
                    description: "Anodized CNC aluminum body with double-gasket dampening, south-facing RGB, hot-swappable tactile lubricated switches, and custom PBT dye-sublimated keycaps.",
                    price: 139.00,
                    original_price: 169.00,
                    category: "Mechanical",
                    rating: 4.95,
                    review_count: 112,
                    stock: 6,
                    badge: "Hot Deal",
                    image_url: "/images/products/keyboard.svg",
                    gallery: JSON.stringify([
                        "/images/products/keyboard.svg",
                        "/images/products/cable.svg"
                    ]),
                    specs: JSON.stringify({
                        "Layout": "75% Compact (82 Keys)",
                        "Mounting": "Poron Gasket Mount",
                        "Switch Type": "Pre-lubed Factory Tactile (55g)",
                        "Connectivity": "Tri-mode (2.4GHz, Bluetooth 5.1, USB-C)",
                        "Plate": "FR4 Flex-cut plate"
                    })
                },
                {
                    id: 4,
                    name: "ViperPro Ultra Ergonomic Gaming Mouse",
                    tagline: "58g ultralight honeycomb-free precision gaming mouse",
                    description: "Featuring a flawless 26,000 DPI optical sensor, optical microswitches rated for 90 million clicks, and pure PTFE glide feet for frictionless tournament tracking.",
                    price: 64.99,
                    original_price: 89.99,
                    category: "Mechanical",
                    rating: 4.78,
                    review_count: 49,
                    stock: 22,
                    badge: "-28% Off",
                    image_url: "/images/products/mouse.svg",
                    gallery: JSON.stringify([
                        "/images/products/mouse.svg",
                        "/images/products/deskpad.svg"
                    ]),
                    specs: JSON.stringify({
                        "Weight": "58 grams",
                        "Sensor": "PixArt PAW3395 26,000 DPI",
                        "Battery": "80 Hours Wireless",
                        "Polling Rate": "Up to 4,000 Hz",
                        "Switches": "Optical Gen-3 (0.2ms actuation)"
                    })
                },
                {
                    id: 5,
                    name: "Lumina 27\" Ultra-Clear 4K HDR Monitor",
                    tagline: "Calibrated 99% DCI-P3 Nano-IPS creative display",
                    description: "Delivering razor-sharp 3840x2160 resolution, hardware color calibration, 90W USB-C single cable power delivery, and an anti-reflective matte coating designed for creative professionals.",
                    price: 389.00,
                    original_price: 449.00,
                    category: "Desk Setup",
                    rating: 4.92,
                    review_count: 73,
                    stock: 5,
                    badge: "Limited Stock",
                    image_url: "/images/products/monitor.svg",
                    gallery: JSON.stringify([
                        "/images/products/monitor.svg",
                        "/images/products/lightbar.svg"
                    ]),
                    specs: JSON.stringify({
                        "Panel": "27-inch Nano-IPS 4K UHD",
                        "Refresh Rate": "144Hz with FreeSync Premium",
                        "Color Accuracy": "Delta E < 1, 99% DCI-P3, 10-bit",
                        "Ports": "1x USB-C (90W PD), 2x HDMI 2.1, 1x DP 1.4",
                        "Stand": "Full Ergonomic (Pivot, Swivel, Height, Tilt)"
                    })
                },
                {
                    id: 6,
                    name: "AeroSteady 3-Axis Smartphone Gimbal",
                    tagline: "Cinematic magnetic tracking with integrated extension rod",
                    description: "Transform mobile video into Hollywood-smooth tracking shots. Equipped with AI face/object recognition, built-in 215mm extension wand, magnetic clamp, and 3-axis brushless stabilization.",
                    price: 94.50,
                    original_price: 119.00,
                    category: "Cameras & EDC",
                    rating: 4.81,
                    review_count: 38,
                    stock: 12,
                    badge: "Trending",
                    image_url: "/images/products/gimbal.svg",
                    gallery: JSON.stringify([
                        "/images/products/gimbal.svg"
                    ]),
                    specs: JSON.stringify({
                        "Payload Capacity": "Up to 300g (supports Pro Max phones)",
                        "Stabilization": "3-Axis Brushless Motors",
                        "Battery Life": "8.5 Hours",
                        "Special Modes": "Inception 360, Dolly Zoom, ActiveTrack 6.0",
                        "Weight": "309g foldable"
                    })
                },
                {
                    id: 7,
                    name: "PrismPulse Studio Monitor Speakers",
                    tagline: "Acoustic waveguide nearfield reference monitors",
                    description: "Bi-amplified studio nearfield speakers with 5-inch woven composite woofers and silk dome tweeters, delivering flat response and expansive stereo imaging for music producers and audiophiles.",
                    price: 219.00,
                    original_price: 260.00,
                    category: "Audio",
                    rating: 4.88,
                    review_count: 52,
                    stock: 8,
                    badge: "Audiophile",
                    image_url: "/images/products/speakers.svg",
                    gallery: JSON.stringify([
                        "/images/products/speakers.svg"
                    ]),
                    specs: JSON.stringify({
                        "Amplification": "70W Class AB Bi-Amped",
                        "Frequency Response": "48Hz - 22kHz",
                        "Inputs": "Balanced XLR, 1/4\" TRS, RCA, Bluetooth 5.0",
                        "Cabinet": "Acoustically treated vinyl-laminated MDF"
                    })
                },
                {
                    id: 8,
                    name: "Nomad Precision Titanium EDC Pen",
                    tagline: "CNC machined Grade-5 titanium bolt-action pen",
                    description: "Crafted from solid aerospace titanium with a silky fluid bolt-action mechanism, German ceramic Schmidt refill, and balanced center of gravity for effortless lifelong writing.",
                    price: 49.00,
                    original_price: 65.00,
                    category: "Cameras & EDC",
                    rating: 4.96,
                    review_count: 94,
                    stock: 30,
                    badge: "Minimalist EDC",
                    image_url: "/images/products/pen.svg",
                    gallery: JSON.stringify([
                        "/images/products/pen.svg",
                        "/images/products/utilityknife.svg"
                    ]),
                    specs: JSON.stringify({
                        "Material": "Solid Grade-5 Titanium (Ti-6Al-4V)",
                        "Mechanism": "Fluid CNC Bolt-Action",
                        "Refill Compatibility": "Schmidt EasyFlow 9000 / Parker G2",
                        "Weight": "32 grams",
                        "Length": "128 mm"
                    })
                },
                {
                    id: 9,
                    name: "ApexFlow Coiled Aviator Keyboard Cable",
                    tagline: "Double-sleeved paracord with heavy GX16 5-pin quick release",
                    description: "Custom artisan keyboard cable featuring PET inner sleeving, tight 6-inch reverse-wound coils, and a precision zinc-alloy matte GX16 aviator connector for clean desk cable aesthetics.",
                    price: 34.00,
                    original_price: 45.00,
                    category: "Mechanical",
                    rating: 4.89,
                    review_count: 41,
                    stock: 18,
                    badge: "Artisan",
                    image_url: "/images/products/cable.svg",
                    gallery: JSON.stringify([
                        "/images/products/cable.svg",
                        "/images/products/keyboard.svg"
                    ]),
                    specs: JSON.stringify({
                        "Connector": "GX16 5-Pin Aviator (Silver Matte)",
                        "Coil Length": "6 Inches (150mm)",
                        "Cable Type": "Double-Sleeved Techflex over Paracord",
                        "Terminals": "Gold-Plated USB-C to USB-A",
                        "Total Length": "1.5 Meters"
                    })
                },
                {
                    id: 10,
                    name: "MagPulse 3-in-1 Fast Wireless Charging Station",
                    tagline: "15W magnetic fast dock for Phone, Smartwatch, and Earbuds",
                    description: "Heavy zinc alloy architecture with floating MagSafe alignment, dedicated watch disc, and recessed wireless pad. Reduces desk clutter to a single premium braided USB-C cable.",
                    price: 79.99,
                    original_price: 99.99,
                    category: "Desk Setup",
                    rating: 4.91,
                    review_count: 67,
                    stock: 15,
                    badge: "Popular",
                    image_url: "/images/products/charger.svg",
                    gallery: JSON.stringify([
                        "/images/products/charger.svg",
                        "/images/products/smartwatch.svg"
                    ]),
                    specs: JSON.stringify({
                        "Total Output": "25W (15W Phone + 5W Watch + 5W Earbuds)",
                        "Materials": "Zinc Alloy + Soft-Touch Silicone",
                        "Safety Protection": "FOD, Over-current, Over-voltage, Thermal",
                        "Weight": "420g Weighted Anti-Slide Base"
                    })
                },
                {
                    id: 11,
                    name: "TitanEdge Ergonomic Aluminum Laptop Stand",
                    tagline: "Dual-pivot stepless angle riser with passive cooling cutouts",
                    description: "Machined from solid aircraft aluminum plate with ultra-stiff dual friction hinges tested for 20,000 cycles. Elevates screen up to 12 inches to relieve neck tension during intense sessions.",
                    price: 54.50,
                    original_price: 69.00,
                    category: "Desk Setup",
                    rating: 4.84,
                    review_count: 53,
                    stock: 25,
                    badge: "Ergonomic",
                    image_url: "/images/products/stand.svg",
                    gallery: JSON.stringify([
                        "/images/products/stand.svg"
                    ]),
                    specs: JSON.stringify({
                        "Compatibility": "10\" to 17\" Laptops & Tablets",
                        "Material": "Anodized 6063 Aluminum (4mm thickness)",
                        "Max Load": "8 kg (17.6 lbs)",
                        "Pads": "Anti-scratch silicone base & cradle grips"
                    })
                },
                {
                    id: 12,
                    name: "SoundStage Ultra-Low Latency Wireless Earbuds",
                    tagline: "18ms gaming mode with 11mm beryllium-coated dynamic drivers",
                    description: "Engineered for competitive gameplay and audiophile clarity. Features proprietary sub-20ms wireless protocol, environmental noise-canceling dual mics, and IPX5 sweat resistance.",
                    price: 89.00,
                    original_price: 119.00,
                    category: "Audio",
                    rating: 4.79,
                    review_count: 36,
                    stock: 16,
                    badge: "Low Latency",
                    image_url: "/images/products/earbuds.svg",
                    gallery: JSON.stringify([
                        "/images/products/earbuds.svg",
                        "/images/products/headphones.svg"
                    ]),
                    specs: JSON.stringify({
                        "Latency": "18ms Ultra-Low Gaming Mode",
                        "Driver": "11mm Beryllium-Coated Diaphragm",
                        "Battery": "7 Hours Playback + 28 Hours with Case",
                        "Water Resistance": "IPX5 Sweat & Water Resistant"
                    })
                },
                {
                    id: 13,
                    name: "Horizon Felt & Leather Desk Pad XL",
                    tagline: "High-density merino wool felt with full-grain leather organizer",
                    description: "Expansive 900x400mm premium desk mat combining water-repellent compressed wool felt with vegetable-tanned leather organizer trim for pens, stylus, and magnetic cable docks.",
                    price: 42.00,
                    original_price: 55.00,
                    category: "Desk Setup",
                    rating: 4.93,
                    review_count: 88,
                    stock: 28,
                    badge: "Handcrafted",
                    image_url: "/images/products/deskpad.svg",
                    gallery: JSON.stringify([
                        "/images/products/deskpad.svg"
                    ]),
                    specs: JSON.stringify({
                        "Dimensions": "900mm x 400mm x 4mm (35.4\" x 15.7\")",
                        "Top Layer": "Anti-Pilling Merino Wool Felt",
                        "Accent": "Full-Grain Italian Vegetable-Tanned Leather",
                        "Underlay": "Natural Rubber Anti-Slip Grip Base"
                    })
                },
                {
                    id: 14,
                    name: "CyberLens UV Precision Optical Cleaning Kit",
                    tagline: "Anti-static cyclone air purge with carbon lens microfiber pen",
                    description: "Professional sensor and lens maintenance kit featuring a high-velocity silicone rocket blower with one-way intake filter, carbon tip lens cleaning pen, and 6 vacuum-sealed microfiber cloths.",
                    price: 29.99,
                    original_price: 39.99,
                    category: "Cameras & EDC",
                    rating: 4.87,
                    review_count: 44,
                    stock: 35,
                    badge: "Essential",
                    image_url: "/images/products/cleaner.svg",
                    gallery: JSON.stringify([
                        "/images/products/cleaner.svg",
                        "/images/products/gimbal.svg"
                    ]),
                    specs: JSON.stringify({
                        "Air Purge": "Medical-Grade Silicone Rocket Blower (Filter intake)",
                        "Lens Pen": "Dual-End Carbon Powder Sponge + Soft Brush",
                        "Cloths": "6x 15x15cm Optical Microfiber (Laser cut)",
                        "Safe For": "Camera sensors, lenses, monitor screens, eyeglasses"
                    })
                },
                {
                    id: 15,
                    name: "Lumina Studio LED Monitor Light Bar",
                    tagline: "Asymmetric optical path with wireless rotary desktop controller",
                    description: "Eliminates screen glare and eye strain. Casts balanced 2700K-6500K dynamic illumination directly across the workspace, controlled via a weighted 2.4GHz metal rotary puck.",
                    price: 74.00,
                    original_price: 95.00,
                    category: "Desk Setup",
                    rating: 4.94,
                    review_count: 61,
                    stock: 11,
                    badge: "Eye Comfort",
                    image_url: "/images/products/lightbar.svg",
                    gallery: JSON.stringify([
                        "/images/products/lightbar.svg",
                        "/images/products/monitor.svg"
                    ]),
                    specs: JSON.stringify({
                        "Optics": "45° Asymmetric Anti-Glare Reflector",
                        "Color Temperature": "Stepless 2700K - 6500K",
                        "CRI Rating": "Ra > 95 High Color Fidelity",
                        "Controller": "Wireless 2.4GHz Heavy CNC Knob",
                        "Power": "5V/2A USB-C to Monitor/PC"
                    })
                },
                {
                    id: 16,
                    name: "BoltAction Micro EDC Utility Knife",
                    tagline: "CNC titanium chassis with tool-free quick blade exchange",
                    description: "A precision everyday companion built from Ti-6Al-4V titanium. Uses standard replaceable trapezoid or hobby utility blades, equipped with a fluid sliding brass bolt lock and deep-carry clip.",
                    price: 39.50,
                    original_price: 52.00,
                    category: "Cameras & EDC",
                    rating: 4.92,
                    review_count: 77,
                    stock: 40,
                    badge: "Titanium EDC",
                    image_url: "/images/products/utilityknife.svg",
                    gallery: JSON.stringify([
                        "/images/products/utilityknife.svg",
                        "/images/products/pen.svg"
                    ]),
                    specs: JSON.stringify({
                        "Body Material": "Grade-5 Titanium (Ti-6Al-4V)",
                        "Lock Type": "Precision Bolt-Action Slider with Brass Pin",
                        "Blade Compatibility": "Standard SK5 Utility Blades (Includes 10x)",
                        "Weight": "28 grams",
                        "Dimensions": "84mm closed length"
                    })
                }
            ];

            // Upsert / Update products to ensure all 16 items have local image paths
            seedCatalog.forEach(p => {
                db.get("SELECT id FROM products WHERE id = ?", [p.id], (err, row) => {
                    if (row) {
                        db.run(`
                            UPDATE products 
                            SET name = ?, tagline = ?, description = ?, price = ?, original_price = ?, 
                                category = ?, rating = ?, review_count = ?, stock = ?, badge = ?, 
                                image_url = ?, gallery = ?, specs = ?
                            WHERE id = ?
                        `, [p.name, p.tagline, p.description, p.price, p.original_price, p.category, p.rating, p.review_count, p.stock, p.badge, p.image_url, p.gallery, p.specs, p.id]);
                    } else {
                        db.run(`
                            INSERT INTO products (id, name, tagline, description, price, original_price, category, rating, review_count, stock, badge, image_url, gallery, specs)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [p.id, p.name, p.tagline, p.description, p.price, p.original_price, p.category, p.rating, p.review_count, p.stock, p.badge, p.image_url, p.gallery, p.specs]);
                    }
                });
            });

            // Seed initial sample reviews if table is empty
            db.get("SELECT COUNT(*) as count FROM reviews", (err, row) => {
                if (row && row.count === 0) {
                    console.log('Seeding initial verified reviews...');
                    const reviews = [
                        { productId: 1, author: "Marcus Vance", rating: 5, comment: "Hands down the most comfortable ANC headphones I have ever worn. The soundstage is remarkably spacious and battery lasts forever." },
                        { productId: 1, author: "Elena Rostova", rating: 5, comment: "Cuts out subway noise completely. Build quality feels very solid with genuine metal hinges." },
                        { productId: 2, author: "David Sterling", rating: 5, comment: "The titanium finish is stunning in person. Battery easily hits 12 days even with continuous tracking enabled." },
                        { productId: 3, author: "Hiroshi Tanaka", rating: 5, comment: "Deep creamy sound right out of the box with zero switch ping. The gasket mount makes typing all day an absolute joy." },
                        { productId: 4, author: "Alex Chen", rating: 5, comment: "Extremely lightweight at 58g without needing cheese-grater holes. The sensor tracking is surgical." },
                        { productId: 5, author: "Claire Montclaire", rating: 5, comment: "Color accuracy is spot on out of the box for photo editing. The single USB-C cable keeps my desk completely cable-free." },
                        { productId: 6, author: "Jordan Reed", rating: 5, comment: "Magnetic phone mounting is seamless. The AI tracking follows face movements without losing focus." },
                        { productId: 7, author: "Stefan Meyer", rating: 5, comment: "Nearfield stereo imaging is incredible. The yellow composite woofers produce punchy, accurate low ends." },
                        { productId: 8, author: "Liam O'Connor", rating: 5, comment: "The bolt action mechanism has a very addictive click. The Schmidt refill writes like melted butter on paper." },
                        { productId: 15, author: "Sarah Jenkins", rating: 5, comment: "The wireless rotary knob is so convenient. Zero screen reflections on my matte monitor." }
                    ];

                    const revStmt = db.prepare("INSERT INTO reviews (product_id, author_name, rating, comment) VALUES (?, ?, ?, ?)");
                    reviews.forEach(r => revStmt.run([r.productId, r.author, r.rating, r.comment]));
                    revStmt.finalize();
                }
            });

            // Seed default demo user and demo admin for instant local testing
            try {
                // 1. Customer: alex_rivera
                db.get("SELECT id FROM users WHERE username = ?", ['alex_rivera'], (err, row) => {
                    const hash = bcrypt.hashSync('pass12345', 10);
                    if (!row) {
                        db.run("INSERT INTO users (username, password, email, role, full_name, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            ['alex_rivera', hash, 'alex.rivera@example.com', 'customer', 'Alex Rivera', '+1 (512) 555-0199', '442 Silicon Crest Way, Suite 8, Austin, TX 78701'], (err) => {
                                if (!err) console.log('Demo user alex_rivera ready for login testing.');
                            });
                    } else {
                        db.run("UPDATE users SET full_name = 'Alex Rivera', phone = '+1 (512) 555-0199', address = '442 Silicon Crest Way, Suite 8, Austin, TX 78701' WHERE username = 'alex_rivera'");
                    }
                });

                // 2. Admin: admin / admin123
                db.get("SELECT id FROM users WHERE username = ?", ['admin'], (err, row) => {
                    if (!row) {
                        const adminHash = bcrypt.hashSync('admin123', 10);
                        db.run("INSERT INTO users (username, password, email, role, full_name, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            ['admin', adminHash, 'admin@aerohardware.local', 'admin', 'Store Administrator', '+1 (512) 555-0100', '100 Innovation Parkway, Austin, TX 78701'], (err) => {
                                if (!err) console.log('Demo admin user ready for testing.');
                            });
                    }
                });
            } catch (e) {
                console.error('Error seeding demo users:', e);
            }
        });
    }
});

module.exports = db;
