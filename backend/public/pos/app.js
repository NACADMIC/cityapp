// Check authentication
if (sessionStorage.getItem('pos-authenticated') !== 'true') {
  window.location.href = 'login.html';
}

// Initialize Socket.io
const socket = io();

// Global variables
let orders = [];
let voiceEnabled = true;
let isPlayingVoice = false;
let processedOrders = new Set();
let currentPendingOrder = null;
let notificationInterval = null;

// Register as POS client
socket.on('connect', () => {
  console.log('✅ Connected to server');
  socket.emit('register-pos');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

// 주문 복원 (POS 재시작 시)
socket.on('restore-orders', (restoredOrders) => {
  console.log('📦 주문 복원:', restoredOrders.length, '개');
  
  restoredOrders.forEach(order => {
    // 중복 체크
    if (!processedOrders.has(order.orderid || order.orderId)) {
      const orderId = order.orderid || order.orderId;
      processedOrders.add(orderId);
      
      // 주문 목록에 추가 (팝업은 안 띄움)
      const orderData = {
        orderId: orderId,
        customerName: order.customername || order.customerName,
        phone: order.customerphone || order.phone,
        address: order.address,
        items: order.items,
        totalAmount: order.totalprice || order.totalAmount,
        paymentMethod: order.paymentmethod || order.paymentMethod || 'cash',
        status: order.status,
        prepTime: order.preptime || order.prepTime,
        createdAt: order.createdat || order.createdAt
      };
      
      addOrder(orderData);
    }
  });
  
  console.log('✅ 주문 복원 완료');
});

// Voice toggle
document.getElementById('voice-toggle').addEventListener('change', (e) => {
  voiceEnabled = e.target.checked;
  console.log('Voice alerts:', voiceEnabled ? 'ON' : 'OFF');
});

// Test functions
function testSound() {
  console.log('🔊 Testing sound...');
  playNotification({
    orderId: 'TEST-123',
    customerName: 'Test Customer',
    phone: '010-1234-5678',
    address: 'Test Address 123',
    items: [
      { name: 'Jjajangmyeon', quantity: 2, price: 6000 },
      { name: 'Tangsuyuk', quantity: 1, price: 15000 }
    ],
    totalAmount: 27000
  });
}

function testOrder() {
  console.log('📦 Testing order...');
  const testOrder = {
    orderId: 'TEST-' + Date.now(),
    customerName: 'Test Customer',
    phone: '010-1234-5678',
    address: 'Test Address, Test City, Test District',
    items: [
      { name: 'Jjajangmyeon', quantity: 2, price: 6000 },
      { name: 'Jjamppong', quantity: 1, price: 7000 },
      { name: 'Tangsuyuk', quantity: 1, price: 15000 }
    ],
    totalAmount: 34000,
    paymentMethod: 'cash',
    createdAt: new Date().toISOString()
  };
  
  addOrder(testOrder);
  playNotification(testOrder);
}

// 주문 큐 시스템
let orderQueue = [];
let isProcessingOrder = false;

// Listen for new orders
socket.on('new-order', (orderData) => {
  console.log('🎉 New order received:', orderData);
  
  // 중복 주문 체크
  if (processedOrders.has(orderData.orderId)) {
    console.log('⚠️ Duplicate order ignored:', orderData.orderId);
    return;
  }
  
  processedOrders.add(orderData.orderId);
  
  // 큐에 추가
  orderQueue.push(orderData);
  console.log(`📥 주문 큐에 추가됨. 대기 중: ${orderQueue.length}개`);
  
  // 현재 처리 중이 아니면 처리 시작
  if (!isProcessingOrder) {
    processNextOrder();
  }
});

// 다음 주문 처리
function processNextOrder() {
  if (orderQueue.length === 0) {
    isProcessingOrder = false;
    console.log('✅ 모든 주문 처리 완료');
    return;
  }
  
  isProcessingOrder = true;
  currentPendingOrder = orderQueue[0]; // 큐에서 제거하지 않음 (수락/거절 시 제거)
  
  console.log(`🔄 주문 처리 중... (남은 대기: ${orderQueue.length - 1}개)`);
  
  // 팝업 표시
  showOrderPopup(currentPendingOrder);
  
  // 음성 알림
  playNotification(currentPendingOrder);
}

// Play notification
function playNotification(orderData) {
  if (!voiceEnabled) {
    console.log('🔇 Voice disabled');
    return;
  }
  
  if (isPlayingVoice) {
    console.log('⚠️ Voice already playing, skipping...');
    return;
  }

  console.log('🔊 Playing notification...');
  isPlayingVoice = true;
  playVoiceFile(orderData);
}

// Play voice file + TTS details
function playVoiceFile(orderData) {
  const audio = new Audio('/pos/sounds/new-order.mp3');
  
  audio.onerror = () => {
    console.log('⚠️ Audio file not found, using browser TTS');
    speakOrderDetails(orderData);
    isPlayingVoice = false;
  };

  audio.onended = () => {
    console.log('✅ Audio finished, speaking details...');
    speakOrderDetails(orderData);
  };

  audio.play().catch(err => {
    console.log('⚠️ Audio play failed:', err);
    speakOrderDetails(orderData);
    isPlayingVoice = false;
  });
}

// Speak order details with TTS
function speakOrderDetails(orderData) {
  if (!window.speechSynthesis) {
    console.log('⚠️ Speech synthesis not supported');
    isPlayingVoice = false;
    return;
  }

  const text = `띵동, 주문이 왔습니다`;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const koreanVoice = voices.find(v => 
    v.lang.includes('ko') && (v.name.includes('Google') || v.name.includes('Microsoft'))
  ) || voices.find(v => v.lang.includes('ko'));

  if (koreanVoice) {
    utterance.voice = koreanVoice;
  }
  
  utterance.onend = () => {
    console.log('✅ TTS finished');
    isPlayingVoice = false;
  };
  
  utterance.onerror = () => {
    console.log('⚠️ TTS error');
    isPlayingVoice = false;
  };

  window.speechSynthesis.speak(utterance);
  console.log('🗣️ Speaking:', text);
}

// Add order to list
function addOrder(orderData) {
  orders.unshift(orderData);
  renderOrders();
  updateStats();
}

// Format payment method
function formatPayment(method) {
  return method === 'cash' ? '현금' : '카드';
}

// Get status buttons
function getStatusButtons(orderId, status) {
  const buttons = {
    'pending': `<button class="btn btn-info" style="background: #ffc107; color: #000;">⏳ 수락 대기 중</button>`,
    'accepted': `<button class="btn btn-accept" onclick="updateStatus('${orderId}', 'preparing')">✓ 조리 시작</button>`,
    'preparing': `<button class="btn btn-accept" onclick="updateStatus('${orderId}', 'delivering')">🚚 배달 출발</button>`,
    'delivering': `<button class="btn btn-accept" onclick="updateStatus('${orderId}', 'completed')">✅ 배달 완료</button>`,
    'completed': `<button class="btn" style="background: #9e9e9e; cursor: not-allowed;" disabled>완료됨</button>`
  };
  return buttons[status] || buttons['pending'];
}

// Render orders
function renderOrders() {
  const ordersList = document.getElementById('orders-list');
  
  if (orders.length === 0) {
    ordersList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>아직 주문이 없습니다</p>
        <small>주문이 실시간으로 표시됩니다</small>
      </div>
    `;
    return;
  }

  ordersList.innerHTML = orders.map((order, index) => `
    <div class="order-card ${index === 0 ? 'new' : ''}">
      <div class="order-header">
        <div>
          <div class="order-id">${order.orderId}</div>
          <div class="order-time">${formatTime(order.createdAt)}</div>
        </div>
        ${index === 0 ? '<span class="order-badge">신규</span>' : ''}
      </div>

      <div class="order-customer">
        <h3>고객 정보</h3>
        <div class="customer-info">
          <div>👤 ${order.customerName}</div>
          <div>📞 ${order.phone}</div>
          <div>📍 ${order.address}</div>
          <div>💳 ${formatPayment(order.paymentMethod || 'cash')}</div>
          ${order.prepTime ? `<div>⏰ 예상 소요시간: ${order.prepTime}분</div>` : ''}
        </div>
      </div>

      <div class="order-items">
        <h4>주문 메뉴</h4>
        ${order.items.map(item => `
          <div class="item">
            <span class="item-name">${item.name} x ${item.quantity}</span>
            <span class="item-price">${(item.price * item.quantity).toLocaleString()}원</span>
          </div>
        `).join('')}
      </div>

      <div class="order-total">
        <span class="total-label">합계</span>
        <span class="total-amount">${order.totalAmount.toLocaleString()}원</span>
      </div>

      <div class="order-actions">
        ${getStatusButtons(order.orderId, order.status)}
        <button class="btn btn-print" onclick="printOrder('${order.orderId}')">🖨 인쇄</button>
      </div>
    </div>
  `).join('');

  // Remove 'new' class after 3 seconds
  setTimeout(() => {
    document.querySelectorAll('.order-card.new').forEach(card => {
      card.classList.remove('new');
    });
  }, 3000);
}

// Update statistics
function updateStats() {
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => 
    new Date(o.createdAt).toDateString() === today
  );

  document.getElementById('today-orders').textContent = todayOrders.length;
  document.getElementById('pending-orders').textContent = orders.length;
  
  const revenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  document.getElementById('today-revenue').textContent = revenue.toLocaleString();
}

// Update order status
async function updateStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    const data = await res.json();
    
    if (data.success) {
      // Update local order
      const order = orders.find(o => o.orderId === orderId);
      if (order) {
        order.status = newStatus;
        renderOrders();
      }
      
      const statusText = {
        'accepted': '주문 수락',
        'preparing': '조리 시작',
        'delivering': '배달 출발',
        'completed': '배달 완료'
      };
      
      alert(`✅ ${statusText[newStatus]}!`);
    }
  } catch (err) {
    alert('상태 업데이트 오류: ' + err.message);
  }
}

// 팝업 표시
function showOrderPopup(orderData) {
  console.log('🎯 showOrderPopup 호출됨:', orderData);
  
  const popup = document.getElementById('order-popup');
  const popupInfo = document.getElementById('popup-order-info');
  
  if (!popup) {
    console.error('❌ 팝업 요소를 찾을 수 없습니다!');
    return;
  }
  
  console.log('✅ 팝업 요소 찾음:', popup);
  
  const itemsHTML = orderData.items.map(item => 
    `<div class="popup-item">${item.name} x ${item.quantity} - ${(item.price * item.quantity).toLocaleString()}원</div>`
  ).join('');
  
  popupInfo.innerHTML = `
    <h3>👤 고객 정보</h3>
    <p><strong>고객명:</strong> ${orderData.customerName}</p>
    <p><strong>전화번호:</strong> ${orderData.phone}</p>
    <p><strong>주소:</strong> ${orderData.address}</p>
    
    <h3 style="margin-top: 25px;">🍜 주문 메뉴</h3>
    ${itemsHTML}
    <div class="popup-total">합계: ${orderData.totalAmount.toLocaleString()}원</div>
  `;
  
  console.log('📝 팝업 내용 설정 완료');
  
  popup.classList.add('show');
  console.log('✅ 팝업 표시됨! classList:', popup.classList);
  
  // 5초마다 음성 반복
  startNotificationLoop();
}

// 알림 반복 시작
function startNotificationLoop() {
  // 기존 반복 정지
  stopNotificationLoop();
  
  console.log('🔁 알림 반복 시작 (5초 간격)');
  
  // 5초마다 반복
  notificationInterval = setInterval(() => {
    if (currentPendingOrder && voiceEnabled) {
      // 음성이 재생 중이어도 강제로 정지하고 다시 재생
      window.speechSynthesis.cancel();
      isPlayingVoice = false;
      
      console.log('🔄 알림 반복... (' + new Date().toLocaleTimeString() + ')');
      console.log('📢 대기 중인 주문:', orderQueue.length, '개');
      playVoiceFile(currentPendingOrder);
    }
  }, 5000); // 5초
}

// 알림 반복 정지
function stopNotificationLoop() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
    console.log('⏹️ 알림 반복 정지');
  }
}

// 팝업 닫기
function hideOrderPopup() {
  const popup = document.getElementById('order-popup');
  popup.classList.remove('show');
  
  // 알림 반복 정지
  stopNotificationLoop();
}

// 주문 수락
function acceptOrder() {
  if (!currentPendingOrder) return;
  
  const prepTime = document.getElementById('prep-time').value;
  console.log(`✅ 주문 수락: ${currentPendingOrder.orderId}, 소요시간: ${prepTime}분`);
  
  // 주문에 소요시간 추가
  currentPendingOrder.prepTime = prepTime;
  currentPendingOrder.status = 'accepted';
  
  addOrder(currentPendingOrder);
  
  // 서버에 수락 상태 업데이트
  updateStatus(currentPendingOrder.orderId, 'accepted');
  
  hideOrderPopup();
  
  // 큐에서 제거
  orderQueue.shift();
  currentPendingOrder = null;
  
  // 다음 주문 처리
  processNextOrder();
}

// 주문 거절
function rejectOrder() {
  if (!currentPendingOrder) return;
  
  if (confirm(`주문을 거절하시겠습니까?\n고객: ${currentPendingOrder.customerName}`)) {
    console.log(`❌ 주문 거절: ${currentPendingOrder.orderId}`);
    
    // 서버에 거절 상태 업데이트
    updateStatus(currentPendingOrder.orderId, 'rejected');
    
    hideOrderPopup();
    
    // 큐에서 제거
    orderQueue.shift();
    currentPendingOrder = null;
    
    // 다음 주문 처리
    processNextOrder();
  }
}

function printOrder(orderId) {
  console.log('🖨 인쇄:', orderId);
  const order = orders.find(o => o.orderId === orderId);
  if (order) {
    window.print();
  }
}

// Format time
function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });
}

// 햄버거 메뉴 토글
function toggleMenu() {
  const sideMenu = document.getElementById('side-menu');
  const overlay = document.getElementById('menu-overlay');
  
  if (sideMenu.classList.contains('active')) {
    sideMenu.classList.remove('active');
    overlay.classList.remove('active');
  } else {
    sideMenu.classList.add('active');
    overlay.classList.add('active');
  }
}

// Initial render
renderOrders();
updateStats();

console.log('🏮 POS 시스템 준비 완료!');

