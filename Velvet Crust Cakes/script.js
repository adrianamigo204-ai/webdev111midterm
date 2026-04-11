const cakeData = [
    { name: "Midnight Truffle", price: 45, category: "Chocolate", desc: "Deep dark chocolate with a silky ganache.", img: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400" },
    { name: "Velvet Strawberry", price: 38, category: "Fruit", desc: "Fresh strawberries whipped into light cream.", img: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400" },
    { name: "Golden Honey", price: 35, category: "Classic", desc: "Local honey infused into a crunchy crust.", img: "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=400" },
    { name: "Vanilla Bean", price: 40, category: "Classic", desc: "Authentic Madagascan vanilla bean sponge.", img: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400" },
    { name: "Caramel Crunch", price: 42, category: "Specialty", desc: "Salted caramel with toasted almond bits.", img: "https://images.unsplash.com/photo-1542826438-bd32f43d626f?w=400" },
    { name: "Pistachio Dream", price: 50, category: "Specialty", desc: "Roasted pistachios and white chocolate glaze.", img: "https://images.unsplash.com/photo-1519340333755-56e9c1d04579?w=400" },
    { name: "Lemon Zest", price: 32, category: "Fruit", desc: "Zesty lemon curd on a shortbread base.", img: "https://images.unsplash.com/photo-1519869325930-281384150729?w=400" },
    { name: "Berry Cheesecake", price: 48, category: "Cheesecake", desc: "NY style cheesecake with forest berries.", img: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400" },
    { name: "Dark Forest", price: 46, category: "Chocolate", desc: "Cherries and chocolate with whipped kirsch.", img: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400" },
    { name: "Espresso Cream", price: 44, category: "Specialty", desc: "Rich coffee layers for the caffeine lovers.", img: "https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=400" }
];

const banners = [
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200",
    "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=1200",
    "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1200"
];

const CART_KEY = "velvetCart";

let cart = [];
let bannerIdx = 0;
let pendingItem = null;

// Initialization
window.onload = () => {
    cart = loadCartFromStorage();
    updateCartCountDisplay();

    renderCakes();
    
    // Setup Search Event
    const searchBar = document.querySelector('.search-bar');
    if(searchBar) {
        searchBar.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            renderCakes(term);
        });
    }

    setInterval(rotateBanner, 4000);

    // If we're on the summary page, render existing cart data.
    updateCart();
};

// Unified Render Function with Filter
function renderCakes(filter = "") {
    const fullGrid = document.getElementById('full-grid');
    const trendGrid = document.getElementById('trending-grid');
    
    if(fullGrid) fullGrid.innerHTML = '';
    if(trendGrid) trendGrid.innerHTML = '';

    cakeData.forEach((cake, idx) => {
        if(cake.name.toLowerCase().includes(filter) || cake.category.toLowerCase().includes(filter)) {
            const html = `
                <div class="cake-card">
                    <span class="category-tag">${cake.category}</span>
                    <img src="${cake.img}" style="width:100%; height:180px; object-fit:cover; border-radius:15px;">
                    <h3>${cake.name}</h3>
                    <p style="font-size:0.8rem; opacity:0.8;">${cake.desc}</p>
                    <p><strong>$${cake.price}</strong></p>
                    <button class="btn-cream" onclick="askConfirm('${cake.name}', ${cake.price})">Add to Cart</button>
                </div>`;
            
            if(fullGrid) fullGrid.innerHTML += html;
            // Only show first 3 items in Trending if no filter is active
            if(trendGrid && idx < 3 && filter === "") trendGrid.innerHTML += html;
        }
    });
}

function rotateBanner() {
    bannerIdx = (bannerIdx + 1) % banners.length;
    const img = document.getElementById('carousel-img');
    if(img) {
        img.style.opacity = 0;
        setTimeout(() => {
            img.src = banners[bannerIdx];
            img.style.opacity = 1;
        }, 500);
    }
}

// Improved Cart Logic
function askConfirm(name, price) {
    pendingItem = { name, price };
    const modal = document.getElementById('cart-modal');
    const msg = document.getElementById('modal-msg');
    const qtyBox = document.getElementById('qty-box');

    msg.innerText = `Add ${name} to your cart?`;
    qtyBox.style.display = 'none';
    modal.style.display = 'flex';
    
    document.getElementById('modal-yes').onclick = () => {
        if (qtyBox.style.display === 'none') {
            msg.innerText = "How many would you like?";
            qtyBox.style.display = 'block';
        } else {
            finalizeAdd();
        }
    };
}

function finalizeAdd() {
    const qty = parseInt(document.getElementById('item-qty').value) || 1;
    cart.push({ ...pendingItem, qty, id: Date.now() });
    updateCart();
    
    const name = pendingItem.name; // Store name for toast
    closeModal();
    showToast(`Added ${qty}x ${name} to cart!`);
}

function closeModal() {
    document.getElementById('cart-modal').style.display = 'none';
    document.getElementById('item-qty').value = 1;
    pendingItem = null;
}

document.getElementById('modal-no').onclick = closeModal;

// Toast Notification Logic
function showToast(message) {
    let toast = document.getElementById('toast');
    if(!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = "position:fixed; bottom:20px; right:20px; background:var(--cream); color:black; padding:15px 25px; border-radius:30px; box-shadow:0 10px 20px rgba(0,0,0,0.2); z-index:3000; font-weight:bold;";
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function updateCart() {
    updateCartCountDisplay();
    const list = document.getElementById('cart-items');
    if(!list) return;
    
    list.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        list.innerHTML += `<tr style="border-bottom: 1px solid var(--glass-border);">
            <td style="padding:15px">${item.name}</td><td>${item.qty}</td><td>$${item.price * item.qty}</td>
            <td><button onclick="removeItem(${item.id})" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">❌</button></td></tr>`;
        total += (item.price * item.qty);
    });
    document.getElementById('total-price').innerText = total;
}

function removeItem(id) {
    cart = cart.filter(i => i.id !== id);
    updateCart();
}

function loadCartFromStorage() {
    try {
        const raw = localStorage.getItem(CART_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function saveCartToStorage() {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (err) {
        // Ignore storage errors (private mode, quota, etc.)
    }
}

function getCartQtyCount() {
    return cart.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);
}

function updateCartCountDisplay() {
    const count = getCartQtyCount();
    document.querySelectorAll('#cart-count').forEach((el) => {
        el.innerText = count;
    });
    saveCartToStorage();
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo({top: 0, behavior: 'smooth'});
}