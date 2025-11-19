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
function getStatusButtons(orderId, status, riderId) {
  let buttons = {
    'pending': `<button class="btn btn-info" style="background: #ffc107; color: #000;" onclick="showPendingOrderPopup('${orderId}')">⏳ 수락 대기 중 (클릭)</button>`,
    'accepted': `<button class="btn btn-accept" onclick="updateStatus('${orderId}', 'preparing')">✓ 조리 시작</button>`,
    'preparing': `<button class="btn btn-accept" onclick="assignRider('${orderId}')">🛵 라이더 배정</button>`,
    'delivering': `<button class="btn btn-accept" onclick="updateStatus('${orderId}', 'completed')">✅ 배달 완료</button>`,
    'completed': `<button class="btn" style="background: #9e9e9e; cursor: not-allowed;" disabled>완료됨</button>`
  };
  
  // preparing 상태에서 라이더가 배정되어 있으면 배달 출발 버튼 표시
  if (status === 'preparing' && riderId) {
    buttons['preparing'] = `<button class="btn btn-accept" onclick="updateStatus('${orderId}', 'delivering')">🚚 배달 출발</button>`;
  }
  
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
        ${getStatusButtons(order.orderId, order.status, order.riderId)}
        <button class="btn btn-print" onclick="printOrder('${order.orderId}')">🖨 인쇄</button>
      </div>
      ${order.riderId ? `<div style="margin-top: 10px; padding: 8px; background: #e3f2fd; border-radius: 5px; font-size: 14px; color: #1976d2;">🛵 라이더 배정됨 (ID: ${order.riderId})</div>` : ''}
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
  
  // 주문 상태 업데이트
  currentPendingOrder.prepTime = prepTime;
  currentPendingOrder.status = 'accepted';
  
  // 목록에 이미 있으면 업데이트, 없으면 추가
  const existingIndex = orders.findIndex(o => o.orderId === currentPendingOrder.orderId);
  if (existingIndex >= 0) {
    orders[existingIndex] = currentPendingOrder;
  } else {
    orders.unshift(currentPendingOrder);
  }
  
  // 화면 업데이트
  renderOrders();
  updateStats();
  
  // 서버에 수락 상태 업데이트
  updateStatus(currentPendingOrder.orderId, 'accepted');
  
  hideOrderPopup();
  
  // 큐에서 제거
  if (orderQueue.length > 0 && orderQueue[0].orderId === currentPendingOrder.orderId) {
    orderQueue.shift();
  }
  
  currentPendingOrder = null;
  
  // 다음 주문 처리
  processNextOrder();
}

