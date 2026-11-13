// REIGN Store Application Logic
let productsData = [];
let storeSettings = {
  brandName: "REIGN",
  whatsapp: "01277141615",
  currency: "ج.م",
  shippingRates: {
    cairo_giza: 50,
    alex_delta: 60,
    upper_egypt: 75
  }
};

let cart = JSON.parse(localStorage.getItem('reign_cart') || '[]');
let currentCategory = 'all';
let cardImgIndex = {};
let qvActiveIndex = 0;
let qvCurrentProduct = null;
let qvSelectedSize = 'M, L';
let qvQuantity = 1;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadSettings();
  await loadProducts();
  setupEventListeners();
  updateCartUI();
  trackVisitorSession();
});

// Theme Management (Light / Dark mode)
function initTheme() {
  const savedTheme = localStorage.getItem('reign_theme') || 'light';
  applyTheme(savedTheme);

  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = document.body.classList.contains('dark-theme');
      const newTheme = isDark ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('reign_theme', newTheme);
      showToast(newTheme === 'dark' ? 'تم تفعيل الوضع الليلي (Dark Mode)' : 'تم تفعيل الوضع النهاري الأبيض (Light Mode)');
    });
  }
}

function applyTheme(theme) {
  const sunIcon = document.querySelector('.theme-icon-sun');
  const moonIcon = document.querySelector('.theme-icon-moon');

  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    if (sunIcon) sunIcon.style.display = 'block';
    if (moonIcon) moonIcon.style.display = 'none';
  } else {
    document.body.classList.remove('dark-theme');
    if (sunIcon) sunIcon.style.display = 'none';
    if (moonIcon) moonIcon.style.display = 'block';
  }
}

// Track Visitor Session
async function trackVisitorSession() {
  try {
    const hasTrackedToday = sessionStorage.getItem('reign_visit_tracked');
    if (!hasTrackedToday) {
      await fetch('/api/track-visit', { method: 'POST' });
      sessionStorage.setItem('reign_visit_tracked', 'true');
    }
  } catch (e) {
    // Non-blocking
  }
}

// Load Settings from API or Local
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      storeSettings = await res.json();
    }
  } catch (e) {
    console.log('Using local store settings');
  }
}

// Load Products from API or fallback
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      productsData = await res.json();
    } else {
      const fallback = await fetch('data/products.json');
      productsData = await fallback.json();
    }
  } catch (e) {
    try {
      const fallback = await fetch('data/products.json');
      productsData = await fallback.json();
    } catch (err) {
      console.error('Failed to load products', err);
    }
  }
  renderProducts();
}

