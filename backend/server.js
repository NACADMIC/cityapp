const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 🔒 SQLite + 비밀번호 암호화 DB
const DB = require('./database');
const db = new DB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// 영업시간 설정 (기본값)
let businessHours = {
  open: 9.5,  // 오전 9시 30분
  close: 21   // 오후 9시
};

// 영업시간을 DB에서 불러오기
function loadBusinessHours() {
  try {
    // DB가 초기화되었는지 확인
    if (db && typeof db.getBusinessHours === 'function') {
      const saved = db.getBusinessHours();
      if (saved && saved.open !== undefined && saved.close !== undefined) {
        businessHours = saved;
        console.log('✅ 영업시간 로드:', businessHours);
        return;
      }
    }
    console.log('⚠️ 영업시간 로드 실패, 기본값 사용:', businessHours);
  } catch (e) {
    console.log('⚠️ 영업시간 로드 오류:', e.message);
    console.log('기본값 사용:', businessHours);
  }
}

// DB 초기화 후 영업시간 로드 (약간의 딜레이)
setTimeout(() => {
  loadBusinessHours();
}, 100);

function isBusinessHours() {
  const now = new Date();
  const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const hour = koreaTime.getHours();
  const minute = koreaTime.getMinutes();
  const currentTime = hour + minute / 60;
  
  return currentTime >= businessHours.open && currentTime < businessHours.close;
}

// Socket.io 연결
io.on('connection', (socket) => {
  console.log('🔌 클라이언트 연결:', socket.id);
  
  // POS 연결 시 accepted 이상인 주문만 복원 (pending은 팝업으로 처리)
  const activeOrders = db.getAllOrders().filter(o => 
    o.status === 'accepted' || 
    o.status === 'preparing' || 
    o.status === 'delivering'
  );
  if (activeOrders.length > 0) {
    socket.emit('restore-orders', activeOrders);
    console.log('📦 진행 중인 주문 복원:', activeOrders.length, '개');
  }
  
  // pending 주문은 new-order로 다시 전송 (팝업 띄우기 위해)
  const pendingOrders = db.getAllOrders().filter(o => o.status === 'pending');
  if (pendingOrders.length > 0) {
    console.log('⏳ Pending 주문 재전송:', pendingOrders.length, '개');
    pendingOrders.forEach(order => {
      setTimeout(() => {
        socket.emit('new-order', {
          orderId: order.orderid,
          customerName: order.customername,
          phone: order.customerphone,
          address: order.address,
          items: JSON.parse(order.items || '[]'),
          totalAmount: order.totalprice,
          paymentMethod: order.paymentmethod || 'cash'
        });
      }, 500); // 약간의 딜레이를 주어 복원 후 팝업 표시
    });
  }
  
  // 라이더 위치 업데이트
  socket.on('rider-location', (data) => {
    const { riderId, lat, lng } = data;
    db.updateRiderLocation(riderId, lat, lng);
    
    // 해당 라이더가 배정된 주문 찾기
    const orders = db.getAllOrders().filter(o => o.riderId == riderId && o.status === 'delivering');
    orders.forEach(order => {
      db.updateOrderRiderLocation(order.orderId, lat, lng);
      // 예상 시간 계산 (간단한 예시)
      const estimatedMinutes = Math.floor(Math.random() * 10) + 5;
      db.updateOrderEstimatedTime(order.orderId, estimatedMinutes);
      io.emit('rider-location-updated', { orderId: order.orderId, lat, lng, estimatedTime: estimatedMinutes });
    });
  });

  // 라이더 상태 변경
  socket.on('rider-status', (data) => {
    const { riderId, status } = data;
    db.updateRiderStatus(riderId, status);
    io.emit('rider-status-changed', { riderId, status });
  });
  
  socket.on('disconnect', () => {
    console.log('❌ 클라이언트 연결 해제:', socket.id);
  });
});

// Root 리다이렉트
app.get('/', (req, res) => {
  res.redirect('/order-new');
});

