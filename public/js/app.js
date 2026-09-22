// State & Configuration
const API_BASE = '/api';
let activePromo = null;
let wishlistProductIds = new Set();

// -------------------------------------------------------------
// Auth & Local Storage Helpers
// -------------------------------------------------------------
function getAuthToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const userStr = localStorage.getItem('user');
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
}

function setAuthSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    updateNav();
    syncWishlist();
    updateCartCount();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Signed out successfully');
    updateNav();
    setTimeout(() => {
        window.location.href = '/';
    }, 400);
}

// -------------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------------
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : '✕';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// -------------------------------------------------------------
// Theme Toggle (Obsidian Dark / Studio Light)
// -------------------------------------------------------------
function initTheme() {
    const savedTheme = localStorage.getItem('store_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('store_theme', next);
    showToast(`Theme switched to ${next} mode`);
}

// -------------------------------------------------------------
// Navigation Bar Controller
// -------------------------------------------------------------
function updateNav() {
    const user = getUser();
    const navAuthContainer = document.getElementById('nav-auth-links');
    if (!navAuthContainer) return;

    const isAdmin = user && (user.role === 'admin' || user.username === 'admin');

    if (user) {
        navAuthContainer.innerHTML = `
            <a href="/" class="nav-btn nav-link-desktop" title="Explore Catalog">Shop</a>
            <a href="/wishlist.html" class="nav-btn has-badge" title="Wishlist">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <span class="badge-count" id="nav-wishlist-count">0</span>
            </a>
            <a href="/compare.html" class="nav-btn has-badge" title="Compare Products">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                <span class="badge-count" id="nav-compare-count">0</span>
            </a>
            <button class="nav-btn has-badge" onclick="openCartDrawer()" title="View Shopping Bag">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                <span class="badge-count" id="nav-cart-count">0</span>
            </button>
            <div class="user-menu">
                <a href="/profile.html" class="user-avatar" title="${user.username} (${user.role || 'customer'})">${user.username.charAt(0).toUpperCase()}</a>
                <a href="/profile.html" class="nav-btn" title="My Account">Profile</a>
                <a href="/orders.html" class="nav-btn" title="View Order History">Orders</a>
                ${isAdmin ? '<a href="/admin.html" class="nav-btn" style="color:var(--accent-amber); font-weight:700;" title="Store Administration">Admin</a>' : ''}
                <a href="/contact.html" class="nav-btn nav-link-desktop" title="Customer Support & Live Tracking">Support</a>
                <button class="nav-btn" onclick="logout()" title="Sign Out">Sign Out</button>
            </div>
            <button class="theme-toggle-btn" onclick="toggleTheme()" title="Toggle Light/Dark Theme">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            </button>
        `;
        updateCartCount();
        syncWishlist();
        updateCompareCount();
    } else {
        navAuthContainer.innerHTML = `
            <a href="/" class="nav-btn nav-link-desktop">Shop</a>
            <a href="/compare.html" class="nav-btn nav-link-desktop">Compare</a>
            <a href="/contact.html" class="nav-btn nav-link-desktop">Support & Track</a>
            <a href="/about.html" class="nav-btn nav-link-desktop">About</a>
            <a href="/login.html" class="nav-btn">Sign In</a>
            <a href="/register.html" class="btn btn-primary btn-sm">Get Started</a>
            <button class="theme-toggle-btn" onclick="toggleTheme()" title="Toggle Theme">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line></svg>
            </button>
        `;
    }
}

// -------------------------------------------------------------
// Cart Drawer & Management
// -------------------------------------------------------------
async function updateCartCount() {
    const token = getAuthToken();
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const items = await res.json();
            const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
            const countEl = document.getElementById('nav-cart-count');
            if (countEl) countEl.textContent = totalCount;
        }
    } catch (e) {
        console.error('Error fetching cart count:', e);
    }
}

