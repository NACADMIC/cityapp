// Global variables
let currentUser = null;
let isGuest = false;
let guestPhone = null;
let cart = [];
let menuItems = [];
let usedPoints = 0;

// 영업시간 체크
async function checkBusinessHours() {
  try {
    const res = await fetch('/api/business-hours');
    const data = await res.json();
    
    if (!data.isOpen) {
      // 영업시간 아님 - 안내 표시
      document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #C8102E 0%, #8B0000 100%); color: white; text-align: center; padding: 20px; font-family: 'Noto Sans KR', sans-serif;">
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 40px; border-radius: 20px; max-width: 500px;">
            <h1 style="font-size: 48px; margin: 0 0 20px 0;">🏮</h1>
            <h2 style="font-size: 32px; margin: 0 0 20px 0; font-weight: bold;">시티반점</h2>
            <p style="font-size: 24px; margin: 0 0 10px 0; font-weight: bold;">현재 영업시간이 아닙니다</p>
            <p style="font-size: 18px; margin: 0 0 30px 0; opacity: 0.9;">영업시간: ${data.businessHours}</p>
            <p style="font-size: 16px; margin: 0; opacity: 0.8;">현재 시간: ${data.currentTime}</p>
            <p style="font-size: 14px; margin: 20px 0 0 0; opacity: 0.7;">영업시간 내에 다시 방문해주세요!</p>
          </div>
        </div>
      `;
      return false;
    }
    return true;
  } catch (err) {
    console.error('영업시간 체크 오류:', err);
    // 오류 시 정상 진행 (서버 연결 문제일 수 있음)
    return true;
  }
}

// Screen navigation
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function showAuthSelect() {
  showScreen('auth-select-screen');
}

function showLogin() {
  showScreen('login-screen');
}

function showRegister() {
  showScreen('register-screen');
}

function showGuestOrder() {
  showScreen('guest-verify-screen');
}

function showMenu() {
  loadMenu();
  updateUserInfo();
  showScreen('menu-screen');
}

function showCart() {
  renderCart();
  showScreen('cart-screen');
}

function showCheckout() {
  if (cart.length === 0) {
    alert('장바구니가 비어있습니다.');
    return;
  }
  renderCheckout();
  showScreen('checkout-screen');
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const phone = document.getElementById('login-phone').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });

    const data = await res.json();

    if (data.success) {
      currentUser = data.user;
      isGuest = false;
      alert(`환영합니다, ${currentUser.name}님!`);
      showMenu();
    } else {
      alert(data.error || '로그인 실패');
    }
  } catch (err) {
    alert('로그인 오류: ' + err.message);
  }
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('register-name').value.trim();
  const phone = document.getElementById('register-phone').value.trim();
  const password = document.getElementById('register-password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, password })
    });

    const data = await res.json();

    if (data.success) {
      alert('회원가입 완료! 로그인해주세요.');
      showLogin();
      document.getElementById('login-phone').value = phone;
    } else {
      alert(data.error || '회원가입 실패');
    }
  } catch (err) {
    alert('회원가입 오류: ' + err.message);
  }
});

// Guest verification - send code
async function sendVerificationCode() {
  const phone = document.getElementById('guest-phone').value.trim();
  
  if (!phone) {
    alert('전화번호를 입력해주세요.');
    return;
  }

  try {
    const res = await fetch('/api/phone/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById('code-group').style.display = 'block';
      document.getElementById('code-display').textContent = data.code;
      alert('인증번호가 발송되었습니다! (테스트: ' + data.code + ')');
    } else {
      alert(data.error || '인증번호 발송 실패');
    }
  } catch (err) {
    alert('인증번호 발송 오류: ' + err.message);
  }
}

// Guest verification - verify
document.getElementById('guest-verify-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const phone = document.getElementById('guest-phone').value.trim();
  const code = document.getElementById('verify-code').value.trim();

  try {
    const res = await fetch('/api/phone/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code })
    });

    const data = await res.json();

    if (data.success) {
      isGuest = true;
      guestPhone = phone;
      alert('인증 완료! 주문을 시작하세요.');
      showMenu();
    } else {
      alert(data.error || '인증 실패');
    }
  } catch (err) {
    alert('인증 오류: ' + err.message);
  }
});

// Logout
function logout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    currentUser = null;
    isGuest = false;
    guestPhone = null;
    cart = [];
    usedPoints = 0;
    showAuthSelect();
  }
}

// Update user info
function updateUserInfo() {
  const userInfoDiv = document.getElementById('user-info');
  
  if (currentUser && !isGuest) {
    userInfoDiv.style.display = 'block';
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-points').textContent = currentUser.points;
    
    // sessionStorage에 저장 (마이페이지에서 사용)
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
  } else {
    userInfoDiv.style.display = 'none';
    sessionStorage.removeItem('currentUser');
  }
}

// Load menu
async function loadMenu() {
  try {
    const res = await fetch('/api/menu');
    const data = await res.json();
    
    if (data.success) {
      menuItems = data.menu;
      renderMenu();
      updateCartCount();
    }
  } catch (err) {
    console.error('메뉴 로드 오류:', err);
    document.getElementById('menu-list').innerHTML = '<p class="loading">메뉴를 불러올 수 없습니다.</p>';
  }
}

// Render menu
function renderMenu(category = 'all') {
  const menuList = document.getElementById('menu-list');
  
  const filtered = category === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === category);

  if (filtered.length === 0) {
    menuList.innerHTML = '<p class="loading">메뉴가 없습니다.</p>';
    return;
  }

  menuList.innerHTML = filtered.map(item => `
    <div class="menu-item" onclick="addToCart(${item.id})">
      ${item.bestseller ? '<span class="bestseller">인기</span>' : ''}
      <div class="emoji">${item.emoji || '🍜'}</div>
      <h3>${item.name}</h3>
      <p class="price">${item.price.toLocaleString()}원</p>
    </div>
  `).join('');
}

// Category tabs
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderMenu(tab.dataset.category);
    });
  });
});

// Add to cart
function addToCart(itemId) {
  const item = menuItems.find(m => m.id === itemId);
  if (!item) return;

  const existing = cart.find(c => c.id === itemId);
  
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...item, quantity: 1 });
  }

  updateCartCount();
  
  const btn = event.target.closest('.menu-item');
  btn.style.transform = 'scale(0.95)';
  setTimeout(() => btn.style.transform = '', 200);
}

// Update cart count
function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cart-count').textContent = count;
}

// Render cart
function renderCart() {
  const cartItemsDiv = document.getElementById('cart-items');
  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (cart.length === 0) {
    cartItemsDiv.innerHTML = '<div class="empty-cart"><div class="empty-cart-icon">🛒</div><p>장바구니가 비어있습니다</p></div>';
    document.getElementById('items-total').textContent = '0원';
    document.getElementById('total-price').textContent = '0원';
    return;
  }

  cartItemsDiv.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <h3>${item.name}</h3>
        <p class="cart-item-price">${(item.price * item.quantity).toLocaleString()}원</p>
      </div>
      <div class="cart-item-controls">
        <button onclick="decreaseQuantity(${idx})">-</button>
        <span>${item.quantity}</span>
        <button onclick="increaseQuantity(${idx})">+</button>
        <button class="remove-btn" onclick="removeFromCart(${idx})">×</button>
      </div>
    </div>
  `).join('');

  document.getElementById('items-total').textContent = itemsTotal.toLocaleString() + '원';

  const pointSection = document.getElementById('point-section');
  const earnPointsInfo = document.getElementById('earn-points-info');
  
  if (currentUser && !isGuest && pointSection && earnPointsInfo) {
    // 회원: 포인트 사용 섹션 표시
    pointSection.style.display = 'block';
    earnPointsInfo.style.display = 'block';
    
    const maxPoints = Math.min(currentUser.points, itemsTotal);
    const usePointsInput = document.getElementById('use-points');
    if (usePointsInput) {
      usePointsInput.max = maxPoints;
      usePointsInput.value = usedPoints;
    }
    
    const finalAmount = itemsTotal - usedPoints;
    const earnPoints = Math.floor(finalAmount * 0.07);
    
    // 보유 포인트 표시
    const userPointsDisplay = document.getElementById('user-points-display');
    if (userPointsDisplay) {
      userPointsDisplay.textContent = currentUser.points.toLocaleString() + 'P';
    }
    
    const usedPointsDisplay = document.getElementById('used-points-display');
    if (usedPointsDisplay) {
      usedPointsDisplay.textContent = '-' + usedPoints.toLocaleString() + 'P';
    }
    
    document.getElementById('total-price').textContent = finalAmount.toLocaleString() + '원';
    
    const earnPointsElem = document.getElementById('earn-points');
    if (earnPointsElem) {
      earnPointsElem.textContent = earnPoints.toLocaleString();
    }
  } else {
    // 비회원: 포인트 섹션 숨김
    if (pointSection) pointSection.style.display = 'none';
    if (earnPointsInfo) earnPointsInfo.style.display = 'none';
    usedPoints = 0;
    document.getElementById('total-price').textContent = itemsTotal.toLocaleString() + '원';
  }
}

// 포인트 적용
function applyPoints() {
  if (!currentUser || isGuest) {
    alert('회원만 포인트를 사용할 수 있습니다.');
    return;
  }

  const usePointsInput = document.getElementById('use-points');
  if (!usePointsInput) {
    console.error('❌ 포인트 입력 필드를 찾을 수 없습니다.');
    return;
  }

  const inputPoints = parseInt(usePointsInput.value) || 0;
  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const maxPoints = Math.min(currentUser.points, itemsTotal);

  console.log('🔍 포인트 적용 시도:', {
    입력포인트: inputPoints,
    보유포인트: currentUser.points,
    상품금액: itemsTotal,
    최대사용가능: maxPoints
  });

  if (inputPoints > maxPoints) {
    alert(`최대 ${maxPoints.toLocaleString()}P까지 사용 가능합니다.`);
    usedPoints = maxPoints;
    usePointsInput.value = maxPoints;
  } else if (inputPoints < 0) {
    alert('0P 이상 입력해주세요.');
    usedPoints = 0;
    usePointsInput.value = 0;
  } else {
    usedPoints = inputPoints;
  }

  console.log('✅ 포인트 적용 완료:', usedPoints, 'P');
  renderCart();
}

// Quantity controls
function increaseQuantity(idx) {
  cart[idx].quantity++;
  renderCart();
  updateCartCount();
}

function decreaseQuantity(idx) {
  if (cart[idx].quantity > 1) {
    cart[idx].quantity--;
  } else {
    cart.splice(idx, 1);
  }
  renderCart();
  updateCartCount();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  renderCart();
  updateCartCount();
}

// Render checkout
function renderCheckout() {
  const checkoutItemsDiv = document.getElementById('checkout-items');
  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalAmount = itemsTotal - usedPoints;
  const earnPoints = Math.floor(finalAmount * 0.07);

  checkoutItemsDiv.innerHTML = cart.map(item => `
    <div class="checkout-item">
      <span>${item.name} x ${item.quantity}</span>
      <span>${(item.price * item.quantity).toLocaleString()}원</span>
    </div>
  `).join('');

  document.getElementById('checkout-items-total').textContent = itemsTotal.toLocaleString() + '원';
  document.getElementById('checkout-total').textContent = finalAmount.toLocaleString() + '원';

  const checkoutPointsSection = document.getElementById('checkout-points-section');
  const checkoutEarnInfo = document.getElementById('checkout-earn-info');
  
  if (currentUser && !isGuest) {
    if (usedPoints > 0) {
      checkoutPointsSection.style.display = 'block';
      document.getElementById('checkout-used-points').textContent = '-' + usedPoints.toLocaleString() + 'P';
    } else {
      checkoutPointsSection.style.display = 'none';
    }
    
    checkoutEarnInfo.style.display = 'block';
    document.getElementById('checkout-earn-points').textContent = earnPoints.toLocaleString();
    
    document.getElementById('checkout-name').value = currentUser.name;
    document.getElementById('checkout-phone').value = currentUser.phone;
  } else {
    checkoutPointsSection.style.display = 'none';
    checkoutEarnInfo.style.display = 'none';
    
    if (isGuest && guestPhone) {
      document.getElementById('checkout-phone').value = guestPhone;
    }
  }
}

// Place order
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const customerName = document.getElementById('checkout-name').value.trim();
  const phone = document.getElementById('checkout-phone').value.trim();
  const address = document.getElementById('checkout-address').value.trim();
  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const orderData = {
    userId: currentUser ? currentUser.userId : null,
    customerName,
    phone,
    address,
    items: cart,
    totalAmount: itemsTotal,
    usedPoints,
    paymentMethod,
    isGuest,
    phoneVerified: isGuest
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById('complete-order-id').textContent = data.orderId;
      
      if (data.earnedPoints && data.earnedPoints > 0) {
        document.getElementById('complete-points-info').style.display = 'block';
        document.getElementById('complete-earned-points').textContent = data.earnedPoints.toLocaleString();
        
        if (currentUser) {
          currentUser.points += data.earnedPoints - usedPoints;
        }
      } else {
        document.getElementById('complete-points-info').style.display = 'none';
      }

      cart = [];
      usedPoints = 0;
      updateCartCount();

      showScreen('complete-screen');
    } else {
      alert(data.error || '주문 실패');
    }
  } catch (err) {
    alert('주문 오류: ' + err.message);
  }
});

// Initial screen - 영업시간 체크 후 시작
(async function init() {
  const isOpen = await checkBusinessHours();
  if (isOpen) {
    showAuthSelect();
  }
})();

