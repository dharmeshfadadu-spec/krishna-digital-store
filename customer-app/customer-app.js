/* ==========================================================================
   ૧. ગ્લોબલ વેરિએબલ્સ અને કન્ફિગ્યુરેશન
   ========================================================================== */
let currentLanguage = 'gu';
let allProducts = {};
let customerProfile = JSON.parse(localStorage.getItem('cust_profile')) || null;
let lat = "", lng = "";

// ઓર્ડર નિયમો માટે ડિફોલ્ટ આંકડા (જે Firebase માંથી લોડ થશે)
let minOrderAmt = 200;
let deliveryCharge = 20;
let freeDeliveryLimit = 1000;

// ભાષા બદલવા માટેનો શબ્દકોષ
const langData = {
    gu: {
        title: "ક્રિષ્ના ગ્રોસરી સ્ટોર",
        search: "વસ્તુ શોધો...",
        navh: "Home",
        navc: "Categories",
        navn: "Notification",
        nava: "Account",
        minAlert: "ઓછામાં ઓછો ઓર્ડર ખરીદી મર્યાદા ₹",
        outStock: "સ્ટોક ખાલી છે",
        succ: "તમારો ઓર્ડર સફળતાપૂર્વક નોંધાઈ ગયો છે! 👍",
        orderIdText: "ઓર્ડર આઈડી"
    },
    en: {
        title: "Krishna Grocery Store",
        search: "Search products...",
        navh: "Home",
        navc: "Categories",
        navn: "Notification",
        nava: "Account",
        minAlert: "Minimum order value must be ₹",
        outStock: "Out of Stock",
        succ: "Your order has been placed successfully! 👍",
        orderIdText: "Order ID"
    }
};

/* ==========================================================================
   ૨. સિંગલ પેજ નેવિગેશન કંટ્રોલ (SPA Logic)
   ========================================================================== */
function switchPage(pageId, element) {
    // બધા પેજ છુપાવો
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // બોટમ બારના બધા બટન આઇકોન નોર્મલ કરો
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // જે પેજ ખોલવું છે તેને બતાવો અને બટન લીલું કરો
    document.getElementById(pageId).classList.add('active');
    element.classList.add('active');
    
    // જો હિસ્ટ્રી પેજ બંધ કરવું હોય તો રીસેટ કરવું
    if(pageId !== 'account-page') {
        let historyArea = document.getElementById('order-history-area');
        if(historyArea) historyArea.style.display = 'none';
    }
}

/* ==========================================================================
   ૩. ભાષા બદલવાની સ્વિચ સિસ્ટમ
   ========================================================================== */
function toggleLanguage() {
    currentLanguage = currentLanguage === 'gu' ? 'en' : 'gu';
    // બટન પર લખાણ બદલો
    document.getElementById('lang-btn').innerText = currentLanguage === 'gu' ? 'English' : 'ગુજરાતી';
    
    // બધી જગ્યાએ ભાષા સેટ કરો
    applyLanguageStrings();
    
    // પ્રોડક્ટ ગ્રીડ ફરીથી લોડ કરો (જો ફંક્શન હાજર હોય)
    if (typeof renderProducts === "function") {
        renderProducts();
    }
}

function applyLanguageStrings() {
    let l = langData[currentLanguage];
    document.getElementById('app-title').innerText = l.title;
    document.getElementById('search-input').placeholder = l.search;
    document.getElementById('nav-h').innerText = l.navh;
    document.getElementById('nav-c').innerText = l.navc;
    document.getElementById('nav-n').innerText = l.navn;
    document.getElementById('nav-a').innerText = l.nava;
}

/* ==========================================================================
   ૪. મુખ્ય ડેટા લોડર (Direct REST API જોડાણ)
   ========================================================================== */
function loadAppData() {
    // એડમિન સેટિંગ્સ અને ઓફર નિયમો લોડ કરવા [૨]
    fetch(`${dbURL}/settings.json`)
    .then(res => res.json())
    .then(settings => {
        if(settings) {
            minOrderAmt = settings.minOrderAmt || 200;
            deliveryCharge = settings.deliveryCharge || 20;
            freeDeliveryLimit = settings.freeDeliveryLimit || 1000;
            
            // એડમિન સંચાલિત ફોન નંબર કનેક્ટ કરો
            document.getElementById('admin-call-btn').href = `tel:${settings.adminPhone || '9999999999'}`;
            
            // સ્થિર સૂચના પટ્ટી સેટ કરો
            document.getElementById('notice-board').innerText = settings.noticeText || "નિયમ સેટ નથી";
            
            // ઓટો બેનર કંટ્રોલ
            let bannerArea = document.getElementById('banner-area');
            if(settings.bannerActive === true) {
                bannerArea.style.display = 'block';
                document.getElementById('banner-text').innerText = settings.bannerText || "";
            } else {
                bannerArea.style.display = 'none';
            }
        }
    })
    .catch(err => console.error("નિયમો લોડ કરવામાં ભૂલ આવી:", err));

    // ડેટાબેઝમાંથી પ્રોડક્ટ્સ લોડ કરવા [૨]
    fetch(`${dbURL}/products.json`)
    .then(res => res.json())
    .then(products => {
        allProducts = products || {};
        if (typeof renderProducts === "function") renderProducts();
        if (typeof renderCategories === "function") renderCategories();
    })
    .catch(err => console.error("વસ્તુઓ લોડ કરવામાં ભૂલ આવી:", err));
    
    updateProfileUI();
}

