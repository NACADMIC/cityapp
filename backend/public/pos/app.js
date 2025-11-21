// Check authentication
if (sessionStorage.getItem('pos-authenticated') !== 'true') {
  window.location.href = 'login.html';
}

// Global variables
let storeName = '시티반점'; // 가게명 (동적으로 로드됨)

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
    if (el.classList && el.classList.contains('store-title')) {
      el.textContent = `🏮 ${storeName}`;
    } else {
      el.textContent = storeName;
    }
  });
  // h1 태그들 업데이트 (store-title 클래스가 없는 경우)
  const h1Elements = document.querySelectorAll('h1:not(.store-title)');
  h1Elements.forEach(h1 => {
    if (h1.textContent.includes('시티반점') || h1.textContent.includes('🏮')) {
      h1.textContent = `🏮 ${storeName}`;
    }
  });
  // title 태그 업데이트
  if (document.title.includes('시티반점')) {
    document.title = document.title.replace('시티반점', storeName);
  }
}

// 바쁨 상태 설정
async function setBusyStatus(status) {
  try {
    const res = await fetch('/api/busy-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      updateBusyStatusUI(status);
      console.log('✅ 바쁨 상태 설정:', status);
    } else {
      alert('상태 설정 실패: ' + data.error);
    }
  } catch (error) {
    alert('오류: ' + error.message);
  }
}

// 바쁨 상태 UI 업데이트
function updateBusyStatusUI(status) {
  document.querySelectorAll('.btn-busy-status').forEach(btn => {
    btn.classList.remove('active');
  });
  const btn = document.getElementById(`busy-${status}`);
  if (btn) {
    btn.classList.add('active');
  }
}

// 바쁨 상태 로드
async function loadBusyStatus() {
  try {
    const res = await fetch('/api/busy-status');
    const data = await res.json();
    if (data.success) {
      updateBusyStatusUI(data.status);
    }
  } catch (error) {
    console.error('바쁨 상태 로드 오류:', error);
  }
}

// 주문 소리 크기 설정 팝업 열기
function openVolumeSettings() {
  const popup = document.getElementById('volume-popup');
  if (popup) {
    // 현재 볼륨 값으로 슬라이더 설정
    const slider = document.getElementById('volume-slider-popup');
    const valueDisplay = document.getElementById('volume-value-popup');
    if (slider && valueDisplay) {
      slider.value = orderVolume;
      valueDisplay.textContent = orderVolume + '%';
    }
    popup.style.display = 'flex';
  }
}

// 주문 소리 크기 설정 팝업 닫기
function closeVolumeSettings() {
  const popup = document.getElementById('volume-popup');
  if (popup) {
    popup.style.display = 'none';
  }
}

// 볼륨 로드 및 초기화
function loadVolume() {
  const savedVolume = localStorage.getItem('orderVolume');
  if (savedVolume !== null) {
    orderVolume = parseInt(savedVolume);
  }
  const slider = document.getElementById('volume-slider');
  const valueDisplay = document.getElementById('volume-value');
  if (slider) {
    slider.value = orderVolume;
  }
  if (valueDisplay) {
    valueDisplay.textContent = orderVolume + '%';
  }
}

// 볼륨 업데이트
function updateVolume(value) {
  orderVolume = parseInt(value);
  localStorage.setItem('orderVolume', orderVolume);
  const valueDisplay = document.getElementById('volume-value');
  const valueDisplayPopup = document.getElementById('volume-value-popup');
  if (valueDisplay) {
    valueDisplay.textContent = orderVolume + '%';
  }
  if (valueDisplayPopup) {
    valueDisplayPopup.textContent = orderVolume + '%';
  }
  console.log('🔊 주문 소리 크기:', orderVolume + '%');
}

// 사이트 편집 모드 열기
function openSiteEditor() {
  const editWindow = window.open('/pos/site-editor.html', 'siteEditor', 'width=1600,height=1000,scrollbars=yes,resizable=yes');
  if (editWindow) {
    editWindow.focus();
  } else {
    alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
  }
}

