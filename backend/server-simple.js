const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const Database = require('./database-simple');
const os = require('os');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(bodyParser.json());

// API 경로 체크 미들웨어 제거
// Express는 라우트를 등록한 순서대로 매칭하므로,
// API 라우트가 먼저 등록되어 있으면 자동으로 우선 처리됨

const db = new Database();

// 이미지 업로드 설정
const uploadDir = path.join(__dirname, 'public', 'images', 'menu');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 파일명을 영문으로 변환 (한글 파일명 방지)
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    // 한글 제거하고 영문/숫자만 사용
    const safeName = file.originalname.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20) || 'image';
    cb(null, `${safeName}_${timestamp}_${randomStr}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다. (jpg, png, gif, webp)'));
    }
  }
});

console.log('✅ 메모리 DB 사용 (Railway 최적화)');

let posClients = [];

// 영업시간 설정 (요일별 기본값) - 0=일요일, 1=월요일, ..., 6=토요일
let businessHours = {
  0: { open: 9.5, close: 21 },  // 일요일
  1: { open: 9.5, close: 21 },  // 월요일
  2: { open: 9.5, close: 21 },  // 화요일
  3: { open: 9.5, close: 21 },  // 수요일
  4: { open: 9.5, close: 21 },  // 목요일
  5: { open: 9.5, close: 21 },  // 금요일
  6: { open: 9.5, close: 21 }   // 토요일
};

// 임시휴업 상태
let temporaryClosed = false;

// 브레이크타임 설정 (요일별, 기본값: 없음)
let breakTime = {};

// 영업시간을 DB에서 불러오기
function loadBusinessHours() {
  try {
    // DB가 초기화되었는지 확인
    if (db && typeof db.getBusinessHours === 'function') {
      const saved = db.getBusinessHours();
      if (saved && typeof saved === 'object') {
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
  // 임시휴업 상태 로드
  if (db && typeof db.getTemporaryClosed === 'function') {
    temporaryClosed = db.getTemporaryClosed();
    console.log('✅ 임시휴업 상태 로드:', temporaryClosed);
  }
  // 브레이크타임 로드
  if (db && typeof db.getBreakTime === 'function') {
    breakTime = db.getBreakTime();
    console.log('✅ 브레이크타임 로드:', breakTime);
  }
}, 100);

function isBusinessHours() {
  try {
    // 변수 초기화 확인
    if (typeof businessHours === 'undefined' || !businessHours) {
      console.warn('⚠️ businessHours가 정의되지 않음, 기본값 사용');
      return false;
    }
    if (typeof temporaryClosed === 'undefined') {
      temporaryClosed = false;
    }
    if (typeof breakTime === 'undefined') {
      breakTime = {};
    }
    
    // 임시휴업 체크
    if (temporaryClosed) {
      return false;
    }
    
    // 한국 시간으로 변환 (UTC+9)
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const dayOfWeek = koreaTime.getDay(); // 0=일요일, 6=토요일
    const hour = koreaTime.getHours();
    const minute = koreaTime.getMinutes();
    const currentTime = hour + minute / 60; // 9시 30분 = 9.5
    
    // 해당 요일의 영업시간 가져오기
    const todayHours = businessHours[dayOfWeek];
    if (!todayHours || typeof todayHours.open !== 'number' || typeof todayHours.close !== 'number') {
      return false; // 영업시간이 설정되지 않은 요일
    }
    
    // 영업시간 체크
    if (currentTime < todayHours.open || currentTime >= todayHours.close) {
      return false;
    }
    
    // 해당 요일의 브레이크타임 체크
    const todayBreakTime = breakTime[dayOfWeek];
    if (todayBreakTime && typeof todayBreakTime.start === 'number' && typeof todayBreakTime.end === 'number') {
      if (currentTime >= todayBreakTime.start && currentTime < todayBreakTime.end) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ isBusinessHours() 오류:', error);
    return false; // 오류 발생 시 안전하게 false 반환
  }
}

app.get('/api/business-hours', (req, res) => {
  console.log('📡 [API] GET /api/business-hours 요청 받음');
  
  try {
    // 변수 초기화 확인 및 기본값 설정
    if (typeof businessHours === 'undefined' || !businessHours) {
      console.warn('⚠️ businessHours가 정의되지 않음, 기본값으로 초기화');
      businessHours = {
        0: { open: 9.5, close: 21 },
        1: { open: 9.5, close: 21 },
        2: { open: 9.5, close: 21 },
        3: { open: 9.5, close: 21 },
        4: { open: 9.5, close: 21 },
        5: { open: 9.5, close: 21 },
        6: { open: 9.5, close: 21 }
      };
    }
    if (typeof breakTime === 'undefined' || !breakTime) {
      console.warn('⚠️ breakTime이 정의되지 않음, 빈 객체로 초기화');
      breakTime = {};
    }
    if (typeof temporaryClosed === 'undefined') {
      console.warn('⚠️ temporaryClosed가 정의되지 않음, false로 초기화');
      temporaryClosed = false;
    }
    
    // isBusinessHours 호출 (내부에서도 안전하게 처리됨)
    let isOpen = false;
    try {
      isOpen = isBusinessHours();
    } catch (err) {
      console.error('❌ isBusinessHours() 호출 오류:', err);
      isOpen = false; // 오류 시 안전하게 false
    }
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const dayOfWeek = koreaTime.getDay();
    const hour = koreaTime.getHours();
    const minute = koreaTime.getMinutes();
    
    // 시간 포맷팅
    const formatTime = (time) => {
      if (typeof time !== 'number' || isNaN(time)) {
        return '00:00';
      }
      const h = Math.floor(time);
      const m = Math.round((time - h) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    
    const todayHours = businessHours[dayOfWeek] || { open: 9.5, close: 21 };
    const todayBreakTime = breakTime[dayOfWeek];
    
    let statusMessage = '';
    if (temporaryClosed) {
      statusMessage = '임시휴업';
    } else if (todayBreakTime && typeof todayBreakTime.start !== 'undefined' && typeof todayBreakTime.end !== 'undefined') {
      const currentTime = hour + minute / 60;
      if (currentTime >= todayBreakTime.start && currentTime < todayBreakTime.end) {
        statusMessage = `브레이크타임 (${formatTime(todayBreakTime.start)} - ${formatTime(todayBreakTime.end)})`;
      }
    }
    
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    
    const response = {
      isOpen,
      currentTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      currentDay: dayOfWeek,
      currentDayName: dayNames[dayOfWeek],
      businessHours: `${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`,
      open: todayHours.open,
      close: todayHours.close,
      allBusinessHours: businessHours, // 모든 요일의 영업시간
      temporaryClosed,
      breakTime: todayBreakTime || null,
      allBreakTime: breakTime, // 모든 요일의 브레이크타임
      statusMessage
    };
    
    console.log('✅ [API] /api/business-hours 응답 전송');
    res.setHeader('Content-Type', 'application/json');
    res.json(response);
  } catch (error) {
    console.error('❌ [API] /api/business-hours 오류:', error);
    console.error('❌ 오류 스택:', error.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// API: 영업시간 설정 (요일별)
app.post('/api/business-hours', (req, res) => {
  console.log('📡 POST /api/business-hours 요청 받음');
  try {
    const { hours } = req.body; // { 0: {open, close}, 1: {open, close}, ... }
    
    if (!hours || typeof hours !== 'object') {
      return res.status(400).json({ success: false, error: '잘못된 요청입니다.' });
    }
    
    // 각 요일의 영업시간 검증
    for (let day = 0; day <= 6; day++) {
      if (hours[day]) {
        const { open, close } = hours[day];
        if (typeof open !== 'number' || typeof close !== 'number') {
          return res.status(400).json({ success: false, error: `요일 ${day}의 시간 형식이 잘못되었습니다.` });
        }
        if (open < 0 || open >= 24 || close < 0 || close > 24) {
          return res.status(400).json({ success: false, error: `요일 ${day}의 시간은 0-24 사이여야 합니다.` });
        }
        if (open >= close) {
          return res.status(400).json({ success: false, error: `요일 ${day}의 오픈 시간은 마감 시간보다 빨라야 합니다.` });
        }
      }
    }
    
    // 기존 설정과 병합
    businessHours = { ...businessHours, ...hours };
    db.saveBusinessHours(businessHours);
    
    console.log('✅ 영업시간 업데이트:', businessHours);
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, businessHours });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 임시휴업 설정
app.post('/api/temporary-closed', (req, res) => {
  console.log('📡 POST /api/temporary-closed 요청 받음');
  try {
    // 변수 초기화 확인
    if (typeof temporaryClosed === 'undefined') {
      temporaryClosed = false;
    }
    
    const { closed } = req.body;
    temporaryClosed = closed === true;
    db.setTemporaryClosed(temporaryClosed);
    console.log('✅ 임시휴업 설정:', temporaryClosed ? 'ON' : 'OFF');
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, temporaryClosed });
  } catch (error) {
    console.error('❌ [API] /api/temporary-closed 오류:', error);
    console.error('❌ 오류 스택:', error.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 브레이크타임 설정 (요일별)
app.post('/api/break-time', (req, res) => {
  console.log('📡 POST /api/break-time 요청 받음');
  try {
    // 변수 초기화 확인
    if (typeof breakTime === 'undefined') {
      breakTime = {};
    }
    
    const { breakTimes } = req.body; // { 0: {start, end}, 1: {start, end}, ... } 또는 { day: 0, start: null, end: null } (해제)
    
    if (!breakTimes || typeof breakTimes !== 'object') {
      return res.status(400).json({ success: false, error: '잘못된 요청입니다.' });
    }
    
    // 각 요일의 브레이크타임 검증 및 설정
    for (let day = 0; day <= 6; day++) {
      if (breakTimes[day] !== undefined) {
        const dayBreak = breakTimes[day];
        
        // null이면 해당 요일 브레이크타임 해제
        if (dayBreak === null) {
          delete breakTime[day];
          continue;
        }
        
        const { start, end } = dayBreak;
        
        // 둘 다 null이면 해제
        if (start === null && end === null) {
          delete breakTime[day];
          continue;
        }
        
        if (typeof start !== 'number' || typeof end !== 'number') {
          return res.status(400).json({ success: false, error: `요일 ${day}의 시간 형식이 잘못되었습니다.` });
        }
        
        if (start < 0 || start >= 24 || end < 0 || end > 24) {
          return res.status(400).json({ success: false, error: `요일 ${day}의 시간은 0-24 사이여야 합니다.` });
        }
        
        if (start >= end) {
          return res.status(400).json({ success: false, error: `요일 ${day}의 시작 시간은 종료 시간보다 빨라야 합니다.` });
        }
        
        breakTime[day] = { start, end };
      }
    }
    
    db.setBreakTime(breakTime);
    
    console.log('✅ 브레이크타임 업데이트:', breakTime);
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, breakTime });
  } catch (error) {
    console.error('❌ [API] /api/break-time 오류:', error);
    console.error('❌ 오류 스택:', error.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ success: false, error: error.message });
  }
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

// API: 메뉴 조회
app.get('/api/menu', async (req, res) => {
  try {
    const menu = db.getAllMenu();
    res.json({ success: true, menu });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 메뉴 생성
app.post('/api/menu', (req, res) => {
  try {
    const { name, category, price, image, bestseller } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, error: '메뉴명과 가격은 필수입니다.' });
    }
    const newMenu = db.createMenu({ name, category, price, image, bestseller });
    res.json({ success: true, menu: newMenu });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 메뉴 수정
app.put('/api/menu/:id', (req, res) => {
  try {
    const menuId = parseInt(req.params.id);
    const { name, category, price, image, bestseller } = req.body;
    const updatedMenu = db.updateMenu(menuId, { name, category, price, image, bestseller });
    res.json({ success: true, menu: updatedMenu });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 메뉴 삭제
app.delete('/api/menu/:id', (req, res) => {
  try {
    const menuId = parseInt(req.params.id);
    const deletedMenu = db.deleteMenu(menuId);
    res.json({ success: true, menu: deletedMenu });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 메뉴 할인 설정
app.post('/api/menu/:id/discount', (req, res) => {
  try {
    const menuId = parseInt(req.params.id);
    const { type, value } = req.body;
    if (type && type !== 'percent' && type !== 'fixed') {
      return res.status(400).json({ success: false, error: '할인 타입은 percent 또는 fixed여야 합니다.' });
    }
    const discount = db.setMenuDiscount(menuId, type ? { type, value } : null);
    res.json({ success: true, discount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 메뉴 할인 조회
app.get('/api/menu/discounts', (req, res) => {
  try {
    const discounts = db.getAllMenuDiscounts();
    res.json({ success: true, discounts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 메뉴 옵션 설정
app.post('/api/menu/:id/options', (req, res) => {
  try {
    const menuId = parseInt(req.params.id);
    const { options } = req.body;
    if (!Array.isArray(options)) {
      return res.status(400).json({ success: false, error: '옵션은 배열이어야 합니다.' });
    }
    const savedOptions = db.setMenuOptions(menuId, options);
    res.json({ success: true, options: savedOptions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 메뉴 옵션 조회
app.get('/api/menu/:id/options', (req, res) => {
  try {
    const menuId = parseInt(req.params.id);
    const options = db.getMenuOptions(menuId);
    res.json({ success: true, options });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 이미지 업로드
app.post('/api/upload/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '이미지 파일이 없습니다.' });
    }
    
    const imageUrl = `/images/menu/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 가게 정보 조회
app.get('/api/store/info', (req, res) => {
  try {
    const storeInfo = db.getStoreInfo();
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, storeInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 가게 정보 저장
app.post('/api/store/info', (req, res) => {
  try {
    const { name, owner, phone, license, address, kakaoChannelUrl, chatServiceUrl, 
            minOrderAmount, deliveryFee, freeDeliveryThreshold } = req.body;
    const storeInfo = db.setStoreInfo({ 
      name, owner, phone, license, address, kakaoChannelUrl, chatServiceUrl,
      minOrderAmount, deliveryFee, freeDeliveryThreshold
    });
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, storeInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 사이트 설정 조회
app.get('/api/site/config', (req, res) => {
  try {
    const siteConfig = db.getSiteConfig();
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, siteConfig });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 사이트 설정 저장
app.post('/api/site/config', (req, res) => {
  try {
    const { pages, globalStyles } = req.body;
    const siteConfig = db.setSiteConfig({ pages, globalStyles });
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, siteConfig });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 바쁨 상태 조회
app.get('/api/busy-status', (req, res) => {
  try {
    const status = db.getBusyStatus();
    res.setHeader('Content-Type', 'application/json');
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
      res.setHeader('Content-Type', 'application/json');
      res.json({ success: true, status: newStatus });
    } else {
      res.status(400).json({ success: false, error: 'Invalid status' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 사용자 목록 조회
app.get('/api/users', (req, res) => {
  try {
    const users = db.users.map(u => ({
      userid: u.userid,
      name: u.name,
      phone: u.phone,
      email: u.email,
      address: u.address,
      points: u.points || 0,
      createdat: u.createdat
    }));
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 포인트 통계
app.get('/api/points/stats', (req, res) => {
  try {
    const stats = db.getPointStats();
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 전체 포인트 내역 조회
app.get('/api/points/history/all', (req, res) => {
  try {
    const history = db.pointHistory.sort((a, b) => new Date(b.createdat) - new Date(a.createdat));
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 포인트 지급
app.post('/api/points/issue', async (req, res) => {
  try {
    const { userId, points, reason } = req.body;
    if (!userId || !points || !reason) {
      return res.status(400).json({ success: false, error: '필수 항목이 누락되었습니다.' });
    }
    
    await db.addPoints(userId, points, 'admin', reason);
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 쿠폰 목록 조회
app.get('/api/coupons', (req, res) => {
  try {
    const coupons = db.getAllCoupons();
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 쿠폰 생성
app.post('/api/coupons', (req, res) => {
  try {
    const coupon = db.createCoupon(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 쿠폰 통계
app.get('/api/coupons/stats', (req, res) => {
  try {
    const stats = db.getCouponStats();
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 쿠폰 발급
app.post('/api/coupons/issue', (req, res) => {
  try {
    const { couponId, userId } = req.body;
    if (!couponId || !userId) {
      return res.status(400).json({ success: false, error: '필수 항목이 누락되었습니다.' });
    }
    
    const coupon = db.issueCouponToUser(couponId, userId);
    if (coupon) {
      res.setHeader('Content-Type', 'application/json');
      res.json({ success: true, coupon });
    } else {
      res.status(400).json({ success: false, error: '쿠폰을 발급할 수 없습니다.' });
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

// API: 통합 매출 통계
app.get('/api/sales/total', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = db.getTotalSalesStats(startDate, endDate);
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 홀 매출 조회
app.get('/api/sales/hall', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const sales = db.getHallSales(startDate, endDate);
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, sales });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 홀 매출 등록
app.post('/api/sales/hall', (req, res) => {
  try {
    const sale = db.addHallSale(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 홀 매출 삭제
app.delete('/api/sales/hall/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = db.hallSales.findIndex(s => s.id === id);
    if (index !== -1) {
      db.hallSales.splice(index, 1);
      res.setHeader('Content-Type', 'application/json');
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: '매출 내역을 찾을 수 없습니다.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 타 플랫폼 매출 조회
app.get('/api/sales/platform', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const sales = db.getPlatformSales(startDate, endDate);
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, sales });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 타 플랫폼 매출 등록
app.post('/api/sales/platform', (req, res) => {
  try {
    const sale = db.addPlatformSale(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 타 플랫폼 매출 삭제
app.delete('/api/sales/platform/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = db.platformSales.findIndex(s => s.id === id);
    if (index !== -1) {
      db.platformSales.splice(index, 1);
      res.setHeader('Content-Type', 'application/json');
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: '매출 내역을 찾을 수 없습니다.' });
    }
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
      message: '🎉 회원가입 완료! 신규 회원 가입 쿠폰 10,000원이 발급되었습니다!' 
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
    const userId = req.params.userId;
    console.log('🔍 사용자 정보 조회 요청:', userId);
    console.log('📊 현재 사용자 수:', db.users.length);
    console.log('📋 사용자 목록:', db.users.map(u => ({ userid: u.userid, name: u.name })));
    
    const user = await db.getUserById(userId);
    console.log('✅ 찾은 사용자:', user ? { userid: user.userid, name: user.name } : '없음');
    
    if (!user) {
      console.error('❌ 사용자를 찾을 수 없음. 요청한 userId:', userId);
      return res.json({ 
        success: false, 
        error: `회원을 찾을 수 없습니다. (userId: ${userId})` 
      });
    }
    res.json({
      success: true,
      user: {
        userId: user.userid,
        name: user.name,
        phone: user.phone,
        points: user.points || 0
      }
    });
  } catch (error) {
    console.error('❌ 사용자 정보 조회 오류:', error);
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
    // 영업시간 체크
    if (!isBusinessHours()) {
      let errorMessage = '현재 주문을 받을 수 없습니다';
      if (temporaryClosed) {
        errorMessage = '임시휴업 중입니다. 주문을 받지 않습니다.';
      } else {
        const now = new Date();
        const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
        const dayOfWeek = koreaTime.getDay();
        const hour = koreaTime.getHours();
        const minute = koreaTime.getMinutes();
        const currentTime = hour + minute / 60;
        
        const todayBreakTime = breakTime[dayOfWeek];
        if (todayBreakTime && currentTime >= todayBreakTime.start && currentTime < todayBreakTime.end) {
          const formatTime = (time) => {
            const h = Math.floor(time);
            const m = Math.round((time - h) * 60);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          };
          errorMessage = `브레이크타임 중입니다 (${formatTime(todayBreakTime.start)} - ${formatTime(todayBreakTime.end)})`;
        }
      }
      return res.json({ success: false, error: errorMessage });
    }
    
    const {
      userId, customerName, phone, address, items,
      totalAmount, deliveryFee = 0, finalAmount: clientFinalAmount, usedPoints = 0, 
      specialRequest = '', paymentMethod = 'cash',
      isGuest = false, phoneVerified = false,
      couponCode = null, couponDiscount = 0
    } = req.body;

    // 쿠폰 사용 시 최소 주문 금액 체크 (23000원)
    const storeInfo = db.getStoreInfo();
    let minOrderAmount = storeInfo.minOrderAmount || 15000;
    
    if (couponCode && couponDiscount > 0) {
      // 쿠폰 사용 시 최소 주문 금액 23000원
      minOrderAmount = 23000;
    }
    
    if (totalAmount < minOrderAmount) {
      return res.json({ success: false, error: `최소 주문 금액은 ${minOrderAmount.toLocaleString()}원입니다.` });
    }
    
    // 쿠폰 검증 및 사용 처리
    let couponId = null;
    if (couponCode && userId) {
      const coupon = db.getCouponByCode(couponCode.toUpperCase());
      if (coupon) {
        // 쿠폰 사용 처리
        db.useCoupon(coupon.id, userId, null); // orderId는 나중에 업데이트
        couponId = coupon.id;
      }
    }

    const orderId = 'ORD-' + Date.now();
    
    if (userId && usedPoints > 0) {
      const user = await db.getUserById(userId);
      if (!user || user.points < usedPoints) {
        return res.json({ success: false, error: '포인트가 부족합니다.' });
      }
    }

    // 최종 금액 계산 (배달료 포함, 쿠폰 할인 적용)
    const calculatedFinalAmount = totalAmount - usedPoints - couponDiscount + deliveryFee;
    const finalAmount = Math.max(0, clientFinalAmount || calculatedFinalAmount);
    const earnedPoints = userId && !isGuest ? Math.floor((totalAmount - usedPoints - couponDiscount) * 0.10) : 0;
    
    // 쿠폰 사용 내역 업데이트 (orderId 추가)
    if (couponId && userId) {
      const usage = db.couponUsage.find(u => u.couponId === couponId && u.userId == userId && !u.orderId);
      if (usage) {
        usage.orderId = orderId;
      }
    }

    await db.createOrder({
      orderid: orderId,
      userId,
      customername: customerName,
      customerphone: phone,
      address,
      items,
      totalprice: finalAmount,
      deliveryFee,
      usedpoints: usedPoints,
      earnedpoints: earnedPoints,
      specialRequest,
      paymentMethod,
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
      paymentMethod,
      createdAt: new Date().toISOString()
    };

    console.log('📢 POS 전송:', posClients.length, '개 POS 클라이언트');
    console.log('📦 주문 데이터:', JSON.stringify(orderData, null, 2));
    
    // POS 클라이언트에게 전송
    if (posClients.length > 0) {
      posClients.forEach(clientId => {
        console.log(`  → POS 클라이언트 ${clientId}에게 전송`);
        io.to(clientId).emit('new-order', orderData);
      });
    } else {
      console.log('⚠️ 연결된 POS 클라이언트가 없습니다. 브로드캐스트로 전송합니다.');
    }
    
    // 모든 클라이언트에게 브로드캐스트 (백업)
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

// API: 포인트 내역 조회
app.get('/api/points/history/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const history = await db.getPointHistory(userId);
    res.json({ success: true, history: history || [] });
  } catch (error) {
    console.error('포인트 내역 조회 오류:', error);
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

// API: 메뉴별 판매 분석 (판매량, 원가, 수익)
app.get('/api/stats/menu-sales-analysis', (req, res) => {
  try {
    const analysis = db.getMenuSalesAnalysis();
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 메뉴 원가 조회
app.get('/api/menu-costs', (req, res) => {
  try {
    const costs = db.getAllMenuCosts();
    const menus = db.getAllMenu();
    const menuList = menus.map(menu => ({
      id: menu.id,
      name: menu.name,
      price: menu.price,
      category: menu.category,
      cost: costs[menu.id] || Math.round(menu.price * 0.4)
    }));
    res.json({ success: true, data: menuList });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 메뉴 원가 설정
app.post('/api/menu-costs/:menuId', (req, res) => {
  try {
    const menuId = parseInt(req.params.menuId);
    const { cost } = req.body;
    
    if (isNaN(menuId) || typeof cost !== 'number' || cost < 0) {
      return res.status(400).json({ success: false, error: '잘못된 요청입니다.' });
    }
    
    db.setMenuCost(menuId, cost);
    res.json({ success: true, menuId, cost });
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
    try {
      const phone = `010-9000-${String(i + 1).padStart(4, '0')}`;
      const name = names[i];
      const email = `test${i + 1}@test.com`;
      const region = selectRegion();
      const address = addresses[region][random(0, addresses[region].length - 1)];
      const password = '1234';
      const user = await db.createUser(phone, name, email, address, password);
      if (user && user.userid) {
        testUserIds.push(user.userid);
        console.log(`✅ ${name} (${phone})`);
      } else {
        console.warn(`⚠️ 회원 생성 실패: ${name}`);
      }
    } catch (error) {
      console.error(`❌ 회원 생성 오류 (${names[i]}):`, error.message);
    }
  }
  console.log(`✅ 총 ${testUserIds.length}명의 회원 생성 완료`);
  
  // 주문 생성 (최근 60일)
  console.log('📦 주문 생성 중...');
  
  // 메뉴 데이터 가져오기
  const menus = db.getAllMenu();
  const validMenus = menus.filter(m => m && m.id && m.name && m.price);
  
  if (validMenus.length === 0) {
    console.error('❌ 유효한 메뉴가 없습니다!');
    return;
  }
  
  console.log(`✅ 유효한 메뉴 ${validMenus.length}개 확인`);
  
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
      
      // 50건마다 진행 상황 출력
      if (totalOrders % 50 === 0) {
        console.log(`  📊 진행 중: ${totalOrders}건 생성됨...`);
      }
    }
  }
  
  console.log(`✅ 완료! 총 ${totalOrders}건의 주문 생성됨`);
  
  // 즉시 DB 확인
  const savedOrders = db.orders.length;
  const savedUsers = db.users.length;
  console.log(`📊 DB 저장 확인: 주문 ${savedOrders}건, 회원 ${savedUsers}명`);
  
  if (savedOrders === 0) {
    console.error('❌ 경고: 주문이 DB에 저장되지 않았습니다!');
  }
}

// 정적 파일 서빙 (모든 API 라우트가 등록된 후에만 등록)
// Express는 라우트를 등록한 순서대로 매칭하므로, 
// API 라우트가 먼저 등록되어 있으면 정적 파일 서빙은 API가 매칭되지 않은 경우에만 실행됨
app.use(express.static(path.join(__dirname, 'public')));

// 기본 경로 리다이렉트 (정적 파일 서빙 이후)
app.get('/', (req, res) => {
  res.redirect('/order-new');
});

// 서버 시작
const PORT = process.env.PORT || 3000;

// 서버 시작 전 라우트 확인
console.log('\n📋 등록된 API 라우트:');
console.log('  GET  /api/business-hours');
console.log('  POST /api/business-hours');
console.log('  POST /api/temporary-closed');
console.log('  POST /api/break-time');
console.log('  (기타 API 라우트들...)');
console.log('📋 정적 파일 서빙: /public (API 경로 제외)\n');

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🏮 시티반점 서버 실행 중');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PORT:', PORT);
  console.log('  환경:', process.env.RAILWAY_ENVIRONMENT || '로컬');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n');
  
  // Railway 환경에서만 테스트 데이터 생성
  if (process.env.RAILWAY_ENVIRONMENT || process.env.PORT) {
    // 서버 시작 후 5초 대기 후 데이터 생성 (DB 초기화 완료 보장)
    // 프로덕션 모드: 테스트 데이터 생성하지 않음
    // 개발 모드에서만 테스트 데이터 생성하려면 환경 변수로 제어
    if (process.env.NODE_ENV === 'development' && process.env.GENERATE_TEST_DATA === 'true') {
      setTimeout(async () => {
        console.log('\n🎲 테스트 데이터 생성 시작...\n');
        
        try {
          // 메뉴 확인
          const menus = db.getAllMenu();
          console.log(`✅ 메뉴 확인: ${menus.length}개`);
          
          if (!menus || menus.length === 0) {
            console.error('❌ 메뉴가 없습니다!');
            return;
          }
          
          // 데이터 생성 실행
          await generateTestData();
          
          // 최종 확인
          const finalUsers = db.users.length;
          const finalOrders = db.orders.length;
          console.log(`\n📊 최종 데이터 확인:`);
          console.log(`   ✅ 회원: ${finalUsers}명`);
          console.log(`   ✅ 주문: ${finalOrders}건`);
          console.log(`   ✅ 메뉴: ${menus.length}개`);
          
          if (finalOrders === 0) {
            console.error('⚠️ 경고: 주문이 하나도 저장되지 않았습니다!');
            console.log('🔍 DB 상태 확인:', {
              users: db.users.length,
              orders: db.orders.length,
              menu: db.menu.length
            });
          } else {
            console.log(`✅ 데이터 저장 완료!\n`);
          }
          
        } catch (error) {
          console.error('❌ 테스트 데이터 생성 오류:', error.message);
          console.error('상세:', error);
        }
      }, 5000); // 5초 후 실행
    } else {
      console.log('✅ 프로덕션 모드: 실제 가입 데이터만 저장됩니다.');
    }
  }
});

