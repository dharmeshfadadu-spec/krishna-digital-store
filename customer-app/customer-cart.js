/* ==========================================================================
   ૧. પ્રોડક્ટ ગ્રીડ અને કેટેગરી બબલ્સ રેન્ડર સિસ્ટમ
   ========================================================================== */
function renderProducts(filterCat = '') {
    const grid = document.getElementById('product-list-area');
    if (!grid) return;
    grid.innerHTML = '';
    
    for (let id in allProducts) {
        let p = allProducts[id];
        if (p.active === false) continue; // જે પ્રોડક્ટ ઇનએક્ટિવ હોય તે ન બતાવે
        if (filterCat && p.category !== filterCat) continue; // કેટેગરી ફિલ્ટર

        let name = currentLanguage === 'gu' ? p.nameGu : p.nameEn;
        let isOut = parseInt(p.stock || 0) <= 0;
        let cartQty = cart[id] || 0;

        let card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${p.image || 'https://placeholder.com'}" class="prod-img">
            <div class="prod-name">${name}</div>
            <div class="prod-weight">${p.weight || '0.010 ગ્રામ'}</div>
            <div class="price-line">
                <span class="mrp">₹${p.mrp}</span> 
                <span class="sprice">₹${p.sprice}</span>
            </div>
            ${isOut ? `<div class="out-of-stock-badge">${langData[currentLanguage].outStock}</div>` : `
                <div class="qty-control">
                    <button class="qty-btn" onclick="updateCart('${id}', -1)">-</button>
                    <span class="qty-num">${cartQty}</span>
                    <button class="qty-btn" onclick="updateCart('${id}', 1)">+</button>
                </div>
            `}
        `;
        grid.appendChild(card);
    }
}

function renderCategories() {
    const bar = document.getElementById('category-bar');
    if (!bar) return;
    bar.innerHTML = `<div class="cat-bubble" onclick="renderProducts()">બધા (All)</div>`;
    
    let cats = new Set();
    for (let id in allProducts) { 
        if (allProducts[id].category && allProducts[id].active !== false) {
            cats.add(allProducts[id].category); 
        }
    }
    
    cats.forEach(c => {
        let b = document.createElement('div');
        b.className = 'cat-bubble';
        b.innerText = c;
        b.onclick = () => renderProducts(c);
        bar.appendChild(b);
    });
}

/* ==========================================================================
   ૨. પ્લસ-માઇનસ જથ્થો કંટ્રોલ અને કાર્ટ મેનેજમેન્ટ
   ========================================================================== */
function updateCart(id, change) {
    let currentQty = cart[id] || 0;
    let newQty = currentQty + change;
    
    if (newQty <= 0) {
        delete cart[id];
    } else {
        let maxStock = parseInt(allProducts[id].stock || 0);
        if (newQty > maxStock) {
            alert(currentLanguage === 'gu' ? "દુકાનમાં આટલો જથ્થો હાજર નથી!" : "Required quantity exceeds available stock!");
            return;
        }
        cart[id] = newQty;
    }
    
    updateCartBadge();
    renderProducts();
}

function updateCartBadge() {
    let totalItems = 0;
    for (let id in cart) { 
        totalItems += cart[id]; 
    }
    const badge = document.getElementById('cart-badge-count');
    if (badge) badge.innerText = totalItems;
}

// સિંગલ આઇટમ ડીલીટ કરવા અથવા આખું કાર્ટ ખાલી કરવા માટે ફંક્શન (ભવિષ્યના વ્યુ માટે)
function clearWholeCart() {
    cart = {};
    updateCartBadge();
    renderProducts();
}

/* ==========================================================================
   ૩. ચેકઆઉટ પ્રોસેસ અને ૧૦૦% મફત Direct REST API ઓર્ડર સબમિટ
   ========================================================================== */
function checkoutCartProcess() {
    let totalBill = 0;
    let itemElements = [];
    
    for (let id in cart) {
        let amt = allProducts[id].sprice * cart[id];
        totalBill += amt;
        itemElements.push({
            productId: id,
            name: allProducts[id].nameGu,
            qty: cart[id],
            price: allProducts[id].sprice
        });
    }

    if (totalBill === 0) {
        alert(currentLanguage === 'gu' ? "તમારું કાર્ટ ખાલી છે! વસ્તુ ઉમેરો." : "Your cart is empty! Add products.");
        return;
    }

    // એડમિન સંચાલિત લઘુત્તમ ખરીદી મર્યાદા ચેક
    if (totalBill < minOrderAmt) {
        alert(`${langData[currentLanguage].minAlert}${minOrderAmt}`);
        return;
    }

    // વન-ટાઇમ રજીસ્ટ્રેશન વિગતો ચેક
    if (!customerProfile) {
        alert(currentLanguage === 'gu' ? "ઓર્ડર કરવા માટે પ્રોફાઇલ વિગતો ભરવી ફરજિયાત છે!" : "Profile details are mandatory for order!");
        openRegistrationForm();
        return;
    }

    // કેશ ઓન ડિલિવરી ઓટો ડિલિવરી ચાર્જ ગણતરી
    let finalDeliveryCharge = totalBill >= freeDeliveryLimit ? 0 : deliveryCharge;
    let finalTotal = totalBill + finalDeliveryCharge;

    // યુનિક ઓર્ડર આઈડી જનરેટર
    let orderID = "ORD" + Math.floor(100000 + Math.random() * 900000);
    
    let orderData = {
        orderID: orderID,
        date: new Date().toLocaleDateString('en-GB'),
        time: new Date().toLocaleTimeString(),
        items: itemElements,
        billAmount: totalBill,
        deliveryCharge: finalDeliveryCharge,
        grandTotal: finalTotal,
        paymentMode: "Cash on Delivery (COD)",
        customer: customerProfile,
        status: "Pending"
    };

    // ૧૦૦% ફ્રી Direct REST API દ્વારા તમારા Firebase ડેટાબેઝમાં ઓર્ડર સબમિટ [૨]
    fetch(`${dbURL}/orders/${orderID}.json`, {
        method: "PUT",
        body: JSON.stringify(orderData)
    })
    .then(res => res.json())
    .then(() => {
        // સ્ટોક ઓટોમેટિક માઇનસ કરવાનું લોજિક (ઇનલાઇન સિંક) [૨]
        for (let id in cart) {
            let remStock = parseInt(allProducts[id].stock || 0) - cart[id];
            fetch(`${dbURL}/products/${id}/stock.json`, { 
                method: "PUT", 
                body: remStock 
            });
        }
        
        // ઓર્ડર સફળતાપૂર્વક સબમિટ થયાનું મોડલ પોપ-અપ બતાવો
        const modalId = document.getElementById('success-order-id');
        const modal = document.getElementById('success-modal');
        if (modalId) modalId.innerText = orderID;
        if (modal) modal.style.display = 'flex';
        
        // કાર્ટ સંપૂર્ણ સાફ કરો
        cart = {};
        updateCartBadge();
        
        // લાઈવ ડેટા ફરીથી લોડ કરો (customer-app.js માંથી)
        if (typeof loadAppData === "function") loadAppData();
    })
    .catch(err => {
        console.error("ઓર્ડર સબમિટ કરવામાં ભૂલ આવી:", err);
        alert(currentLanguage === 'gu' ? "ઓર્ડર મોકલવામાં સમસ્યા આવી. ઇન્ટરનેટ ચેક કરો!" : "Failed to place order. Check connection!");
    });
}

function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) modal.style.display = 'none';
    
    // ઓર્ડર પૂરો થયા પછી ગ્રાહકને હોમ પેજ પર મોકલો
    const homeBtn = document.querySelector('.bottom-nav .nav-item');
    if (homeBtn) switchPage('home-page', homeBtn);
}
