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
  
  // 데이터베이스 초기화 후 시드 데이터 확인 (비동기)
  setTimeout(async () => {
    try {
      const seedData = require('./seed-data');
      await seedData();
    } catch (err) {
      console.error('⚠️ 시드 데이터 확인 오류:', err.message);
    }
  }, 2000);
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

// 카카오 알림톡 모듈
let sms;
try {
  sms = require('./sms');
} catch (error) {
  console.log('⚠️ 알림톡 모듈 로드 실패:', error.message);
  sms = null;
}

// HTTP 요청용 (원격 프린터 서버 호출)
const axios = require('axios');

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

// 영업시간을 DB에서 불러오기 (요일별 포함)
async function loadBusinessHours() {
  try {
    // DB가 초기화되었는지 확인
    if (db && typeof db.getBusinessHours === 'function') {
      const saved = process.env.DATABASE_URL ? await db.getBusinessHours() : db.getBusinessHours();
      if (saved && saved.open !== undefined && saved.close !== undefined) {
        businessHours = saved;
        console.log('✅ 영업시간 로드:', businessHours);
      }
    }
    
    // 요일별 영업시간도 로드
    if (db && typeof db.getBusinessHoursByDay === 'function') {
      const allHours = process.env.DATABASE_URL ? await db.getBusinessHoursByDay() : db.getBusinessHoursByDay();
      if (Object.keys(allHours).length > 0) {
        console.log('✅ 요일별 영업시간 로드:', allHours);
      }
    }
    
    // 임시휴업 상태 로드
    if (db && typeof db.getTemporaryClosed === 'function') {
      const closed = process.env.DATABASE_URL ? await db.getTemporaryClosed() : db.getTemporaryClosed();
      console.log('✅ 임시휴업 상태 로드:', closed);
    }
  } catch (e) {
    console.log('⚠️ 영업시간 로드 실패, 기본값 사용:', businessHours);
    console.log('⚠️ 영업시간 로드 오류:', e.message);
  }
}

// DB 초기화 후 영업시간 로드 (약간의 딜레이)
setTimeout(async () => {
  await loadBusinessHours();
}, 100);

async function isBusinessHours() {
  const now = new Date();
  const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const dayOfWeek = koreaTime.getDay(); // 0=일요일, 6=토요일
  const hour = koreaTime.getHours();
  const minute = koreaTime.getMinutes();
  const currentTime = hour + minute / 60;
  
  try {
    // 임시휴업 확인
    let temporaryClosed = false;
    if (db && typeof db.getTemporaryClosed === 'function') {
      temporaryClosed = process.env.DATABASE_URL ? await db.getTemporaryClosed() : db.getTemporaryClosed();
    }
    if (temporaryClosed) {
      return false;
    }
    
    // 요일별 휴무일 확인
    let closedDays = [];
    if (db && typeof db.getClosedDays === 'function') {
      closedDays = process.env.DATABASE_URL ? await db.getClosedDays() : db.getClosedDays();
    }
    if (closedDays.includes(dayOfWeek)) {
      return false; // 오늘은 휴무일
    }
    
    // 요일별 영업시간 확인
    let allBusinessHours = {};
    if (db && typeof db.getBusinessHoursByDay === 'function') {
      allBusinessHours = process.env.DATABASE_URL ? await db.getBusinessHoursByDay() : db.getBusinessHoursByDay();
    }
    
    // 요일별 영업시간이 있으면 사용
    if (allBusinessHours && Object.keys(allBusinessHours).length > 0 && allBusinessHours[dayOfWeek]) {
      const todayHours = allBusinessHours[dayOfWeek];
      
      // 브레이크타임 확인
      let allBreakTime = {};
      if (db && typeof db.getBreakTime === 'function') {
        allBreakTime = process.env.DATABASE_URL ? await db.getBreakTime() : db.getBreakTime();
      }
      
      const todayBreakTime = allBreakTime[dayOfWeek];
      if (todayBreakTime && currentTime >= todayBreakTime.start && currentTime < todayBreakTime.end) {
        return false; // 브레이크타임 중
      }
      
      return currentTime >= todayHours.open && currentTime < todayHours.close;
    }
    
    // 요일별 영업시간이 없으면 기본 영업시간 사용
    return currentTime >= businessHours.open && currentTime < businessHours.close;
  } catch (e) {
    console.error('영업시간 체크 오류:', e);
    // 오류 시 기본 영업시간 사용
    return currentTime >= businessHours.open && currentTime < businessHours.close;
  }
}

