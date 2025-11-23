// Global variables
let currentUser = null;
let isGuest = false;
let guestPhone = null;
let cart = [];
let menuItems = [];
let usedPoints = 0;
let couponCode = null;
let couponDiscount = 0;
let couponName = null;
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
      const now = new Date();
      const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
      const dayOfWeek = koreaTime.getDay();
      const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
      
      // 휴무일 확인
      if (data.closedDays && data.closedDays.includes(dayOfWeek)) {
        reasonMessage = `오늘은 ${dayNames[dayOfWeek]} 휴무일입니다`;
      } else if (data.temporaryClosed) {
        reasonMessage = '임시휴업 중입니다';
      } else if (data.statusMessage) {
        reasonMessage = data.statusMessage;
      }
      
      document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #C8102E 0%, #8B0000 100%); color: white; text-align: center; padding: 20px; font-family: 'Noto Sans KR', sans-serif;">
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 40px; border-radius: 20px; max-width: 500px;">
            <h1 style="font-size: 48px; margin: 0 0 20px 0;">🏮</h1>
            <h2 style="font-size: 32px; margin: 0 0 20px 0; font-weight: bold;" data-store-name>시티반점</h2>
            <p style="font-size: 24px; margin: 0 0 10px 0; font-weight: bold;">${reasonMessage}</p>
            ${!data.closedDays || !data.closedDays.includes(dayOfWeek) ? `<p style="font-size: 18px; margin: 0 0 30px 0; opacity: 0.9;">영업시간: ${data.businessHours}</p>` : ''}
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
      loadFavoriteMenus(); // 즐겨찾기 로드
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
  const favoriteTab = document.getElementById('favorite-tab');
  
  if (currentUser && !isGuest) {
    userInfoDiv.style.display = 'block';
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-points').textContent = currentUser.points;
    
    // 헤더에 사용자 이름 표시
    const headerUserName = document.getElementById('header-user-name');
    const headerUserNameText = document.getElementById('header-user-name-text');
    if (headerUserName && headerUserNameText) {
      headerUserNameText.textContent = currentUser.name;
      headerUserName.style.display = 'block';
    }
    
    // 헤더에 포인트 표시
    const headerPoints = document.getElementById('header-points');
    const headerPointsValue = document.getElementById('header-points-value');
    if (headerPoints && headerPointsValue) {
      headerPointsValue.textContent = currentUser.points;
      headerPoints.style.display = 'block';
    }
    
    // 즐겨찾기 탭 표시
    if (favoriteTab) {
      favoriteTab.style.display = 'flex';
    }
    
    // sessionStorage에 저장 (마이페이지와 네비게이션에서 사용)
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // 즐겨찾기 메뉴 로드
    loadFavoriteMenus();
    
    console.log('📦 세션 저장 완료:', currentUser);
  } else {
    userInfoDiv.style.display = 'none';
    
    // 헤더의 사용자 이름 숨기기
    const headerUserName = document.getElementById('header-user-name');
    if (headerUserName) {
      headerUserName.style.display = 'none';
    }
    
    // 헤더의 포인트 숨기기
    const headerPoints = document.getElementById('header-points');
    if (headerPoints) {
      headerPoints.style.display = 'none';
    }
    if (favoriteTab) {
      favoriteTab.style.display = 'none';
    }
    sessionStorage.removeItem('currentUser');
    favoriteMenuIds = [];
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
  
  let filtered;
  if (category === 'all') {
    filtered = menuItems;
  } else if (category === '인기') {
    filtered = menuItems.filter(item => item.bestseller === 1);
  } else if (category === '주류') {
    filtered = menuItems.filter(item => item.category === '맥주' || item.category === '소주');
  } else if (category === '즐겨찾기') {
    // 즐겨찾기 메뉴 로드
    loadFavoriteMenus().then(favorites => {
      const favoriteIds = favorites.map(f => f.id);
      filtered = menuItems.filter(item => favoriteIds.includes(item.id));
      renderMenuItems(filtered);
    });
    return;
  } else {
    filtered = menuItems.filter(item => item.category === category);
  }
  
  renderMenuItems(filtered);
}

// 메뉴 아이템 렌더링
function renderMenuItems(filtered) {
  const menuList = document.getElementById('menu-list');
  
  if (filtered.length === 0) {
    menuList.innerHTML = '<p class="loading">메뉴가 없습니다.</p>';
    return;
  }

  menuList.innerHTML = filtered.map(item => {
    const isFavorite = favoriteMenuIds.includes(item.id);
    const isAvailable = item.isAvailable !== 0 && item.isAvailable !== false;
    return `
    <div class="menu-item" ${!isAvailable ? 'style="opacity: 0.5; position: relative;"' : ''} onclick="${isAvailable ? `showMenuDetail(${item.id})` : 'alert(\'품절된 메뉴입니다.\')'}">
      ${!isAvailable ? '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 8px; font-weight: 700; z-index: 100;">품절</div>' : ''}
      ${item.image 
        ? `<img src="${item.image}" alt="${item.name}" class="menu-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
           <div class="emoji" style="display:none;">${item.emoji || '🍜'}</div>`
        : `<div class="emoji">${item.emoji || '🍜'}</div>`
      }
      <div style="position: absolute; top: 8px; right: 8px; z-index: 10;">
        <button onclick="event.stopPropagation(); toggleFavorite(${item.id})" style="background: ${isFavorite ? '#e74c3c' : 'rgba(255,255,255,0.8)'}; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          ${isFavorite ? '❤️' : '🤍'}
        </button>
      </div>
      <h3>${item.name}</h3>
      <p class="price">${item.price.toLocaleString()}원</p>
    </div>
  `;
  }).join('');
}

let favoriteMenuIds = [];

// 즐겨찾기 메뉴 로드
async function loadFavoriteMenus() {
  if (!currentUser) return [];
  
  try {
    const res = await fetch(`/api/favorites/${currentUser.userid}`);
    const data = await res.json();
    if (data.success) {
      favoriteMenuIds = data.favorites.map(f => f.id);
      return data.favorites;
    }
  } catch (err) {
    console.error('즐겨찾기 로드 오류:', err);
  }
  return [];
}

