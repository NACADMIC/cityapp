// Global variables
let currentUser = null;
let isGuest = false;
let guestPhone = null;
let cart = [];
let menuItems = [];
let usedPoints = 0;
let storeName = '시티반점'; // 가게명 (동적으로 로드됨)

// Privacy Accordion Toggle
function togglePrivacy(type) {
  const content = document.getElementById(`${type}-content`);
  const arrow = document.getElementById(`${type}-arrow`);
  const header = content.previousElementSibling;
  
  if (content.classList.contains('active')) {
    content.classList.remove('active');
    arrow.classList.remove('active');
    header.classList.remove('active');
  } else {
    content.classList.add('active');
    arrow.classList.add('active');
    header.classList.add('active');
  }
}

// 영업시간 체크
async function checkBusinessHours() {
  // 개발자 모드 체크 (URL 파라미터 또는 localStorage)
  const urlParams = new URLSearchParams(window.location.search);
  const devMode = urlParams.get('dev') === 'true' || localStorage.getItem('dev-mode') === 'true';
  
  if (devMode) {
    console.log('🔧 개발자 모드: 영업시간 체크 우회');
    // 개발자 모드 배지 표시
    const devBadge = document.createElement('div');
    devBadge.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #ff9800;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    devBadge.textContent = '🔧 개발자 모드';
    document.body.appendChild(devBadge);
    return true;
  }
  
  try {
    const res = await fetch('/api/business-hours');
    const data = await res.json();
    
    if (!data.isOpen) {
      // 영업시간 아님 - 안내 표시 (개발자 접속 링크 포함)
      let reasonMessage = '현재 영업시간이 아닙니다';
      if (data.statusMessage) {
        reasonMessage = data.statusMessage;
      }
      
      document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #C8102E 0%, #8B0000 100%); color: white; text-align: center; padding: 20px; font-family: 'Noto Sans KR', sans-serif;">
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 40px; border-radius: 20px; max-width: 500px;">
            <h1 style="font-size: 48px; margin: 0 0 20px 0;">🏮</h1>
            <h2 style="font-size: 32px; margin: 0 0 20px 0; font-weight: bold;" data-store-name>시티반점</h2>
            <p style="font-size: 24px; margin: 0 0 10px 0; font-weight: bold;">${reasonMessage}</p>
            <p style="font-size: 18px; margin: 0 0 30px 0; opacity: 0.9;">영업시간: ${data.businessHours}</p>
            <p style="font-size: 16px; margin: 0; opacity: 0.8;">현재 시간: ${data.currentTime}</p>
            <p style="font-size: 14px; margin: 20px 0 0 0; opacity: 0.7;">영업시간 내에 다시 방문해주세요!</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.3);">
              <a href="?dev=true" style="display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: all 0.3s;">
                🔧 개발자 접속
              </a>
            </div>
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

// 개발자 테스트 로그인
async function testLogin() {
  const testPhone = '010-0000-0000';
  const testPassword = 'test1234';
  const testName = '테스트사용자';
  
  try {
    // 먼저 로그인 시도
    let res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, password: testPassword })
    });
    
    let data = await res.json();
    
    // 로그인 실패하면 자동 회원가입
    if (!data.success) {
      console.log('테스트 계정이 없어서 자동 생성합니다...');
      res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: testPhone, 
          name: testName, 
          email: 'test@test.com',
          address: '서울시 강남구 테스트동 123',
          password: testPassword 
        })
      });
      
      data = await res.json();
      
      if (data.success) {
        // 회원가입 후 바로 로그인
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: testPhone, password: testPassword })
        });
        
        data = await res.json();
      }
    }
    
    if (data.success) {
      currentUser = data.user;
      isGuest = false;
      
      // sessionStorage에 저장
      sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      console.log('✅ 테스트 로그인 성공!', currentUser);
      updateUserInfo();
      showMenu();
    } else {
      alert('테스트 로그인 실패: ' + (data.error || '알 수 없는 오류'));
    }
  } catch (err) {
    console.error('테스트 로그인 오류:', err);
    alert('테스트 로그인 오류: ' + err.message);
  }
}