/* ==========================================================================
   ૫. પ્રોડક્ટ સર્ચબાર કંટ્રોલ
   ========================================================================== */
function searchProducts() {
    let query = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.product-card').forEach(card => {
        let name = card.querySelector('.prod-name').innerText.toLowerCase();
        card.style.display = name.includes(query) ? 'flex' : 'none';
    });
}

/* ==========================================================================
   ૬. ૧૦૦% મફત બ્રાઉઝર લાઈવ લોકેશન (HTML5 Geolocation API)
   ========================================================================== */
function getLiveLocation() {
    let statusText = document.getElementById('location-status');
    statusText.style.color = "orange";
    statusText.innerText = "⏳ લોકેશન શોધી રહ્યા છીએ...";
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                lat = position.coords.latitude;
                lng = position.coords.longitude;
                statusText.style.color = "green";
                statusText.innerText = `✅ લોકેશન મળી ગયું! (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            }, 
            (error) => {
                statusText.style.color = "red";
                statusText.innerText = "❌ જીપીએસ ચાલુ કરો અને પરમિશન Allow કરો.";
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        statusText.style.color = "red";
        statusText.innerText = "❌ તમારા ફોનમાં જીપીએસ સપોર્ટ નથી.";
    }
}

/* ==========================================================================
   ૭. વન-ટાઇમ રજીસ્ટ્રેશન વિગતો મેનેજમેન્ટ
   ========================================================================== */
function openRegistrationForm() {
    document.getElementById('registration-modal').style.display = 'flex';
    if(customerProfile) {
        document.getElementById('cust-name-input').value = customerProfile.name || "";
        document.getElementById('cust-phone-input').value = customerProfile.phone || "";
        document.getElementById('cust-address-input').value = customerProfile.address || "";
        lat = customerProfile.lat || "";
        lng = customerProfile.lng || "";
        if(lat) {
            document.getElementById('location-status').innerText = "✅ લોકેશન પહેલેથી સેવ્ડ છે.";
        }
    }
}

function saveRegistrationData() {
    let name = document.getElementById('cust-name-input').value.trim();
    let phone = document.getElementById('cust-phone-input').value.trim();
    let address = document.getElementById('cust-address-input').value.trim();

    if(!name || !phone || !address) {
        alert("નામ, સરનામું અને મોબાઈલ નંબર લખવો ફરજિયાત છે!");
        return;
    }
    
    if(phone.length !== 10) {
        alert("કૃપા કરીને સાચો ૧૦ આંકડાનો મોબાઈલ નંબર નાખો!");
        return;
    }

    if(!lat || !lng) {
        alert("ઓર્ડર ડિલિવરી માટે 'લાઈવ લોકેશન મેળવો' બટન દબાવવું ફરજિયાત છે!");
        return;
    }

    // બ્રાઉઝર લોકલ સ્ટોરેજમાં સેવ કરો
    customerProfile = { name, phone, address, lat, lng };
    localStorage.setItem('cust_profile', JSON.stringify(customerProfile));
    
    document.getElementById('registration-modal').style.display = 'none';
    updateProfileUI();
}

function updateProfileUI() {
    if(customerProfile) {
        document.getElementById('disp-name').innerText = customerProfile.name;
        document.getElementById('disp-phone').innerText = customerProfile.phone;
        document.getElementById('disp-address').innerText = customerProfile.address;
        document.getElementById('disp-loc').innerText = "✅ હા (સેવ્ડ)";
        document.getElementById('disp-loc').style.color = "green";
    }
}

/* ==========================================================================
   ૮. એકાઉન્ટ ડિલીટ અને નોટિફિકેશન ક્લિયર
   ========================================================================== */
function deleteAccountData() {
    if(confirm("શું તમે તમારી બધી જ પ્રોફાઇલ વિગતો અને ઓર્ડર ડેટા ફોનમાંથી કાયમ માટે ડીલીટ કરવા માંગો છો?")) {
        localStorage.clear();
        customerProfile = null;
        location.reload();
    }
}

function clearNotifications() {
    document.getElementById('notification-list-area').innerHTML = "<p style='color:#777; padding:15px; font-style:italic;'>બધી જ સૂચનાઓ સાફ કરી દીધી છે.</p>";
}

// એપ ઓપન થાય એટલે બધું ડેટા લોડ થાય
window.addEventListener('DOMContentLoaded', loadAppData);