// API: 영업시간 체크
app.get('/api/business-hours', (req, res) => {
  const isOpen = isBusinessHours();
  const now = new Date();
  const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const hour = koreaTime.getHours();
  const minute = koreaTime.getMinutes();
  
  // 시간 포맷팅
  const formatTime = (time) => {
    const h = Math.floor(time);
    const m = Math.round((time - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  
  res.json({
    isOpen,
    currentTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    businessHours: `${formatTime(businessHours.open)} - ${formatTime(businessHours.close)}`,
    open: businessHours.open,
    close: businessHours.close
  });
});

// API: 영업시간 설정
app.post('/api/business-hours', (req, res) => {
  try {
    const { open, close } = req.body;
    
    if (typeof open !== 'number' || typeof close !== 'number') {
      return res.status(400).json({ success: false, error: '잘못된 시간 형식입니다.' });
    }
    
    if (open < 0 || open >= 24 || close < 0 || close > 24) {
      return res.status(400).json({ success: false, error: '시간은 0-24 사이여야 합니다.' });
    }
    
    businessHours = { open, close };
    db.saveBusinessHours(businessHours);
    
    console.log('✅ 영업시간 업데이트:', businessHours);
    res.json({ success: true, businessHours });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 메뉴 조회
app.get('/api/menu', (req, res) => {
  try {
    const menu = db.getAllMenu();
    res.json({ success: true, menu });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 회원가입
app.post('/api/auth/register', async (req, res) => {
  try {
    const { phone, name, email, address, password } = req.body;
    
    const existing = db.getUserByPhone(phone);
    if (existing) {
      return res.json({ success: false, error: '이미 가입된 전화번호입니다.' });
    }
    
    // 🔒 비밀번호 암호화하여 저장
    const user = await db.createUser(phone, name, email, address, password);
    
    res.json({ 
      success: true, 
      message: '🎉 회원가입 완료! 환영 포인트 10,000P가 지급되었습니다!' 
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 로그인
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    const user = db.getUserByPhone(phone);
    if (!user) {
      return res.json({ success: false, error: '가입되지 않은 전화번호입니다.' });
    }
    
    // 🔒 비밀번호 검증
    const isValid = await db.verifyPassword(password, user.password);
    if (!isValid) {
      return res.json({ success: false, error: '비밀번호가 일치하지 않습니다.' });
    }
    
    // 비밀번호 제외하고 전송 (userId 필드 명시적으로 포함)
    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      success: true, 
      user: {
        userId: user.userId || user.userid || user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        address: user.address,
        points: user.points || 0
      }
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 사용자 정보 조회
app.get('/api/auth/me/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('🔍 사용자 정보 조회 요청:', userId);
    
    const user = db.getUserById(userId);
    if (!user) {
      console.error('❌ 사용자를 찾을 수 없음. 요청한 userId:', userId);
      return res.json({ 
        success: false, 
        error: `사용자를 찾을 수 없습니다. (userId: ${userId})` 
      });
    }
    
    const { password, ...userWithoutPassword } = user;
    console.log('✅ 사용자 정보 반환:', { userId: userWithoutPassword.userId, name: userWithoutPassword.name });
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 아이디(전화번호) 찾기
app.post('/api/auth/find-id', (req, res) => {
  try {
    const { name } = req.body;
    const users = db.getUserByName(name);
    
    if (users && users.length > 0) {
      res.json({ success: true, phone: users[0].phone });
    } else {
      res.json({ success: false, error: '가입된 정보가 없습니다.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 사용자 확인 (비밀번호 찾기)
app.post('/api/auth/verify-user', (req, res) => {
  try {
    const { phone, name } = req.body;
    const user = db.getUserByPhone(phone);
    
    if (user && user.name === name) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: '가입 정보가 일치하지 않습니다.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 비밀번호 재설정
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { phone, newPassword } = req.body;
    
    const success = await db.updatePassword(phone, newPassword);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: '비밀번호 변경 실패' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 포인트 내역
app.get('/api/points/:userId', (req, res) => {
  try {
    const history = db.getPointHistory(req.params.userId);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 전화 인증 코드 발송
app.post('/api/phone/send-code', (req, res) => {
  try {
    const { phone } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    db.createVerification(phone, code);
    
    console.log(`📱 인증번호 발송: ${phone} → ${code}`);
    res.json({ success: true, code });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 전화 인증 확인
app.post('/api/phone/verify-code', (req, res) => {
  try {
    const { phone, code } = req.body;
    const isValid = db.verifyPhone(phone, code);
    
    if (isValid) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: '인증번호가 일치하지 않거나 만료되었습니다.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주문 생성
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, customerName, phone, address, items, totalAmount, usedPoints, paymentMethod, isGuest, phoneVerified } = req.body;
    
    // 포인트 사용 검증
    if (userId && usedPoints > 0) {
      const user = db.getUserById(userId);
      if (!user || user.points < usedPoints) {
        return res.json({ success: false, error: '포인트가 부족합니다.' });
      }
    }
    
    const finalAmount = totalAmount - (usedPoints || 0);
    const earnedPoints = userId && !isGuest ? Math.floor(finalAmount * 0.10) : 0;
    
    const orderId = 'ORD-' + Date.now();
    const orderData = {
      orderId,
      userId: userId || null,
      customerName,
      phone,
      address,
      items: JSON.stringify(items),
      totalAmount: finalAmount,
      usedPoints: usedPoints || 0,
      earnedPoints,
      paymentMethod,
      status: 'pending',
      isGuest: isGuest ? 1 : 0,
      phoneVerified: phoneVerified ? 1 : 0,
      createdAt: new Date().toISOString()
    };
    
    db.createOrder(orderData);
    
    // 포인트 차감
    if (userId && usedPoints > 0) {
      db.addPoints(userId, -usedPoints);
      db.addPointHistory(userId, orderId, -usedPoints, 'use');
    }
    
    // POS에 주문 전송
    io.emit('new-order', {
      orderId,
      customerName,
      phone,
      address,
      items,
      totalAmount: finalAmount,
      paymentMethod
    });
    
    console.log('📦 새 주문:', orderId);
    
    res.json({ 
      success: true, 
      orderId,
      earnedPoints
    });
  } catch (error) {
    console.error('주문 생성 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주문 상태 업데이트
app.post('/api/orders/:orderId/status', (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    db.updateOrderStatus(orderId, status);
    
    // 배달 완료 시 포인트 적립
    if (status === 'completed') {
      const order = db.getOrderById(orderId);
      if (order && order.userId && order.earnedPoints > 0) {
        db.addPoints(order.userId, order.earnedPoints);
        db.addPointHistory(order.userId, orderId, order.earnedPoints, 'earn');
      }
    }
    
    io.emit('order-status-changed', { orderId, status });
    
    console.log('📝 주문 상태 변경:', orderId, '→', status);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주문 조회 (ID)
app.get('/api/orders/:orderId', (req, res) => {
  try {
    const order = db.getOrderById(req.params.orderId);
    if (!order) {
      return res.json({ success: false, error: '주문을 찾을 수 없습니다.' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 사용자 주문 조회
app.get('/api/orders/user/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const allOrders = db.getAllOrders();
    const orders = allOrders.filter(o => o.userId == userId);
    
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 라이더별 주문 조회
app.get('/api/orders/rider/:riderId', (req, res) => {
  try {
    const riderId = req.params.riderId;
    const allOrders = db.getAllOrders();
    const orders = allOrders.filter(o => o.riderId == riderId && (o.status === 'delivering' || o.status === 'preparing'));
    
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 포인트 내역 조회
app.get('/api/points/history/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const history = db.getPointHistory(userId);
    
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 전화번호로 주문 조회
app.get('/api/orders/phone/:phone', (req, res) => {
  try {
    const phone = req.params.phone;
    const allOrders = db.getAllOrders();
    const orders = allOrders.filter(o => o.phone === phone);
    
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 통계 및 분석 API ==========

// API: 실시간 대시보드
app.get('/api/stats/realtime', (req, res) => {
  try {
    const stats = db.getRealTimeStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 일별 매출
app.get('/api/stats/daily', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const sales = db.getDailySales(days);
    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 월별 매출
app.get('/api/stats/monthly', (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const sales = db.getMonthlySales(months);
    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 정산 정보
app.get('/api/stats/settlement', (req, res) => {
  try {
    const startDate = req.query.startDate || new Date(new Date().setDate(1)).toISOString().split('T')[0];
    const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
    const settlement = db.getSettlement(startDate, endDate);
    res.json({ success: true, data: settlement });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 지역별 주문
app.get('/api/stats/regions', (req, res) => {
  try {
    const regions = db.getOrdersByRegion();
    res.json({ success: true, data: regions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 상위 고객
app.get('/api/stats/top-customers', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const customers = db.getTopCustomers(limit);
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 인기 메뉴
app.get('/api/stats/popular-menus', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const menus = db.getPopularMenus(limit);
    res.json({ success: true, data: menus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 시간대별 주문
app.get('/api/stats/time-distribution', (req, res) => {
  try {
    const distribution = db.getTimeDistribution();
    res.json({ success: true, data: distribution });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 리 단위 통계
app.get('/api/stats/ri', (req, res) => {
  try {
    const riStats = db.getOrdersByRi();
    res.json({ success: true, data: riStats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 아파트 단지 단위 통계
app.get('/api/stats/apartments', (req, res) => {
  try {
    const aptStats = db.getOrdersByApartment();
    res.json({ success: true, data: aptStats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 라이더 API ==========

// API: 라이더 회원가입
app.post('/api/riders/register', async (req, res) => {
  try {
    const { phone, name, password } = req.body;
    const existing = db.getRiderByPhone(phone);
    if (existing) {
      return res.json({ success: false, error: '이미 등록된 전화번호입니다.' });
    }
    const rider = await db.createRider(phone, name, password);
    res.json({ success: true, rider: { riderId: rider.riderId, name: rider.name, phone: rider.phone } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 라이더 로그인
app.post('/api/riders/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const rider = db.getRiderByPhone(phone);
    if (!rider) {
      return res.json({ success: false, error: '등록되지 않은 라이더입니다.' });
    }
    const isValid = await db.verifyPassword(password, rider.password);
    if (!isValid) {
      return res.json({ success: false, error: '비밀번호가 일치하지 않습니다.' });
    }
    res.json({ success: true, rider: { riderId: rider.riderId, name: rider.name, phone: rider.phone } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 라이더 목록 조회
app.get('/api/riders', (req, res) => {
  try {
    const riders = db.getAllRiders();
    res.json({ success: true, riders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 라이더에게 배정 가능한 주문 목록
app.get('/api/riders/orders', (req, res) => {
  try {
    const orders = db.getAllOrders().filter(o => 
      o.status === 'preparing' && !o.riderId
    );
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 라이더 배정
app.post('/api/orders/:orderId/assign-rider', (req, res) => {
  try {
    const { orderId } = req.params;
    const { riderId } = req.body;
    db.assignRiderToOrder(orderId, riderId);
    db.updateRiderStatus(riderId, 'delivering');
    io.emit('rider-assigned', { orderId, riderId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 라이더 위치 업데이트
app.post('/api/riders/:riderId/location', (req, res) => {
  try {
    const { riderId } = req.params;
    const { lat, lng } = req.body;
    db.updateRiderLocation(riderId, lat, lng);
    
    // 해당 라이더가 배정된 주문 찾기
    const orders = db.getAllOrders().filter(o => o.riderId == riderId && o.status === 'delivering');
    orders.forEach(order => {
      db.updateOrderRiderLocation(order.orderId, lat, lng);
      // 예상 시간 계산 (간단한 예시: 거리 기반)
      const estimatedMinutes = Math.floor(Math.random() * 10) + 5; // 실제로는 거리 계산 필요
      db.updateOrderEstimatedTime(order.orderId, estimatedMinutes);
      io.emit('rider-location-updated', { orderId: order.orderId, lat, lng, estimatedTime: estimatedMinutes });
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 리뷰 작성
app.post('/api/reviews', (req, res) => {
  try {
    const { orderId, userId, rating, comment } = req.body;
    db.createReview(orderId, userId, rating, comment);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주문별 리뷰 조회
app.get('/api/reviews/order/:orderId', (req, res) => {
  try {
    const reviews = db.getReviewsByOrderId(req.params.orderId);
    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 서버 시작
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏮 시티반점 주문 서버 시작! (SQLite + 암호화)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📌 로컬 주소:');
  console.log(`   http://localhost:${PORT}/order-new`);
  console.log(`   http://127.0.0.1:${PORT}/order-new`);
  console.log('');
  console.log('💾 데이터베이스: SQLite (restaurant.db)');
  console.log('🔒 비밀번호: bcrypt 암호화');
  console.log('');
  console.log('🎯 POS 주소:');
  console.log(`   http://localhost:${PORT}/pos/login.html`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
