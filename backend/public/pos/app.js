// Check authentication
if (sessionStorage.getItem('pos-authenticated') !== 'true') {
  window.location.href = 'login.html';
}

// Initialize Socket.io
const socket = io();

// Global variables
let orders = [];
let voiceEnabled = true;

// Register as POS client
socket.on('connect', () => {
  console.log('✅ Connected to server');
  socket.emit('register-pos');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
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

// Listen for new orders
socket.on('new-order', (orderData) => {
  console.log('🎉 New order received:', orderData);
  addOrder(orderData);
  playNotification(orderData);
});

// Play notification
function playNotification(orderData) {
  if (!voiceEnabled) {
    console.log('🔇 Voice disabled');
    return;
  }

  console.log('🔊 Playing notification...');
  playVoiceFile(orderData);
}

// Play voice file + TTS details
function playVoiceFile(orderData) {
  const audio = new Audio('/pos/sounds/new-order.mp3');
  
  audio.onerror = () => {
    console.log('⚠️ Audio file not found, using browser TTS');
    speakOrderDetails(orderData);
  };

  audio.onended = () => {
    console.log('✅ Audio finished, speaking details...');
    speakOrderDetails(orderData);
  };

  audio.play().catch(err => {
    console.log('⚠️ Audio play failed:', err);
    speakOrderDetails(orderData);
  });
}

// Speak order details with TTS
function speakOrderDetails(orderData) {
  if (!window.speechSynthesis) {
    console.log('⚠️ Speech synthesis not supported');
    return;
  }

  const itemsText = orderData.items
    .map(item => `${item.name} ${item.quantity}개`)
    .join(', ');

  const addressParts = orderData.address.split(',');
  const shortAddress = addressParts.length > 2 
    ? addressParts.slice(-2).join(',') 
    : orderData.address;

  const text = `고객명 ${orderData.customerName}, 주문 ${itemsText}, 배달지 ${shortAddress}`;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 1.1;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const koreanVoice = voices.find(v => 
    v.lang.includes('ko') && (v.name.includes('Google') || v.name.includes('Microsoft'))
  ) || voices.find(v => v.lang.includes('ko'));

  if (koreanVoice) {
    utterance.voice = koreanVoice;
  }

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
    'pending': `<button class="btn btn-accept" onclick="updateStatus('${orderId}', 'preparing')">✓ 조리 시작</button>`,
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
          <div>💳 ${formatPayment(order.paymentMethod)}</div>
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

// Order actions
function acceptOrder(orderId) {
  updateStatus(orderId, 'preparing');
}

function printOrder(orderId) {
  console.log('🖨 인쇄:', orderId);
  const order = orders.find(o => o.orderId === orderId);
  if (order) {
    window.print();
  }
}

function rejectOrder(orderId) {
  if (confirm(`주문 ${orderId}을(를) 거절하시겠습니까?`)) {
    console.log('❌ 거절:', orderId);
    orders = orders.filter(o => o.orderId !== orderId);
    renderOrders();
    updateStats();
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

// Initial render
renderOrders();
updateStats();

console.log('🏮 POS 시스템 준비 완료!');