// 즐겨찾기 토글
async function toggleFavorite(menuId) {
  if (!currentUser) {
    alert('로그인이 필요합니다.');
    return;
  }
  
  const isFavorite = favoriteMenuIds.includes(menuId);
  
  try {
    if (isFavorite) {
      await fetch(`/api/favorites/${currentUser.userid}/${menuId}`, { method: 'DELETE' });
      favoriteMenuIds = favoriteMenuIds.filter(id => id !== menuId);
    } else {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.userid, menuId })
      });
      favoriteMenuIds.push(menuId);
    }
    
    // 현재 카테고리가 즐겨찾기면 다시 렌더링
    const activeTab = document.querySelector('.special-tab.active, .category-tab.active');
    if (activeTab && activeTab.dataset.category === '즐겨찾기') {
      renderMenu('즐겨찾기');
    } else {
      // 메뉴 목록 다시 렌더링
      const category = activeTab ? activeTab.dataset.category : 'all';
      renderMenu(category);
    }
  } catch (err) {
    console.error('즐겨찾기 토글 오류:', err);
    alert('오류가 발생했습니다.');
  }
}

// 주소록 모달
async function showAddressModal() {
  if (!currentUser) {
    alert('로그인이 필요합니다.');
    return;
  }
  
  const modal = document.getElementById('address-modal');
  if (!modal) {
    alert('주소록 모달을 찾을 수 없습니다.');
    return;
  }
  
  modal.style.display = 'flex';
  
  try {
    const res = await fetch(`/api/addresses/${currentUser.userId || currentUser.userid}`);
    const data = await res.json();
    
    if (data.success) {
      displayAddressList(data.addresses || []);
    }
  } catch (error) {
    console.error('주소록 로드 오류:', error);
    document.getElementById('address-list').innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">주소록을 불러올 수 없습니다.</p>';
  }
}

// 주소록 목록 표시
function displayAddressList(addresses) {
  const addressList = document.getElementById('address-list');
  if (!addressList) return;
  
  if (addresses.length === 0) {
    addressList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">저장된 주소가 없습니다.</p>';
    return;
  }
  
  addressList.innerHTML = addresses.map(addr => `
    <div class="address-item" onclick="selectAddress('${addr.address.replace(/'/g, "\\'")}', ${addr.id})" style="padding: 15px; border: 2px solid ${addr.isDefault ? '#ff9800' : '#ddd'}; border-radius: 10px; margin-bottom: 10px; cursor: pointer; background: ${addr.isDefault ? '#fff3cd' : 'white'};">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 5px;">
            ${addr.addressName || '주소'} ${addr.isDefault ? '<span style="background: #ff9800; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 8px;">기본</span>' : ''}
          </div>
          <div style="color: #666; font-size: 14px;">${addr.address}</div>
        </div>
        <button onclick="event.stopPropagation(); deleteAddress(${addr.id})" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-left: 10px;">
          삭제
        </button>
      </div>
    </div>
  `).join('');
}

// 주소 선택
function selectAddress(address, addressId) {
  document.getElementById('checkout-address').value = address;
  document.getElementById('address-modal').style.display = 'none';
}