function ensureCartDrawer() {
    if (!document.getElementById('cart-drawer')) {
        const overlay = document.createElement('div');
        overlay.className = 'drawer-overlay';
        overlay.id = 'cart-drawer-overlay';
        overlay.onclick = closeCartDrawer;
        document.body.appendChild(overlay);

        const drawer = document.createElement('aside');
        drawer.className = 'drawer-container';
        drawer.id = 'cart-drawer';
        drawer.setAttribute('aria-label', 'Shopping bag');
        drawer.innerHTML = `
            <div class="drawer-header">
                <div class="drawer-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    <span>Shopping Bag</span>
                </div>
                <button class="drawer-close" onclick="closeCartDrawer()" aria-label="Close bag">✕</button>
            </div>
            <div class="drawer-body" id="drawer-cart-list"></div>
            <div class="drawer-footer" id="drawer-cart-footer">
                <div class="promo-box">
                    <input type="text" id="drawer-promo-input" class="promo-input" placeholder="Promo code (ALPHA20)" aria-label="Promo code">
                    <button class="btn btn-secondary btn-sm" onclick="applyPromoCode()">Apply</button>
                </div>
                <div id="drawer-summary-container"></div>
                <button class="btn btn-primary btn-block" style="margin-top:1.25rem;" onclick="openCheckoutModal()" id="btn-drawer-checkout">
                    <span>Proceed to Checkout</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
                <a href="/cart.html" style="display:block; text-align:center; margin-top:0.75rem; font-size:0.85rem; color:var(--text-secondary); text-decoration:none;">View Full Bag Page →</a>
            </div>
        `;
        document.body.appendChild(drawer);
    }
}

function openCartDrawer() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    ensureCartDrawer();
    const overlay = document.getElementById('cart-drawer-overlay');
    const drawer = document.getElementById('cart-drawer');
    if (overlay && drawer) {
        overlay.classList.add('active');
        drawer.classList.add('active');
        loadDrawerCart();
    } else {
        window.location.href = '/cart.html';
    }
}

function closeCartDrawer() {
    const overlay = document.getElementById('cart-drawer-overlay');
    const drawer = document.getElementById('cart-drawer');
    if (overlay && drawer) {
        overlay.classList.remove('active');
        drawer.classList.remove('active');
    }
}

