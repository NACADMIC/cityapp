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

// 영업시간 설정
const businessHours = {
  open: 9.5,  // 오전 9시 30분
  close: 21   // 오후 9시
};

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
  
  // POS 연결 시 대기 중인 주문 전송
  const pendingOrders = db.getAllOrders().filter(o => o.status === 'pending' || o.status === 'accepted');
  if (pendingOrders.length > 0) {
    socket.emit('restore-orders', pendingOrders);
    console.log('📦 대기 주문 복원:', pendingOrders.length, '개');
  }
  
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
  res.json({
    isOpen,
    currentTime: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    businessHours: `09:30 - 21:00`
  });
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
    
    // 비밀번호 제외하고 전송
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 사용자 정보 조회
app.get('/api/auth/me/:userId', (req, res) => {
  try {
    const user = db.getUserById(req.params.userId);
    if (!user) {
      return res.json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }
    
    const { password, ...userWithoutPassword } = user;
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
