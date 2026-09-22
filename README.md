# AERO // Precision Hardware & EDC E-Commerce Store

An end-to-end, fully functional, multi-page local e-commerce web application crafted with high-performance hardware aesthetics, running 100% locally with zero cloud dependencies.

Built with **Node.js**, **Express**, **Vanilla CSS & JS**, and an embedded **SQLite3** database.

---

## 🌟 Pages & Architecture

1. **Store Catalog & Home (`/` or `/index.html`)**:
   - Hero banner with flagship product spotlight
   - Live debounced search with instant autocomplete dropdown (`/` keyboard shortcut)
   - Category filtering (Audio, Wearables, Mechanical, Desk Setup, Cameras & EDC)
   - Sort selector (Featured, Price: Low to High, Price: High to Low, Rating, Newest)
   - Product cards with stock urgency indicators, sale badges, wishlist toggle, compare button, and quick-add to bag

2. **Product Detail View (`/product` or `/product.html?id=...`)**:
   - Multi-angle gallery with interactive thumbnails
   - Comprehensive technical specifications sheet
   - Verified buyer ratings breakdown and reviews
   - Interactive review submission form
   - Related products carousel

3. **Wishlist Page (`/wishlist` or `/wishlist.html`)**:
   - Dedicated full-page saved items view
   - 1-Click "Move All to Bag" batch action
   - Quick compare and remove controls

4. **Product Comparison Matrix (`/compare` or `/compare.html`)**:
   - Side-by-side engineering comparison of 2 to 4 products simultaneously
   - Compare pricing, original price, verified ratings, stock levels, battery life, materials, and warranty
   - Dynamic product selector dropdown

5. **Customer Support, FAQ & Live Tracker (`/contact` or `/contact.html`)**:
   - Public shipment tracking query by tracking code (`TRK-...`) with animated checkpoint timeline (Packed -> Dispatched -> In Transit -> Delivered)
   - Direct hardware support inquiry / ticket dispatch form
   - Interactive FAQ accordion covering local dispatch, warranty, returns, and payment

6. **User Account & Profile Settings (`/profile` or `/profile.html`)**:
   - Profile summary with total orders count, total spent ($), and saved wishlist items
   - Personal contact information and default shipping address editor
   - Password change form with current password verification

7. **Store Administration Dashboard (`/admin` or `/admin.html`)**:
   - Live business metric cards (Gross Revenue, Total Orders, Active Catalog Items, Low Stock Warnings)
   - Orders management table with live status dropdown update (Processing -> Confirmed -> Shipped -> Delivered -> Cancelled) and tracking code editor
   - Inventory catalog table with live price/stock quick editing and product deletion
   - Support tickets inbox with Open/Resolved status toggle

8. **Shopping Bag & Multi-Step Checkout (`/cart` or `/cart.html` + Slide-Over Drawer)**:
   - Live quantity steppers and instant subtotal/tax/shipping recalculation
   - Coupon promo code system
   - 3-Step express checkout modal (Shipping Address -> Payment Method -> Order Confirmation with Tracking Code)

9. **Order History & Real-Time Tracking (`/orders` or `/orders.html`)**:
   - Itemized purchase history, delivery address details, and live status progress bars

10. **About Us (`/about` or `/about.html`)**:
    - Brand story, engineering tolerances, aerospace titanium craftsmanship, and offline-first local architecture principles

11. **Authentication (`/login` and `/register`)**:
    - Secure bcrypt password hashing and JWT token management
    - 1-Click test credentials autofill

---

## 🖼️ 100% Local Offline Images & Fix for Missing Assets

- **Problem solved**: Remote Unsplash images were failing with 404 errors (specifically product 4 and product 6) and broke in offline environments.
- **Solution**: Designed and bundled 16 high-resolution vector SVG assets in `/public/images/products/*.svg` for every product in the catalog.
- **Automatic Fallback**: All `<img>` tags across the application include `onerror="this.onerror=null;this.src='/images/placeholder.svg'"` to guarantee zero broken images under any condition.

---

## 🚀 Running in Local Environment

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
node server.js
# or: npm start
```

### 3. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Demo Accounts & Testing

### 1. Customer Account
- **Username**: `alex_rivera`
- **Password**: `pass12345`
- (Available via 1-click **Autofill** button on `/login.html`)

### 2. Administrator Account
- **Username**: `admin`
- **Password**: `admin123`
- (Available via 1-click **Sign In as Demo Admin** on `/admin.html`)

---

## 🎟️ Active Promo Codes

Apply in the Shopping Bag drawer or during checkout:
- `ALPHA20`: **20% Off Storewide**
- `WELCOME15`: **15% Off Welcome Discount**
- `FREESHIP`: **Free Express Shipping**
- `LOCAL10`: **10% Local Discount**
- `SAVE50`: **$50 Off Orders Over $200**

---

## 🧪 Comprehensive Verification Suite

Run the automated 33-point end-to-end integration and stress test suite:
```bash
node test_store.js
```
Validates catalog, filtering, search, sorting, authentication, cart, checkout, reviews, profile, support tickets, public tracking, admin controls, product creation/cascade deletion, inventory stock auto-restoration upon order cancellation, local SVG image integrity, and clean URL routing.