async function loadDrawerCart() {
    const token = getAuthToken();
    if (!token) return;

    const listEl = document.getElementById('drawer-cart-list');
    const footerEl = document.getElementById('drawer-cart-footer');
    if (!listEl) return;

    listEl.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:2rem 0;">Loading bag items...</p>';

    try {
        const res = await fetch(`${API_BASE}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load cart');

        const items = await res.json();
        if (items.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center; padding:3.5rem 1rem;">
                    <div style="font-size:2.5rem; margin-bottom:1rem; opacity:0.6;">🛍️</div>
                    <h3 style="font-size:1.15rem; margin-bottom:0.5rem;">Your bag is empty</h3>
                    <p style="color:var(--text-muted); font-size:0.875rem; margin-bottom:1.5rem;">Explore our curated selection and add your favorite pieces.</p>
                    <button class="btn btn-secondary btn-sm" onclick="closeCartDrawer()">Explore Catalog</button>
                </div>
            `;
            if (footerEl) footerEl.style.display = 'none';
            return;
        }

        if (footerEl) footerEl.style.display = 'block';

        let subtotal = 0;
        listEl.innerHTML = items.map(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            return `
                <div class="cart-item-row" id="drawer-item-${item.cart_item_id}">
                    <img src="${item.image_url}" alt="${item.name}" class="cart-item-thumb" onerror="this.onerror=null;this.src='/images/placeholder.svg'">
                    <div class="cart-item-details">
                        <div class="cart-item-name" title="${item.name}">${item.name}</div>
                        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.4rem;">
                            <div class="qty-stepper">
                                <button class="qty-btn" onclick="modifyDrawerQty(${item.cart_item_id}, ${item.quantity - 1})">-</button>
                                <span class="qty-display">${item.quantity}</span>
                                <button class="qty-btn" onclick="modifyDrawerQty(${item.cart_item_id}, ${item.quantity + 1})">+</button>
                            </div>
                            <button class="cart-item-remove" onclick="modifyDrawerQty(${item.cart_item_id}, 0)" title="Remove item">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        renderDrawerSummary(subtotal);
    } catch (e) {
        console.error('Error rendering drawer cart:', e);
        listEl.innerHTML = '<p style="color:var(--accent-rose); text-align:center;">Failed to load cart items.</p>';
    }
}

function renderDrawerSummary(subtotal) {
    let discount = 0;
    let shipping = subtotal >= 100 ? 0 : 9.99;

    if (activePromo) {
        if (activePromo.type === 'percent') {
            discount = subtotal * activePromo.value;
        } else if (activePromo.type === 'shipping') {
            shipping = 0;
        } else if (activePromo.type === 'fixed') {
            if (!activePromo.minSubtotal || subtotal >= activePromo.minSubtotal) {
                discount = Math.min(subtotal, activePromo.value);
            }
        }
    }

    const taxable = Math.max(0, subtotal - discount);
    const tax = taxable * 0.0825;
    const total = taxable + shipping + tax;

    const summaryEl = document.getElementById('drawer-summary-container');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="order-summary-row">
                <span>Subtotal</span>
                <span class="font-mono">$${subtotal.toFixed(2)}</span>
            </div>
            ${discount > 0 ? `
            <div class="order-summary-row" style="color:var(--accent-emerald);">
                <span>Promo Discount</span>
                <span class="font-mono">-$${discount.toFixed(2)}</span>
            </div>` : ''}
            <div class="order-summary-row">
                <span>Shipping ${subtotal >= 100 ? '(Free Express)' : ''}</span>
                <span class="font-mono">${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span>
            </div>
            <div class="order-summary-row">
                <span>Estimated Tax (8.25%)</span>
                <span class="font-mono">$${tax.toFixed(2)}</span>
            </div>
            <div class="order-summary-row total">
                <span>Total</span>
                <span class="font-mono" style="color:var(--accent);">$${total.toFixed(2)}</span>
            </div>
        `;
    }
}

async function modifyDrawerQty(cartItemId, newQty) {
    const token = getAuthToken();
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/cart/${cartItemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ quantity: newQty })
        });

        if (res.ok) {
            updateCartCount();
            loadDrawerCart();
            // Also refresh cart page if on /cart.html
            if (typeof window.refreshCartPage === 'function') {
                window.refreshCartPage();
            }
        } else {
            const data = await res.json();
            showToast(data.error || 'Could not update item', 'error');
        }
    } catch (e) {
        console.error('Error modifying quantity:', e);
    }
}

async function addToCart(productId, quantity = 1) {
    const token = getAuthToken();
    if (!token) {
        showToast('Please log in to add items to your cart', 'error');
        setTimeout(() => window.location.href = '/login.html', 1000);
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId, quantity })
        });

        if (res.ok) {
            showToast('Item added to your shopping bag!');
            updateCartCount();
            openCartDrawer();
        } else {
            const data = await res.json();
            showToast(data.error || 'Failed to add item', 'error');
        }
    } catch (e) {
        showToast('Error adding item to cart', 'error');
    }
}

