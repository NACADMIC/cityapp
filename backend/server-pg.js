const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const Database = require('./database-pg');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const db = new Database();

// Railway PostgreSQL 연결 확인
if (process.env.DATABASE_URL) {
  console.log('✅ Railway PostgreSQL 연결됨');
} else {
  console.log('⚠️ DATABASE_URL 없음 - Railway에서 PostgreSQL 추가 필요!');
}

let posClients = [];

// 영업시간 체크 미들웨어
const businessHours = {
  open: 11,  // 오전 11시
  close: 23  // 밤 11시
};

function isBusinessHours() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= businessHours.open && hour < businessHours.close;
}

// 영업시간 체크 API
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

  socket.on('register-pos', () => {
    posClients.push(socket.id);
    console.log('💻 POS 등록:', socket.id);
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
    
    res.json({ success: true, code }); // 테스트용
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
      userId,
      customerName,
      phone,
      address,
      items,
      totalAmount,
      usedPoints = 0,
      isGuest = false,
      phoneVerified = false
    } = req.body;

    const orderId = 'ORD-' + Date.now();
    
    // 포인트 검증
    if (userId && usedPoints > 0) {
      const user = await db.getUserById(userId);
      if (!user || user.points < usedPoints) {
        return res.json({ success: false, error: '포인트가 부족합니다.' });
      }
    }

    const finalAmount = totalAmount - usedPoints;
    const earnedPoints = userId && !isGuest ? Math.floor(finalAmount * 0.07) : 0;

    // 주문 저장
    await db.createOrder({
      orderId,
      userId,
      customerName,
      customerPhone: phone,
      address,
      items,
      totalPrice: finalAmount,
      usedPoints,
      earnedPoints,
      isGuest,
      phoneVerified
    });

    // 포인트 처리
    if (userId) {
      if (usedPoints > 0) {
        await db.addPoints(userId, -usedPoints, 'use', `주문 사용: ${orderId}`);
      }
      if (earnedPoints > 0) {
        await db.addPoints(userId, earnedPoints, 'earn', `주문 적립: ${orderId}`);
      }
    }

    // POS 전송
    const orderData = {
      orderId,
      customerName,
      phone,
      address,
      items,
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
    
    // POS에 상태 변경 알림
    io.emit('order-status-changed', { orderId, status });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주문 조회 (주문번호로)
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
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
  }

  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🏮 시티반점 서버 실행 중');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('  📱 주문 페이지:');
  console.log(`  http://${localIP}:${PORT}/order-new`);
  console.log('');
  console.log('  💻 POS 페이지:');
  console.log(`  http://localhost:${PORT}/pos/login.html`);
  console.log('  비밀번호: 1234');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n');
});