// Render Products Grid
function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const filtered = currentCategory === 'all' 
    ? productsData 
    : productsData.filter(p => p.category === currentCategory);

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #a1a1aa;">لا توجد منتجات متوفرة في هذا القسم حالياً.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    let imgs = p.images && p.images.length ? p.images : [p.image, p.hover_image].filter(Boolean);
    if (!imgs.length) imgs = ['assets/img/placeholder.svg'];
    
    if (cardImgIndex[p.id] === undefined) {
      cardImgIndex[p.id] = 0;
    }
    const currentIdx = cardImgIndex[p.id] || 0;
    const activeImg = imgs[currentIdx] || imgs[0];

    const hasDiscount = p.has_discount !== false && p.old_price && p.price < p.old_price;
    const defaultSize = (p.sizes && p.sizes[0]) ? p.sizes[0] : 'M, L';

    return `
      <div class="product-card" id="card-${p.id}" data-selected-size="${defaultSize}">
        <div class="product-media" id="media-${p.id}">
          <img src="${activeImg}" alt="${p.name}" class="product-img" id="img-${p.id}" onclick="openQuickView('${p.id}')">
          ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}

          ${imgs.length > 1 ? `
            <button type="button" class="prod-arrow prod-arrow-prev" onclick="event.stopPropagation(); changeCardImg('${p.id}', -1)" aria-label="الصورة السابقة" title="الصورة السابقة">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button type="button" class="prod-arrow prod-arrow-next" onclick="event.stopPropagation(); changeCardImg('${p.id}', 1)" aria-label="الصورة التالية" title="الصورة التالية">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div class="prod-img-dots" id="dots-${p.id}">
              ${imgs.map((_, i) => `
                <span class="prod-dot ${i === currentIdx ? 'active' : ''}" onclick="event.stopPropagation(); goToCardImg('${p.id}', ${i})"></span>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <div class="product-info">
          <h3 class="product-title" onclick="openQuickView('${p.id}')" style="cursor: pointer;">${p.name_ar || p.name}</h3>
          <p class="product-sub">${p.subtitle_ar || p.subtitle}</p>

          <div class="product-price-row">
            <span class="product-price">${p.price}</span>
            ${hasDiscount ? `<span class="product-price-old">${p.old_price}</span>` : ''}
            <span class="product-currency">${storeSettings.currency || 'ج.م'}</span>
            ${hasDiscount && p.discount ? `<span class="product-discount-tag">${p.discount}</span>` : ''}
          </div>

          <div class="size-selector-row">
            <span style="font-size: 0.78rem; color: #a1a1aa; margin-left: 6px;">المقاس:</span>
            ${(p.sizes || ['M, L', 'XL, XXL']).map((s, idx) => `
              <button 
                type="button" 
                class="size-pill ${idx === 0 ? 'active' : ''}" 
                onclick="selectCardSize('${p.id}', '${s}', this)">
                ${s}
              </button>
            `).join('')}
          </div>

          <div class="product-card-actions">
            <button type="button" class="btn-card-add" onclick="addCardToCart('${p.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
              </svg>
              إضافة للسلة
            </button>
            <button type="button" class="btn-card-quick" title="معاينة تفاصيل المنتج والصور" onclick="openQuickView('${p.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Manual Card Image Navigation (Arrows & Dots)
window.changeCardImg = function(productId, delta) {
  const p = productsData.find(item => item.id === productId);
  if (!p) return;
  const imgs = p.images && p.images.length ? p.images : [p.image, p.hover_image].filter(Boolean);
  if (imgs.length <= 1) return;

  const currentIdx = cardImgIndex[productId] || 0;
  const newIdx = (currentIdx + delta + imgs.length) % imgs.length;
  goToCardImg(productId, newIdx);
};

window.goToCardImg = function(productId, targetIdx) {
  const p = productsData.find(item => item.id === productId);
  if (!p) return;
  const imgs = p.images && p.images.length ? p.images : [p.image, p.hover_image].filter(Boolean);
  if (!imgs[targetIdx]) return;

  cardImgIndex[productId] = targetIdx;
  const imgEl = document.getElementById(`img-${productId}`);
  if (imgEl) {
    imgEl.style.opacity = '0.3';
    setTimeout(() => {
      imgEl.src = imgs[targetIdx];
      imgEl.style.opacity = '1';
    }, 120);
  }

  const dotsWrap = document.getElementById(`dots-${productId}`);
  if (dotsWrap) {
    const dots = dotsWrap.querySelectorAll('.prod-dot');
    dots.forEach((dot, idx) => {
      if (idx === targetIdx) dot.classList.add('active');
      else dot.classList.remove('active');
    });
  }
};

// Quick View Modal Logic
window.openQuickView = function(productId) {
  const p = productsData.find(item => item.id === productId);
  if (!p) return;

  qvCurrentProduct = p;
  qvActiveIndex = cardImgIndex[productId] || 0;
  qvSelectedSize = (p.sizes && p.sizes[0]) ? p.sizes[0] : 'M, L';
  qvQuantity = 1;

  const imgs = p.images && p.images.length ? p.images : [p.image, p.hover_image].filter(Boolean);
  const activeImg = imgs[qvActiveIndex] || imgs[0] || 'assets/img/placeholder.svg';
  const hasDiscount = p.has_discount !== false && p.old_price && p.price < p.old_price;
  const discountText = p.discount || (p.old_price ? `وفر ${p.old_price - p.price} ج.م` : '');
  const currency = storeSettings.currency || 'ج.م';

  const content = document.getElementById('quickview-content');
  if (!content) return;

  content.innerHTML = `
    <div class="quickview-grid">
      <!-- Media Gallery Column -->
      <div class="qv-media-col">
        <div class="qv-main-img-wrap">
          <img src="${activeImg}" alt="${p.name_ar || p.name}" class="qv-main-img" id="qv-large-img">
          
          ${imgs.length > 1 ? `
            <button type="button" class="prod-arrow prod-arrow-prev" onclick="changeQvImg(-1)" title="الصورة السابقة">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button type="button" class="prod-arrow prod-arrow-next" onclick="changeQvImg(1)" title="الصورة التالية">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          ` : ''}
        </div>

        ${imgs.length > 1 ? `
          <div class="qv-thumbs-row">
            ${imgs.map((src, i) => `
              <div class="qv-thumb ${i === qvActiveIndex ? 'active' : ''}" onclick="setQvImg(${i})" id="qv-thumb-${i}">
                <img src="${src}" alt="صورة ${i + 1}">
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Info & Order Column -->
      <div class="qv-info-col">
        ${p.badge ? `<span class="qv-badge">${p.badge}</span>` : ''}
        <h2 class="qv-title">${p.name_ar || p.name}</h2>
        <p class="qv-sub">${p.subtitle_ar || p.subtitle || ''}</p>

        <div class="qv-price-row">
          <span class="qv-price">${p.price} ${currency}</span>
          ${hasDiscount ? `<span class="qv-old-price">${p.old_price} ${currency}</span>` : ''}
          ${hasDiscount ? `<span class="product-discount-tag">${discountText}</span>` : ''}
        </div>

        <ul class="qv-features-list">
          <li>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>خامة ميلتون قطن مصري فاخر ثقيل (Heavyweight Fleece) بنعومة فائقة.</span>
          </li>
          <li>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>قصة وايد ليج فضفاضة انسيابية (Relaxed Drape) مريحة لكل الأوقات.</span>
          </li>
          <li>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>تطريز شعار REIGN ثلاثي الأبعاد بارز وعالي الدقة.</span>
          </li>
          <li>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>كمر مطاطي متين مع تكت جودة فاخرة وجيوب جانبية عميقة.</span>
          </li>
        </ul>

        <!-- Size Selection -->
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.84rem; font-weight: 700; color: #fff;">المقاس المطلوب:</span>
            <button type="button" class="btn-open-sizeguide" style="background:none; border:none; color:#a1a1aa; font-size:0.78rem; text-decoration:underline; cursor:pointer;" onclick="openSizeGuideFromQv()">دليل المقاسات 📏</button>
          </div>
          <div class="size-selector-row" style="margin-bottom: 0;">
            ${(p.sizes || ['M, L', 'XL, XXL']).map((s, idx) => `
              <button 
                type="button" 
                class="size-pill ${idx === 0 ? 'active' : ''}" 
                onclick="selectQvSize('${s}', this)">
                ${s}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Quantity Selector -->
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 24px;">
          <span style="font-size: 0.84rem; font-weight: 700; color: #fff;">الكمية:</span>
          <div class="cart-qty-ctrl" style="background: var(--bg-card); padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <button type="button" class="btn-qty" onclick="changeQvQty(-1)">-</button>
            <span id="qv-qty-display" style="font-size: 0.95rem; font-weight: 800; min-width: 28px; text-align: center; color: #fff;">1</span>
            <button type="button" class="btn-qty" onclick="changeQvQty(1)">+</button>
          </div>
        </div>

        <!-- Actions -->
        <div class="qv-actions-row">
          <button type="button" class="btn-qv-add" onclick="addQvToCart()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            إضافة إلى سلة المشتريات
          </button>

          <button type="button" class="btn-qv-wa" onclick="checkoutQvViaWhatsApp()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            طلب فوري عبر واتساب مباشرة
          </button>
        </div>

        <!-- Perks -->
        <div class="qv-perks-row">
          <div class="qv-perk-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>معاينة وقياس عند الاستلام</span>
          </div>
          <div class="qv-perk-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
            <span>توصيل سريع 2 - 4 أيام</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const modal = document.getElementById('quickview-modal');
  if (modal) modal.classList.add('active');
};

window.closeQuickView = function() {
  const modal = document.getElementById('quickview-modal');
  if (modal) modal.classList.remove('active');
};

window.setQvImg = function(index) {
  if (!qvCurrentProduct) return;
  const imgs = qvCurrentProduct.images && qvCurrentProduct.images.length ? qvCurrentProduct.images : [qvCurrentProduct.image, qvCurrentProduct.hover_image].filter(Boolean);
  if (!imgs[index]) return;

  qvActiveIndex = index;
  const largeImg = document.getElementById('qv-large-img');
  if (largeImg) {
    largeImg.style.opacity = '0.3';
    setTimeout(() => {
      largeImg.src = imgs[index];
      largeImg.style.opacity = '1';
    }, 120);
  }

  const thumbs = document.querySelectorAll('.qv-thumb');
  thumbs.forEach((t, i) => {
    if (i === index) t.classList.add('active');
    else t.classList.remove('active');
  });
};

window.changeQvImg = function(delta) {
  if (!qvCurrentProduct) return;
  const imgs = qvCurrentProduct.images && qvCurrentProduct.images.length ? qvCurrentProduct.images : [qvCurrentProduct.image, qvCurrentProduct.hover_image].filter(Boolean);
  if (imgs.length <= 1) return;

  const newIdx = (qvActiveIndex + delta + imgs.length) % imgs.length;
  setQvImg(newIdx);
};

window.selectQvSize = function(size, el) {
  qvSelectedSize = size;
  const pills = el.parentElement.querySelectorAll('.size-pill');
  pills.forEach(p => p.classList.remove('active'));
  el.classList.add('active');
};

window.changeQvQty = function(delta) {
  qvQuantity = Math.max(1, qvQuantity + delta);
  const disp = document.getElementById('qv-qty-display');
  if (disp) disp.textContent = qvQuantity;
};

window.openSizeGuideFromQv = function() {
  const sizeModal = document.getElementById('sizeguide-modal');
  if (sizeModal) sizeModal.classList.add('active');
};

window.addQvToCart = function() {
  if (!qvCurrentProduct) return;
  const size = qvSelectedSize || 'M, L';
  const cartItemId = `${qvCurrentProduct.id}-${size}`;
  const existing = cart.find(item => item.cartItemId === cartItemId);

  if (existing) {
    existing.qty += qvQuantity;
  } else {
    cart.push({
      cartItemId,
      id: qvCurrentProduct.id,
      name: qvCurrentProduct.name_ar || qvCurrentProduct.name,
      price: qvCurrentProduct.price,
      size: size,
      image: qvCurrentProduct.image || 'assets/img/placeholder.svg',
      qty: qvQuantity
    });
  }

  saveCart();
  updateCartUI();
  closeQuickView();
  openCartDrawer();
  showToast(`تمت إضافة ${qvCurrentProduct.name_ar || qvCurrentProduct.name} (${qvQuantity} قطع - مقاس ${size}) إلى سلتك`);
};

window.checkoutQvViaWhatsApp = function() {
  if (!qvCurrentProduct) return;
  const size = qvSelectedSize || 'M, L';
  const phone = storeSettings.whatsapp || '01277141615';
  const formattedPhone = phone.replace(/^0/, '20');
  const totalPrice = qvCurrentProduct.price * qvQuantity;

  let msg = `*طلب سريع من موقع REIGN* 👑\n\n`;
  msg += `*المنتج:* ${qvCurrentProduct.name_ar || qvCurrentProduct.name}\n`;
  msg += `*المقاس المطلوب:* ${size}\n`;
  msg += `*الكمية:* ${qvQuantity}\n`;
  msg += `*السعر:* ${totalPrice} ج.م\n`;
  msg += `*طريقة الاستلام:* الدفع عند الاستلام مع المعاينة والقياس 🚚\n\n`;
  msg += `_أرجو تأكيد الطلب لإرسال الاسم والمحافظة والعنوان بالتفصيل._`;

  const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
};

// Select Card Size
window.selectCardSize = function(productId, size, el) {
  const card = document.getElementById(`card-${productId}`);
  if (!card) return;
  card.setAttribute('data-selected-size', size);

  const pills = card.querySelectorAll('.size-pill');
  pills.forEach(p => p.classList.remove('active'));
  el.classList.add('active');
};

// Add Card to Cart
window.addCardToCart = function(productId) {
  const card = document.getElementById(`card-${productId}`);
  const product = productsData.find(p => p.id === productId);
  if (!card || !product) return;

  const size = card.getAttribute('data-selected-size') || product.sizes[0];
  const cartItemId = `${product.id}-${size}`;
  const existing = cart.find(item => item.cartItemId === cartItemId);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      cartItemId,
      id: product.id,
      name: product.name_ar || product.name,
      price: product.price,
      size: size,
      image: product.image || 'assets/img/placeholder.svg',
      qty: 1
    });
  }

  saveCart();
  updateCartUI();
  openCartDrawer();
  showToast(`تمت إضافة ${product.name_ar || product.name} (مقاس ${size}) إلى سلتك`);
};

// Setup Event Listeners
function setupEventListeners() {
  // Category tabs
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.getAttribute('data-category');
      renderProducts();
    });
  });

  // Hero color switcher
  const heroDots = document.querySelectorAll('.hero-color-switcher .color-dot');
  const heroImg = document.getElementById('hero-main-img');
  heroDots.forEach(dot => {
    dot.addEventListener('click', () => {
      heroDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      const img = dot.getAttribute('data-img');
      if (heroImg && img) {
        heroImg.style.opacity = '0.4';
        setTimeout(() => {
          heroImg.src = img;
          heroImg.style.opacity = '1';
        }, 150);
      }
    });
  });

  // Cart Drawer open/close
  const cartBtn = document.getElementById('nav-cart-btn');
  const cartClose = document.getElementById('cart-close-btn');
  const cartOverlay = document.getElementById('cart-drawer-overlay');

  if (cartBtn) cartBtn.addEventListener('click', openCartDrawer);
  if (cartClose) cartClose.addEventListener('click', closeCartDrawer);
  if (cartOverlay) {
    cartOverlay.addEventListener('click', (e) => {
      if (e.target === cartOverlay) closeCartDrawer();
    });
  }

  // Size Guide Modal open/close
  const sizeGuideBtns = document.querySelectorAll('.btn-open-sizeguide');
  const sizeModal = document.getElementById('sizeguide-modal');
  const sizeModalClose = document.getElementById('sizeguide-close');

  sizeGuideBtns.forEach(b => b.addEventListener('click', (e) => {
    e.preventDefault();
    if (sizeModal) sizeModal.classList.add('active');
  }));

  if (sizeModalClose) {
    sizeModalClose.addEventListener('click', () => {
      if (sizeModal) sizeModal.classList.remove('active');
    });
  }

  // Quick View Modal Backdrop & Escape
  const qvModal = document.getElementById('quickview-modal');
  if (qvModal) {
    qvModal.addEventListener('click', (e) => {
      if (e.target === qvModal) closeQuickView();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeQuickView();
      if (sizeModal) sizeModal.classList.remove('active');
      closeCartDrawer();
    }
  });
}

// Cart Drawer open / close
function openCartDrawer() {
  const overlay = document.getElementById('cart-drawer-overlay');
  if (overlay) overlay.classList.add('active');
}

function closeCartDrawer() {
  const overlay = document.getElementById('cart-drawer-overlay');
  if (overlay) overlay.classList.remove('active');
}

// Save Cart
function saveCart() {
  localStorage.setItem('reign_cart', JSON.stringify(cart));
}

// Update Cart UI
function updateCartUI() {
  const countEls = document.querySelectorAll('.cart-count');
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
  countEls.forEach(el => el.textContent = totalCount);

  const list = document.getElementById('cart-items-list');
  const totalEl = document.getElementById('cart-total');

  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `
      <div class="cart-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
        </svg>
        <p>سلة المشتريات فارغة حالياً</p>
        <button class="btn-primary" style="padding: 10px 24px; font-size: 0.88rem;" onclick="closeCartDrawer()">تصفح المنتجات</button>
      </div>
    `;
    if (totalEl) totalEl.textContent = `0 ${storeSettings.currency || 'ج.م'}`;
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  list.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-details">
        <h4 class="cart-item-name">${item.name}</h4>
        <span class="cart-item-meta">${item.color ? `اللون: ${item.color} | ` : ''}المقاس: ${item.size}</span>
        <span class="cart-item-price">${item.price * item.qty} ${storeSettings.currency || 'ج.م'}</span>
        
        <div class="cart-qty-ctrl">
          <button class="btn-qty" onclick="changeQty('${item.cartItemId}', -1)">-</button>
          <span style="font-size: 0.85rem; font-weight: 700; min-width: 20px; text-align: center;">${item.qty}</span>
          <button class="btn-qty" onclick="changeQty('${item.cartItemId}', 1)">+</button>
          <button style="background: transparent; border: none; color: #ef4444; font-size: 0.75rem; cursor: pointer; margin-right: 12px;" onclick="removeItem('${item.cartItemId}')">حذف</button>
        </div>
      </div>
    </div>
  `).join('');

  if (totalEl) totalEl.textContent = `${subtotal} ${storeSettings.currency || 'ج.م'}`;
}

// Change Quantity
window.changeQty = function(cartItemId, delta) {
  const item = cart.find(i => i.cartItemId === cartItemId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.cartItemId !== cartItemId);
  }
  saveCart();
  updateCartUI();
};

// Remove Item
window.removeItem = function(cartItemId) {
  cart = cart.filter(i => i.cartItemId !== cartItemId);
  saveCart();
  updateCartUI();
};

// WhatsApp Direct Checkout
window.checkoutViaWhatsApp = function() {
  if (cart.length === 0) {
    alert('السلة فارغة!');
    return;
  }

  const phone = storeSettings.whatsapp || "01277141615";
  const formattedPhone = phone.startsWith('0') ? '2' + phone : phone;

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  let msg = `*طلب جديد من موقع REIGN* 👑\n\n`;
  msg += `*المنتجات المطلوبة:*\n`;
  cart.forEach((item, idx) => {
    msg += `${idx + 1}. *${item.name}*\n`;
    if (item.color) msg += `   - اللون: ${item.color}\n`;
    msg += `   - المقاس: ${item.size}\n`;
    msg += `   - الكمية: ${item.qty}\n`;
    msg += `   - السعر: ${item.price * item.qty} ج.م\n\n`;
  });

  msg += `--------------------------\n`;
  msg += `*إجمالي الطلب:* ${subtotal} ج.م\n`;
  msg += `*طريقة الدفع:* الدفع عند الاستلام مع إمكانية المعاينة والقياس 🚚\n\n`;
  msg += `_برجاء تأكيد الطلب لإرسال الاسم والعنوان بالتفصيل ورقم الهاتف._`;

  const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
};

// Toast notification
function showToast(msg) {
  let toast = document.getElementById('reign-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'reign-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #18181b;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.2);
      padding: 14px 24px;
      border-radius: 9999px;
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: 0 12px 30px rgba(0,0,0,0.5);
      z-index: 200;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(20px);
    `;
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    ${msg}
  `;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
  }, 3200);
}
