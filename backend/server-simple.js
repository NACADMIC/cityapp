const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const Database = require('./database-simple');
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 기본 경로 리다이렉트
app.get('/', (req, res) => {
  res.redirect('/order-new');
});

const db = new Database();

console.log('✅ 메모리 DB 사용 (Railway 최적화)');

let posClients = [];

// 영업시간 체크
const businessHours = {
  open: 11,
  close: 23
};

function isBusinessHours() {
  // 한국 시간으로 변환 (UTC+9)
  const now = new Date();
  const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const hour = koreaTime.getHours();
  return hour >= businessHours.open && hour < businessHours.close;
}

app.get('/api/business-hours', (req, res) => {
  const isOpen = isBusinessHours();
  const now = new Date();
  res.json({
    isOpen,
    currentTime: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    businessHours: `${businessHours.open}:00 - ${businessHours.close}:00`
  });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('🔌 연결:', socket.id);
  socket.on('register-pos', async () => {
    posClients.push(socket.id);
    console.log('💻 POS 등록:', socket.id);
    
    // POS 연결 시 최근 미처리 주문 전송 (최근 10개)
    try {
      const recentOrders = await db.getAllOrders();
      const pendingOrders = recentOrders
        .filter(o => o.status === 'pending' || o.status === 'accepted')
        .slice(0, 10);
      
      if (pendingOrders.length > 0) {
        console.log(`📦 미처리 주문 ${pendingOrders.length}개 전송`);
        socket.emit('restore-orders', pendingOrders);
      }
    } catch (err) {
      console.error('주문 복원 오류:', err);
    }
  });
  socket.on('disconnect', () => {
    posClients = posClients.filter(id => id !== socket.id);
    console.log('❌ 연결 종료:', socket.id);
  });
});

// API: 메뉴
app.get('/api/menu', async (req, res) => {
  try {
    const menu = await db.getAllMenu();
    res.json({ success: true, menu });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 회원가입
app.post('/api/auth/register', async (req, res) => {
  try {
    const { phone, name, password } = req.body;
    const existing = await db.getUserByPhone(phone);
    if (existing) {
      return res.json({ success: false, error: '이미 가입된 전화번호입니다.' });
    }
    const user = await db.createUser(phone, name, password);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 로그인
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await db.getUserByPhone(phone);
    if (!user || user.password !== password) {
      return res.json({ success: false, error: '전화번호 또는 비밀번호가 일치하지 않습니다.' });
    }
    res.json({
      success: true,
      user: {
        userId: user.userid,
        name: user.name,
        phone: user.phone,
        points: user.points
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 회원 정보
app.get('/api/auth/me/:userId', async (req, res) => {
  try {
    const user = await db.getUserById(req.params.userId);
    if (!user) {
      return res.json({ success: false, error: '회원을 찾을 수 없습니다.' });
    }
    res.json({
      success: true,
      user: {
        userId: user.userid,
        name: user.name,
        phone: user.phone,
        points: user.points
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 전화 인증 발송
app.post('/api/phone/send-code', async (req, res) => {
  try {
    const { phone } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await db.createVerification(phone, code);
    res.json({ success: true, code });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 전화 인증 확인
app.post('/api/phone/verify-code', async (req, res) => {
  try {
    const { phone, code } = req.body;
    const isValid = await db.verifyPhone(phone, code);
    if (isValid) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: '인증번호가 일치하지 않거나 만료되었습니다.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주문
app.post('/api/orders', async (req, res) => {
  try {
    const {
      userId, customerName, phone, address, items,
      totalAmount, usedPoints = 0, isGuest = false, phoneVerified = false
    } = req.body;

    const orderId = 'ORD-' + Date.now();
    
    if (userId && usedPoints > 0) {
      const user = await db.getUserById(userId);
      if (!user || user.points < usedPoints) {
        return res.json({ success: false, error: '포인트가 부족합니다.' });
      }
    }

    const finalAmount = totalAmount - usedPoints;
    const earnedPoints = userId && !isGuest ? Math.floor(finalAmount * 0.07) : 0;

    await db.createOrder({
      orderid: orderId,
      userId,
      customername: customerName,
      customerphone: phone,
      address,
      items,
      totalprice: finalAmount,
      usedpoints: usedPoints,
      earnedpoints: earnedPoints,
      isguest: isGuest,
      phoneverified: phoneVerified,
      status: 'pending'
    });

    if (userId) {
      if (usedPoints > 0) {
        await db.addPoints(userId, -usedPoints, 'use', `주문 사용: ${orderId}`);
      }
      if (earnedPoints > 0) {
        await db.addPoints(userId, earnedPoints, 'earn', `주문 적립: ${orderId}`);
      }
    }

    const orderData = {
      orderId, customerName, phone, address, items,
      totalAmount: finalAmount,
      createdAt: new Date().toISOString()
    };

    console.log('📢 POS 전송:', posClients.length, '개');
    posClients.forEach(clientId => {
      io.to(clientId).emit('new-order', orderData);
    });
    io.emit('new-order', orderData);

    res.json({ success: true, orderId, earnedPoints });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주문 목록
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await db.getAllOrders();
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주문 상태 업데이트
app.post('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    await db.updateOrderStatus(orderId, status);
    io.emit('order-status-changed', { orderId, status });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주문 조회
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.orderId);
    if (!order) {
      return res.json({ success: false, error: '주문을 찾을 수 없습니다.' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 포인트 내역
app.get('/api/points/:userId', async (req, res) => {
  try {
    const history = await db.getPointHistory(req.params.userId);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 서버 시작
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🏮 시티반점 서버 실행 중');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PORT:', PORT);
  console.log('  환경:', process.env.RAILWAY_ENVIRONMENT || '로컬');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n');
});