function showFindId() {
  showScreen('find-id-screen');
  document.getElementById('find-id-result').style.display = 'none';
  document.getElementById('find-id-form').reset();
}

function showFindPassword() {
  showScreen('find-password-screen');
  document.getElementById('find-password-result').style.display = 'none';
  document.getElementById('find-password-form').reset();
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
      
      // sessionStorage에 저장
      sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      console.log('✅ 로그인 성공!', currentUser);
      alert(`환영합니다, ${currentUser.name}님!`);
      updateUserInfo();
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
  
  const phone = document.getElementById('register-phone').value.trim();
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const address = document.getElementById('register-address').value.trim();
  const password = document.getElementById('register-password').value.trim();
  const passwordConfirm = document.getElementById('register-password-confirm').value.trim();
  const privacyAgree = document.getElementById('register-privacy').checked;
  
  if (password !== passwordConfirm) {
    alert('비밀번호가 일치하지 않습니다.');
    return;
  }
  
  if (!privacyAgree) {
    alert('개인정보 수집 및 이용에 동의해주세요.');
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, name, email, address, password })
    });

    const data = await res.json();

    if (data.success) {
      alert(data.message || '회원가입 완료! 로그인해주세요.');
      showLogin();
      document.getElementById('login-phone').value = phone;
    } else {
      alert(data.error || '회원가입 실패');
    }
  } catch (err) {
    alert('회원가입 오류: ' + err.message);
  }
});