// Global variables (함수 호출 전에 선언해야 함)
let orders = [];
let voiceEnabled = true;
let isPlayingVoice = false;
let processedOrders = new Set();
let currentPendingOrder = null;
let notificationInterval = null;
let orderVolume = 50; // 주문 소리 크기 (0-100)

// 페이지 로드 시 가게 정보, 볼륨, 바쁨 상태 로드
loadStoreInfo();
loadVolume();
loadBusyStatus();

// Initialize Socket.io
const socket = io();

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

// 테스트 함수 제거됨 (더 이상 필요 없음)

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
  audio.volume = orderVolume / 100; // 볼륨 설정 (0.0 ~ 1.0)
  
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
async function updateStatus(orderId, newStatus, estimatedTime = null) {
  try {
    console.log('📝 주문 상태 업데이트 시작:', orderId, '→', newStatus);
    
    const body = { status: newStatus };
    if (estimatedTime !== null) {
      body.estimatedTime = estimatedTime;
    }
    
    console.log('📤 서버에 요청 전송:', body);
    
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('📥 서버 응답:', data);
    
    if (data.success) {
      // Update local order
      const order = orders.find(o => o.orderId === orderId);
      if (order) {
        order.status = newStatus;
        if (estimatedTime !== null) {
          order.estimatedTime = estimatedTime;
        }
      }
      
      const statusText = {
        'accepted': '주문 수락',
        'preparing': '조리 시작',
        'delivering': '배달 출발',
        'completed': '배달 완료'
      };
      
      console.log(`✅ ${statusText[newStatus]} 완료!`);
      
      // 화면 업데이트
      renderOrders();
      updateStats();
      
      alert(`✅ ${statusText[newStatus]}!`);
      return true;
    } else {
      throw new Error(data.error || '상태 업데이트 실패');
    }
  } catch (err) {
    console.error('❌ 상태 업데이트 오류:', err);
    alert('상태 업데이트 오류: ' + err.message);
    throw err;
  }
}