async function applyPromoCode() {
    const input = document.getElementById('drawer-promo-input');
    if (!input || !input.value.trim()) return;

    const code = input.value.trim().toUpperCase();
    try {
        const res = await fetch(`${API_BASE}/orders/validate-coupon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });

        const data = await res.json();
        if (data.valid) {
            activePromo = data.promo;
            activePromo.code = code;
            showToast(`Promo "${code}" applied: ${data.promo.description}!`);
            loadDrawerCart();
        } else {
            showToast(data.error || 'Invalid promo code', 'error');
        }
    } catch (e) {
        showToast('Error checking promo code', 'error');
    }
}

// -------------------------------------------------------------
// Wishlist Drawer & Toggle
// -------------------------------------------------------------
async function syncWishlist() {
    const token = getAuthToken();
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/wishlist`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const items = await res.json();
            wishlistProductIds = new Set(items.map(i => i.id));
            const countEl = document.getElementById('nav-wishlist-count');
            if (countEl) countEl.textContent = items.length;

            // Update heart icons across page
            document.querySelectorAll('.wishlist-toggle-btn').forEach(btn => {
                const pid = parseInt(btn.dataset.productId, 10);
                const svg = btn.querySelector('svg');
                if (wishlistProductIds.has(pid)) {
                    btn.classList.add('active');
                    if (svg) svg.setAttribute('fill', 'currentColor');
                } else {
                    btn.classList.remove('active');
                    if (svg) svg.setAttribute('fill', 'none');
                }
            });
        }
    } catch (e) {
        console.error('Error syncing wishlist:', e);
    }
}

async function toggleWishlist(productId, btnElement) {
    const token = getAuthToken();
    if (!token) {
        showToast('Please log in to save items to wishlist', 'error');
        setTimeout(() => window.location.href = '/login.html', 1000);
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/wishlist/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId })
        });

        const data = await res.json();
        if (res.ok) {
            showToast(data.message);
            const svg = btnElement ? btnElement.querySelector('svg') : null;
            if (data.inWishlist) {
                wishlistProductIds.add(productId);
                if (btnElement) {
                    btnElement.classList.add('active');
                    if (svg) svg.setAttribute('fill', 'currentColor');
                }
            } else {
                wishlistProductIds.delete(productId);
                if (btnElement) {
                    btnElement.classList.remove('active');
                    if (svg) svg.setAttribute('fill', 'none');
                }
            }
            syncWishlist();
        }
    } catch (e) {
        showToast('Error updating wishlist', 'error');
    }
}

function openWishlistDrawer() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    const overlay = document.getElementById('wishlist-drawer-overlay');
    const drawer = document.getElementById('wishlist-drawer');
    if (overlay && drawer) {
        overlay.classList.add('active');
        drawer.classList.add('active');
        loadDrawerWishlist();
    } else {
        window.location.href = '/wishlist.html';
    }
}

function closeWishlistDrawer() {
    const overlay = document.getElementById('wishlist-drawer-overlay');
    const drawer = document.getElementById('wishlist-drawer');
    if (overlay && drawer) {
        overlay.classList.remove('active');
        drawer.classList.remove('active');
    }
}

