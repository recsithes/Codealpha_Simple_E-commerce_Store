// Utility functions
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function getAuthToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

function updateNav() {
    const user = getUser();
    const navLinks = document.getElementById('nav-auth-links');
    if (navLinks) {
        if (user) {
            navLinks.innerHTML = `
                <a href="#" onclick="logout()">Logout (${user.username})</a>
                <a href="/cart.html" class="cart-icon">
                    🛒 Cart
                    <span class="cart-count" id="nav-cart-count">0</span>
                </a>
            `;
            updateCartCount();
        } else {
            navLinks.innerHTML = `
                <a href="/login.html">Login</a>
                <a href="/register.html">Register</a>
            `;
        }
    }
}

async function updateCartCount() {
    const token = getAuthToken();
    if (!token) return;

    try {
        const res = await fetch('/api/cart', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const cartItems = await res.json();
            const count = cartItems.reduce((acc, item) => acc + item.quantity, 0);
            const countEl = document.getElementById('nav-cart-count');
            if (countEl) countEl.textContent = count;
        }
    } catch (error) {
        console.error('Error fetching cart count:', error);
    }
}

async function addToCart(productId, quantity = 1) {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const res = await fetch('/api/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId, quantity })
        });
        
        if (res.ok) {
            showToast('Added to cart!');
            updateCartCount();
        } else {
            const data = await res.json();
            showToast(data.error || 'Failed to add to cart');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('Error adding to cart');
    }
}

document.addEventListener('DOMContentLoaded', updateNav);