// 주소 삭제
async function deleteAddress(addressId) {
  if (!confirm('이 주소를 삭제하시겠습니까?')) return;
  
  if (!currentUser) {
    alert('로그인이 필요합니다.');
    return;
  }
  
  try {
    const res = await fetch(`/api/addresses/${currentUser.userId || currentUser.userid}/${addressId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    
    if (data.success) {
      alert('주소가 삭제되었습니다.');
      showAddressModal(); // 목록 새로고침
    } else {
      alert('주소 삭제에 실패했습니다.');
    }
  } catch (error) {
    console.error('주소 삭제 오류:', error);
    alert('오류가 발생했습니다.');
  }
}

// 주소 저장
async function saveAddress() {
  if (!currentUser) {
    alert('로그인이 필요합니다.');
    return;
  }
  
  const address = document.getElementById('checkout-address').value.trim();
  if (!address) {
    alert('주소를 입력해주세요.');
    return;
  }
  
  const addressName = prompt('주소 이름을 입력해주세요 (예: 집, 회사)', '집');
  if (!addressName) return;
  
  try {
    const res = await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.userId || currentUser.userid,
        address: address,
        addressName: addressName,
        isDefault: false
      })
    });
    
    const data = await res.json();
    if (data.success) {
      alert('주소가 저장되었습니다.');
      showAddressModal(); // 목록 새로고침
    } else {
      alert('주소 저장에 실패했습니다.');
    }
  } catch (error) {
    console.error('주소 저장 오류:', error);
    alert('오류가 발생했습니다.');
  }
}

// 저장된 주소 로드
async function loadSavedAddresses() {
  if (!currentUser) return [];
  
  try {
    const res = await fetch(`/api/addresses/${currentUser.userid}`);
    const data = await res.json();
    if (data.success) {
      return data.addresses;
    }
  } catch (err) {
    console.error('주소록 로드 오류:', err);
  }
  return [];
}

// 주소 저장
async function saveAddress(address, addressName) {
  if (!currentUser) return;
  
  try {
    await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.userid,
        address,
        addressName,
        isDefault: false
      })
    });
    alert('주소가 저장되었습니다!');
  } catch (err) {
    console.error('주소 저장 오류:', err);
  }
}

// 주소 선택
function selectAddress(address) {
  document.getElementById('checkout-address').value = address;
}

// Category tabs
document.addEventListener('DOMContentLoaded', () => {
  // 일반 카테고리 탭
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.special-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderMenu(tab.dataset.category);
    });
  });
  
  // 특별 메뉴 탭 (오늘의메뉴, 추천메뉴)
  document.querySelectorAll('.special-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.special-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderMenu(tab.dataset.category);
    });
  });
});

// 메뉴 상세 팝업 표시
let currentMenuDetail = null;
let selectedOptionsByCategory = {}; // { category: [option1, option2, ...] }
let selectedQuantity = 1;

async function showMenuDetail(itemId) {
  const item = menuItems.find(m => m.id === itemId);
  if (!item) return;
  
  currentMenuDetail = item;
  selectedOptionsByCategory = {};
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
  
  // 옵션을 카테고리별로 그룹화 (기존 구조가 단순 배열이면 변환)
  const optionGroups = [];
  if (menuOptions.length > 0 && menuOptions[0].category) {
    // 이미 카테고리 구조인 경우
    optionGroups.push(...menuOptions);
  } else {
    // 기본 옵션 그룹 생성 (기존 단순 배열 구조)
    if (menuOptions.length > 0) {
      optionGroups.push({
        category: '추가 옵션',
        maxSelect: menuOptions.length,
        options: menuOptions
      });
    }
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
      
      ${optionGroups.length > 0 ? optionGroups.map((group, groupIdx) => `
        <div class="option-group-section">
          <div class="option-group-header">
            <div>
              <h3>${group.category}</h3>
              <p class="option-group-subtitle">최대 ${group.maxSelect}개 선택</p>
            </div>
          </div>
          <div class="option-group-items">
            ${group.options.map((opt, optIdx) => {
              const optionId = `${groupIdx}_${optIdx}`;
              const isSelected = selectedOptionsByCategory[group.category]?.some(o => o.name === opt.name && o.price === opt.price);
              return `
                <label class="option-item">
                  <input type="checkbox" 
                         value="${optionId}" 
                         data-category="${group.category}"
                         data-name="${opt.name}"
                         data-price="${opt.price || 0}"
                         ${isSelected ? 'checked' : ''}
                         onchange="toggleOptionGroup('${group.category}', '${opt.name}', ${opt.price || 0}, ${group.maxSelect}, this)">
                  <span class="option-name">${opt.name}</span>
                  ${opt.price ? `<span class="option-price">+${opt.price.toLocaleString()}원</span>` : ''}
                </label>
              `;
            }).join('')}
          </div>
        </div>
      `).join('') : ''}
      
      <div class="quantity-section">
        <h3>수량</h3>
        <div class="quantity-controls">
          <button onclick="decreaseMenuQuantity()" class="qty-btn">-</button>
          <span id="selected-quantity" class="qty-value">${selectedQuantity}</span>
          <button onclick="increaseMenuQuantity()" class="qty-btn">+</button>
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
  selectedOptionsByCategory = {};
  selectedQuantity = 1;
}

function toggleOptionGroup(category, name, price, maxSelect, checkbox) {
  if (!selectedOptionsByCategory[category]) {
    selectedOptionsByCategory[category] = [];
  }
  
  const categoryOptions = selectedOptionsByCategory[category];
  
  if (checkbox.checked) {
    // 최대 선택 개수 체크
    if (categoryOptions.length >= maxSelect) {
      checkbox.checked = false;
      alert(`최대 ${maxSelect}개까지 선택 가능합니다.`);
      return;
    }
    categoryOptions.push({ name, price });
  } else {
    // 선택 해제
    selectedOptionsByCategory[category] = categoryOptions.filter(
      opt => !(opt.name === name && opt.price === price)
    );
  }
  
  updateMenuDetailTotal();
}

function increaseMenuQuantity() {
  selectedQuantity++;
  const qtyElement = document.getElementById('selected-quantity');
  if (qtyElement) {
    qtyElement.textContent = selectedQuantity;
  }
  updateMenuDetailTotal();
}

function decreaseMenuQuantity() {
  if (selectedQuantity > 1) {
    selectedQuantity--;
    const qtyElement = document.getElementById('selected-quantity');
    if (qtyElement) {
      qtyElement.textContent = selectedQuantity;
    }
    updateMenuDetailTotal();
  }
}

function updateMenuDetailTotal() {
  if (!currentMenuDetail) return;
  
  const basePrice = currentMenuDetail.price;
  
  // 모든 카테고리의 선택된 옵션 가격 합산
  let optionsPrice = 0;
  Object.values(selectedOptionsByCategory).forEach(options => {
    options.forEach(opt => {
      optionsPrice += opt.price || 0;
    });
  });
  
  const totalPrice = (basePrice + optionsPrice) * selectedQuantity;
  
  const totalElement = document.getElementById('menu-detail-total-price');
  const addToCartPriceElement = document.getElementById('add-to-cart-price');
  
  if (totalElement) {
    totalElement.textContent = totalPrice.toLocaleString() + '원';
  }
  
  if (addToCartPriceElement) {
    addToCartPriceElement.textContent = totalPrice.toLocaleString() + '원';
  }
}

function addToCartWithOptions() {
  if (!currentMenuDetail) return;
  
  const basePrice = currentMenuDetail.price;
  
  // 모든 카테고리의 선택된 옵션 가격 합산
  let optionsPrice = 0;
  const allSelectedOptions = [];
  Object.entries(selectedOptionsByCategory).forEach(([category, options]) => {
    options.forEach(opt => {
      optionsPrice += opt.price || 0;
      allSelectedOptions.push({ category, ...opt });
    });
  });
  
  const totalPrice = basePrice + optionsPrice;
  
  // 옵션 정보를 문자열로 저장
  const optionsText = allSelectedOptions.length > 0
    ? allSelectedOptions.map(opt => opt.name + (opt.price ? ` (+${opt.price.toLocaleString()}원)` : '')).join(', ')
    : '';
  
  // 옵션 조합을 키로 사용
  const optionsKey = JSON.stringify(allSelectedOptions);
  const cartKey = `${currentMenuDetail.id}_${optionsKey}`;
  
  // 기존 장바구니에 같은 메뉴+옵션 조합이 있는지 확인
  const existing = cart.find(c => {
    const cKey = `${c.id}_${JSON.stringify(c.selectedOptions || [])}`;
    return cKey === cartKey;
  });
  
  if (existing) {
    existing.quantity += selectedQuantity;
  } else {
    cart.push({
      ...currentMenuDetail,
      quantity: selectedQuantity,
      selectedOptions: allSelectedOptions,
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
  
  // 하단 네비게이션 장바구니 뱃지 업데이트 (메뉴 화면)
  const navCartBadge = document.getElementById('nav-cart-count');
  if (navCartBadge) {
    navCartBadge.textContent = count;
    navCartBadge.style.display = count > 0 ? 'block' : 'none';
  }
  
  // 하단 네비게이션 장바구니 뱃지 업데이트 (장바구니 화면)
  const navCartBadgeCart = document.getElementById('nav-cart-count-cart');
  if (navCartBadgeCart) {
    navCartBadgeCart.textContent = count;
    navCartBadgeCart.style.display = count > 0 ? 'block' : 'none';
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
  
  // 쿠폰 사용 시 최소 주문 금액 25000원으로 변경
  if (couponCode && couponDiscount > 0) {
    minOrderAmount = 25000;
  }
  
  // 쿠폰 안내 표시/숨김 (쿠폰 적용 시에만 표시)
  const couponInfo = document.getElementById('coupon-info');
  if (couponInfo) {
    if (couponCode && couponDiscount > 0) {
      // 쿠폰이 적용된 경우에만 표시 (이미 applyCoupon에서 내용이 설정됨)
      // 내용이 없으면 기본 안내 표시
      if (!couponInfo.textContent.trim()) {
        couponInfo.style.display = 'none';
      }
    } else {
      // 쿠폰 미적용 시 안내 숨기기
      couponInfo.style.display = 'none';
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
  
  // 쿠폰 할인 표시
  const finalAmount = itemsTotal - usedPoints - couponDiscount + deliveryFee;
  const totalPriceEl = document.getElementById('total-price');
  if (totalPriceEl) {
    totalPriceEl.textContent = finalAmount.toLocaleString() + '원';
  }
  
  // 쿠폰 섹션 표시/숨김 (회원일 때만)
  const couponSection = document.getElementById('coupon-section');
  if (couponSection) {
    if (currentUser && !isGuest) {
      couponSection.style.display = 'block';
    } else {
      couponSection.style.display = 'none';
    }
  }
  
  // 쿠폰 할인 행 추가/제거
  const existingCouponRow = document.getElementById('coupon-discount-row');
  if (couponDiscount > 0) {
    // 기존 쿠폰 할인 행 제거
    if (existingCouponRow) {
      existingCouponRow.remove();
    }
    
    // 쿠폰 할인 행 추가
    const cartSummaryDiv = document.querySelector('.cart-summary');
    if (cartSummaryDiv) {
      const couponRow = document.createElement('div');
      couponRow.id = 'coupon-discount-row';
      couponRow.className = 'summary-row';
      couponRow.style.color = '#27ae60';
      couponRow.style.fontWeight = '600';
      couponRow.innerHTML = `
        <span>🎫 쿠폰 할인 (${couponName})</span>
        <span>-${couponDiscount.toLocaleString()}원</span>
      `;
      // 배달료 행 앞에 삽입
      const deliveryFeeRow = document.getElementById('delivery-fee-row');
      if (deliveryFeeRow) {
        cartSummaryDiv.insertBefore(couponRow, deliveryFeeRow);
      } else {
        cartSummaryDiv.appendChild(couponRow);
      }
    }
  } else {
    // 쿠폰 미사용 시 행 제거
    if (existingCouponRow) {
      existingCouponRow.remove();
    }
  }
  
  // 포인트 섹션 표시/숨김
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
    
    const finalAmount = itemsTotal - usedPoints - couponDiscount + deliveryFee;
    const earnPoints = Math.floor((itemsTotal - usedPoints - couponDiscount) * 0.10);
    
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

// 사용 가능한 쿠폰 자동 제안
async function suggestAvailableCoupons() {
  if (!currentUser || isGuest || cart.length === 0) {
    return;
  }

  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  try {
    const res = await fetch(`/api/coupons/user/${currentUser.userid}`);
    const data = await res.json();
    
    if (data.success && data.coupons && data.coupons.length > 0) {
      // 사용 가능한 쿠폰 필터링 (최소 주문 금액 체크)
      const availableCoupons = data.coupons.filter(coupon => {
        if (coupon.usedCount >= coupon.maxUseCount) return false;
        if (coupon.minAmount && itemsTotal < coupon.minAmount) return false;
        return true;
      });
      
      if (availableCoupons.length > 0) {
        // 가장 할인액이 큰 쿠폰 추천
        const bestCoupon = availableCoupons.reduce((best, current) => {
          return current.discountAmount > best.discountAmount ? current : best;
        });
        
        // 쿠폰 자동 제안 UI 표시
        showCouponSuggestion(bestCoupon, availableCoupons.length);
      }
    }
  } catch (error) {
    console.error('쿠폰 제안 오류:', error);
  }
}

// 쿠폰 제안 UI 표시
function showCouponSuggestion(bestCoupon, totalCount) {
  // 기존 제안 제거
  const existingSuggestion = document.getElementById('coupon-suggestion');
  if (existingSuggestion) {
    existingSuggestion.remove();
  }
  
  // 쿠폰 섹션 찾기
  const couponSection = document.getElementById('coupon-section');
  if (!couponSection) return;
  
  // 제안 UI 생성
  const suggestionDiv = document.createElement('div');
  suggestionDiv.id = 'coupon-suggestion';
  suggestionDiv.style.cssText = 'background: #e8f5e9; border: 2px solid #4caf50; border-radius: 10px; padding: 15px; margin-bottom: 15px;';
  suggestionDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <div>
        <div style="font-weight: 700; color: #2e7d32; font-size: 16px; margin-bottom: 5px;">
          🎁 사용 가능한 쿠폰이 ${totalCount}개 있어요!
        </div>
        <div style="color: #555; font-size: 14px;">
          <strong>${bestCoupon.name}</strong> - ${bestCoupon.discountAmount.toLocaleString()}원 할인
        </div>
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="autoApplyCoupon('${bestCoupon.code}')" style="flex: 1; padding: 10px; background: #4caf50; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
        자동 적용
      </button>
      <button onclick="showCouponList()" style="flex: 1; padding: 10px; background: white; color: #4caf50; border: 2px solid #4caf50; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
        전체 보기
      </button>
    </div>
  `;
  
  // 쿠폰 섹션 맨 위에 삽입
  couponSection.insertBefore(suggestionDiv, couponSection.firstChild);
}

// 쿠폰 자동 적용
async function autoApplyCoupon(code) {
  const couponCodeInput = document.getElementById('coupon-code');
  if (couponCodeInput) {
    couponCodeInput.value = code;
  }
  await applyCoupon();
  
  // 제안 UI 제거
  const suggestion = document.getElementById('coupon-suggestion');
  if (suggestion) {
    suggestion.remove();
  }
}

// 쿠폰 적용
async function applyCoupon() {
  if (!currentUser || isGuest) {
    alert('회원만 쿠폰을 사용할 수 있습니다.');
    return;
  }

  const couponCodeInput = document.getElementById('coupon-code');
  if (!couponCodeInput) {
    console.error('❌ 쿠폰 입력 필드를 찾을 수 없습니다.');
    return;
  }

  const code = couponCodeInput.value.trim().toUpperCase();
  if (!code) {
    alert('쿠폰 코드를 입력해주세요.');
    return;
  }

  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  try {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        userId: currentUser.userid,
        totalAmount: itemsTotal
      })
    });

    const data = await res.json();

    if (data.success) {
      couponCode = code;
      couponDiscount = data.coupon.discountAmount;
      couponName = data.coupon.name;
      
      // 쿠폰 정보 표시
      document.getElementById('coupon-name-display').textContent = couponName;
      document.getElementById('coupon-discount-display').textContent = couponDiscount.toLocaleString();
      document.getElementById('coupon-error').style.display = 'none';
      
      // 최소 주문 금액 안내 업데이트 (쿠폰 적용 시에만 표시)
      const couponInfo = document.getElementById('coupon-info');
      if (data.coupon.minAmount) {
        couponInfo.textContent = `💡 최소 주문 금액: ${data.coupon.minAmount.toLocaleString()}원 이상`;
        couponInfo.style.display = 'block';
      } else {
        couponInfo.style.display = 'none';
      }
      
      renderCart();
      alert(`쿠폰이 적용되었습니다! ${couponDiscount.toLocaleString()}원 할인`);
    } else {
      couponCode = null;
      couponDiscount = 0;
      couponName = null;
      
      document.getElementById('coupon-name-display').textContent = '쿠폰 미사용';
      document.getElementById('coupon-discount-display').textContent = '0';
      document.getElementById('coupon-error').textContent = data.error;
      document.getElementById('coupon-error').style.display = 'block';
      
      // 쿠폰 미적용 시 안내 숨기기
      document.getElementById('coupon-info').style.display = 'none';
      
      renderCart();
      alert(data.error);
    }
  } catch (err) {
    console.error('쿠폰 적용 오류:', err);
    alert('쿠폰 적용 중 오류가 발생했습니다: ' + err.message);
  }
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