// 팝업 표시
function showOrderPopup(orderData) {
  console.log('🎯 showOrderPopup 호출됨:', orderData);
  console.log('  - orderData.items 타입:', typeof orderData.items);
  console.log('  - orderData.items 값:', orderData.items);
  
  const popup = document.getElementById('order-popup');
  const popupInfo = document.getElementById('popup-order-info');
  
  if (!popup) {
    console.error('❌ 팝업 요소를 찾을 수 없습니다!');
    return;
  }
  
  if (!popupInfo) {
    console.error('❌ popup-order-info 요소를 찾을 수 없습니다!');
    return;
  }
  
  console.log('✅ 팝업 요소 찾음:', popup);
  
  // items가 문자열이면 파싱
  let items = orderData.items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
      console.log('  - items 문자열 파싱 완료');
    } catch (e) {
      console.error('  - items 파싱 오류:', e);
      items = [];
    }
  }
  
  if (!Array.isArray(items)) {
    console.error('  - items가 배열이 아닙니다:', items);
    items = [];
  }
  
  const itemsHTML = items.map(item => 
    `<div class="popup-item">${item.name} x ${item.quantity} - ${(item.price * item.quantity).toLocaleString()}원</div>`
  ).join('');
  
  popupInfo.innerHTML = `
    <h3>👤 고객 정보</h3>
    <p><strong>고객명:</strong> ${orderData.customerName || '없음'}</p>
    <p><strong>전화번호:</strong> ${orderData.phone || '없음'}</p>
    <p><strong>주소:</strong> ${orderData.address || '없음'}</p>
    
    <h3 style="margin-top: 25px;">🍜 주문 메뉴</h3>
    ${itemsHTML || '<p>메뉴 정보 없음</p>'}
    <div class="popup-total">합계: ${(orderData.totalAmount || 0).toLocaleString()}원</div>
    
    <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">⏱️ 예상 배달 시간 (분)</label>
      <input type="number" id="estimated-time-input" min="10" max="120" value="${orderData.estimatedTime || 35}" 
             style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px;">
      <p style="margin-top: 5px; font-size: 12px; color: #666;">기본값: 35분 (10-120분 사이 입력)</p>
    </div>
  `;
  
  console.log('📝 팝업 내용 설정 완료');
  
  // 팝업 표시
  popup.style.display = 'flex';
  popup.classList.add('show');
  console.log('✅ 팝업 표시됨! display:', popup.style.display, 'classList:', popup.classList);
  
  // 수락 버튼에 예상 시간 포함하도록 수정
  const acceptBtn = document.getElementById('popup-accept-btn') || popup.querySelector('.btn-accept');
  const rejectBtn = document.getElementById('popup-reject-btn') || popup.querySelector('.btn-reject');
  
  if (!acceptBtn) {
    console.error('❌ 수락 버튼을 찾을 수 없습니다!');
    console.error('  - popup:', popup);
    console.error('  - orderData.orderId:', orderData.orderId);
  }
  
  if (acceptBtn && orderData.orderId) {
    // 기존 이벤트 리스너 제거
    const newAcceptBtn = acceptBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
    
    // 새 이벤트 리스너 설정
    newAcceptBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      try {
        console.log('🔘 수락 버튼 클릭됨:', orderData.orderId);
        const estimatedTime = parseInt(document.getElementById('estimated-time-input')?.value || 35);
        console.log('⏱️ 예상 시간:', estimatedTime, '분');
        
        // 팝업 먼저 닫기
        hideOrderPopup();
        
        // 주문 상태 업데이트
        const success = await updateStatus(orderData.orderId, 'accepted', estimatedTime);
        
        if (success) {
          // 주문 목록 새로고침
          await loadOrders();
          renderOrders();
          updateStats();
          console.log('✅ 주문 수락 완료:', orderData.orderId);
        }
      } catch (error) {
        console.error('❌ 주문 수락 오류:', error);
        alert('주문 수락 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
      }
    };
    
    // 수락 버튼이 제대로 설정되었는지 확인
    console.log('✅ 수락 버튼 설정 완료:', newAcceptBtn);
  }
  
  console.log('  - 수락 버튼:', acceptBtn);
  console.log('  - 거절 버튼:', rejectBtn);
  
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
  console.log('🔒 hideOrderPopup 호출됨');
  const popup = document.getElementById('order-popup');
  if (popup) {
    popup.style.display = 'none';
    popup.classList.remove('show');
    console.log('✅ 팝업 숨김 완료');
  }
  
  // 알림 반복 정지
  stopNotificationLoop();
}