async function loadDrawerWishlist() {
    const token = getAuthToken();
    const listEl = document.getElementById('drawer-wishlist-list');
    if (!listEl || !token) return;

    listEl.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:2rem 0;">Loading saved items...</p>';

    try {
        const res = await fetch(`${API_BASE}/wishlist`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const items = await res.json();

        if (items.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center; padding:3.5rem 1rem;">
                    <div style="font-size:2.5rem; margin-bottom:1rem; opacity:0.6;">🤍</div>
                    <h3 style="font-size:1.15rem; margin-bottom:0.5rem;">Your wishlist is empty</h3>
                    <p style="color:var(--text-muted); font-size:0.875rem;">Tap the heart on any product to save it for later.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = items.map(item => `
            <div class="cart-item-row">
                <img src="${item.image_url}" alt="${item.name}" class="cart-item-thumb" onerror="this.onerror=null;this.src='/images/placeholder.svg'">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                    <div style="display:flex; gap:0.5rem; margin-top:0.4rem;">
                        <button class="btn btn-primary btn-sm" onclick="addToCart(${item.id}); closeWishlistDrawer();">Move to Bag</button>
                        <button class="btn btn-secondary btn-sm" onclick="toggleWishlist(${item.id}); loadDrawerWishlist();">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        listEl.innerHTML = '<p style="color:var(--accent-rose); text-align:center;">Failed to load wishlist.</p>';
    }
}

// -------------------------------------------------------------
// Interactive Checkout Modal
// -------------------------------------------------------------
function openCheckoutModal() {
    closeCartDrawer();
    const overlay = document.getElementById('checkout-modal-overlay');
    if (overlay) {
        overlay.classList.add('active');
        showCheckoutStep(1);
    } else {
        window.location.href = '/cart.html';
    }
}

function closeCheckoutModal() {
    const overlay = document.getElementById('checkout-modal-overlay');
    if (overlay) overlay.classList.remove('active');
}

function showCheckoutStep(step) {
    document.querySelectorAll('.checkout-step-panel').forEach(p => p.style.display = 'none');
    const target = document.getElementById(`checkout-step-${step}`);
    if (target) target.style.display = 'block';

    // Update progress markers
    for (let i = 1; i <= 3; i++) {
        const marker = document.getElementById(`step-marker-${i}`);
        if (marker) {
            marker.classList.remove('active', 'completed');
            if (i < step) marker.classList.add('completed');
            else if (i === step) marker.classList.add('active');
        }
    }
}

async function handlePlaceOrder(event) {
    if (event) event.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    const fullName = document.getElementById('ship-name')?.value || 'Local Shopper';
    const street = document.getElementById('ship-street')?.value || '101 Tech Boulevard';
    const city = document.getElementById('ship-city')?.value || 'Austin';
    const state = document.getElementById('ship-state')?.value || 'TX';
    const zip = document.getElementById('ship-zip')?.value || '78701';
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'Instant Card';

    const submitBtn = document.getElementById('btn-submit-order');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Securing Payment & Placing Order...';
    }

    try {
        const res = await fetch(`${API_BASE}/orders/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                shippingAddress: { name: fullName, street, city, state, zip },
                paymentMethod,
                couponCode: activePromo ? activePromo.code : null
            })
        });

        const data = await res.json();
        if (res.ok) {
            // Update step 3 with confirmed details
            document.getElementById('confirm-order-id').textContent = `#${data.orderId}`;
            document.getElementById('confirm-tracking-code').textContent = data.trackingCode;
            document.getElementById('confirm-order-total').textContent = `$${data.totalPrice.toFixed(2)}`;

            updateCartCount();
            activePromo = null;
            showCheckoutStep(3);
            showToast('Order confirmed and processing!');
        } else {
            showToast(data.error || 'Checkout failed', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Complete Order';
            }
        }
    } catch (e) {
        showToast('Error processing checkout', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Complete Order';
        }
    }
}

// -------------------------------------------------------------
// Admin: Add Custom Product Modal
// -------------------------------------------------------------
function openAddProductModal() {
    const overlay = document.getElementById('add-product-modal-overlay');
    if (overlay) overlay.classList.add('active');
}

function closeAddProductModal() {
    const overlay = document.getElementById('add-product-modal-overlay');
    if (overlay) overlay.classList.remove('active');
}

async function handleCreateProduct(event) {
    event.preventDefault();
    const name = document.getElementById('new-prod-name').value;
    const tagline = document.getElementById('new-prod-tagline').value;
    const category = document.getElementById('new-prod-category').value;
    const price = document.getElementById('new-prod-price').value;
    const original_price = document.getElementById('new-prod-orig-price').value;
    const stock = document.getElementById('new-prod-stock').value;
    const badge = document.getElementById('new-prod-badge').value;
    const image_url = document.getElementById('new-prod-image').value;
    const description = document.getElementById('new-prod-desc').value;

    try {
        const res = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name, tagline, category, price, original_price, stock, badge, image_url, description
            })
        });

        if (res.ok) {
            allProductsCache = null;
            showToast('Custom product added to catalog!');
            closeAddProductModal();
            if (typeof window.loadProducts === 'function') {
                window.loadProducts();
            }
        } else {
            const err = await res.json();
            showToast(err.error || 'Failed to add product', 'error');
        }
    } catch (e) {
        showToast('Network error adding product', 'error');
    }
}