// Guest info form
document.getElementById('guest-verify-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const phone = document.getElementById('guest-phone').value.trim();
  const privacyAgree = document.getElementById('guest-privacy').checked;
  
  if (!phone) {
    alert('전화번호를 입력해주세요.');
    return;
  }
  
  if (!privacyAgree) {
    alert('개인정보 수집 및 이용에 동의해주세요.');
    return;
  }
  
  // Store guest info
  guestPhone = phone;
  isGuest = true;
  
  alert('비회원 주문 시작! 메뉴를 선택해주세요.');
  showMenu();
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
    
    // sessionStorage에 저장 (마이페이지와 네비게이션에서 사용)
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    console.log('📦 세션 저장 완료:', currentUser);
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
    <div class="menu-item" onclick="showMenuDetail(${item.id})">
      ${item.bestseller ? '<span class="bestseller">인기</span>' : ''}
      ${item.image 
        ? `<img src="${item.image}" alt="${item.name}" class="menu-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
           <div class="emoji" style="display:none;">${item.emoji || '🍜'}</div>`
        : `<div class="emoji">${item.emoji || '🍜'}</div>`
      }
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

// 메뉴 상세 팝업 표시
let currentMenuDetail = null;
let selectedOptions = [];
let selectedQuantity = 1;

async function showMenuDetail(itemId) {
  const item = menuItems.find(m => m.id === itemId);
  if (!item) return;
  
  currentMenuDetail = item;
  selectedOptions = [];
  selectedQuantity = 1;
  
  // 옵션 로드
  let menuOptions = [];
  try {
    const res = await fetch(`/api/menu/${itemId}/options`);
    const data = await res.json();
    if (data.success && data.options) {
      menuOptions = data.options;
    }
  } catch (err) {
    console.error('옵션 로드 오류:', err);
  }
  
  // 팝업 내용 생성
  const popup = document.getElementById('menu-detail-popup');
  const popupContent = document.getElementById('menu-detail-content');
  
  popupContent.innerHTML = `
    <div class="menu-detail-header">
      <button class="close-btn" onclick="closeMenuDetail()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #333; position: absolute; top: 15px; right: 15px; z-index: 10;">✕</button>
      ${item.image 
        ? `<img src="${item.image}" alt="${item.name}" class="menu-detail-image" onerror="this.style.display='none';">`
        : `<div class="menu-detail-emoji">${item.emoji || '🍜'}</div>`
      }
    </div>
    <div class="menu-detail-body">
      <h2>${item.name}</h2>
      <p class="menu-detail-price">${item.price.toLocaleString()}원</p>
      ${item.description ? `<p class="menu-detail-description">${item.description}</p>` : ''}
      
      ${menuOptions.length > 0 ? `
        <div class="menu-options-section">
          <h3>옵션 선택</h3>
          ${menuOptions.map((opt, idx) => `
            <label class="option-item">
              <input type="checkbox" value="${idx}" onchange="toggleOption(${idx}, '${opt.name}', ${opt.price || 0})">
              <span class="option-name">${opt.name}</span>
              ${opt.price ? `<span class="option-price">+${opt.price.toLocaleString()}원</span>` : ''}
            </label>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="quantity-section">
        <h3>수량</h3>
        <div class="quantity-controls">
          <button onclick="decreaseQuantity()" class="qty-btn">-</button>
          <span id="selected-quantity" class="qty-value">${selectedQuantity}</span>
          <button onclick="increaseQuantity()" class="qty-btn">+</button>
        </div>
      </div>
      
      <div class="menu-detail-total">
        <span>총 금액</span>
        <span id="menu-detail-total-price">${item.price.toLocaleString()}원</span>
      </div>
      
      <button class="btn btn-primary" onclick="addToCartWithOptions()" style="width: 100%; margin-top: 20px; padding: 16px; font-size: 18px; font-weight: 600;">
        장바구니에 추가
      </button>
    </div>
  `;
  
  popup.style.display = 'flex';
  updateMenuDetailTotal();
}

function closeMenuDetail() {
  document.getElementById('menu-detail-popup').style.display = 'none';
  currentMenuDetail = null;
  selectedOptions = [];
  selectedQuantity = 1;
}

function toggleOption(idx, name, price) {
  const checkbox = event.target;
  const option = { idx, name, price };
  
  if (checkbox.checked) {
    selectedOptions.push(option);
  } else {
    selectedOptions = selectedOptions.filter(opt => opt.idx !== idx);
  }
  
  updateMenuDetailTotal();
}

function increaseQuantity() {
  selectedQuantity++;
  document.getElementById('selected-quantity').textContent = selectedQuantity;
  updateMenuDetailTotal();
}

function decreaseQuantity() {
  if (selectedQuantity > 1) {
    selectedQuantity--;
    document.getElementById('selected-quantity').textContent = selectedQuantity;
    updateMenuDetailTotal();
  }
}

function updateMenuDetailTotal() {
  if (!currentMenuDetail) return;
  
  const basePrice = currentMenuDetail.price;
  const optionsPrice = selectedOptions.reduce((sum, opt) => sum + (opt.price || 0), 0);
  const totalPrice = (basePrice + optionsPrice) * selectedQuantity;
  
  const totalElement = document.getElementById('menu-detail-total-price');
  if (totalElement) {
    totalElement.textContent = totalPrice.toLocaleString() + '원';
  }
}

function addToCartWithOptions() {
  if (!currentMenuDetail) return;
  
  const basePrice = currentMenuDetail.price;
  const optionsPrice = selectedOptions.reduce((sum, opt) => sum + (opt.price || 0), 0);
  const totalPrice = basePrice + optionsPrice;
  
  // 옵션 정보를 문자열로 저장
  const optionsText = selectedOptions.length > 0 
    ? selectedOptions.map(opt => opt.name + (opt.price ? ` (+${opt.price.toLocaleString()}원)` : '')).join(', ')
    : '';
  
  // 기존 장바구니에 같은 메뉴+옵션 조합이 있는지 확인
  const cartKey = `${currentMenuDetail.id}_${optionsText}`;
  const existing = cart.find(c => {
    const cKey = `${c.id}_${c.optionsText || ''}`;
    return cKey === cartKey;
  });
  
  if (existing) {
    existing.quantity += selectedQuantity;
  } else {
    cart.push({
      ...currentMenuDetail,
      quantity: selectedQuantity,
      options: selectedOptions,
      optionsText: optionsText,
      price: totalPrice // 옵션 포함 가격
    });
  }
  
  updateCartCount();
  closeMenuDetail();
  
  // 알림 표시
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px 40px;
    border-radius: 12px;
    font-size: 18px;
    font-weight: 600;
    z-index: 10000;
    animation: fadeInOut 1.5s;
  `;
  notification.textContent = '장바구니에 추가되었습니다!';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 1500);
}

// Add to cart (기존 함수는 호환성을 위해 유지)
function addToCart(itemId) {
  showMenuDetail(itemId);
}

// Update cart count
function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // 하단 네비게이션 장바구니 뱃지 업데이트
  const navCartBadge = document.getElementById('nav-cart-count');
  if (navCartBadge) {
    navCartBadge.textContent = count;
    navCartBadge.style.display = count > 0 ? 'block' : 'none';
  }
  
  // 사이드 메뉴 장바구니 뱃지 업데이트
  updateSideCartCount();
}

// Render cart
async function renderCart() {
  const cartItemsDiv = document.getElementById('cart-items');
  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (cart.length === 0) {
    cartItemsDiv.innerHTML = '<div class="empty-cart"><div class="empty-cart-icon">🛒</div><p>장바구니가 비어있습니다</p></div>';
    document.getElementById('items-total').textContent = '0원';
    document.getElementById('total-price').textContent = '0원';
    const deliveryFeeRow = document.getElementById('delivery-fee-row');
    const minOrderWarning = document.getElementById('min-order-warning');
    if (deliveryFeeRow) deliveryFeeRow.style.display = 'none';
    if (minOrderWarning) minOrderWarning.style.display = 'none';
    return;
  }

  cartItemsDiv.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <h3>${item.name}${item.optionsText ? `<br><small style="color: #666; font-size: 12px; font-weight: normal;">${item.optionsText}</small>` : ''}</h3>
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

  // 배달료 및 최소 주문 금액 계산
  let deliveryFee = 0;
  let minOrderAmount = 15000;
  let freeDeliveryThreshold = 20000;
  
  try {
    const storeRes = await fetch('/api/store/info');
    const storeData = await storeRes.json();
    if (storeData.storeInfo) {
      minOrderAmount = storeData.storeInfo.minOrderAmount || 15000;
      freeDeliveryThreshold = storeData.storeInfo.freeDeliveryThreshold || 20000;
      const baseDeliveryFee = storeData.storeInfo.deliveryFee || 3000;
      
      // 배달료 계산
      if (itemsTotal < freeDeliveryThreshold) {
        deliveryFee = baseDeliveryFee;
      }
    }
  } catch (err) {
    console.error('배달료 계산 오류:', err);
  }
  
  // 배달료 표시
  const deliveryFeeRow = document.getElementById('delivery-fee-row');
  const deliveryFeeAmount = document.getElementById('delivery-fee');
  if (deliveryFeeRow && deliveryFeeAmount) {
    if (deliveryFee > 0) {
      deliveryFeeRow.style.display = 'flex';
      deliveryFeeAmount.textContent = deliveryFee.toLocaleString() + '원';
    } else {
      deliveryFeeRow.style.display = 'none';
    }
  }
  
  // 최소 주문 금액 경고 표시
  const minOrderWarning = document.getElementById('min-order-warning');
  const minOrderAmountDisplay = document.getElementById('min-order-amount');
  if (minOrderWarning && minOrderAmountDisplay) {
    if (itemsTotal < minOrderAmount) {
      minOrderWarning.style.display = 'block';
      minOrderAmountDisplay.textContent = minOrderAmount.toLocaleString();
    } else {
      minOrderWarning.style.display = 'none';
    }
  }

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
    
    const finalAmount = itemsTotal - usedPoints + deliveryFee;
    const earnPoints = Math.floor((itemsTotal - usedPoints) * 0.10);
    
    // 보유 포인트 표시
    const userPointsDisplay = document.getElementById('user-points-display');
    if (userPointsDisplay) {
      userPointsDisplay.textContent = currentUser.points.toLocaleString();
    }
    
    // 사용 포인트 표시
    const usedPointsDisplay = document.getElementById('used-points-display');
    if (usedPointsDisplay) {
      usedPointsDisplay.textContent = usedPoints.toLocaleString();
    }
    
    // 최대 사용 가능 포인트 표시
    const maxPointsDisplay = document.getElementById('max-points-display');
    if (maxPointsDisplay) {
      maxPointsDisplay.textContent = maxPoints.toLocaleString();
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
    const finalAmount = itemsTotal + deliveryFee;
    document.getElementById('total-price').textContent = finalAmount.toLocaleString() + '원';
  }
}

// 빠른 포인트 입력
function quickPoints(amount) {
  if (!currentUser || isGuest) return;
  
  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const maxPoints = Math.min(currentUser.points, itemsTotal);
  const usePointsInput = document.getElementById('use-points');
  
  if (amount === 'all') {
    usePointsInput.value = maxPoints;
    usedPoints = maxPoints;
  } else {
    const current = parseInt(usePointsInput.value) || 0;
    const newAmount = Math.min(current + amount, maxPoints);
    usePointsInput.value = newAmount;
    usedPoints = newAmount;
  }
  
  // 카트 다시 렌더링
  renderCart();
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
async function renderCheckout() {
  const checkoutItemsDiv = document.getElementById('checkout-items');
  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // 배달료 계산
  let deliveryFee = 0;
  try {
    const storeRes = await fetch('/api/store/info');
    const storeData = await storeRes.json();
    if (storeData.storeInfo) {
      const freeDeliveryThreshold = storeData.storeInfo.freeDeliveryThreshold || 20000;
      const baseDeliveryFee = storeData.storeInfo.deliveryFee || 3000;
      if (itemsTotal < freeDeliveryThreshold) {
        deliveryFee = baseDeliveryFee;
      }
    }
  } catch (err) {
    console.error('배달료 계산 오류:', err);
  }
  
  const finalAmount = itemsTotal - usedPoints + deliveryFee;
  const earnPoints = Math.floor((itemsTotal - usedPoints) * 0.10);

  checkoutItemsDiv.innerHTML = cart.map(item => `
    <div class="checkout-item">
      <span>${item.name} x ${item.quantity}</span>
      <span>${(item.price * item.quantity).toLocaleString()}원</span>
    </div>
  `).join('');

  document.getElementById('checkout-items-total').textContent = itemsTotal.toLocaleString() + '원';
  if (deliveryFee > 0) {
    const deliveryRow = document.createElement('div');
    deliveryRow.className = 'checkout-item';
    deliveryRow.innerHTML = `<span>배달료</span><span>${deliveryFee.toLocaleString()}원</span>`;
    checkoutItemsDiv.appendChild(deliveryRow);
  }
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
    document.getElementById('checkout-address').value = currentUser.address || '';
  } else {
    checkoutPointsSection.style.display = 'none';
    checkoutEarnInfo.style.display = 'none';
    
    if (isGuest && guestPhone) {
      document.getElementById('checkout-phone').value = guestPhone;
      document.getElementById('checkout-name').value = '';
      document.getElementById('checkout-address').value = '';
    }
  }
}

// Place order
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  // 영업시간 체크 (개발자 모드 제외)
  const urlParams = new URLSearchParams(window.location.search);
  const devMode = urlParams.get('dev') === 'true' || localStorage.getItem('dev-mode') === 'true';
  
  if (!devMode) {
    try {
      const hoursRes = await fetch('/api/business-hours');
      const hoursData = await hoursRes.json();
      
      if (!hoursData.isOpen) {
        let reasonMessage = '현재 주문을 받을 수 없습니다';
        if (hoursData.statusMessage) {
          reasonMessage = hoursData.statusMessage;
        }
        alert(`${reasonMessage}\n영업시간: ${hoursData.businessHours}\n현재 시간: ${hoursData.currentTime}`);
        return;
      }
    } catch (err) {
      console.error('영업시간 체크 오류:', err);
      // 서버 오류 시에도 주문 진행 (서버에서 다시 체크함)
    }
  }

  const customerName = document.getElementById('checkout-name').value.trim();
  const phone = document.getElementById('checkout-phone').value.trim();
  const address = document.getElementById('checkout-address').value.trim();
  const specialRequest = document.getElementById('checkout-request').value.trim();
  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // 배달료 계산 (서버에서 최종 확인)
  let deliveryFee = 0;
  try {
    const storeRes = await fetch('/api/store/info');
    const storeData = await storeRes.json();
    if (storeData.storeInfo) {
      const minOrder = storeData.storeInfo.minOrderAmount || 15000;
      const freeDeliveryThreshold = storeData.storeInfo.freeDeliveryThreshold || 20000;
      const baseDeliveryFee = storeData.storeInfo.deliveryFee || 3000;
      
      // 최소 주문 금액 체크
      if (itemsTotal < minOrder) {
        alert(`최소 주문 금액은 ${minOrder.toLocaleString()}원입니다.\n현재 주문 금액: ${itemsTotal.toLocaleString()}원`);
        return;
      }
      
      // 배달료 계산 (무료 배달 기준 미만이면 배달료 추가)
      if (itemsTotal < freeDeliveryThreshold) {
        deliveryFee = baseDeliveryFee;
      }
    }
  } catch (err) {
    console.error('배달료 계산 오류:', err);
  }

  const finalAmount = itemsTotal - usedPoints + deliveryFee;

  const orderData = {
    userId: currentUser ? currentUser.userId : null,
    customerName,
    phone,
    address,
    items: cart,
    totalAmount: itemsTotal,
    deliveryFee,
    finalAmount,
    usedPoints,
    paymentMethod,
    specialRequest,
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

// Find ID
document.getElementById('find-id-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('find-id-name').value.trim();
  
  try {
    const res = await fetch('/api/auth/find-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    const data = await res.json();
    
    if (data.success) {
      // 전화번호 일부 마스킹
      const phone = data.phone;
      const masked = phone.substring(0, 7) + '****';
      document.getElementById('found-phone').textContent = masked;
      document.getElementById('find-id-result').style.display = 'block';
    } else {
      alert(data.error || '가입된 정보가 없습니다.');
    }
  } catch (err) {
    alert('오류: ' + err.message);
  }
});

// Find Password
document.getElementById('find-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const phone = document.getElementById('find-pw-phone').value.trim();
  const name = document.getElementById('find-pw-name').value.trim();
  
  try {
    const res = await fetch('/api/auth/verify-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, name })
    });
    
    const data = await res.json();
    
    if (data.success) {
      document.getElementById('find-password-result').style.display = 'block';
      document.getElementById('find-password-form').style.display = 'none';
    } else {
      alert(data.error || '가입 정보가 일치하지 않습니다.');
    }
  } catch (err) {
    alert('오류: ' + err.message);
  }
});

// Reset Password
document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const phone = document.getElementById('find-pw-phone').value.trim();
  const newPassword = document.getElementById('new-password').value.trim();
  const newPasswordConfirm = document.getElementById('new-password-confirm').value.trim();
  
  if (newPassword !== newPasswordConfirm) {
    alert('비밀번호가 일치하지 않습니다.');
    return;
  }
  
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, newPassword })
    });
    
    const data = await res.json();
    
    if (data.success) {
      alert('비밀번호가 변경되었습니다. 로그인해주세요.');
      showLogin();
    } else {
      alert(data.error || '비밀번호 변경 실패');
    }
  } catch (err) {
    alert('오류: ' + err.message);
  }
});

// Bottom Navigation Functions
function goHome() {
  showMenu();
  updateNavActive('home');
}

function goToCart() {
  showCart();
  updateNavActive('cart');
}

// 주문내역 페이지로 이동
function goToOrderHistory() {
  console.log('📦 주문내역 이동 시도...');
  
  // 먼저 전역 변수 체크
  if (currentUser && currentUser.userId) {
    console.log('✅ 전역 변수로 이동 - 주문내역');
    window.location.href = '/mypage?tab=orders';
    return;
  }
  
  // sessionStorage 체크
  const currentUserData = sessionStorage.getItem('currentUser');
  if (!currentUserData) {
    console.log('❌ 세션 데이터 없음');
    alert('로그인이 필요합니다.');
    return;
  }
  
  try {
    const user = JSON.parse(currentUserData);
    if (user && user.userId) {
      console.log('✅ 세션 데이터로 이동 - 주문내역');
      window.location.href = '/mypage?tab=orders';
    } else {
      alert('로그인 정보가 올바르지 않습니다.');
    }
  } catch (e) {
    console.error('세션 파싱 오류:', e);
    alert('로그인이 필요합니다.');
  }
}

// 마이시티 페이지로 이동
function goToMyPage() {
  console.log('📦 마이시티 이동 시도...');
  
  // 먼저 전역 변수 체크
  if (currentUser && currentUser.userId) {
    console.log('✅ 전역 변수로 이동');
    try {
      window.location.assign('/mypage?tab=profile');
    } catch (e) {
      console.error('페이지 이동 오류:', e);
      window.location.href = '/mypage';
    }
    return;
  }
  
  // sessionStorage 체크
  const currentUserData = sessionStorage.getItem('currentUser');
  if (!currentUserData) {
    console.log('❌ 세션 데이터 없음');
    alert('로그인이 필요합니다.');
    return;
  }
  
  try {
    const user = JSON.parse(currentUserData);
    if (user && user.userId) {
      console.log('✅ 세션 데이터로 이동');
      try {
        window.location.assign('/mypage?tab=profile');
      } catch (e) {
        console.error('페이지 이동 오류:', e);
        window.location.href = '/mypage';
      }
    } else {
      alert('로그인 정보가 올바르지 않습니다.');
    }
  } catch (e) {
    console.error('세션 파싱 오류:', e);
    alert('로그인이 필요합니다.');
  }
}

// 포인트 내역 페이지로 이동
function goToPointHistory() {
  console.log('💰 포인트 내역 이동 시도...');
  
  // 먼저 전역 변수 체크
  if (currentUser && currentUser.userId) {
    console.log('✅ 전역 변수로 이동');
    try {
      window.location.assign('/mypage?tab=points');
    } catch (e) {
      console.error('페이지 이동 오류:', e);
      window.location.href = '/mypage';
    }
    return;
  }
  
  // sessionStorage 체크
  const currentUserData = sessionStorage.getItem('currentUser');
  if (!currentUserData) {
    console.log('❌ 세션 데이터 없음');
    alert('로그인이 필요합니다.');
    return;
  }
  
  try {
    const user = JSON.parse(currentUserData);
    if (user && user.userId) {
      console.log('✅ 세션 데이터로 이동');
      try {
        window.location.assign('/mypage?tab=points');
      } catch (e) {
        console.error('페이지 이동 오류:', e);
        window.location.href = '/mypage';
      }
    } else {
      alert('로그인 정보가 올바르지 않습니다.');
    }
  } catch (e) {
    console.error('세션 파싱 오류:', e);
    alert('로그인이 필요합니다.');
  }
}

function updateNavActive(active) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (active === 'home') {
    document.querySelectorAll('.nav-btn')[0].classList.add('active');
  } else if (active === 'cart') {
    document.querySelectorAll('.nav-btn')[2].classList.add('active');
  }
}

// 가게 정보 로드
async function loadStoreInfo() {
  try {
    const res = await fetch('/api/store/info');
    const data = await res.json();
    if (data.success && data.storeInfo && data.storeInfo.name) {
      storeName = data.storeInfo.name;
      updateStoreNameInUI();
    }
  } catch (error) {
    console.error('가게 정보 로드 오류:', error);
  }
}

// UI에 가게명 업데이트
function updateStoreNameInUI() {
  // 모든 가게명 표시 요소 업데이트
  document.querySelectorAll('[data-store-name]').forEach(el => {
    // 로그인 관련 화면(auth-select, login, register)은 연등 없이 가게명만 표시
    if (el.closest('#auth-select-screen') || el.closest('#login-screen') || el.closest('#register-screen')) {
      el.textContent = storeName;
    } else {
      // 메뉴 화면 등 다른 곳은 연등 포함
      el.textContent = `🏮 ${storeName}`;
    }
  });
  // title 태그 업데이트
  document.title = `${storeName} - 주문`;
  // h1 태그들 업데이트 (로그인 화면 제외)
  const h1Elements = document.querySelectorAll('h1');
  h1Elements.forEach(h1 => {
    // 로그인 관련 화면의 h1은 건드리지 않음 (이미 위에 logo div가 있음)
    if (h1.closest('#auth-select-screen') || h1.closest('#login-screen') || h1.closest('#register-screen')) {
      return;
    }
    if (h1.textContent.includes('시티반점') || h1.textContent.includes('🏮')) {
      h1.textContent = `🏮 ${storeName}`;
    }
  });
}

// 바쁨 상태 로드 및 표시
async function loadBusyStatus() {
  try {
    const res = await fetch('/api/busy-status');
    const data = await res.json();
    if (data.success) {
      const banner = document.getElementById('busy-status-banner');
      const statusText = document.getElementById('busy-status-text');
      const statusMessage = document.getElementById('busy-status-message');
      
      if (banner && statusText) {
        // statusMessage는 제거 (더 깔끔하게)
        if (data.status === 'very-busy') {
          banner.style.background = 'rgba(244, 67, 54, 0.2)';
          banner.style.borderColor = 'rgba(244, 67, 54, 0.5)';
          statusText.textContent = '🔴 매우 바쁨';
          statusText.style.color = '#ffcdd2';
          banner.style.display = 'flex';
        } else if (data.status === 'busy') {
          banner.style.background = 'rgba(255, 152, 0, 0.2)';
          banner.style.borderColor = 'rgba(255, 152, 0, 0.5)';
          statusText.textContent = '🟠 바쁨';
          statusText.style.color = '#ffe0b2';
          banner.style.display = 'flex';
        } else if (data.status === 'normal') {
          banner.style.background = 'rgba(76, 175, 80, 0.2)';
          banner.style.borderColor = 'rgba(76, 175, 80, 0.5)';
          statusText.textContent = '🟢 보통';
          statusText.style.color = '#c8e6c9';
          banner.style.display = 'flex';
        } else {
          banner.style.display = 'none';
        }
      }
    }
  } catch (error) {
    console.error('바쁨 상태 로드 오류:', error);
  }
}

// 사이드 메뉴 토글
function toggleSideMenu() {
  const sideMenu = document.getElementById('side-menu');
  const overlay = document.getElementById('menu-overlay');
  if (sideMenu && overlay) {
    sideMenu.classList.toggle('active');
    overlay.classList.toggle('active');
  }
}

// 장바구니 개수 업데이트 (사이드 메뉴용)
function updateSideCartCount() {
  const sideCartCount = document.getElementById('side-cart-count');
  if (sideCartCount) {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (count > 0) {
      sideCartCount.textContent = count;
      sideCartCount.style.display = 'inline-block';
    } else {
      sideCartCount.style.display = 'none';
    }
  }
}

// Initial screen - 영업시간 체크 후 시작
(async function init() {
  // 가게 정보 먼저 로드
  await loadStoreInfo();
  await loadBusyStatus();
  
  const isOpen = await checkBusinessHours();
  if (isOpen) {
    // 세션에서 사용자 복원
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        if (currentUser && currentUser.userId) {
          console.log('✅ 세션에서 사용자 복원:', currentUser);
          isGuest = false;
          updateUserInfo();
          showMenu();
          return;
        }
      } catch (e) {
        console.error('세션 복원 오류:', e);
      }
    }
    
    // 재주문 체크
    const reorderItems = localStorage.getItem('reorder-items');
    const quickCheckout = localStorage.getItem('quick-checkout');
    
    if (reorderItems) {
      const items = JSON.parse(reorderItems);
      
      // 현재 사용자 체크
      const currentUserData = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
      
      if (currentUserData) {
        // 장바구니에 추가
        cart.length = 0; // 기존 장바구니 비우기
        items.forEach(item => {
          cart.push({
            id: item.menuId,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          });
        });
        
        localStorage.removeItem('reorder-items');
        
        if (quickCheckout === 'true') {
          localStorage.removeItem('quick-checkout');
          showMenu();
          setTimeout(() => showCheckout(), 100);
        } else {
          showMenu();
          alert('장바구니에 메뉴를 담았습니다!');
        }
      } else {
        localStorage.removeItem('reorder-items');
        localStorage.removeItem('quick-checkout');
        showAuthSelect();
      }
    } else {
      showAuthSelect();
    }
  }
})();

