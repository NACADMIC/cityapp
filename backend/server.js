const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 🔒 데이터베이스 선택: PostgreSQL (Railway) 또는 SQLite (로컬)
// DATABASE_URL이 있으면 PostgreSQL, 없으면 SQLite 사용
let DB, db;

if (process.env.DATABASE_URL) {
  // Railway PostgreSQL 사용
  console.log('✅ PostgreSQL 데이터베이스 사용 (Railway)');
  DB = require('./database-pg-complete');
  db = new DB();
} else {
  // 로컬 SQLite 사용
  console.log('✅ SQLite 데이터베이스 사용 (로컬)');
  DB = require('./database');
  db = new DB();
}

// 프린터 모듈
const printer = require('./printer');

// PG 결제 모듈
const payment = require('./payment');

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

// 클라이언트 설정 파일 제공
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    window.APP_CONFIG = {
      IMP_KEY: '${process.env.IMP_KEY || ''}',
      API_URL: '${req.protocol}://${req.get('host')}'
    };
  `);
});

const PORT = process.env.PORT || 3000;

// 프린터 초기화
printer.initPrinter();

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
    
    // 사용자 중복 체크
    let existing;
    if (process.env.DATABASE_URL) {
      existing = await db.getUserByPhone(phone);
    } else {
      existing = db.getUserByPhone(phone);
    }
    
    if (existing) {
      return res.json({ success: false, error: '이미 가입된 전화번호입니다.' });
    }
    
    // 🔒 비밀번호 암호화하여 저장 및 쿠폰 발급
    const user = await db.createUser(phone, name, email, address, password);
    
    // 쿠폰 발급 확인
    let couponCode = null;
    try {
      if (process.env.DATABASE_URL) {
        // PostgreSQL
        const couponResult = await db.query('SELECT code FROM coupons WHERE code = $1', [`WELCOME${user.userId}`]);
        if (couponResult.rows.length > 0) {
          couponCode = couponResult.rows[0].code;
        }
      } else {
        // SQLite
        const coupon = db.db.prepare('SELECT code FROM coupons WHERE code = ?').get(`WELCOME${user.userId}`);
        if (coupon) {
          couponCode = coupon.code;
        }
      }
    } catch (err) {
      console.error('쿠폰 확인 오류:', err);
    }
    
    console.log(`✅ 회원가입 완료: ${name} (${phone}) - UserId: ${user.userId} - 쿠폰: ${couponCode || '발급 확인 필요'}`);
    
    res.json({ 
      success: true, 
      message: '🎉 회원가입 완료! 신규 회원 가입 쿠폰 10,000원이 지급되었습니다! (25,000원 이상 주문 시 사용 가능)',
      userId: user.userId,
      couponCode: couponCode
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

// API: 모든 회원 목록 조회 (POS용)
app.get('/api/users', async (req, res) => {
  try {
    let users;
    if (process.env.DATABASE_URL) {
      // PostgreSQL
      const result = await db.query('SELECT "userId", phone, name, email, address, points, "createdAt" FROM users ORDER BY "createdAt" DESC');
      users = result.rows.map(user => ({
        userId: user.userId,
        phone: user.phone,
        name: user.name,
        email: user.email || '',
        address: user.address || '',
        points: user.points || 0,
        createdAt: user.createdAt
      }));
    } else {
      // SQLite
      const allUsers = db.db.prepare('SELECT userId, phone, name, email, address, points, createdAt FROM users ORDER BY createdAt DESC').all();
      users = allUsers.map(user => ({
        userId: user.userId,
        phone: user.phone,
        name: user.name,
        email: user.email || '',
        address: user.address || '',
        points: user.points || 0,
        createdAt: user.createdAt
      }));
    }
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 모든 주문 내역 조회 (POS용)
app.get('/api/orders', async (req, res) => {
  try {
    let orders;
    if (process.env.DATABASE_URL) {
      // PostgreSQL
      const result = await db.query('SELECT * FROM orders ORDER BY "createdAt" DESC LIMIT 1000');
      orders = result.rows.map(order => ({
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      }));
    } else {
      // SQLite
      orders = db.getAllOrders();
    }
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 모든 포인트 내역 조회 (POS용)
app.get('/api/points/history/all', async (req, res) => {
  try {
    let history;
    if (process.env.DATABASE_URL) {
      // PostgreSQL
      const result = await db.query(`
        SELECT ph.*, u.name as "userName", u.phone 
        FROM point_history ph
        LEFT JOIN users u ON ph."userId" = u."userId"
        ORDER BY ph."createdAt" DESC
        LIMIT 1000
      `);
      history = result.rows;
    } else {
      // SQLite
      history = db.db.prepare(`
        SELECT ph.*, u.name as userName, u.phone 
        FROM point_history ph
        LEFT JOIN users u ON ph.userId = u.userId
        ORDER BY ph.createdAt DESC
        LIMIT 1000
      `).all();
    }
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 모든 쿠폰 사용 내역 조회 (POS용)
app.get('/api/coupons/usage/all', async (req, res) => {
  try {
    let usage;
    if (process.env.DATABASE_URL) {
      // PostgreSQL
      const result = await db.query(`
        SELECT 
          cu.*,
          c.code,
          c.name as "couponName",
          c."discountType",
          c."discountValue",
          u.name as "userName",
          u.phone
        FROM coupon_usage cu
        LEFT JOIN coupons c ON cu."couponId" = c.id
        LEFT JOIN users u ON cu."userId" = u."userId"
        ORDER BY cu."usedAt" DESC
        LIMIT 1000
      `);
      usage = result.rows;
    } else {
      // SQLite
      usage = db.db.prepare(`
        SELECT 
          cu.*,
          c.code,
          c.name as couponName,
          c.discountType,
          c.discountValue,
          u.name as userName,
          u.phone
        FROM coupon_usage cu
        LEFT JOIN coupons c ON cu.couponId = c.id
        LEFT JOIN users u ON cu.userId = u.userId
        ORDER BY cu.usedAt DESC
        LIMIT 1000
      `).all();
    }
    res.json({ success: true, usage });
  } catch (error) {
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

// API: 쿠폰 조회 (코드로)
app.post('/api/coupons/validate', (req, res) => {
  try {
    const { code, userId, totalAmount } = req.body;
    
    if (!code) {
      return res.json({ success: false, error: '쿠폰 코드를 입력해주세요.' });
    }
    
    const coupon = db.getCouponByCode(code.toUpperCase());
    
    if (!coupon) {
      return res.json({ success: false, error: '유효하지 않은 쿠폰 코드입니다.' });
    }
    
    // 유효기간 체크
    const now = new Date();
    if (new Date(coupon.validFrom) > now || new Date(coupon.validTo) < now) {
      return res.json({ success: false, error: '쿠폰 유효기간이 만료되었습니다.' });
    }
    
    // 활성화 상태 체크
    if (!coupon.isActive) {
      return res.json({ success: false, error: '사용할 수 없는 쿠폰입니다.' });
    }
    
    // 최소 주문 금액 체크
    if (totalAmount && coupon.minAmount && totalAmount < coupon.minAmount) {
      return res.json({ 
        success: false, 
        error: `이 쿠폰은 최소 주문 금액 ${coupon.minAmount.toLocaleString()}원 이상일 때 사용 가능합니다.` 
      });
    }
    
    // 할인 금액 계산
    let discountAmount = 0;
    if (coupon.discountType === 'fixed') {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === 'percent') {
      discountAmount = Math.floor(totalAmount * (coupon.discountValue / 100));
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    }
    
    res.json({ 
      success: true, 
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minAmount: coupon.minAmount,
        discountAmount: discountAmount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 사용자 쿠폰 조회
app.get('/api/coupons/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    let coupons;
    if (process.env.DATABASE_URL) {
      // PostgreSQL
      coupons = await db.getUserCoupons(userId);
    } else {
      // SQLite
      coupons = db.getUserCoupons(userId);
    }
    res.json({ success: true, coupons });
  } catch (error) {
    console.error('쿠폰 조회 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주문 생성
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, customerName, phone, address, items, totalAmount, usedPoints, paymentMethod, isGuest, phoneVerified, couponCode, couponDiscount, orderType, deliveryFee } = req.body;
    
    // 포인트 사용 검증
    if (userId && usedPoints > 0) {
      const user = db.getUserById(userId);
      if (!user || user.points < usedPoints) {
        return res.json({ success: false, error: '포인트가 부족합니다.' });
      }
    }
    
    // 쿠폰 검증 및 사용 처리
    let couponId = null;
    if (couponCode && userId) {
      const coupon = db.getCouponByCode(couponCode.toUpperCase());
      if (coupon) {
        // 최소 주문 금액 체크
        if (coupon.minAmount && totalAmount < coupon.minAmount) {
          return res.json({ 
            success: false, 
            error: `이 쿠폰은 최소 주문 금액 ${coupon.minAmount.toLocaleString()}원 이상일 때 사용 가능합니다.` 
          });
        }
        // 쿠폰 사용 처리
        db.useCoupon(coupon.id, userId, null); // orderId는 나중에 업데이트
        couponId = coupon.id;
      }
    }
    
    // 포장 주문은 배달료 0원
    const finalDeliveryFee = (orderType === 'takeout') ? 0 : (deliveryFee || 0);
    const finalAmount = totalAmount - (usedPoints || 0) - (couponDiscount || 0) + finalDeliveryFee;
    const earnedPoints = userId && !isGuest ? Math.floor((totalAmount - (usedPoints || 0) - (couponDiscount || 0)) * 0.10) : 0;
    
    // 주문번호를 1번부터 순차적으로 생성
    const orderNumber = db.getNextOrderNumber();
    const orderId = orderNumber.toString();
    const orderData = {
      orderId,
      userId: userId || null,
      customerName,
      phone,
      address: orderType === 'takeout' ? '포장 주문' : address,
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
    
    // 쿠폰 사용 내역 업데이트 (orderId 추가)
    if (couponId && userId) {
      db.useCoupon(couponId, userId, orderId);
    }
    
    // 주문서 프린터 출력
    const orderForPrint = {
      orderId,
      customerName,
      phone,
      address: orderType === 'takeout' ? '포장 주문' : address,
      items,
      totalAmount: finalAmount,
      usedPoints: usedPoints || 0,
      couponDiscount: couponDiscount || 0,
      deliveryFee: finalDeliveryFee,
      finalAmount: finalAmount,
      paymentMethod,
      orderType: orderType || 'delivery',
      createdAt: orderData.createdAt
    };
    printer.printOrder(orderForPrint);
    
    // POS에 주문 전송
    io.emit('new-order', {
      orderId,
      customerName,
      phone,
      address: orderType === 'takeout' ? '포장 주문' : address,
      items,
      totalAmount: finalAmount,
      paymentMethod,
      orderType: orderType || 'delivery'
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
// 주문 상태 변경 (수락, 조리중, 배달중 등)
app.post('/api/orders/:orderId/status', (req, res) => {
  try {
    const { orderId } = req.params;
    let { status } = req.body;
    
    const order = db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: '주문을 찾을 수 없습니다.' });
    }
    
    // 현금 주문이고 배달 완료 상태로 변경 시 자동으로 완료 상태로 변경
    const paymentMethod = order.paymentMethod || order.paymentmethod || 'cash';
    const isCashOrder = paymentMethod === 'cash' || paymentMethod === '만나서현금' || paymentMethod === '만나서카드';
    
    if (status === 'delivering' && isCashOrder) {
      // 현금 주문은 배달 완료 시 자동으로 완료 상태로 변경
      status = 'completed';
      console.log('💰 현금 주문 - 배달 완료 시 자동 완료 처리:', orderId);
    }
    
    db.updateOrderStatus(orderId, status);
    
    // 주문 수락 시 프린터에서 자동 인쇄
    if (status === 'accepted') {
      if (order) {
        // 프린터 출력용 주문 데이터 준비
        const orderForPrint = {
          orderId: order.orderId || order.orderid,
          customerName: order.customerName || order.customername,
          phone: order.phone || order.customerphone,
          address: order.address,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
          totalAmount: order.totalAmount || order.totalprice,
          usedPoints: order.usedPoints || order.usedpoints || 0,
          couponDiscount: order.couponDiscount || order.coupondiscount || 0,
          deliveryFee: order.deliveryFee || order.deliveryfee || 0,
          finalAmount: order.finalAmount || order.finalamount || (order.totalAmount || order.totalprice),
          paymentMethod: paymentMethod,
          orderType: order.orderType || order.ordertype || 'delivery',
          createdAt: order.createdAt || order.createdat
        };
        
        // 프린터 출력
        printer.printOrder(orderForPrint);
        console.log('🖨️ 주문 수락 - 프린터 출력:', orderId);
      }
    }
    
    // 배달 완료 시 포인트 적립
    if (status === 'completed') {
      if (order && order.userId) {
        const earnedPoints = order.earnedPoints || order.earnedpoints || 0;
        if (earnedPoints > 0) {
          db.addPoints(order.userId, earnedPoints);
          db.addPointHistory(order.userId, orderId, earnedPoints, 'earn');
          console.log('💰 포인트 적립:', order.userId, earnedPoints);
        }
      }
    }
    
    // 주문 취소 시 포인트/쿠폰 복구
    if (status === 'cancelled') {
      if (order && order.userId) {
        // 사용한 포인트 복구
        const usedPoints = order.usedPoints || order.usedpoints || 0;
        if (usedPoints > 0) {
          db.addPoints(order.userId, usedPoints);
          db.addPointHistory(order.userId, orderId, usedPoints, 'refund');
        }
        // 쿠폰 복구는 별도 처리 필요
      }
    }
    
    io.emit('order-status-changed', { orderId, status });
    
    console.log('📝 주문 상태 변경:', orderId, '→', status, `(결제: ${paymentMethod})`);
    res.json({ success: true, status });
  } catch (error) {
    console.error('❌ 주문 상태 변경 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주문 취소 요청
app.post('/api/orders/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    
    const order = db.getOrderById(orderId);
    if (!order) {
      return res.json({ success: false, error: '주문을 찾을 수 없습니다.' });
    }
    
    // 이미 완료되거나 취소된 주문은 취소 불가
    if (order.status === 'completed' || order.status === 'cancelled') {
      return res.json({ success: false, error: '이미 완료되거나 취소된 주문입니다.' });
    }
    
    // 결제 취소 (카드 결제인 경우)
    if (order.paymentMethod && order.paymentMethod !== 'cash' && order.impUid) {
      const cancelResult = await payment.cancelPayment(order.impUid, reason || '주문 취소');
      if (!cancelResult.success) {
        console.error('결제 취소 실패:', cancelResult.error);
        // 결제 취소 실패해도 주문 취소는 진행
      }
    }
    
    // 주문 취소 처리
    db.updateOrderStatus(orderId, 'cancelled');
    
    // 포인트 복구
    if (order.userId && order.usedPoints > 0) {
      db.addPoints(order.userId, order.usedPoints);
      db.addPointHistory(order.userId, orderId, order.usedPoints, 'refund');
    }
    
    io.emit('order-status-changed', { orderId, status: 'cancelled' });
    
    console.log('❌ 주문 취소:', orderId, reason || '');
    res.json({ success: true, message: '주문이 취소되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 결제 검증
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { impUid, merchantUid } = req.body;
    
    const result = await payment.verifyPayment(impUid, merchantUid);
    
    if (result.success) {
      // 주문 정보 업데이트 (impUid 저장)
      const order = db.getOrderById(merchantUid);
      if (order) {
        // impUid를 주문에 저장 (필요시 orders 테이블에 impUid 컬럼 추가)
        console.log('✅ 결제 검증 완료:', impUid, merchantUid);
      }
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 프린터 테스트
app.post('/api/printer/test', (req, res) => {
  try {
    const result = printer.printTest();
    res.json({ success: result, message: result ? '프린터 테스트 완료' : '프린터 연결 실패' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 일반 프린터 테스트 (브라우저 인쇄)
app.get('/api/printer/test-general', (req, res) => {
  try {
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>프린터 테스트 - 시티반점</title>
        <style>
          @media print {
            @page { margin: 10mm; size: 80mm auto; }
            body { margin: 0; padding: 0; }
          }
          body {
            font-family: 'Courier New', monospace;
            padding: 20px;
            text-align: center;
            width: 80mm;
            margin: 0 auto;
          }
          .test-header {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
          }
          .test-info {
            font-size: 12px;
            line-height: 1.6;
            margin: 15px 0;
            text-align: left;
          }
          .test-footer {
            margin-top: 20px;
            font-size: 10px;
            color: #666;
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="test-header">프린터 테스트</div>
        <div class="test-info">
          <p><strong>시티반점 주문 시스템</strong></p>
          <p>테스트 일시: ${new Date().toLocaleString('ko-KR')}</p>
          <p>━━━━━━━━━━━━━━━━━━━━</p>
          <p>이 전표가 정상적으로 출력되면</p>
          <p>프린터가 정상 작동합니다.</p>
          <p>━━━━━━━━━━━━━━━━━━━━</p>
        </div>
        <div class="test-footer">
          <p>테스트 완료</p>
        </div>
        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
    res.send(testHtml);
  } catch (error) {
    res.status(500).send('오류: ' + error.message);
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

// API: 즐겨찾기 메뉴 추가
app.post('/api/favorites', (req, res) => {
  try {
    const { userId, menuId } = req.body;
    db.addFavoriteMenu(userId, menuId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 즐겨찾기 메뉴 제거
app.delete('/api/favorites/:userId/:menuId', (req, res) => {
  try {
    const { userId, menuId } = req.params;
    db.removeFavoriteMenu(userId, menuId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 즐겨찾기 메뉴 목록
app.get('/api/favorites/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const favorites = db.getFavoriteMenus(userId);
    res.json({ success: true, favorites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주소록 저장
app.post('/api/addresses', (req, res) => {
  try {
    const { userId, address, addressName, isDefault } = req.body;
    db.saveAddress(userId, address, addressName, isDefault);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주소록 조회
app.get('/api/addresses/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const addresses = db.getSavedAddresses(userId);
    res.json({ success: true, addresses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 주소 삭제
app.delete('/api/addresses/:userId/:addressId', (req, res) => {
  try {
    const { userId, addressId } = req.params;
    db.deleteAddress(userId, addressId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 기본 주소 설정
app.post('/api/addresses/:userId/:addressId/set-default', (req, res) => {
  try {
    const { userId, addressId } = req.params;
    db.setDefaultAddress(userId, addressId);
    res.json({ success: true });
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