// -------------------------------------------------------------
// Product Comparison Helpers
// -------------------------------------------------------------
function getCompareIds() {
    try {
        const saved = localStorage.getItem('compare_products');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

function updateCompareCount() {
    const list = getCompareIds();
    const countEl = document.getElementById('nav-compare-count');
    if (countEl) countEl.textContent = list.length;
}

function toggleCompare(productId) {
    let list = getCompareIds();
    const pid = parseInt(productId, 10);
    const idx = list.indexOf(pid);
    if (idx > -1) {
        list.splice(idx, 1);
        showToast('Removed from comparison list');
    } else {
        if (list.length >= 4) {
            showToast('You can compare a maximum of 4 products at once', 'error');
            return;
        }
        list.push(pid);
        showToast('Added to comparison! Click Compare in nav to view');
    }
    localStorage.setItem('compare_products', JSON.stringify(list));
    updateCompareCount();
    document.querySelectorAll(`.btn-compare-${pid}`).forEach(btn => {
        btn.classList.toggle('active', list.includes(pid));
    });
}

// -------------------------------------------------------------
// Live Search Dropdown Autocomplete
// -------------------------------------------------------------
let allProductsCache = null;
async function fetchProductsForSearch() {
    if (!allProductsCache) {
        try {
            const res = await fetch(`${API_BASE}/products`);
            if (res.ok) allProductsCache = await res.json();
        } catch (e) {}
    }
    return allProductsCache || [];
}

function initSearchSuggestions() {
    const input = document.getElementById('site-search-input');
    if (!input) return;

    let dropdown = document.getElementById('search-suggestions-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'search-suggestions-dropdown';
        dropdown.className = 'search-dropdown';
        input.parentElement.appendChild(dropdown);
    }

    let timer = null;
    input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const query = input.value.trim().toLowerCase();
            if (query.length < 2) {
                dropdown.classList.remove('active');
                dropdown.innerHTML = '';
                return;
            }

            const products = await fetchProductsForSearch();
            const matches = products.filter(p => 
                (p.name && p.name.toLowerCase().includes(query)) || 
                (p.category && p.category.toLowerCase().includes(query)) ||
                (p.tagline && p.tagline.toLowerCase().includes(query))
            ).slice(0, 6);

            if (matches.length === 0) {
                dropdown.innerHTML = `
                    <div style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.85rem;">
                        No hardware matches for "${input.value}"
                    </div>
                `;
                dropdown.classList.add('active');
                return;
            }

            dropdown.innerHTML = matches.map(p => `
                <a href="/product.html?id=${p.id}" class="search-item">
                    <img src="${p.image_url}" alt="${p.name}" class="search-item-img" onerror="this.onerror=null;this.src='/images/placeholder.svg'">
                    <div class="search-item-info">
                        <div class="search-item-name">${p.name}</div>
                        <div class="search-item-meta">
                            <span>${p.category}</span>
                            <span>•</span>
                            <span>★ ${p.rating ? p.rating.toFixed(1) : '4.8'}</span>
                        </div>
                    </div>
                    <div class="search-item-price">$${p.price.toFixed(2)}</div>
                </a>
            `).join('');

            dropdown.classList.add('active');
        }, 180);
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

// -------------------------------------------------------------
// Keyboard Shortcuts & Global Init
// -------------------------------------------------------------
document.addEventListener('keydown', (e) => {
    // Focus search on '/'
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        const searchInput = document.getElementById('site-search-input');
        if (searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
    }
    // Close overlays on 'Escape'
    if (e.key === 'Escape') {
        closeCartDrawer();
        closeWishlistDrawer();
        closeCheckoutModal();
        closeAddProductModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateNav();
    initSearchSuggestions();
});