// 주문 타입에 따라 주소 필드 표시/숨김
function toggleAddressField() {
  const orderType = document.querySelector('input[name="orderType"]:checked').value;
  const addressGroup = document.getElementById('address-group');
  const addressInput = document.getElementById('checkout-address');
  
  if (orderType === 'takeout') {
    // 포장 주문: 주소 필드 숨기기
    addressGroup.style.display = 'none';
    addressInput.removeAttribute('required');
    addressInput.value = '포장 주문';
  } else {
    // 배달 주문: 주소 필드 표시
    addressGroup.style.display = 'block';
    addressInput.setAttribute('required', 'required');
    if (addressInput.value === '포장 주문') {
      addressInput.value = '';
    }
  }
  
  // 배달료 재계산
  renderCart();
}

// Render checkout
async function renderCheckout() {
  const checkoutItemsDiv = document.getElementById('checkout-items');
  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // 주문 타입 확인
  const orderType = document.querySelector('input[name="orderType"]:checked')?.value || 'delivery';
  
  // 배달료 계산 (포장 주문은 배달료 0원)
  let deliveryFee = 0;
  if (orderType === 'delivery') {
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
  }
  
  const finalAmount = itemsTotal - usedPoints - couponDiscount + deliveryFee;
  const earnPoints = Math.floor((itemsTotal - usedPoints - couponDiscount) * 0.10);

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
  // 쿠폰 할인 표시
  if (couponDiscount > 0) {
    const couponRow = document.createElement('div');
    couponRow.className = 'checkout-item';
    couponRow.innerHTML = `<span>쿠폰 할인 (${couponName})</span><span style="color: #27ae60;">-${couponDiscount.toLocaleString()}원</span>`;
    checkoutItemsDiv.appendChild(couponRow);
  }
  
  document.getElementById('checkout-total').textContent = finalAmount.toLocaleString() + '원';

  const checkoutPointsSection = document.getElementById('checkout-points-section');
  const checkoutEarnInfo = document.getElementById('checkout-earn-info');
  const couponSection = document.getElementById('coupon-section');
  
  if (currentUser && !isGuest) {
    // 포인트 섹션
    if (usedPoints > 0) {
      checkoutPointsSection.style.display = 'block';
      document.getElementById('checkout-used-points').textContent = '-' + usedPoints.toLocaleString() + 'P';
    } else {
      checkoutPointsSection.style.display = 'none';
    }
    
    // 쿠폰 섹션 표시
    if (couponSection) {
      couponSection.style.display = 'block';
    }
    
    checkoutEarnInfo.style.display = 'block';
    document.getElementById('checkout-earn-points').textContent = earnPoints.toLocaleString();
    
    document.getElementById('checkout-name').value = currentUser.name;
    document.getElementById('checkout-phone').value = currentUser.phone;
    document.getElementById('checkout-address').value = currentUser.address || '';
    
    // 주소록 로드
    loadSavedAddresses().then(addresses => {
      const savedAddressesDiv = document.getElementById('saved-addresses');
      if (savedAddressesDiv && addresses.length > 0) {
        savedAddressesDiv.style.display = 'block';
        savedAddressesDiv.innerHTML = addresses.map(addr => `
          <button type="button" onclick="selectAddress('${addr.address.replace(/'/g, "\\'")}')" style="margin: 5px; padding: 8px 12px; background: ${addr.isDefault ? '#FFD700' : '#f5f5f5'}; border: 1px solid #ddd; border-radius: 8px; font-size: 12px; cursor: pointer;">
            ${addr.addressName}${addr.isDefault ? ' (기본)' : ''}
          </button>
        `).join('');
      }
    });
  } else {
    checkoutPointsSection.style.display = 'none';
    checkoutEarnInfo.style.display = 'none';
    if (couponSection) {
      couponSection.style.display = 'none';
    }
    
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
  const orderType = document.querySelector('input[name="orderType"]:checked').value;
  const address = orderType === 'takeout' ? '포장 주문' : document.getElementById('checkout-address').value.trim();
  const specialRequest = document.getElementById('checkout-request').value.trim();
  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

  // 포장 주문 시 주소 필수 체크 제외
  if (orderType === 'delivery' && !address) {
    alert('배달 주소를 입력해주세요.');
    return;
  }

  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // 배달료 계산 (포장 주문은 배달료 0원)
  let deliveryFee = 0;
  if (orderType === 'delivery') {
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
  }

  const finalAmount = itemsTotal - usedPoints - couponDiscount + deliveryFee;

  // 주문 데이터 준비
  const orderData = {
    userId: currentUser ? currentUser.userid : null,
    customerName,
    phone,
    address,
    items: cart,
    totalAmount: itemsTotal,
    usedPoints: usedPoints || 0,
    couponCode: couponCode || null,
    couponDiscount: couponDiscount || 0,
    orderType: orderType || 'delivery',
    deliveryFee: deliveryFee || 0,
    paymentMethod: paymentMethod,
    isGuest: !currentUser,
    phoneVerified: currentUser ? true : (guestPhone === phone),
    specialRequest: specialRequest || ''
  };

  // 선결제인 경우 PG 결제 진행 (카드, 카카오페이, 네이버페이)
  const prepaidMethods = ['card_prepaid', 'kakao_pay', 'naver_pay'];
  if (prepaidMethods.includes(paymentMethod) && typeof IMP !== 'undefined') {
    // IMP_KEY는 서버에서 전달받음
    const IMP_KEY = window.APP_CONFIG?.IMP_KEY || 'imp12345678';
    
    if (!IMP_KEY || IMP_KEY === 'imp12345678') {
      alert('결제 시스템이 설정되지 않았습니다. 관리자에게 문의하세요.');
      return;
    }
    const merchantUid = 'ORD-' + Date.now();
    
    IMP.init(IMP_KEY);
    
    // PG사 및 결제 방법 설정
    let pg = 'inicis'; // 기본값: 이니시스
    let pay_method = 'card';
    
    if (paymentMethod === 'kakao_pay') {
      pg = 'kakaopay';
      pay_method = 'card';
    } else if (paymentMethod === 'naver_pay') {
      pg = 'naverpay';
      pay_method = 'card';
    } else if (paymentMethod === 'card_prepaid') {
      pg = 'inicis';
      pay_method = 'card';
    }
    
    IMP.request_pay({
      pg: pg,
      pay_method: pay_method,
      merchant_uid: merchantUid,
      name: `시티반점 주문 (${cart.length}개 메뉴)`,
      amount: finalAmount,
      buyer_name: customerName,
      buyer_tel: phone,
      buyer_addr: address,
      m_redirect_url: window.location.origin + '/order-new/complete'
    }, async (rsp) => {
      if (rsp.success) {
        // 결제 검증
        const verifyRes = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            impUid: rsp.imp_uid,
            merchantUid: merchantUid
          })
        });
        
        const verifyData = await verifyRes.json();
        
        if (verifyData.success) {
          // 주문 생성
          await createOrder(orderData, merchantUid, rsp.imp_uid);
        } else {
          alert('결제 검증 실패: ' + verifyData.error);
        }
      } else {
        alert('결제 실패: ' + rsp.error_msg);
      }
    });
    
    return; // PG 결제 진행 중이므로 여기서 종료
  }

  // 만나서 결제 (현금/카드) 또는 PG 미설정 시 바로 주문 생성
  await createOrder(orderData, null, null);
});

