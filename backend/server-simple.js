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
  open: 9.5,  // 오전 9시 30분
  close: 21   // 오후 9시
};

function isBusinessHours() {
  // 한국 시간으로 변환 (UTC+9)
  const now = new Date();
  const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const hour = koreaTime.getHours();
  const minute = koreaTime.getMinutes();
  const currentTime = hour + minute / 60; // 9시 30분 = 9.5
  
  return currentTime >= businessHours.open && currentTime < businessHours.close;
}

app.get('/api/business-hours', (req, res) => {
  const isOpen = isBusinessHours();
  const now = new Date();
  res.json({
    isOpen,
    currentTime: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    businessHours: `09:30 - 21:00`
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
    const { phone, name, email, address, password } = req.body;
    const existing = await db.getUserByPhone(phone);
    if (existing) {
      return res.json({ success: false, error: '이미 가입된 전화번호입니다.' });
    }
    const user = await db.createUser(phone, name, email, address, password);
    res.json({ 
      success: true, 
      message: '🎉 회원가입 완료! 환영 포인트 10,000P가 지급되었습니다!' 
    });
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

// API: 아이디(전화번호) 찾기
app.post('/api/auth/find-id', async (req, res) => {
  try {
    const { name } = req.body;
    const users = await db.getUserByName(name);
    
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
app.post('/api/auth/verify-user', async (req, res) => {
  try {
    const { phone, name } = req.body;
    const user = await db.getUserByPhone(phone);
    
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
    
    const success = db.updatePassword(phone, newPassword);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: '비밀번호 변경 실패' });
    }
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
    const earnedPoints = userId && !isGuest ? Math.floor(finalAmount * 0.10) : 0;

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

// API: 주문 조회 (전화번호로 - 비회원용)
app.get('/api/orders/phone/:phone', async (req, res) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const allOrders = await db.getAllOrders();
    const orders = allOrders.filter(o => 
      (o.customerphone === phone || o.phone === phone)
    ).sort((a, b) => {
      const timeA = a.createdat || a.createdAt || 0;
      const timeB = b.createdat || b.createdAt || 0;
      return timeB - timeA;
    });
    
    if (orders.length === 0) {
      return res.json({ success: false, error: '주문 내역이 없습니다.' });
    }
    
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주문 조회 (회원 ID로)
app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const allOrders = await db.getAllOrders();
    const orders = allOrders.filter(o => 
      o.userid == userId || o.userId == userId
    ).sort((a, b) => {
      const timeA = a.createdat || a.createdAt || 0;
      const timeB = b.createdat || b.createdAt || 0;
      return timeB - timeA;
    });
    
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 테스트 데이터 생성 (Railway용)
async function generateTestData() {
  console.log('🎲 테스트 데이터 생성 시작...\n');
  
  const names = ['김민수', '이영희', '박철수', '정수진', '최동욱', '강미정', '윤지훈', '임소연', '한준호', '오세영'];
  const regions = [
    { name: '공도읍', weight: 50 },
    { name: '미양면', weight: 25 },
    { name: '대덕면', weight: 15 },
    { name: '양성면', weight: 10 }
  ];
  const addresses = {
    '공도읍': ['경기도 안성시 공도읍 만정리 123-45', '경기도 안성시 공도읍 진사리 234-56'],
    '미양면': ['경기도 안성시 미양면 개소리 111-22', '경기도 안성시 미양면 대신리 222-33'],
    '대덕면': ['경기도 안성시 대덕면 모산리 444-55', '경기도 안성시 대덕면 건지리 555-66'],
    '양성면': ['경기도 안성시 양성면 덕봉리 777-88', '경기도 안성시 양성면 동항리 888-99']
  };
  
  function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  function selectRegion() {
    const totalWeight = regions.reduce((sum, r) => sum + r.weight, 0);
    let rand = random(1, totalWeight);
    for (const region of regions) {
      rand -= region.weight;
      if (rand <= 0) return region.name;
    }
    return regions[0].name;
  }
  
  // 회원 10명 생성
  console.log('👥 회원 생성 중...');
  const testUserIds = [];
  for (let i = 0; i < 10; i++) {
    const phone = `010-9000-${String(i + 1).padStart(4, '0')}`;
    const name = names[i];
    const email = `test${i + 1}@test.com`;
    const address = addresses[selectRegion()][random(0, addresses[selectRegion()].length - 1)];
    const password = '1234';
    const user = await db.createUser(phone, name, email, address, password);
    testUserIds.push(user.userid);
    console.log(`✅ ${name} (${phone})`);
  }
  
  // 주문 생성 (최근 60일)
  console.log('\n📦 주문 생성 중...');
  
  // 메뉴 데이터 안전하게 가져오기
  let menus;
  try {
    menus = db.getAllMenu();
  } catch (error) {
    console.error('❌ 메뉴 데이터 가져오기 실패:', error);
    return;
  }
  
  if (!menus || !Array.isArray(menus) || menus.length === 0) {
    console.error('❌ 메뉴 데이터가 없습니다!', typeof menus, menus);
    return;
  }
  
  // 유효한 메뉴만 필터링
  const validMenus = menus.filter(m => m && m.id && m.name && m.price);
  if (validMenus.length === 0) {
    console.error('❌ 유효한 메뉴가 없습니다!');
    return;
  }
  
  console.log(`✅ 메뉴 ${validMenus.length}개 확인됨 (전체 ${menus.length}개 중)`);
  
  let totalOrders = 0;
  
  for (let day = 0; day < 60; day++) {
    const ordersPerDay = random(3, 8);
    
    for (let i = 0; i < ordersPerDay; i++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      date.setHours(random(11, 20), random(0, 59), random(0, 59));
      
      const region = selectRegion();
      const address = addresses[region][random(0, addresses[region].length - 1)];
      const customerName = names[random(0, names.length - 1)];
      const phone = `010-${random(1000, 9999)}-${random(1000, 9999)}`;
      const userId = random(0, 100) < 70 && testUserIds.length > 0 ? testUserIds[random(0, testUserIds.length - 1)] : null;
      
      // 랜덤 메뉴 선택 (유효한 메뉴만 사용)
      const itemCount = random(1, 4);
      const items = [];
      for (let j = 0; j < itemCount; j++) {
        const menu = validMenus[random(0, validMenus.length - 1)];
        if (menu && menu.id && menu.name && menu.price) {
          items.push({
            id: menu.id,
            name: menu.name,
            price: menu.price,
            quantity: random(1, 3)
          });
        }
      }
      
      if (items.length === 0) {
        continue; // 메뉴가 없으면 스킵
      }
      
      const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const usedPoints = userId && random(0, 100) < 30 ? random(0, Math.min(3000, totalAmount)) : 0;
      const finalAmount = totalAmount - usedPoints;
      const earnedPoints = userId ? Math.floor(finalAmount * 0.10) : 0;
      
      const orderData = {
        orderId: 'TEST-' + Date.now() + '-' + random(1000, 9999),
        userId: userId,
        customerName,
        phone,
        address,
        items,
        totalAmount: finalAmount,
        usedPoints,
        earnedPoints,
        paymentMethod: random(0, 100) < 60 ? 'card' : 'cash',
        status: 'completed',
        createdAt: date.getTime()
      };
      
      db.createOrder(orderData);
      
      if (userId && usedPoints > 0) {
        db.addPoints(userId, -usedPoints);
      }
      if (userId && earnedPoints > 0) {
        db.addPoints(userId, earnedPoints);
      }
      
      totalOrders++;
    }
  }
  
  console.log(`\n✅ 완료! 총 ${totalOrders}건의 주문 생성됨\n`);
}

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
  
  // Railway 환경에서만 테스트 데이터 생성 (비동기로 처리하여 서버 시작을 막지 않음)
  if (process.env.RAILWAY_ENVIRONMENT || process.env.PORT) {
    // 서버 시작 후 백그라운드에서 데이터 생성
    setTimeout(() => {
      generateTestData().catch(error => {
        console.error('❌ 테스트 데이터 생성 오류:', error);
        console.log('⚠️ 테스트 데이터 없이 계속 진행합니다...\n');
      });
    }, 1000); // 1초 후 실행
  }
});