// Socket.io 연결
io.on('connection', async (socket) => {
  console.log('🔌 클라이언트 연결:', socket.id);
  
  // POS 연결 시 accepted 이상인 주문만 복원 (pending은 팝업으로 처리)
  let allOrders;
  if (process.env.DATABASE_URL) {
    // PostgreSQL
    allOrders = await db.getAllOrders();
  } else {
    // SQLite
    allOrders = db.getAllOrders();
  }
  
  const activeOrders = allOrders.filter(o => {
    const status = o.status || o.Status;
    return status === 'accepted' || status === 'preparing' || status === 'delivering';
  });
  
  if (activeOrders.length > 0) {
    socket.emit('restore-orders', activeOrders);
    console.log('📦 진행 중인 주문 복원:', activeOrders.length, '개');
  }
  
  // pending 주문은 new-order로 다시 전송 (팝업 띄우기 위해)
  const pendingOrders = allOrders.filter(o => {
    const status = o.status || o.Status;
    return status === 'pending';
  });
  
  if (pendingOrders.length > 0) {
    console.log('⏳ Pending 주문 재전송:', pendingOrders.length, '개');
    pendingOrders.forEach(order => {
      setTimeout(() => {
        const orderId = order.orderId || order.orderid;
        const customerName = order.customerName || order.customername;
        const phone = order.phone || order.customerphone;
        const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : order.items;
        const totalAmount = order.totalAmount || order.totalprice;
        const paymentMethod = order.paymentMethod || order.paymentmethod || 'cash';
        
        socket.emit('new-order', {
          orderId,
          customerName,
          phone,
          address: order.address,
          items,
          totalAmount,
          paymentMethod
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

// API: 영업시간 조회 (요일별 포함)
app.get('/api/business-hours', async (req, res) => {
  try {
    const isOpen = await isBusinessHours();
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const dayOfWeek = koreaTime.getDay(); // 0=일요일, 6=토요일
    const hour = koreaTime.getHours();
    const minute = koreaTime.getMinutes();
    
    const formatTime = (time) => {
      const h = Math.floor(time);
      const m = Math.round((time - h) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    
    // 요일별 영업시간 조회
    let allBusinessHours = {};
    if (process.env.DATABASE_URL) {
      allBusinessHours = await db.getBusinessHoursByDay();
    } else {
      allBusinessHours = db.getBusinessHoursByDay();
    }
    
    // 브레이크타임 조회
    let allBreakTime = {};
    if (process.env.DATABASE_URL) {
      allBreakTime = await db.getBreakTime();
    } else {
      allBreakTime = db.getBreakTime();
    }
    
    // 요일별 휴무일 조회
    let closedDays = [];
    if (process.env.DATABASE_URL) {
      closedDays = await db.getClosedDays();
    } else {
      closedDays = db.getClosedDays();
    }
    
    // 임시휴업 조회
    let temporaryClosed = false;
    if (process.env.DATABASE_URL) {
      temporaryClosed = await db.getTemporaryClosed();
    } else {
      temporaryClosed = db.getTemporaryClosed();
    }
    
    // 오늘 요일의 영업시간 결정
    let todayHours = businessHours; // 기본값
    let businessHoursText = `${formatTime(businessHours.open)} - ${formatTime(businessHours.close)}`;
    
    if (allBusinessHours && Object.keys(allBusinessHours).length > 0 && allBusinessHours[dayOfWeek]) {
      todayHours = allBusinessHours[dayOfWeek];
      businessHoursText = `${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`;
    }
    
    res.json({
      isOpen: true, // 영업시간 체크 비활성화 - 항상 주문 가능
      currentTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      businessHours: businessHoursText,
      open: todayHours.open,
      close: todayHours.close,
      allBusinessHours,
      allBreakTime,
      closedDays,
      temporaryClosed
    });
  } catch (error) {
    console.error('❌ 영업시간 조회 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 영업시간 설정 (단일 값 - 하위 호환성)
app.post('/api/business-hours', async (req, res) => {
  try {
    const { open, close, hours } = req.body;
    
    console.log('📝 영업시간 저장 요청:', { open, close, hours });
    
    // 요일별 영업시간 저장 (새 형식)
    if (hours && typeof hours === 'object' && Object.keys(hours).length > 0) {
      try {
        if (process.env.DATABASE_URL) {
          await db.saveBusinessHoursByDay(hours);
        } else {
          db.saveBusinessHoursByDay(hours);
        }
        console.log('✅ 요일별 영업시간 업데이트 완료:', hours);
        
        // 저장된 데이터 다시 조회하여 반환
        let savedHours = {};
        if (process.env.DATABASE_URL) {
          savedHours = await db.getBusinessHoursByDay();
        } else {
          savedHours = db.getBusinessHoursByDay();
        }
        
        return res.json({ success: true, allBusinessHours: savedHours });
      } catch (err) {
        console.error('❌ 요일별 영업시간 저장 오류:', err);
        return res.status(500).json({ success: false, error: `저장 오류: ${err.message}` });
      }
    }
    
    // 단일 영업시간 저장 (기존 형식)
    if (typeof open !== 'number' || typeof close !== 'number') {
      return res.status(400).json({ success: false, error: '잘못된 시간 형식입니다.' });
    }
    
    if (open < 0 || open >= 24 || close < 0 || close > 24) {
      return res.status(400).json({ success: false, error: '시간은 0-24 사이여야 합니다.' });
    }
    
    try {
      businessHours = { open, close };
      if (process.env.DATABASE_URL) {
        await db.saveBusinessHours(businessHours);
      } else {
        db.saveBusinessHours(businessHours);
      }
      
      console.log('✅ 영업시간 업데이트 완료:', businessHours);
      res.json({ success: true, businessHours });
    } catch (err) {
      console.error('❌ 영업시간 저장 오류:', err);
      res.status(500).json({ success: false, error: `저장 오류: ${err.message}` });
    }
  } catch (error) {
    console.error('❌ 영업시간 설정 API 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 브레이크타임 설정
app.post('/api/break-time', async (req, res) => {
  try {
    const { breakTimes } = req.body;
    
    if (!breakTimes || typeof breakTimes !== 'object') {
      return res.status(400).json({ success: false, error: '잘못된 브레이크타임 형식입니다.' });
    }
    
    if (process.env.DATABASE_URL) {
      await db.saveBreakTime(breakTimes);
    } else {
      db.saveBreakTime(breakTimes);
    }
    
    console.log('✅ 브레이크타임 업데이트:', breakTimes);
    res.json({ success: true, breakTimes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 요일별 휴무일 설정
app.post('/api/closed-days', async (req, res) => {
  try {
    const { closedDays } = req.body;
    
    if (!Array.isArray(closedDays)) {
      return res.status(400).json({ success: false, error: '잘못된 형식입니다. 배열이 필요합니다.' });
    }
    
    // 모든 값이 0-6 사이의 숫자인지 확인
    if (!closedDays.every(day => Number.isInteger(day) && day >= 0 && day <= 6)) {
      return res.status(400).json({ success: false, error: '요일 번호는 0-6 사이여야 합니다.' });
    }
    
    if (process.env.DATABASE_URL) {
      await db.saveClosedDays(closedDays);
    } else {
      db.saveClosedDays(closedDays);
    }
    
    console.log('✅ 요일별 휴무일 설정 업데이트:', closedDays);
    res.json({ success: true, closedDays });
  } catch (error) {
    console.error('❌ 요일별 휴무일 설정 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 요일별 휴무일 조회
app.get('/api/closed-days', async (req, res) => {
  try {
    let closedDays = [];
    if (process.env.DATABASE_URL) {
      closedDays = await db.getClosedDays();
    } else {
      closedDays = db.getClosedDays();
    }
    res.json({ success: true, closedDays });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 임시휴업 설정
app.post('/api/temporary-closed', async (req, res) => {
  try {
    const { closed } = req.body;
    
    if (typeof closed !== 'boolean') {
      return res.status(400).json({ success: false, error: '잘못된 형식입니다.' });
    }
    
    if (process.env.DATABASE_URL) {
      await db.saveTemporaryClosed(closed);
    } else {
      db.saveTemporaryClosed(closed);
    }
    
    console.log('✅ 임시휴업 설정 업데이트:', closed);
    res.json({ success: true, temporaryClosed: closed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 가게 정보 조회
app.get('/api/store/info', async (req, res) => {
  try {
    let storeInfo;
    if (process.env.DATABASE_URL) {
      storeInfo = await db.getStoreInfo();
    } else {
      storeInfo = db.getStoreInfo();
    }
    res.json({ success: true, storeInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 가게 정보 저장
app.post('/api/store/info', async (req, res) => {
  try {
    const storeInfo = req.body;
    
    if (process.env.DATABASE_URL) {
      await db.saveStoreInfo(storeInfo);
    } else {
      db.saveStoreInfo(storeInfo);
    }
    
    console.log('✅ 가게 정보 업데이트:', storeInfo);
    res.json({ success: true, storeInfo });
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

// API: 메뉴 품절 처리
app.put('/api/menu/:menuId/availability', (req, res) => {
  try {
    const { menuId } = req.params;
    const { isAvailable } = req.body;
    
    const menu = db.db.prepare('SELECT * FROM menu WHERE id = ?').get(menuId);
    if (!menu) {
      return res.status(404).json({ success: false, error: '메뉴를 찾을 수 없습니다.' });
    }
    
    db.db.prepare('UPDATE menu SET isAvailable = ? WHERE id = ?').run(isAvailable ? 1 : 0, menuId);
    
    console.log(`✅ 메뉴 품절 상태 변경: ${menu.name} - ${isAvailable ? '판매 가능' : '품절'}`);
    res.json({ success: true, message: isAvailable ? '판매 가능으로 변경되었습니다.' : '품절로 변경되었습니다.' });
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
    
    // 🔒 비밀번호 암호화하여 저장 및 쿠폰 발급 (즉시 처리)
    const user = await db.createUser(phone, name, email, address, password);
    
    // 쿠폰 발급 확인 (즉시 확인)
    let couponCode = null;
    let couponName = null;
    try {
      if (process.env.DATABASE_URL) {
        // PostgreSQL - 쿠폰 코드와 이름 확인
        const couponResult = await db.query('SELECT code, name FROM coupons WHERE code = $1', [`WELCOME${user.userId}`]);
        if (couponResult.rows.length > 0) {
          couponCode = couponResult.rows[0].code;
          couponName = couponResult.rows[0].name;
        }
      } else {
        // SQLite - 쿠폰 코드와 이름 확인
        const coupon = db.db.prepare('SELECT code, name FROM coupons WHERE code = ?').get(`WELCOME${user.userId}`);
        if (coupon) {
          couponCode = coupon.code;
          couponName = coupon.name;
        }
      }
    } catch (err) {
      console.error('쿠폰 확인 오류:', err);
    }
    
    if (couponCode) {
      console.log(`✅ 회원가입 완료: ${name} (${phone}) - UserId: ${user.userId} - 쿠폰 발급 완료: ${couponCode}`);
    } else {
      console.warn(`⚠️ 회원가입 완료: ${name} (${phone}) - UserId: ${user.userId} - 쿠폰 발급 확인 필요`);
    }
    
    res.json({ 
      success: true, 
      message: couponCode 
        ? '🎉 회원가입 완료! 신규 회원 가입 쿠폰 10,000원이 지급되었습니다! (25,000원 이상 주문 시 사용 가능)'
        : '🎉 회원가입 완료! (쿠폰 발급 확인 중...)',
      userId: user.userId,
      couponCode: couponCode,
      couponName: couponName
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
    
    let user;
    if (process.env.DATABASE_URL) {
      // PostgreSQL
      user = await db.getUserByPhone(phone);
    } else {
      // SQLite
      user = db.getUserByPhone(phone);
    }
    
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
        email: user.email || '',
        address: user.address || '',
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
app.get('/api/auth/me/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('🔍 사용자 정보 조회 요청:', userId);
    
    let user;
    if (process.env.DATABASE_URL) {
      user = await db.getUserById(userId);
    } else {
      user = db.getUserById(userId);
    }
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

// API: 데이터베이스 연결 상태 확인
app.get('/api/admin/db-connection-test', async (req, res) => {
  try {
    if (process.env.DATABASE_URL && db && typeof db.testConnection === 'function') {
      const test = await db.testConnection();
      res.json({ success: true, connection: test });
    } else {
      res.json({ success: true, connection: { connected: true, database: 'SQLite (로컬)' } });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 데이터베이스 상태 확인 (관리자용) - 연결 테스트 포함
app.get('/api/admin/db-status', async (req, res) => {
  try {
    let stats = {};
    let connectionInfo = { connected: false, error: null };
    
    if (process.env.DATABASE_URL) {
      // PostgreSQL 연결 테스트
      if (db && typeof db.testConnection === 'function') {
        try {
          connectionInfo = await db.testConnection();
          if (!connectionInfo.connected) {
            return res.status(500).json({ 
              success: false, 
              error: `PostgreSQL 연결 실패: ${connectionInfo.error}`,
              connectionInfo,
              database: 'PostgreSQL (Railway)'
            });
          }
        } catch (err) {
          return res.status(500).json({
            success: false,
            error: `PostgreSQL 연결 테스트 오류: ${err.message}`,
            connectionInfo: { connected: false, error: err.message },
            database: 'PostgreSQL (Railway)'
          });
        }
      }
      
      // PostgreSQL
      const userCount = await db.query('SELECT COUNT(*) as count FROM users');
      const orderCount = await db.query('SELECT COUNT(*) as count FROM orders');
      const menuCount = await db.query('SELECT COUNT(*) as count FROM menu');
      const couponCount = await db.query('SELECT COUNT(*) as count FROM coupons');
      
      const recentUsers = await db.query(`
        SELECT "userId", name, phone, "createdAt" 
        FROM users 
        ORDER BY "createdAt" DESC 
        LIMIT 5
      `);
      
      const recentOrders = await db.query(`
        SELECT "orderId", "customerName", phone, status, "createdAt"
        FROM orders
        ORDER BY "createdAt" DESC
        LIMIT 5
      `);
      
      stats = {
        database: 'PostgreSQL (Railway)',
        connectionStatus: connectionInfo.connected ? 'connected' : 'disconnected',
        connectionInfo: connectionInfo,
        users: {
          total: parseInt(userCount.rows[0].count),
          recent: recentUsers.rows
        },
        orders: {
          total: parseInt(orderCount.rows[0].count),
          recent: recentOrders.rows
        },
        menu: {
          total: parseInt(menuCount.rows[0].count)
        },
        coupons: {
          total: parseInt(couponCount.rows[0].count)
        }
      };
    } else {
      // SQLite
      const userCount = db.db.prepare('SELECT COUNT(*) as count FROM users').get();
      const orderCount = db.db.prepare('SELECT COUNT(*) as count FROM orders').get();
      const menuCount = db.db.prepare('SELECT COUNT(*) as count FROM menu').get();
      const couponCount = db.db.prepare('SELECT COUNT(*) as count FROM coupons').get();
      
      const recentUsers = db.db.prepare(`
        SELECT userId, name, phone, createdAt 
        FROM users 
        ORDER BY createdAt DESC 
        LIMIT 5
      `).all();
      
      const recentOrders = db.db.prepare(`
        SELECT orderId, customerName, phone, status, createdAt
        FROM orders
        ORDER BY createdAt DESC
        LIMIT 5
      `).all();
      
      stats = {
        database: 'SQLite (로컬)',
        users: {
          total: userCount.count,
          recent: recentUsers
        },
        orders: {
          total: orderCount.count,
          recent: recentOrders
        },
        menu: {
          total: menuCount.count
        },
        coupons: {
          total: couponCount.count
        }
      };
    }
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('데이터베이스 상태 확인 오류:', error);
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
app.post('/api/auth/verify-user', async (req, res) => {
  try {
    const { phone, name } = req.body;
    let user;
    if (process.env.DATABASE_URL) {
      user = await db.getUserByPhone(phone);
    } else {
      user = db.getUserByPhone(phone);
    }
    
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
app.post('/api/coupons/validate', async (req, res) => {
  try {
    const { code, userId, totalAmount } = req.body;
    
    if (!code) {
      return res.json({ success: false, error: '쿠폰 코드를 입력해주세요.' });
    }
    
    let coupon;
    if (process.env.DATABASE_URL) {
      coupon = await db.getCouponByCode(code.toUpperCase());
    } else {
      coupon = db.getCouponByCode(code.toUpperCase());
    }
    
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
    
    // 사용자 쿠폰 소유 여부 확인 (userId가 있는 경우)
    if (userId) {
      let userCoupons;
      if (process.env.DATABASE_URL) {
        userCoupons = await db.getUserCoupons(userId);
      } else {
        userCoupons = db.getUserCoupons(userId);
      }
      
      const hasCoupon = userCoupons.some(uc => uc.id === coupon.id && !uc.orderId && !uc.usedAt);
      
      if (!hasCoupon) {
        // 쿠폰이 발급되지 않았거나 이미 사용한 경우
        let usageCheck;
        if (process.env.DATABASE_URL) {
          const result = await db.query(
            'SELECT * FROM coupon_usage WHERE "couponId" = $1 AND "userId" = $2 ORDER BY id DESC LIMIT 1',
            [coupon.id, userId]
          );
          usageCheck = result.rows[0] || null;
        } else {
          usageCheck = db.db.prepare(`
            SELECT * FROM coupon_usage 
            WHERE couponId = ? AND userId = ? 
            ORDER BY id DESC LIMIT 1
          `).get(coupon.id, userId);
        }
        
        if (!usageCheck) {
          return res.json({ success: false, error: '이 쿠폰은 발급되지 않았습니다. 먼저 쿠폰을 발급받아주세요.' });
        }
        
        if (usageCheck.orderId || usageCheck.usedAt) {
          return res.json({ success: false, error: '이미 사용한 쿠폰입니다.' });
        }
      }
    }
    
    // 최소 주문 금액 체크
    if (totalAmount && coupon.minAmount && totalAmount < coupon.minAmount) {
      return res.json({ 
        success: false, 
        error: `이 쿠폰은 최소 주문 금액 ${coupon.minAmount.toLocaleString()}원 이상일 때 사용 가능합니다.` 
      });
    }
    
    // 할인 금액 계산
    const discountValue = parseInt(coupon.discountValue) || 0; // 문자열인 경우 숫자로 변환
    let discountAmount = 0;
    if (coupon.discountType === 'fixed') {
      discountAmount = discountValue;
    } else if (coupon.discountType === 'percent') {
      discountAmount = Math.floor(totalAmount * (discountValue / 100));
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
        discountValue: discountValue,
        minAmount: coupon.minAmount ? parseInt(coupon.minAmount) : 0,
        discountAmount: discountAmount
      }
    });
  } catch (error) {
    console.error('쿠폰 검증 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 모든 쿠폰 조회 (관리자용)
app.get('/api/coupons', async (req, res) => {
  try {
    let coupons;
    if (process.env.DATABASE_URL) {
      coupons = await db.getAllCoupons();
    } else {
      coupons = db.getAllCoupons();
    }
    
    // 발급량과 사용량 포함하여 반환
    const couponsWithStats = await Promise.all(coupons.map(async (coupon) => {
      let issuedCount = 0;
      let usedCount = 0;
      
      if (process.env.DATABASE_URL) {
        // PostgreSQL: 발급량과 사용량 조회
        const issuedResult = await db.query(
          'SELECT COUNT(*) as count FROM coupon_usage WHERE "couponId" = $1',
          [coupon.id]
        );
        const usedResult = await db.query(
          'SELECT COUNT(*) as count FROM coupon_usage WHERE "couponId" = $1 AND "usedAt" IS NOT NULL',
          [coupon.id]
        );
        issuedCount = parseInt(issuedResult.rows[0].count || 0);
        usedCount = parseInt(usedResult.rows[0].count || 0);
      } else {
        // SQLite: 발급량과 사용량 조회
        const issuedResult = db.db.prepare(
          'SELECT COUNT(*) as count FROM coupon_usage WHERE couponId = ?'
        ).get(coupon.id);
        const usedResult = db.db.prepare(
          'SELECT COUNT(*) as count FROM coupon_usage WHERE couponId = ? AND usedAt IS NOT NULL'
        ).get(coupon.id);
        issuedCount = issuedResult.count || 0;
        usedCount = usedResult.count || 0;
      }
      
      return {
        ...coupon,
        issuedCount,
        usedCount
      };
    }));
    
    res.json({ success: true, coupons: couponsWithStats });
  } catch (error) {
    console.error('쿠폰 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 쿠폰 통계 조회
app.get('/api/coupons/stats', async (req, res) => {
  try {
    let stats;
    if (process.env.DATABASE_URL) {
      stats = await db.getCouponStats();
    } else {
      stats = db.getCouponStats();
    }
    
    // 사용률 계산
    const usageRate = stats.totalIssued > 0 
      ? Math.round((stats.totalUsed / stats.totalIssued) * 100) 
      : 0;
    
    res.json({ 
      success: true, 
      stats: {
        ...stats,
        usageRate
      }
    });
  } catch (error) {
    console.error('쿠폰 통계 조회 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 쿠폰 생성
app.post('/api/coupons', async (req, res) => {
  try {
    const { code, name, discountType, discountValue, minAmount, maxDiscount, validFrom, validTo, isActive } = req.body;
    
    if (!code || !name || !discountType || !discountValue) {
      return res.status(400).json({ success: false, error: '필수 항목이 누락되었습니다.' });
    }
    
    // 코드 중복 체크
    let existing;
    if (process.env.DATABASE_URL) {
      existing = await db.getCouponByCode(code.toUpperCase());
    } else {
      existing = db.getCouponByCode(code.toUpperCase());
    }
    
    if (existing) {
      return res.status(400).json({ success: false, error: '이미 존재하는 쿠폰 코드입니다.' });
    }
    
    let coupon;
    if (process.env.DATABASE_URL) {
      coupon = await db.createCoupon({
        code: code.toUpperCase(),
        name,
        discountType,
        discountValue,
        minAmount: minAmount || 0,
        maxDiscount: maxDiscount || null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validTo: validTo ? new Date(validTo) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: isActive !== false
      });
    } else {
      coupon = db.createCoupon({
        code: code.toUpperCase(),
        name,
        discountType,
        discountValue,
        minAmount: minAmount || 0,
        maxDiscount: maxDiscount || null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validTo: validTo ? new Date(validTo) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: isActive !== false
      });
    }
    
    console.log('✅ 쿠폰 생성:', coupon.code);
    res.json({ success: true, coupon });
  } catch (error) {
    console.error('쿠폰 생성 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 쿠폰 발급 (사용자에게 쿠폰 지급) - 관리자용
app.post('/api/coupons/issue', async (req, res) => {
  try {
    const { couponId, userId } = req.body;
    
    if (!couponId || !userId) {
      return res.status(400).json({ success: false, error: '필수 항목이 누락되었습니다.' });
    }
    
    // 쿠폰 존재 확인
    let couponExists;
    if (process.env.DATABASE_URL) {
      couponExists = await db.getCouponById(couponId);
    } else {
      couponExists = db.getCouponById(couponId);
    }
    
    if (!couponExists) {
      return res.status(400).json({ success: false, error: '쿠폰을 찾을 수 없습니다.' });
    }
    
    // 사용자 존재 확인
    let userExists;
    if (process.env.DATABASE_URL) {
      userExists = await db.getUserById(userId);
    } else {
      userExists = db.getUserById(userId);
    }
    
    if (!userExists) {
      return res.status(400).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }
    
    // 쿠폰 발급
    let coupon;
    if (process.env.DATABASE_URL) {
      coupon = await db.issueCouponToUser(couponId, userId);
    } else {
      coupon = db.issueCouponToUser(couponId, userId);
    }
    
    if (coupon) {
      console.log(`✅ 쿠폰 발급 API 성공: couponId=${couponId}, userId=${userId}, code=${coupon.code}`);
      res.json({ success: true, coupon, message: '쿠폰이 발급되었습니다!' });
    } else {
      console.error(`❌ 쿠폰 발급 API 실패: couponId=${couponId}, userId=${userId}`);
      res.status(400).json({ success: false, error: '쿠폰을 발급할 수 없습니다. (이미 발급되었거나 오류 발생)' });
    }
  } catch (error) {
    console.error('쿠폰 발급 API 오류:', error);
    console.error('오류 상세:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 쿠폰 리딤 (쿠폰 코드로 발급받기) - 고객용
app.post('/api/coupons/redeem', async (req, res) => {
  try {
    const { code, userId } = req.body;
    
    if (!code || !userId) {
      return res.status(400).json({ success: false, error: '쿠폰 코드를 입력해주세요.' });
    }
    
    // 쿠폰 조회
    let coupon;
    if (process.env.DATABASE_URL) {
      coupon = await db.getCouponByCode(code.toUpperCase());
    } else {
      coupon = db.getCouponByCode(code.toUpperCase());
    }
    
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
    
    // 이미 발급받았는지 확인
    let existingUsage;
    if (process.env.DATABASE_URL) {
      const result = await db.query(
        'SELECT * FROM coupon_usage WHERE "couponId" = $1 AND "userId" = $2 ORDER BY id DESC LIMIT 1',
        [coupon.id, userId]
      );
      existingUsage = result.rows[0] || null;
    } else {
      existingUsage = db.db.prepare(`
        SELECT * FROM coupon_usage 
        WHERE couponId = ? AND userId = ? 
        ORDER BY id DESC LIMIT 1
      `).get(coupon.id, userId);
    }
    
    // 이미 발급받았고 사용하지 않았다면 발급 불가
    if (existingUsage && !existingUsage.orderId && !existingUsage.usedAt) {
      return res.json({ success: false, error: '이미 발급받은 쿠폰입니다.' });
    }
    
    // 쿠폰 발급
    let issuedCoupon;
    if (process.env.DATABASE_URL) {
      issuedCoupon = await db.issueCouponToUser(coupon.id, userId);
    } else {
      issuedCoupon = db.issueCouponToUser(coupon.id, userId);
    }
    
    if (issuedCoupon) {
      console.log(`✅ 쿠폰 리딤 완료: ${code} -> userId=${userId}`);
      res.json({ success: true, coupon: issuedCoupon, message: '쿠폰이 발급되었습니다!' });
    } else {
      res.status(400).json({ success: false, error: '쿠폰을 발급할 수 없습니다.' });
    }
  } catch (error) {
    console.error('쿠폰 리딤 오류:', error);
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
      let user;
      if (process.env.DATABASE_URL) {
        user = await db.getUserById(userId);
      } else {
        user = db.getUserById(userId);
      }
      if (!user || (user.points || 0) < usedPoints) {
        return res.json({ success: false, error: '포인트가 부족합니다.' });
      }
    }
    
    // 쿠폰 검증 및 사용 처리
    let couponId = null;
    if (couponCode && userId) {
      let coupon;
      if (process.env.DATABASE_URL) {
        coupon = await db.getCouponByCode(couponCode.toUpperCase());
      } else {
        coupon = db.getCouponByCode(couponCode.toUpperCase());
      }
      
      if (coupon) {
        // 사용자 쿠폰 소유 여부 확인
        let userCoupons;
        if (process.env.DATABASE_URL) {
          userCoupons = await db.getUserCoupons(userId);
        } else {
          userCoupons = db.getUserCoupons(userId);
        }
        
        const hasCoupon = userCoupons.some(uc => uc.id === coupon.id && !uc.orderId && !uc.usedAt);
        
        if (!hasCoupon) {
          // 쿠폰이 발급되지 않았거나 이미 사용한 경우
          let usageCheck;
          if (process.env.DATABASE_URL) {
            const result = await db.query(
              'SELECT * FROM coupon_usage WHERE "couponId" = $1 AND "userId" = $2 ORDER BY id DESC LIMIT 1',
              [coupon.id, userId]
            );
            usageCheck = result.rows[0] || null;
          } else {
            usageCheck = db.db.prepare(`
              SELECT * FROM coupon_usage 
              WHERE couponId = ? AND userId = ? 
              ORDER BY id DESC LIMIT 1
            `).get(coupon.id, userId);
          }
          
          if (!usageCheck) {
            return res.json({ success: false, error: '이 쿠폰은 발급되지 않았습니다. 먼저 쿠폰을 발급받아주세요.' });
          }
          
          if (usageCheck.orderId || usageCheck.usedAt) {
            return res.json({ success: false, error: '이미 사용한 쿠폰입니다.' });
          }
        }
        
        // 최소 주문 금액 체크
        if (coupon.minAmount && totalAmount < coupon.minAmount) {
          return res.json({ 
            success: false, 
            error: `이 쿠폰은 최소 주문 금액 ${coupon.minAmount.toLocaleString()}원 이상일 때 사용 가능합니다.` 
          });
        }
        
        // 쿠폰 사용 처리 (orderId는 주문 생성 후 업데이트)
        couponId = coupon.id;
      } else {
        return res.json({ success: false, error: '유효하지 않은 쿠폰 코드입니다.' });
      }
    }
    
    // 포장 주문은 배달료 0원
    const finalDeliveryFee = (orderType === 'takeout') ? 0 : (deliveryFee || 0);
    const finalAmount = totalAmount - (usedPoints || 0) - (couponDiscount || 0) + finalDeliveryFee;
    const earnedPoints = userId && !isGuest ? Math.floor((totalAmount - (usedPoints || 0) - (couponDiscount || 0)) * 0.10) : 0;
    
    // 주문번호를 1번부터 순차적으로 생성
    let orderNumber;
    if (process.env.DATABASE_URL) {
      orderNumber = await db.getNextOrderNumber();
    } else {
      orderNumber = db.getNextOrderNumber();
    }
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
    
    if (process.env.DATABASE_URL) {
      await db.createOrder(orderData);
    } else {
      db.createOrder(orderData);
    }
    
    // 포인트 차감
    if (userId && usedPoints > 0) {
      if (process.env.DATABASE_URL) {
        await db.addPoints(userId, -usedPoints);
        await db.addPointHistory(userId, orderId, -usedPoints, 'use');
      } else {
        db.addPoints(userId, -usedPoints);
        db.addPointHistory(userId, orderId, -usedPoints, 'use');
      }
    }
    
    // 쿠폰 사용 내역 업데이트 (orderId 추가)
    if (couponId && userId) {
      if (process.env.DATABASE_URL) {
        await db.useCoupon(couponId, userId, orderId);
      } else {
        db.useCoupon(couponId, userId, orderId);
      }
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
    
    // 프린터 서버 URL이 있으면 원격 호출, 없으면 로컬 프린터 사용
    const PRINTER_SERVER_URL = process.env.PRINTER_SERVER_URL;
    if (PRINTER_SERVER_URL) {
      // 원격 프린터 서버 호출 (LKT-20 등)
      console.log('🖨️ 주문 생성 - 원격 프린터 서버 호출:', PRINTER_SERVER_URL);
      axios.post(`${PRINTER_SERVER_URL}/print`, orderForPrint, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      })
        .then((response) => {
          console.log('✅ 원격 프린터 출력 완료:', orderId);
          console.log('프린터 서버 응답:', response.data);
        })
        .catch(err => {
          console.error('❌ 원격 프린터 출력 실패:', orderId);
          console.error('에러 상세:', err.message);
          if (err.code === 'ECONNREFUSED') {
            console.error('⚠️ 프린터 서버에 연결할 수 없습니다. 프린터 서버가 실행 중인지 확인하세요.');
          }
        });
    } else {
      // 로컬 Windows 프린터 사용
      console.log('🖨️ 주문 생성 - Windows 기본 프린터로 출력:', orderId);
      try {
        const printResult = printer.printOrder(orderForPrint);
        if (printResult) {
          console.log('✅ Windows 프린터 출력 완료:', orderId);
        } else {
          console.error('❌ Windows 프린터 출력 실패:', orderId);
        }
      } catch (printError) {
        console.error('❌ Windows 프린터 출력 오류:', printError.message);
      }
    }
    
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
app.post('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    let { status, estimatedTime } = req.body;
    
    console.log('📝 주문 상태 업데이트 요청:', { orderId, status, estimatedTime });
    
    let order;
    if (process.env.DATABASE_URL) {
      order = await db.getOrderById(orderId);
    } else {
      order = db.getOrderById(orderId);
    }
    
    if (!order) {
      console.error('❌ 주문을 찾을 수 없음:', orderId);
      return res.status(404).json({ success: false, error: '주문을 찾을 수 없습니다.' });
    }
    
    console.log('✅ 주문 찾음:', orderId);
    
    // 현금 주문이고 배달 완료 상태로 변경 시 자동으로 완료 상태로 변경
    const paymentMethod = order.paymentMethod || order.paymentmethod || 'cash';
    const isCashOrder = paymentMethod === 'cash' || paymentMethod === '만나서현금' || paymentMethod === '만나서카드';
    
    if (status === 'delivering' && isCashOrder) {
      // 현금 주문은 배달 완료 시 자동으로 완료 상태로 변경
      status = 'completed';
      console.log('💰 현금 주문 - 배달 완료 시 자동 완료 처리:', orderId);
    }
    
    // 주문 상태 업데이트
    console.log('💾 데이터베이스에 상태 업데이트 중:', { orderId, status, estimatedTime });
    
    if (process.env.DATABASE_URL) {
      // PostgreSQL
      await db.updateOrderStatus(orderId, status);
      console.log('✅ PostgreSQL 상태 업데이트 완료');
      
      // 예상 시간이 있으면 저장
      if (estimatedTime !== null && estimatedTime !== undefined) {
        try {
          await db.query('UPDATE orders SET "estimatedTime" = $1 WHERE "orderId" = $2', [estimatedTime, orderId]);
          console.log('✅ 예상 시간 업데이트 완료:', estimatedTime, '분');
        } catch (timeError) {
          console.error('⚠️ 예상 시간 업데이트 실패 (무시됨):', timeError.message);
        }
      }
    } else {
      // SQLite
      db.updateOrderStatus(orderId, status);
      console.log('✅ SQLite 상태 업데이트 완료');
      
      // 예상 시간이 있으면 저장
      if (estimatedTime !== null && estimatedTime !== undefined) {
        try {
          db.updateOrderEstimatedTime(orderId, estimatedTime);
          console.log('✅ 예상 시간 업데이트 완료:', estimatedTime, '분');
        } catch (timeError) {
          console.error('⚠️ 예상 시간 업데이트 실패 (무시됨):', timeError.message);
        }
      }
    }
    
    // 주문 수락 시 프린터에서 자동 인쇄
    if (status === 'accepted') {
      console.log('✅ 주문 수락 상태 변경:', orderId);
      if (order) {
        console.log('📋 주문 데이터 확인:', {
          orderId: order.orderId || order.orderid,
          customerName: order.customerName || order.customername,
          items: typeof order.items === 'string' ? 'string' : 'array'
        });
        
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
        
        console.log('🖨️ 프린터 출력 함수 호출 시작');
        // 프린터 출력 (비동기로 처리, 실패해도 주문 상태 업데이트는 성공)
        try {
          const PRINTER_SERVER_URL = process.env.PRINTER_SERVER_URL;
          if (PRINTER_SERVER_URL) {
            console.log('🖨️ 원격 프린터 서버 호출:', PRINTER_SERVER_URL);
            // 프린터 출력은 비동기로 처리 (실패해도 주문 상태 업데이트는 성공)
            axios.post(`${PRINTER_SERVER_URL}/print`, orderForPrint, {
              timeout: 5000,
              headers: { 'Content-Type': 'application/json' }
            })
              .then((response) => {
                console.log('✅ 원격 프린터 출력 완료:', orderId);
                console.log('프린터 서버 응답:', response.data);
              })
              .catch(err => {
                console.error('❌ 원격 프린터 출력 실패:', orderId);
                console.error('에러 상세:', err.message);
                if (err.response) {
                  console.error('응답 상태:', err.response.status);
                  console.error('응답 데이터:', err.response.data);
                }
                if (err.code === 'ECONNREFUSED') {
                  console.error('⚠️ 프린터 서버에 연결할 수 없습니다. 프린터 서버가 실행 중인지 확인하세요.');
                }
              });
          } else {
            console.log('🖨️ 로컬 프린터 사용');
            try {
              const printResult = printer.printOrder(orderForPrint);
              console.log('🖨️ 주문 수락 - 프린터 출력 결과:', printResult, '주문번호:', orderId);
            } catch (printError) {
              console.error('⚠️ 로컬 프린터 출력 오류 (무시됨):', printError.message);
            }
          }
          console.log('🖨️ 주문 수락 - 프린터 출력 요청 완료:', orderId);
        } catch (printError) {
          console.error('⚠️ 프린터 출력 오류 (무시됨):', printError.message);
          // 프린터 출력 실패해도 주문 상태 업데이트는 계속 진행
        }
      } else {
        console.error('❌ 주문 데이터가 없습니다:', orderId);
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
    
    // Socket.io로 상태 변경 알림
    io.emit('order-status-changed', { orderId, status });
    
    console.log('✅ 주문 상태 변경 완료:', orderId, '→', status, `(결제: ${paymentMethod})`);
    res.json({ success: true, status, message: '주문 상태가 업데이트되었습니다.' });
  } catch (error) {
    console.error('❌ 주문 상태 변경 오류:', error);
    console.error('에러 스택:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message || '주문 상태 변경 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// API: 주문 수정 (접수 전에만 가능)
app.put('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items, address, totalAmount, finalAmount, usedPoints, couponCode, couponDiscount } = req.body;

    let order;
    if (process.env.DATABASE_URL) {
      order = await db.getOrderById(orderId);
    } else {
      order = db.getOrderById(orderId);
    }
    
    if (!order) {
      return res.json({ success: false, error: '주문을 찾을 수 없습니다.' });
    }

    // 접수 전 상태가 아니면 수정 불가
    if (order.status !== 'pending') {
      return res.json({ success: false, error: '접수 전 주문만 수정할 수 있습니다.' });
    }

    // 수정할 내용 준비
    const updates = {};
    if (items) updates.items = items;
    if (address) updates.address = address;
    if (totalAmount !== undefined) updates.totalAmount = totalAmount;
    if (finalAmount !== undefined) updates.finalAmount = finalAmount;
    if (usedPoints !== undefined) updates.usedPoints = usedPoints;
    if (couponCode !== undefined) updates.couponCode = couponCode;
    if (couponDiscount !== undefined) updates.couponDiscount = couponDiscount;

    let result;
    if (process.env.DATABASE_URL) {
      result = await db.updateOrder(orderId, updates);
    } else {
      result = db.updateOrder(orderId, updates);
    }
    
    if (!result.success) {
      return res.json({ success: false, error: result.error });
    }

    // POS에 주문 수정 알림
    io.emit('order-updated', { orderId, order: result.order });
    
    console.log('✏️ 주문 수정:', orderId);
    res.json({ success: true, order: result.order });
  } catch (error) {
    console.error('❌ 주문 수정 오류:', error);
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
    if (process.env.DATABASE_URL) {
      await db.updateOrderStatus(orderId, 'cancelled');
    } else {
      db.updateOrderStatus(orderId, 'cancelled');
    }
    
    // 포인트 복구
    if (order.userId && order.usedPoints > 0) {
      if (process.env.DATABASE_URL) {
        await db.addPoints(order.userId, order.usedPoints);
        await db.addPointHistory(order.userId, orderId, order.usedPoints, 'refund');
      } else {
        db.addPoints(order.userId, order.usedPoints);
        db.addPointHistory(order.userId, orderId, order.usedPoints, 'refund');
      }
      console.log(`✅ 포인트 복구: ${order.usedPoints}P (userId: ${order.userId})`);
    }
    
    // 쿠폰 복구 (쿠폰 사용 내역 확인 및 복구)
    if (order.userId) {
      try {
        // 쿠폰 사용 내역 조회
        let couponUsage;
        if (process.env.DATABASE_URL) {
          const result = await db.query(`
            SELECT cu.*, c.code, c.name 
            FROM coupon_usage cu
            INNER JOIN coupons c ON cu."couponId" = c.id
            WHERE cu."userId" = $1 AND cu."orderId" = $2
          `, [order.userId, orderId]);
          couponUsage = result.rows[0] || null;
        } else {
          couponUsage = db.db.prepare(`
            SELECT cu.*, c.code, c.name 
            FROM coupon_usage cu
            INNER JOIN coupons c ON cu.couponId = c.id
            WHERE cu.userId = ? AND cu.orderId = ?
          `).get(order.userId, orderId);
        }
        
        if (couponUsage) {
          // 쿠폰 사용 내역 삭제 (복구)
          if (process.env.DATABASE_URL) {
            await db.query('DELETE FROM coupon_usage WHERE id = $1', [couponUsage.id]);
            await db.query('UPDATE coupons SET "usedCount" = "usedCount" - 1 WHERE id = $1', [couponUsage.couponId]);
          } else {
            db.db.prepare('DELETE FROM coupon_usage WHERE id = ?').run(couponUsage.id);
            // 쿠폰 사용 횟수 감소
            db.db.prepare('UPDATE coupons SET usedCount = usedCount - 1 WHERE id = ?').run(couponUsage.couponId);
          }
          console.log(`✅ 쿠폰 복구: ${couponUsage.code} (${couponUsage.name})`);
        }
      } catch (err) {
        console.error('쿠폰 복구 오류:', err.message);
      }
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
      let order;
      if (process.env.DATABASE_URL) {
        order = await db.getOrderById(merchantUid);
      } else {
        order = db.getOrderById(merchantUid);
      }
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
app.post('/api/printer/test', async (req, res) => {
  try {
    const PRINTER_SERVER_URL = process.env.PRINTER_SERVER_URL;
    if (PRINTER_SERVER_URL) {
      // 원격 프린터 서버 호출 (LKT-20 전용)
      try {
        console.log('🖨️ LKT-20 프린터 테스트 요청:', PRINTER_SERVER_URL);
        const response = await axios.get(`${PRINTER_SERVER_URL}/test`, {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ LKT-20 프린터 테스트 응답:', response.data);
        res.json(response.data);
      } catch (error) {
        console.error('❌ LKT-20 프린터 서버 연결 실패:', error.message);
        res.status(500).json({ 
          success: false, 
          error: `LKT-20 프린터 서버 연결 실패: ${error.message}\n\n프린터 서버가 POS PC에서 실행 중인지 확인해주세요.` 
        });
      }
    } else {
      // PRINTER_SERVER_URL이 설정되지 않음
      res.status(400).json({ 
        success: false, 
        error: 'LKT-20 프린터 서버 URL이 설정되지 않았습니다.\n\nRailway 환경 변수에 PRINTER_SERVER_URL을 설정해주세요.\n예: http://172.30.1.61:3001' 
      });
    }
  } catch (error) {
    console.error('❌ 프린터 테스트 오류:', error);
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

// API: 바쁨 상태 조회
app.get('/api/busy-status', (req, res) => {
  try {
    const status = db.getBusyStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 바쁨 상태 설정
app.post('/api/busy-status', (req, res) => {
  try {
    const { status } = req.body;
    const newStatus = db.setBusyStatus(status);
    if (newStatus) {
      res.json({ success: true, status: newStatus });
    } else {
      res.status(400).json({ success: false, error: 'Invalid status' });
    }
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
  if (process.env.DATABASE_URL) {
    console.log('🏮 시티반점 주문 서버 시작! (PostgreSQL + Railway)');
    console.log('💾 데이터베이스: PostgreSQL (Railway)');
  } else {
    console.log('🏮 시티반점 주문 서버 시작! (SQLite + 암호화)');
    console.log('💾 데이터베이스: SQLite (restaurant.db)');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📌 서비스 주소:');
  console.log(`   http://localhost:${PORT}/order-new`);
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    console.log(`   https://${process.env.RAILWAY_PUBLIC_DOMAIN}/order-new`);
  }
  console.log('');
  console.log('🔒 비밀번호: bcrypt 암호화');
  console.log('🔔 알림톡: ' + (sms ? '활성화' : '비활성화 (환경 변수 없음)'));
  console.log('🖨️ 프린터: ' + (process.env.PRINTER_SERVER_URL ? '원격 서버 연결' : '로컬/없음'));
  console.log('');
  console.log('🎯 POS 주소:');
  console.log(`   http://localhost:${PORT}/pos/login.html`);
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    console.log(`   https://${process.env.RAILWAY_PUBLIC_DOMAIN}/pos/login.html`);
  }
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