// 주문 거절
function rejectOrder() {
  if (!currentPendingOrder) return;
  
  if (confirm(`주문을 거절하시겠습니까?\n고객: ${currentPendingOrder.customerName}`)) {
    console.log(`❌ 주문 거절: ${currentPendingOrder.orderId}`);
    
    // 목록에서 제거
    const index = orders.findIndex(o => o.orderId === currentPendingOrder.orderId);
    if (index >= 0) {
      orders.splice(index, 1);
    }
    
    // 화면 업데이트
    renderOrders();
    updateStats();
    
    // 서버에 거절 상태 업데이트
    updateStatus(currentPendingOrder.orderId, 'rejected');
    
    hideOrderPopup();
    
    // 큐에서 제거
    if (orderQueue.length > 0 && orderQueue[0].orderId === currentPendingOrder.orderId) {
      orderQueue.shift();
    }
    
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

// 대기 중인 주문 팝업 표시
function showPendingOrderPopup(orderId) {
  console.log('🔍 대기 주문 팝업 열기:', orderId);
  
  // 주문 찾기
  const order = orders.find(o => o.orderId === orderId);
  if (!order) {
    console.error('❌ 주문을 찾을 수 없습니다:', orderId);
    return;
  }
  
  console.log('✅ 주문 찾음:', order);
  
  // 현재 대기 주문 설정
  currentPendingOrder = order;
  
  // 팝업 표시
  showOrderPopup(order);
  
  // 음성 알림 시작
  playNotification(order);
}

// 라이더 배정 (드롭다운 팝업)
async function assignRider(orderId) {
  try {
    // 라이더 목록 가져오기
    const res = await fetch('/api/riders');
    const data = await res.json();
    
    if (!data.success || !data.riders || data.riders.length === 0) {
      alert('등록된 라이더가 없습니다.');
      return;
    }

    // 온라인 라이더 우선 표시
    const onlineRiders = data.riders.filter(r => r.status === 'online');
    const offlineRiders = data.riders.filter(r => r.status !== 'online');
    const sortedRiders = [...onlineRiders, ...offlineRiders];

    // 라이더 선택 팝업 생성
    const popup = document.createElement('div');
    popup.className = 'popup-overlay';
    popup.style.display = 'flex';
    popup.innerHTML = `
      <div class="popup-content" style="max-width: 400px;">
        <h2>🛵 라이더 배정</h2>
        <div style="margin: 20px 0;">
          <label style="display: block; margin-bottom: 10px; font-weight: 600;">라이더 선택:</label>
          <select id="rider-select" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
            <option value="">-- 라이더 선택 --</option>
            ${sortedRiders.map(r => `
              <option value="${r.riderId}" ${r.status === 'online' ? 'style="background: #e8f5e9;"' : ''}>
                ${r.name} (${r.phone}) - ${r.status === 'online' ? '🟢 온라인' : '⚫ 오프라인'}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="popup-actions">
          <button class="btn btn-accept" onclick="confirmAssignRider('${orderId}')">배정</button>
          <button class="btn btn-reject" onclick="closeRiderPopup()">취소</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
    
    // 전역 변수에 저장
    window.currentRiderPopup = popup;
    window.currentRiderOrderId = orderId;
  } catch (err) {
    alert('오류: ' + err.message);
  }
}

// 라이더 배정 확인
async function confirmAssignRider(orderId) {
  const select = document.getElementById('rider-select');
  const riderId = select.value;
  
  if (!riderId) {
    alert('라이더를 선택해주세요.');
    return;
  }

  try {
    const assignRes = await fetch(`/api/orders/${orderId}/assign-rider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riderId: parseInt(riderId) })
    });

    const assignData = await assignRes.json();
    if (assignData.success) {
      const order = orders.find(o => o.orderId === orderId);
      if (order) {
        order.riderId = parseInt(riderId);
        renderOrders();
      }
      closeRiderPopup();
      alert('라이더가 배정되었습니다!');
    } else {
      alert('라이더 배정 실패: ' + assignData.error);
    }
  } catch (err) {
    alert('오류: ' + err.message);
  }
}

// 라이더 팝업 닫기
function closeRiderPopup() {
  if (window.currentRiderPopup) {
    window.currentRiderPopup.remove();
    window.currentRiderPopup = null;
    window.currentRiderOrderId = null;
  }
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

// 영업시간 상태 업데이트
async function updateBusinessStatus() {
  try {
    const res = await fetch('/api/business-hours');
    const data = await res.json();
    
    const statusEl = document.getElementById('business-status');
    const statusText = document.getElementById('status-text');
    const tempClosedBtn = document.getElementById('temporary-closed-btn');
    
    // 임시휴업 버튼 업데이트
    if (data.temporaryClosed) {
      tempClosedBtn.textContent = '🔴 임시휴업';
      tempClosedBtn.style.background = '#f44336';
      tempClosedBtn.style.color = 'white';
    } else {
      tempClosedBtn.textContent = '🟢 영업중';
      tempClosedBtn.style.background = '#4caf50';
      tempClosedBtn.style.color = 'white';
    }
    
    // 상태 표시 업데이트
    if (data.isOpen) {
      statusEl.style.background = '#4caf50';
      statusEl.style.color = 'white';
      let statusMsg = `🟢 영업중 (${data.businessHours})`;
      if (data.statusMessage) {
        statusMsg += ` - ${data.statusMessage}`;
      }
      statusText.textContent = statusMsg;
    } else {
      statusEl.style.background = '#ff9800';
      statusEl.style.color = 'white';
      let statusMsg = `🔴 영업시간 아님`;
      if (data.statusMessage) {
        statusMsg = `🔴 ${data.statusMessage}`;
      } else {
        statusMsg += ` (${data.businessHours})`;
      }
      statusText.textContent = statusMsg;
    }
  } catch (err) {
    console.error('영업시간 상태 업데이트 오류:', err);
  }
}

// 영업시간 설정 팝업 열기
async function openBusinessHoursSettings() {
  try {
    const res = await fetch('/api/business-hours');
    const data = await res.json();
    
    // 현재 설정값으로 입력 필드 채우기
    const openHour = Math.floor(data.open);
    const openMinute = Math.round((data.open - openHour) * 60);
    const closeHour = Math.floor(data.close);
    const closeMinute = Math.round((data.close - closeHour) * 60);
    
    document.getElementById('open-hour').value = openHour;
    document.getElementById('open-minute').value = openMinute;
    document.getElementById('close-hour').value = closeHour;
    document.getElementById('close-minute').value = closeMinute;
    
    // 현재 설정 표시
    document.getElementById('current-hours-display').textContent = data.businessHours;
    document.getElementById('current-time-display').textContent = data.currentTime;
    
    // 팝업 표시
    document.getElementById('business-hours-popup').style.display = 'flex';
  } catch (err) {
    alert('영업시간 정보를 불러오는 중 오류가 발생했습니다: ' + err.message);
  }
}

// 영업시간 설정 팝업 닫기
function closeBusinessHoursSettings() {
  document.getElementById('business-hours-popup').style.display = 'none';
}

// 영업시간 저장
async function saveBusinessHours() {
  try {
    const openHour = parseInt(document.getElementById('open-hour').value);
    const openMinute = parseInt(document.getElementById('open-minute').value);
    const closeHour = parseInt(document.getElementById('close-hour').value);
    const closeMinute = parseInt(document.getElementById('close-minute').value);
    
    if (isNaN(openHour) || isNaN(openMinute) || isNaN(closeHour) || isNaN(closeMinute)) {
      alert('모든 시간을 입력해주세요.');
      return;
    }
    
    const open = openHour + openMinute / 60;
    const close = closeHour + closeMinute / 60;
    
    if (open >= close) {
      alert('오픈 시간은 마감 시간보다 빨라야 합니다.');
      return;
    }
    
    const res = await fetch('/api/business-hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ open, close })
    });
    
    const data = await res.json();
    if (data.success) {
      alert('영업시간이 저장되었습니다!');
      closeBusinessHoursSettings();
      updateBusinessStatus();
    } else {
      alert('저장 실패: ' + data.error);
    }
  } catch (err) {
    alert('저장 오류: ' + err.message);
  }
}

// Initial render
renderOrders();
updateStats();
updateBusinessStatus();
// 임시휴업 토글
async function toggleTemporaryClosed() {
  try {
    const res = await fetch('/api/business-hours');
    const data = await res.json();
    const currentStatus = data.temporaryClosed;
    
    const newStatus = !currentStatus;
    const confirmMsg = newStatus 
      ? '임시휴업을 시작하시겠습니까? 주문을 받지 않습니다.' 
      : '영업을 재개하시겠습니까?';
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    const updateRes = await fetch('/api/temporary-closed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closed: newStatus })
    });
    
    const updateData = await updateRes.json();
    if (updateData.success) {
      alert(newStatus ? '임시휴업이 시작되었습니다.' : '영업이 재개되었습니다.');
      updateBusinessStatus();
    } else {
      alert('설정 실패: ' + updateData.error);
    }
  } catch (err) {
    alert('오류: ' + err.message);
  }
}

// 브레이크타임 설정 팝업 열기
async function openBreakTimeSettings() {
  try {
    const res = await fetch('/api/business-hours');
    const data = await res.json();
    
    if (data.breakTime) {
      const startHour = Math.floor(data.breakTime.start);
      const startMinute = Math.round((data.breakTime.start - startHour) * 60);
      const endHour = Math.floor(data.breakTime.end);
      const endMinute = Math.round((data.breakTime.end - endHour) * 60);
      
      document.getElementById('break-start-hour').value = startHour;
      document.getElementById('break-start-minute').value = startMinute;
      document.getElementById('break-end-hour').value = endHour;
      document.getElementById('break-end-minute').value = endMinute;
      
      const formatTime = (time) => {
        const h = Math.floor(time);
        const m = Math.round((time - h) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };
      document.getElementById('current-break-time-display').textContent = 
        `${formatTime(data.breakTime.start)} - ${formatTime(data.breakTime.end)}`;
    } else {
      document.getElementById('break-start-hour').value = 14;
      document.getElementById('break-start-minute').value = 30;
      document.getElementById('break-end-hour').value = 15;
      document.getElementById('break-end-minute').value = 30;
      document.getElementById('current-break-time-display').textContent = '없음';
    }
    
    document.getElementById('break-time-popup').style.display = 'flex';
  } catch (err) {
    alert('브레이크타임 정보를 불러오는 중 오류가 발생했습니다: ' + err.message);
  }
}

// 브레이크타임 설정 팝업 닫기
function closeBreakTimeSettings() {
  document.getElementById('break-time-popup').style.display = 'none';
}

// 브레이크타임 저장
async function saveBreakTime() {
  try {
    const startHour = parseInt(document.getElementById('break-start-hour').value);
    const startMinute = parseInt(document.getElementById('break-start-minute').value);
    const endHour = parseInt(document.getElementById('break-end-hour').value);
    const endMinute = parseInt(document.getElementById('break-end-minute').value);
    
    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
      alert('모든 시간을 입력해주세요.');
      return;
    }
    
    const start = startHour + startMinute / 60;
    const end = endHour + endMinute / 60;
    
    if (start >= end) {
      alert('시작 시간은 종료 시간보다 빨라야 합니다.');
      return;
    }
    
    const res = await fetch('/api/break-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end })
    });
    
    const data = await res.json();
    if (data.success) {
      alert('브레이크타임이 저장되었습니다!');
      closeBreakTimeSettings();
      updateBusinessStatus();
    } else {
      alert('저장 실패: ' + data.error);
    }
  } catch (err) {
    alert('저장 오류: ' + err.message);
  }
}

// 브레이크타임 해제
async function clearBreakTime() {
  if (!confirm('브레이크타임을 해제하시겠습니까?')) {
    return;
  }
  
  try {
    const res = await fetch('/api/break-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start: null, end: null })
    });
    
    const data = await res.json();
    if (data.success) {
      alert('브레이크타임이 해제되었습니다!');
      closeBreakTimeSettings();
      updateBusinessStatus();
    } else {
      alert('해제 실패: ' + data.error);
    }
  } catch (err) {
    alert('오류: ' + err.message);
  }
}

setInterval(updateBusinessStatus, 60000); // 1분마다 영업시간 상태 업데이트

console.log('🏮 POS 시스템 준비 완료!');