// 주문 생성 함수 (외부에서 호출 가능)
async function createOrder(orderData, merchantUid, impUid) {
  // 주문 수정 모드인지 확인
  if (window.editingOrderId) {
    // 주문 수정
    try {
      const res = await fetch(`/api/orders/${window.editingOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderData.items,
          address: orderData.address,
          totalAmount: orderData.totalAmount,
          finalAmount: orderData.totalAmount - orderData.usedPoints - orderData.couponDiscount + orderData.deliveryFee,
          usedPoints: orderData.usedPoints,
          couponCode: orderData.couponCode,
          couponDiscount: orderData.couponDiscount
        })
      });

      const data = await res.json();

      if (data.success) {
        alert('주문이 수정되었습니다!');
        window.editingOrderId = null;
        // 장바구니 초기화
        cart = [];
        usedPoints = 0;
        couponCode = null;
        couponDiscount = 0;
        updateCartCount();
        // 마이페이지로 이동
        window.location.href = '/mypage';
        return;
      } else {
        alert('주문 수정 실패: ' + (data.error || '알 수 없는 오류'));
        return;
      }
    } catch (error) {
      console.error('주문 수정 오류:', error);
      alert('주문 수정 중 오류가 발생했습니다.');
      return;
    }
  }

  // 새 주문 생성
  const orderPayload = {
    ...orderData,
    orderId: merchantUid || ('ORD-' + Date.now()),
    impUid: impUid || null
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById('complete-order-id').textContent = data.orderId;
      
      // 주문번호를 sessionStorage에 저장 (비회원 주문조회용)
      sessionStorage.setItem('lastOrderId', data.orderId);
      if (orderData.phone) {
        sessionStorage.setItem('lastOrderPhone', orderData.phone);
      }
      
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
      couponCode = null;
      couponDiscount = 0;
      couponName = null;
      
      // 주문 타입 및 주소 필드 초기화
      document.querySelector('input[name="orderType"][value="delivery"]').checked = true;
      toggleAddressField();
      document.getElementById('checkout-address').value = '';
      
      updateCartCount();

      // 주문 완료 후 리뷰 작성 버튼 표시 (회원만)
      if (currentUser && currentUser.userId) {
        document.getElementById('review-section').style.display = 'block';
        // 리뷰 작성용 orderId 저장
        window.currentOrderId = data.orderId;
      } else {
        document.getElementById('review-section').style.display = 'none';
      }

      showScreen('complete-screen');
    } else {
      alert(data.error || '주문 실패');
    }
  } catch (err) {
    alert('주문 오류: ' + err.message);
  }
}

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

// 리뷰 작성 모달 표시
function showReviewModal() {
  document.getElementById('review-modal').style.display = 'flex';
  // 별점 초기화
  document.querySelectorAll('.star').forEach(star => {
    star.textContent = '☆';
    star.style.color = '#ddd';
  });
  document.getElementById('review-comment').value = '';
  document.getElementById('submit-review-btn').disabled = true;
  window.currentRating = 0;
}

// 리뷰 작성 모달 닫기
function closeReviewModal() {
  document.getElementById('review-modal').style.display = 'none';
}

// 별점 선택
document.addEventListener('DOMContentLoaded', () => {
  const stars = document.querySelectorAll('.star');
  const ratingText = document.getElementById('rating-text');
  const submitBtn = document.getElementById('submit-review-btn');
  
  if (stars.length > 0) {
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.dataset.rating);
        window.currentRating = rating;
        
        // 별점 표시 업데이트
        stars.forEach((s, index) => {
          if (index < rating) {
            s.textContent = '★';
            s.style.color = '#ffd700';
          } else {
            s.textContent = '☆';
            s.style.color = '#ddd';
          }
        });
        
        // 별점 텍스트 업데이트
        const texts = ['', '별로예요', '보통이에요', '좋아요', '매우 좋아요', '최고예요'];
        ratingText.textContent = texts[rating] || '';
        ratingText.style.color = '#333';
        
        // 제출 버튼 활성화
        submitBtn.disabled = false;
      });
      
      // 호버 효과
      star.addEventListener('mouseenter', () => {
        const rating = parseInt(star.dataset.rating);
        stars.forEach((s, index) => {
          if (index < rating) {
            s.style.color = '#ffd700';
          }
        });
      });
    });
    
    // 별점 영역에서 마우스 나갈 때
    document.getElementById('star-rating').addEventListener('mouseleave', () => {
      if (window.currentRating) {
        const rating = window.currentRating;
        stars.forEach((s, index) => {
          if (index < rating) {
            s.textContent = '★';
            s.style.color = '#ffd700';
          } else {
            s.textContent = '☆';
            s.style.color = '#ddd';
          }
        });
      }
    });
  }
});

// 리뷰 제출
async function submitReview() {
  if (!window.currentRating || window.currentRating < 1) {
    alert('별점을 선택해주세요.');
    return;
  }
  
  if (!window.currentOrderId) {
    alert('주문 정보를 찾을 수 없습니다.');
    return;
  }
  
  if (!currentUser || !currentUser.userId) {
    alert('로그인이 필요합니다.');
    return;
  }
  
  const comment = document.getElementById('review-comment').value.trim();
  const rating = window.currentRating;
  
  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: window.currentOrderId,
        userId: currentUser.userId,
        rating: rating,
        comment: comment || null
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      alert('리뷰가 등록되었습니다. 감사합니다!');
      closeReviewModal();
      document.getElementById('review-section').style.display = 'none';
    } else {
      alert(data.error || '리뷰 등록에 실패했습니다.');
    }
  } catch (error) {
    console.error('리뷰 제출 오류:', error);
    alert('리뷰 등록 중 오류가 발생했습니다.');
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

// 쿠폰 목록 화면 표시
async function showCouponList() {
  if (!currentUser || isGuest) {
    alert('로그인이 필요합니다.');
    showLogin();
    return;
  }

  showScreen('coupon-list-screen');
  
  try {
    const res = await fetch(`/api/coupons/user/${currentUser.userid}`);
    const data = await res.json();
    
    const container = document.getElementById('coupon-list-container');
    
    if (!data.success || !data.coupons || data.coupons.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #999;">
          <div style="font-size: 64px; margin-bottom: 20px;">🎫</div>
          <p style="font-size: 18px; margin-bottom: 10px; color: #666;">보유한 쿠폰이 없습니다</p>
          <p style="font-size: 14px; color: #999;">회원가입 시 자동으로 쿠폰이 발급됩니다!</p>
        </div>
      `;
      return;
    }
    
    const now = new Date();
    const validCoupons = [];
    const expiredCoupons = [];
    
    data.coupons.forEach(coupon => {
      const validTo = new Date(coupon.validTo);
      if (validTo >= now && coupon.isActive) {
        validCoupons.push(coupon);
      } else {
        expiredCoupons.push(coupon);
      }
    });
    
    let html = '';
    
    // 사용 가능한 쿠폰
    if (validCoupons.length > 0) {
      html += '<h3 style="margin: 20px 0 15px 0; font-size: 18px; color: #333;">✅ 보유 쿠폰</h3>';
      validCoupons.forEach(coupon => {
        const validTo = new Date(coupon.validTo);
        const daysLeft = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
        const couponAmount = coupon.discountType === 'fixed' 
          ? coupon.discountValue 
          : 0; // 퍼센트 쿠폰은 금액권이 아님
        const minAmountText = coupon.minAmount ? `최소 주문 ${coupon.minAmount.toLocaleString()}원 이상` : '';
        
        html += `
          <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); border-radius: 20px; padding: 0; margin-bottom: 20px; overflow: hidden; box-shadow: 0 8px 20px rgba(255, 215, 0, 0.4); position: relative; border: 3px solid #FFD700;">
            <!-- 쿠폰 패턴 배경 -->
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.1; background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px);"></div>
            
            <div style="position: relative; padding: 25px 20px;">
              <!-- 왼쪽: 금액 -->
              <div style="display: flex; align-items: center; gap: 20px;">
                <div style="flex: 1;">
                  <div style="font-size: 14px; color: #8B4513; font-weight: 600; margin-bottom: 8px; opacity: 0.9;">${coupon.name}</div>
                  <div style="font-size: 48px; font-weight: 900; color: #8B4513; line-height: 1; margin-bottom: 5px;">
                    ${couponAmount.toLocaleString()}
                    <span style="font-size: 28px; font-weight: 700;">원</span>
                  </div>
                  ${minAmountText ? `<div style="font-size: 12px; color: #8B4513; opacity: 0.8; margin-top: 8px;">${minAmountText}</div>` : ''}
                </div>
                
                <!-- 오른쪽: 쿠폰 정보 -->
                <div style="text-align: right; border-left: 2px dashed rgba(139, 69, 19, 0.3); padding-left: 20px;">
                  <div style="font-size: 18px; font-weight: 700; color: #8B4513; margin-bottom: 8px; letter-spacing: 2px;">${coupon.code}</div>
                  <div style="font-size: 12px; color: #8B4513; opacity: 0.8; margin-bottom: 15px;">
                    유효기간: ${daysLeft}일 남음
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button onclick="copyCouponCode('${coupon.code}')" style="background: rgba(139, 69, 19, 0.1); border: 2px solid #8B4513; color: #8B4513; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; transition: all 0.3s;" onmouseover="this.style.background='#8B4513'; this.style.color='white';" onmouseout="this.style.background='rgba(139, 69, 19, 0.1)'; this.style.color='#8B4513';">
                      📋 코드 복사
                    </button>
                    <button onclick="useCouponCode('${coupon.code}')" style="background: #8B4513; color: white; padding: 8px 16px; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; transition: all 0.3s;" onmouseover="this.style.background='#654321';" onmouseout="this.style.background='#8B4513';">
                      💳 사용하기
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 하단: 쿠폰 번호 -->
            <div style="background: rgba(139, 69, 19, 0.1); padding: 12px 20px; border-top: 2px dashed rgba(139, 69, 19, 0.3); text-align: center;">
              <div style="font-size: 11px; color: #8B4513; opacity: 0.7; letter-spacing: 1px;">쿠폰 번호: ${coupon.code}</div>
            </div>
          </div>
        `;
      });
    }
    
    // 만료된 쿠폰
    if (expiredCoupons.length > 0) {
      html += '<h3 style="margin: 30px 0 15px 0; font-size: 18px; color: #999;">❌ 만료된 쿠폰</h3>';
      expiredCoupons.forEach(coupon => {
        html += `
          <div style="background: #f5f5f5; border-radius: 16px; padding: 20px; margin-bottom: 15px; color: #999; opacity: 0.6;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div>
                <h4 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #999;">${coupon.name}</h4>
                <p style="margin: 0; font-size: 14px;">${coupon.code}</p>
              </div>
              <div style="font-size: 12px; color: #999;">만료됨</div>
            </div>
          </div>
        `;
      });
    }
    
    container.innerHTML = html;
  } catch (err) {
    console.error('쿠폰 목록 로드 오류:', err);
    document.getElementById('coupon-list-container').innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #e74c3c;">
        <p>쿠폰 목록을 불러올 수 없습니다.</p>
        <button onclick="showCouponList()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
          다시 시도
        </button>
      </div>
    `;
  }
}

// 쿠폰 코드 복사
function copyCouponCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    alert(`쿠폰 코드 "${code}"가 복사되었습니다!\n장바구니에서 사용하세요.`);
  }).catch(() => {
    // 클립보드 복사 실패 시
    const textarea = document.createElement('textarea');
    textarea.value = code;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert(`쿠폰 코드 "${code}"가 복사되었습니다!\n장바구니에서 사용하세요.`);
  });
}

// 쿠폰 코드 사용하기
function useCouponCode(code) {
  showCart();
  setTimeout(() => {
    const couponInput = document.getElementById('coupon-code');
    if (couponInput) {
      couponInput.value = code;
      applyCoupon();
    }
  }, 300);
}

// 쿠폰 리딤 (쿠폰 코드로 발급받기)
async function redeemCoupon() {
  if (!currentUser || isGuest) {
    alert('로그인이 필요합니다.');
    showLogin();
    return;
  }

  const codeInput = document.getElementById('redeem-coupon-code');
  const errorDiv = document.getElementById('redeem-error');
  
  if (!codeInput) {
    console.error('❌ 리딤 입력 필드를 찾을 수 없습니다.');
    return;
  }

  const code = codeInput.value.trim().toUpperCase();
  if (!code) {
    errorDiv.textContent = '쿠폰 코드를 입력해주세요.';
    errorDiv.style.display = 'block';
    return;
  }

  errorDiv.style.display = 'none';

  try {
    const res = await fetch('/api/coupons/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        userId: currentUser.userid
      })
    });

    const data = await res.json();

    if (data.success) {
      codeInput.value = '';
      errorDiv.style.display = 'none';
      alert('✅ 쿠폰이 발급되었습니다!');
      // 쿠폰 목록 새로고침
      showCouponList();
    } else {
      errorDiv.textContent = data.error || '쿠폰 발급에 실패했습니다.';
      errorDiv.style.display = 'block';
    }
  } catch (err) {
    console.error('쿠폰 리딤 오류:', err);
    errorDiv.textContent = '쿠폰 발급 중 오류가 발생했습니다: ' + err.message;
    errorDiv.style.display = 'block';
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
      // 메뉴 화면 등 다른 곳은 가게명만 표시 (로고는 이미지로 표시됨)
      el.textContent = storeName;
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
      h1.textContent = storeName;
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
        if (data.status === 'very-busy') {
          banner.style.background = 'rgba(244, 67, 54, 0.2)';
          banner.style.borderColor = 'rgba(244, 67, 54, 0.5)';
          statusText.textContent = '주문혼잡도: 많이바쁨';
          statusText.style.color = '#ffcdd2';
          banner.style.display = 'flex';
        } else if (data.status === 'busy') {
          banner.style.background = 'rgba(255, 152, 0, 0.2)';
          banner.style.borderColor = 'rgba(255, 152, 0, 0.5)';
          statusText.textContent = '주문혼잡도: 바쁨';
          statusText.style.color = '#ffe0b2';
          banner.style.display = 'flex';
        } else if (data.status === 'normal') {
          banner.style.background = 'rgba(76, 175, 80, 0.2)';
          banner.style.borderColor = 'rgba(76, 175, 80, 0.5)';
          statusText.textContent = '주문혼잡도: 보통';
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
    
    // 주문 수정 체크
    const editOrderId = sessionStorage.getItem('editOrderId');
    if (editOrderId) {
      const currentUserData = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
      if (currentUserData) {
        currentUser = currentUserData;
        isGuest = false;
        updateUserInfo();
        
        // 주문 정보 로드
        try {
          const res = await fetch(`/api/orders/${editOrderId}`);
          const data = await res.json();
          if (data.success && data.order) {
            const order = data.order;
            cart.length = 0;
            order.items.forEach(item => {
              cart.push({
                id: item.menuId,
                name: item.name,
                price: item.price,
                quantity: item.quantity
              });
            });
            
            sessionStorage.removeItem('editOrderId');
            showMenu();
            setTimeout(() => {
              showCheckout();
              alert('주문을 수정할 수 있습니다. 변경 후 다시 주문해주세요.');
            }, 100);
            return;
          }
        } catch (err) {
          console.error('주문 수정 로드 오류:', err);
          sessionStorage.removeItem('editOrderId');
        }
      }
    }
    
    // 재주문 체크
    // 재주문 처리 (mypage에서 온 경우)
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
  
  // 재주문 처리
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('reorder') === 'true') {
    const reorderData = sessionStorage.getItem('reorderData');
    if (reorderData) {
      try {
        const data = JSON.parse(reorderData);
        // 장바구니에 추가
        if (data.items && Array.isArray(data.items)) {
          cart = data.items;
          updateCartCount();
          // 주소 자동 입력
          if (data.address) {
            document.getElementById('checkout-address').value = data.address;
          }
          // 장바구니 화면으로 이동
          showCart();
          sessionStorage.removeItem('reorderData');
        }
      } catch (e) {
        console.error('재주문 데이터 파싱 오류:', e);
      }
    }
  }
  
  // 주문 수정 처리
  if (urlParams.get('edit') === 'true') {
    const editOrderData = sessionStorage.getItem('editOrderData');
    if (editOrderData) {
      try {
        const data = JSON.parse(editOrderData);
        window.editingOrderId = data.orderId;
        
        // 장바구니에 기존 주문 메뉴 추가
        if (data.items && Array.isArray(data.items)) {
          cart = data.items;
          updateCartCount();
        }
        
        // 주소 자동 입력
        if (data.address) {
          document.getElementById('checkout-address').value = data.address;
        }
        
        // 사용한 포인트 복원
        if (data.usedPoints > 0) {
          usedPoints = data.usedPoints;
        }
        
        // 쿠폰 복원
        if (data.couponCode) {
          couponCode = data.couponCode;
          couponDiscount = data.couponDiscount || 0;
        }
        
        // 장바구니 화면으로 이동
        showCart();
        
        // 수정 모드 표시
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
          const submitBtn = checkoutForm.querySelector('button[type="submit"]');
          if (submitBtn) {
            submitBtn.textContent = '주문 수정하기';
            submitBtn.style.background = '#3498db';
          }
        }
        
        sessionStorage.removeItem('editOrderData');
      } catch (e) {
        console.error('주문 수정 데이터 파싱 오류:', e);
      }
    }
  }
})();

