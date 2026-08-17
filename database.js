const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Initialize tables
        db.serialize(() => {
            // Users Table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                email TEXT UNIQUE
            )`);

            // Products Table
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                description TEXT,
                price REAL,
                image_url TEXT
            )`);

            // Orders Table
            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                total_price REAL,
                status TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // Order Items Table
            db.run(`CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER,
                product_id INTEGER,
                quantity INTEGER,
                price REAL,
                FOREIGN KEY (order_id) REFERENCES orders (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`);

            // Cart Table (Simplified: stores active cart items for users)
            db.run(`CREATE TABLE IF NOT EXISTS cart_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                product_id INTEGER,
                quantity INTEGER,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`);
            
            // Seed sample products if empty
            db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
                if (row && row.count === 0) {
                    console.log('Seeding initial products...');
                    const stmt = db.prepare("INSERT INTO products (name, description, price, image_url) VALUES (?, ?, ?, ?)");
                    stmt.run("Wireless Headphones", "High-quality noise-canceling wireless headphones.", 199.99, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80");
                    stmt.run("Smart Watch", "Track your fitness and stay connected.", 249.50, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80");
                    stmt.run("Mechanical Keyboard", "RGB backlit mechanical keyboard with tactile switches.", 129.00, "https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&q=80");
                    stmt.run("Gaming Mouse", "Ergonomic gaming mouse with adjustable DPI.", 59.99, "https://images.unsplash.com/photo-1527814050087-379381547969?w=800&q=80");
                    stmt.run("4K Monitor", "Crisp 27-inch 4K UHD monitor for work and play.", 349.99, "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80");
                    stmt.run("Smartphone Gimbal", "3-axis stabilizer for smooth video recording.", 89.00, "https://images.unsplash.com/photo-1586952865915-d4191bb99ea1?w=800&q=80");
                    stmt.finalize();
                }
            });
        });
    }
});

module.exports = db;