// 주문 수락
function acceptOrder() {
  console.log('🔘 acceptOrder() 호출됨');
  console.log('  - currentPendingOrder:', currentPendingOrder);
  
  if (!currentPendingOrder) {
    console.error('❌ currentPendingOrder가 없습니다!');
    alert('주문 정보를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
    return;
  }
  
  const prepTimeElement = document.getElementById('prep-time');
  if (!prepTimeElement) {
    console.error('❌ prep-time 요소를 찾을 수 없습니다!');
    alert('예상 소요시간 선택 요소를 찾을 수 없습니다.');
    return;
  }
  
  const prepTime = prepTimeElement.value;
  console.log(`✅ 주문 수락: ${currentPendingOrder.orderId}, 소요시간: ${prepTime}분`);
  
  try {
    // 주문 상태 업데이트
    currentPendingOrder.prepTime = prepTime;
    currentPendingOrder.status = 'accepted';
    
    // 목록에 이미 있으면 업데이트, 없으면 추가
    const existingIndex = orders.findIndex(o => o.orderId === currentPendingOrder.orderId);
    if (existingIndex >= 0) {
      orders[existingIndex] = currentPendingOrder;
      console.log('  - 기존 주문 업데이트됨');
    } else {
      orders.unshift(currentPendingOrder);
      console.log('  - 새 주문 추가됨');
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
      console.log('  - 큐에서 주문 제거됨');
    }
    
    const acceptedOrderId = currentPendingOrder.orderId;
    currentPendingOrder = null;
    
    console.log(`✅ 주문 ${acceptedOrderId} 수락 완료!`);
    
    // 다음 주문 처리
    processNextOrder();
  } catch (error) {
    console.error('❌ 주문 수락 중 오류:', error);
    alert('주문 수락 중 오류가 발생했습니다: ' + error.message);
  }
}

// 주문 거절
function rejectOrder() {
  console.log('🔘 rejectOrder() 호출됨');
  console.log('  - currentPendingOrder:', currentPendingOrder);
  
  if (!currentPendingOrder) {
    console.error('❌ currentPendingOrder가 없습니다!');
    alert('주문 정보를 찾을 수 없습니다.');
    return;
  }
  
  if (confirm(`주문을 거절하시겠습니까?\n고객: ${currentPendingOrder.customerName || '알 수 없음'}\n주문번호: ${currentPendingOrder.orderId}`)) {
    console.log(`❌ 주문 거절: ${currentPendingOrder.orderId}`);
    
    try {
      // 목록에서 제거
      const index = orders.findIndex(o => o.orderId === currentPendingOrder.orderId);
      if (index >= 0) {
        orders.splice(index, 1);
        console.log('  - 주문 목록에서 제거됨');
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
        console.log('  - 큐에서 주문 제거됨');
      }
      
      const rejectedOrderId = currentPendingOrder.orderId;
      currentPendingOrder = null;
      
      console.log(`✅ 주문 ${rejectedOrderId} 거절 완료!`);
      
      // 다음 주문 처리
      processNextOrder();
    } catch (error) {
      console.error('❌ 주문 거절 중 오류:', error);
      alert('주문 거절 중 오류가 발생했습니다: ' + error.message);
    }
  } else {
    console.log('  - 거절 취소됨');
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
    
    // 응답이 JSON인지 확인
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('❌ JSON이 아닌 응답:', text.substring(0, 200));
      return; // 조용히 실패 (반복 호출 방지)
    }
    
    if (!res.ok) {
      console.error('❌ HTTP 오류:', res.status, res.statusText);
      return;
    }
    
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
      let statusMsg = `🟢 영업중`;
      if (data.businessHours) {
        statusMsg += ` (${data.businessHours})`;
      }
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
      } else if (data.businessHours) {
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
    
    // 응답이 JSON인지 확인
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('❌ JSON이 아닌 응답:', text.substring(0, 200));
      alert('서버 응답 오류: JSON이 아닌 응답을 받았습니다.\n서버를 재시작해주세요.');
      return;
    }
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const allHours = data.allBusinessHours || {};
    
    // 요일별 입력 필드 생성
    const container = document.getElementById('business-hours-days-container');
    container.innerHTML = '';
    
    for (let day = 0; day <= 6; day++) {
      const dayHours = allHours[day] || { open: 9.5, close: 21 };
      const openHour = Math.floor(dayHours.open);
      const openMinute = Math.round((dayHours.open - openHour) * 60);
      const closeHour = Math.floor(dayHours.close);
      const closeMinute = Math.round((dayHours.close - closeHour) * 60);
      
      const dayDiv = document.createElement('div');
      dayDiv.style.cssText = 'margin-bottom: 25px; padding: 20px; background: #f5f5f5; border-radius: 8px;';
      dayDiv.innerHTML = `
        <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333;">${dayNames[day]}</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px;">오픈 시간:</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="number" id="open-hour-${day}" min="0" max="23" value="${openHour}" 
                     style="width: 70px; padding: 8px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
              <span style="font-size: 14px;">시</span>
              <input type="number" id="open-minute-${day}" min="0" max="59" step="30" value="${openMinute}" 
                     style="width: 70px; padding: 8px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
              <span style="font-size: 14px;">분</span>
            </div>
          </div>
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px;">마감 시간:</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="number" id="close-hour-${day}" min="0" max="23" value="${closeHour}" 
                     style="width: 70px; padding: 8px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
              <span style="font-size: 14px;">시</span>
              <input type="number" id="close-minute-${day}" min="0" max="59" step="30" value="${closeMinute}" 
                     style="width: 70px; padding: 8px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
              <span style="font-size: 14px;">분</span>
            </div>
          </div>
        </div>
      `;
      container.appendChild(dayDiv);
    }
    
    // 현재 설정 표시
    document.getElementById('current-day-display').textContent = data.currentDayName || '-';
    document.getElementById('current-time-display').textContent = data.currentTime || '-';
    document.getElementById('current-hours-display').textContent = data.businessHours || '-';
    
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
    const hours = {};
    
    // 각 요일의 영업시간 수집
    for (let day = 0; day <= 6; day++) {
      const openHour = parseInt(document.getElementById(`open-hour-${day}`).value);
      const openMinute = parseInt(document.getElementById(`open-minute-${day}`).value);
      const closeHour = parseInt(document.getElementById(`close-hour-${day}`).value);
      const closeMinute = parseInt(document.getElementById(`close-minute-${day}`).value);
      
      if (isNaN(openHour) || isNaN(openMinute) || isNaN(closeHour) || isNaN(closeMinute)) {
        alert(`요일 ${day}의 모든 시간을 입력해주세요.`);
        return;
      }
      
      const open = openHour + openMinute / 60;
      const close = closeHour + closeMinute / 60;
      
      if (open >= close) {
        const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        alert(`${dayNames[day]}의 오픈 시간은 마감 시간보다 빨라야 합니다.`);
        return;
      }
      
      hours[day] = { open, close };
    }
    
    const res = await fetch('/api/business-hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours })
    });
    
    // 응답이 JSON인지 확인
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('❌ JSON이 아닌 응답:', text.substring(0, 200));
      alert('서버 응답 오류: JSON이 아닌 응답을 받았습니다.\n서버를 재시작해주세요.');
      return;
    }
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
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
    
    // 응답이 JSON인지 확인
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('❌ JSON이 아닌 응답:', text.substring(0, 200));
      alert('서버 응답 오류: JSON이 아닌 응답을 받았습니다.\n서버를 재시작해주세요.');
      return;
    }
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
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
    
    // 응답이 JSON인지 확인
    const updateContentType = updateRes.headers.get('content-type');
    if (!updateContentType || !updateContentType.includes('application/json')) {
      const text = await updateRes.text();
      console.error('❌ JSON이 아닌 응답:', text.substring(0, 200));
      alert('서버 응답 오류: JSON이 아닌 응답을 받았습니다.\n서버를 재시작해주세요.');
      return;
    }
    
    if (!updateRes.ok) {
      throw new Error(`HTTP ${updateRes.status}: ${updateRes.statusText}`);
    }
    
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
    
    // 응답이 JSON인지 확인
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('❌ JSON이 아닌 응답:', text.substring(0, 200));
      alert('서버 응답 오류: JSON이 아닌 응답을 받았습니다.\n서버를 재시작해주세요.');
      return;
    }
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const allBreakTime = data.allBreakTime || {};
    
    // 요일별 입력 필드 생성
    const container = document.getElementById('break-time-days-container');
    container.innerHTML = '';
    
    for (let day = 0; day <= 6; day++) {
      const dayBreak = allBreakTime[day];
      let startHour = 14, startMinute = 30, endHour = 15, endMinute = 30;
      
      if (dayBreak && dayBreak.start !== undefined) {
        startHour = Math.floor(dayBreak.start);
        startMinute = Math.round((dayBreak.start - startHour) * 60);
        endHour = Math.floor(dayBreak.end);
        endMinute = Math.round((dayBreak.end - endHour) * 60);
      }
      
      const dayDiv = document.createElement('div');
      dayDiv.style.cssText = 'margin-bottom: 25px; padding: 20px; background: #fff3cd; border-radius: 8px;';
      dayDiv.innerHTML = `
        <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333;">${dayNames[day]}</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px;">시작 시간:</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="number" id="break-start-hour-${day}" min="0" max="23" value="${startHour}" 
                     style="width: 70px; padding: 8px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
              <span style="font-size: 14px;">시</span>
              <input type="number" id="break-start-minute-${day}" min="0" max="59" step="30" value="${startMinute}" 
                     style="width: 70px; padding: 8px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
              <span style="font-size: 14px;">분</span>
            </div>
          </div>
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px;">종료 시간:</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="number" id="break-end-hour-${day}" min="0" max="23" value="${endHour}" 
                     style="width: 70px; padding: 8px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
              <span style="font-size: 14px;">시</span>
              <input type="number" id="break-end-minute-${day}" min="0" max="59" step="30" value="${endMinute}" 
                     style="width: 70px; padding: 8px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
              <span style="font-size: 14px;">분</span>
            </div>
          </div>
        </div>
        <div style="margin-top: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="break-enabled-${day}" ${dayBreak ? 'checked' : ''} 
                   style="width: 18px; height: 18px; cursor: pointer;">
            <span style="font-size: 14px; color: #666;">브레이크타임 사용</span>
          </label>
        </div>
      `;
      container.appendChild(dayDiv);
    }
    
    // 현재 설정 표시
    document.getElementById('current-break-day-display').textContent = data.currentDayName || '-';
    const formatTime = (time) => {
      const h = Math.floor(time);
      const m = Math.round((time - h) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    if (data.breakTime && data.breakTime.start !== undefined) {
      document.getElementById('current-break-time-display').textContent = 
        `${formatTime(data.breakTime.start)} - ${formatTime(data.breakTime.end)}`;
    } else {
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
    const breakTimes = {};
    
    // 각 요일의 브레이크타임 수집
    for (let day = 0; day <= 6; day++) {
      const enabled = document.getElementById(`break-enabled-${day}`).checked;
      
      if (!enabled) {
        // 브레이크타임 해제
        breakTimes[day] = null;
        continue;
      }
      
      const startHour = parseInt(document.getElementById(`break-start-hour-${day}`).value);
      const startMinute = parseInt(document.getElementById(`break-start-minute-${day}`).value);
      const endHour = parseInt(document.getElementById(`break-end-hour-${day}`).value);
      const endMinute = parseInt(document.getElementById(`break-end-minute-${day}`).value);
      
      if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
        const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        alert(`${dayNames[day]}의 모든 시간을 입력해주세요.`);
        return;
      }
      
      const start = startHour + startMinute / 60;
      const end = endHour + endMinute / 60;
      
      if (start >= end) {
        const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        alert(`${dayNames[day]}의 시작 시간은 종료 시간보다 빨라야 합니다.`);
        return;
      }
      
      breakTimes[day] = { start, end };
    }
    
    const res = await fetch('/api/break-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ breakTimes })
    });
    
    // 응답이 JSON인지 확인
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('❌ JSON이 아닌 응답:', text.substring(0, 200));
      alert('서버 응답 오류: JSON이 아닌 응답을 받았습니다.\n서버를 재시작해주세요.');
      return;
    }
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
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

setInterval(updateBusinessStatus, 60000); // 1분마다 영업시간 상태 업데이트

// 프린터 테스트 함수
function testPrinter() {
  // 일반 프린터 테스트 페이지 열기
  const testWindow = window.open('/api/printer/test-general', '_blank', 'width=400,height=600');
  if (!testWindow) {
    alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
  }
}

console.log('🏮 POS 시스템 준비 완료!');

