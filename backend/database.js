const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

class DB {
  constructor() {
    this.db = new Database(path.join(__dirname, 'restaurant.db'));
    this.init();
  }

  init() {
    // 프로덕션 모드: 테이블 삭제하지 않음 (실제 데이터 보존)
    // 개발 모드에서만 테이블 삭제하려면 환경 변수로 제어
    if (process.env.NODE_ENV === 'development' && process.env.RESET_DB === 'true') {
      try {
        this.db.exec('DROP TABLE IF EXISTS orders');
        this.db.exec('DROP TABLE IF EXISTS point_history');
        this.db.exec('DROP TABLE IF EXISTS phone_verification');
        console.log('⚠️ 개발 모드: 기존 테이블 삭제 완료');
      } catch (err) {
        console.log('⚠️ 테이블 삭제 오류:', err.message);
      }
    }

    // 메뉴 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price INTEGER NOT NULL,
        emoji TEXT,
        bestseller INTEGER DEFAULT 0
      )
    `);

    // 회원 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        userId INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        address TEXT,
        password TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    `);

    // 주문 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId TEXT UNIQUE NOT NULL,
        userId INTEGER,
        customerName TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        items TEXT NOT NULL,
        totalAmount INTEGER NOT NULL,
        usedPoints INTEGER DEFAULT 0,
        earnedPoints INTEGER DEFAULT 0,
        paymentMethod TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        isGuest INTEGER DEFAULT 0,
        phoneVerified INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    `);

    // 포인트 내역
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS point_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        orderId TEXT,
        points INTEGER NOT NULL,
        type TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);

    // 전화 인증
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS phone_verification (
        phone TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL
      )
    `);

    // 라이더 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS riders (
        riderId INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        status TEXT DEFAULT 'offline',
        currentLat REAL,
        currentLng REAL,
        createdAt TEXT NOT NULL
      )
    `);

    // 주문에 라이더 정보 추가 (기존 테이블에 컬럼 추가는 SQLite에서 제한적이므로 별도 처리)
    try {
      this.db.exec('ALTER TABLE orders ADD COLUMN riderId INTEGER');
      this.db.exec('ALTER TABLE orders ADD COLUMN riderLat REAL');
      this.db.exec('ALTER TABLE orders ADD COLUMN riderLng REAL');
      this.db.exec('ALTER TABLE orders ADD COLUMN estimatedTime INTEGER');
    } catch (e) {
      // 컬럼이 이미 존재하면 무시
    }

    // 리뷰 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        reviewId INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId TEXT NOT NULL,
        userId INTEGER,
        rating INTEGER NOT NULL,
        comment TEXT,
        createdAt TEXT NOT NULL
      )
    `);

    // 쿠폰 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        discountType TEXT NOT NULL,
        discountValue INTEGER NOT NULL,
        minAmount INTEGER DEFAULT 0,
        maxDiscount INTEGER,
        validFrom TEXT NOT NULL,
        validTo TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        issuedCount INTEGER DEFAULT 0,
        usedCount INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    `);

    // 쿠폰 사용 내역 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS coupon_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        couponId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        orderId TEXT,
        usedAt TEXT NOT NULL
      )
    `);

    // 즐겨찾기 메뉴 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS favorite_menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        menuId INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        UNIQUE(userId, menuId)
      )
    `);

    // 주소록 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS saved_addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        address TEXT NOT NULL,
        addressName TEXT NOT NULL,
        isDefault INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    `);

    // 기본 메뉴 데이터
    const count = this.db.prepare('SELECT COUNT(*) as count FROM menu').get();
    if (count.count === 0) {
      const insert = this.db.prepare('INSERT INTO menu (name, category, price, emoji, bestseller) VALUES (?, ?, ?, ?, ?)');
      
      // 오늘의 메뉴
      insert.run('짜장면', '오늘의메뉴', 6000, '🍜', 1);
      insert.run('짬뽕', '오늘의메뉴', 7000, '🌶️', 1);
      
      // 추천 메뉴
      insert.run('탕수육', '추천메뉴', 15000, '🥘', 1);
      insert.run('깐풍기', '추천메뉴', 18000, '🍗', 1);
      insert.run('양장피', '추천메뉴', 20000, '🥗', 0);
      
      // 면류
      insert.run('짜장면', '면류', 6000, '🍜', 0);
      insert.run('짬뽕', '면류', 7000, '🌶️', 0);
      insert.run('울면', '면류', 7000, '🍝', 0);
      insert.run('간짜장', '면류', 7000, '🍜', 0);
      
      // 밥류
      insert.run('볶음밥', '밥류', 7000, '🍚', 0);
      insert.run('짜장밥', '밥류', 6500, '🍚', 0);
      insert.run('짬뽕밥', '밥류', 7500, '🍚', 0);
      
      // 디저트
      insert.run('군만두', '디저트', 5000, '🥟', 0);
      insert.run('물만두', '디저트', 5000, '🥟', 0);
      insert.run('짬뽕순두부', '디저트', 8000, '🥘', 0);
      
      // 음료
      insert.run('코카콜라 2L', '음료', 3500, '🥤', 0);
      insert.run('제로콜라', '음료', 2500, '🥤', 0);
      insert.run('사이다', '음료', 2000, '🥤', 0);
      insert.run('매실', '음료', 3000, '🍵', 0);
      
      // 맥주
      insert.run('테라', '맥주', 4500, '🍺', 0);
      insert.run('카스', '맥주', 4000, '🍺', 0);
      insert.run('기네스', '맥주', 6000, '🍺', 0);
      insert.run('아사히', '맥주', 5000, '🍺', 0);
      insert.run('칭따오', '맥주', 4500, '🍺', 0);
      
      // 소주
      insert.run('참이슬', '소주', 4500, '🍶', 0);
      insert.run('처음처럼', '소주', 4500, '🍶', 0);
      insert.run('연태고량주(중)', '소주', 25000, '🍶', 0);
      
      console.log('✅ 메뉴 데이터 초기화 완료');
    }
  }

  // 메뉴
  getAllMenu() {
    return this.db.prepare('SELECT * FROM menu').all();
  }

  // 회원
  async createUser(phone, name, email, address, password) {
    // 🔒 비밀번호 암호화!
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    
    const stmt = this.db.prepare('INSERT INTO users (phone, name, email, address, password, points, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)');
    const result = stmt.run(phone, name, email, address, hashedPassword, createdAt);
    
    const userId = result.lastInsertRowid;
    
    // 🎁 신규 회원 가입 쿠폰 자동 발급 (10,000원 쿠폰, 25,000원 이상 주문 시 사용 가능)
    try {
      const welcomeCoupon = this.createCoupon({
        code: `WELCOME${userId}`,
        name: '신규 회원 가입 쿠폰',
        discountType: 'fixed',
        discountValue: 10000,
        minAmount: 25000, // 최소 주문 금액 25,000원
        maxDiscount: null,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90일 유효
        isActive: true
      });
      
      if (!welcomeCoupon) {
        console.error(`❌ 쿠폰 생성 실패: userId=${userId}`);
      } else {
        // 쿠폰 발급 기록
        const issued = this.issueCouponToUser(welcomeCoupon.id, userId);
        if (issued) {
          console.log(`✅ 신규 회원 가입: ${name} (${phone}) - 쿠폰 발급: ${welcomeCoupon.code} (10,000원, 25,000원 이상 주문 시 사용 가능)`);
        } else {
          console.error(`❌ 쿠폰 발급 실패: userId=${userId}, couponId=${welcomeCoupon.id}`);
        }
      }
    } catch (error) {
      console.error(`❌ 회원가입 쿠폰 발급 오류:`, error);
    }
    
    return this.getUserById(userId);
  }

  getUserByPhone(phone) {
    return this.db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  }

  getUserById(userId) {
    return this.db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
  }

  getUserByName(name) {
    return this.db.prepare('SELECT * FROM users WHERE name = ?').all(name);
  }

  async updatePassword(phone, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = this.db.prepare('UPDATE users SET password = ? WHERE phone = ?').run(hashedPassword, phone);
    return result.changes > 0;
  }

  // 🔒 비밀번호 검증
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  addPoints(userId, points) {
    this.db.prepare('UPDATE users SET points = points + ? WHERE userId = ?').run(points, userId);
  }

  // 라이더
  async createRider(phone, name, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    const stmt = this.db.prepare('INSERT INTO riders (phone, name, password, status, createdAt) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(phone, name, hashedPassword, 'offline', createdAt);
    return this.getRiderById(result.lastInsertRowid);
  }

  getRiderByPhone(phone) {
    return this.db.prepare('SELECT * FROM riders WHERE phone = ?').get(phone);
  }

  getRiderById(riderId) {
    return this.db.prepare('SELECT * FROM riders WHERE riderId = ?').get(riderId);
  }

  getAllRiders() {
    return this.db.prepare('SELECT * FROM riders').all();
  }

  updateRiderLocation(riderId, lat, lng) {
    return this.db.prepare('UPDATE riders SET currentLat = ?, currentLng = ? WHERE riderId = ?').run(lat, lng, riderId);
  }

  updateRiderStatus(riderId, status) {
    return this.db.prepare('UPDATE riders SET status = ? WHERE riderId = ?').run(status, riderId);
  }

  assignRiderToOrder(orderId, riderId) {
    return this.db.prepare('UPDATE orders SET riderId = ? WHERE orderId = ?').run(riderId, orderId);
  }

  updateOrderRiderLocation(orderId, lat, lng) {
    return this.db.prepare('UPDATE orders SET riderLat = ?, riderLng = ? WHERE orderId = ?').run(lat, lng, orderId);
  }

  updateOrderEstimatedTime(orderId, minutes) {
    return this.db.prepare('UPDATE orders SET estimatedTime = ? WHERE orderId = ?').run(minutes, orderId);
  }

  // 주문
  createOrder(data) {
    const stmt = this.db.prepare(`
      INSERT INTO orders (orderId, userId, customerName, phone, address, items, totalAmount, usedPoints, earnedPoints, paymentMethod, status, isGuest, phoneVerified, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      data.orderId, data.userId, data.customerName, data.phone, data.address,
      data.items, data.totalAmount, data.usedPoints, data.earnedPoints,
      data.paymentMethod, data.status, data.isGuest, data.phoneVerified, data.createdAt
    );
  }

  getAllOrders() {
    return this.db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  }

  getOrderById(orderId) {
    return this.db.prepare('SELECT * FROM orders WHERE orderId = ?').get(orderId);
  }

  updateOrderStatus(orderId, status) {
    return this.db.prepare('UPDATE orders SET status = ? WHERE orderId = ?').run(status, orderId);
  }

  // 포인트 내역
  addPointHistory(userId, orderId, points, type) {
    const stmt = this.db.prepare('INSERT INTO point_history (userId, orderId, points, type, createdAt) VALUES (?, ?, ?, ?, ?)');
    return stmt.run(userId, orderId, points, type, new Date().toISOString());
  }

  getPointHistory(userId) {
    return this.db.prepare('SELECT * FROM point_history WHERE userId = ? ORDER BY id DESC').all(userId);
  }

  // 전화 인증
  createVerification(phone, code) {
    const now = new Date();
    const expires = new Date(now.getTime() + 5 * 60000); // 5분
    const stmt = this.db.prepare('INSERT OR REPLACE INTO phone_verification (phone, code, createdAt, expiresAt) VALUES (?, ?, ?, ?)');
    return stmt.run(phone, code, now.toISOString(), expires.toISOString());
  }

  verifyPhone(phone, code) {
    const result = this.db.prepare('SELECT * FROM phone_verification WHERE phone = ? AND code = ?').get(phone, code);
    if (!result) return false;
    
    const now = new Date();
    const expires = new Date(result.expiresAt);
    return now < expires;
  }

  // ========== 통계 및 분석 ==========
  
  // 1. 매출 통계
  getDailySales(days = 30) {
    return this.db.prepare(`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as orderCount,
        SUM(totalAmount) as totalSales,
        SUM(usedPoints) as totalPointsUsed,
        SUM(earnedPoints) as totalPointsEarned,
        SUM(CASE WHEN paymentMethod = 'card' THEN totalAmount ELSE 0 END) as cardSales,
        SUM(CASE WHEN paymentMethod = 'cash' THEN totalAmount ELSE 0 END) as cashSales
      FROM orders
      WHERE status = 'completed'
        AND DATE(createdAt) >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `).all(days);
  }

  getMonthlySales(months = 12) {
    return this.db.prepare(`
      SELECT 
        strftime('%Y-%m', createdAt) as month,
        COUNT(*) as orderCount,
        SUM(totalAmount) as totalSales,
        AVG(totalAmount) as avgOrderAmount
      FROM orders
      WHERE status = 'completed'
      GROUP BY strftime('%Y-%m', createdAt)
      ORDER BY month DESC
      LIMIT ?
    `).all(months);
  }

  getTodayStats() {
    return this.db.prepare(`
      SELECT 
        COUNT(*) as orderCount,
        SUM(totalAmount) as totalSales,
        AVG(totalAmount) as avgOrderAmount,
        MAX(totalAmount) as maxOrderAmount,
        MIN(totalAmount) as minOrderAmount
      FROM orders
      WHERE DATE(createdAt) = DATE('now')
        AND status = 'completed'
    `).get();
  }

  // 2. 정산 정보
  getSettlement(startDate, endDate) {
    return this.db.prepare(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(totalAmount) as grossSales,
        SUM(usedPoints) as pointsRedeemed,
        SUM(earnedPoints) as pointsIssued,
        SUM(CASE WHEN paymentMethod = 'card' THEN totalAmount ELSE 0 END) as cardPayments,
        SUM(CASE WHEN paymentMethod = 'cash' THEN totalAmount ELSE 0 END) as cashPayments
      FROM orders
      WHERE status = 'completed'
        AND DATE(createdAt) BETWEEN ? AND ?
    `).get(startDate, endDate);
  }

  // 3. 지역별 분석 (공도읍 중심 배달 지역만)
  getOrdersByRegion() {
    return this.db.prepare(`
      SELECT 
        CASE
          WHEN address LIKE '%공도%' OR address LIKE '%공도읍%' THEN '공도읍'
          WHEN address LIKE '%미양%' OR address LIKE '%미양면%' THEN '미양면'
          WHEN address LIKE '%대덕%' OR address LIKE '%대덕면%' THEN '대덕면'
          WHEN address LIKE '%양성%' OR address LIKE '%양성면%' THEN '양성면'
          ELSE '기타'
        END as region,
        COUNT(*) as orderCount,
        SUM(totalAmount) as totalSales,
        AVG(totalAmount) as avgOrderAmount
      FROM orders
      WHERE status = 'completed'
      GROUP BY region
      ORDER BY orderCount DESC
    `).all();
  }

  // 4. 고객 성향 분석
  getTopCustomers(limit = 10) {
    return this.db.prepare(`
      SELECT 
        userId,
        customername as customerName,
        customerphone as phone,
        COUNT(*) as orderCount,
        SUM(totalAmount) as totalSpent,
        AVG(totalAmount) as avgOrderAmount,
        MAX(createdAt) as lastOrderDate
      FROM orders
      WHERE userId IS NOT NULL
        AND status = 'completed'
      GROUP BY userId
      ORDER BY totalSpent DESC
      LIMIT ?
    `).all(limit);
  }

  getPopularMenus(limit = 10) {
    return this.db.prepare(`
      SELECT 
        json_extract(value, '$.name') as menuName,
        SUM(json_extract(value, '$.quantity')) as totalQuantity,
        SUM(json_extract(value, '$.price') * json_extract(value, '$.quantity')) as totalRevenue,
        COUNT(DISTINCT orderId) as orderCount
      FROM orders, json_each(items)
      WHERE status = 'completed'
      GROUP BY menuName
      ORDER BY totalQuantity DESC
      LIMIT ?
    `).all(limit);
  }

  getTimeDistribution() {
    return this.db.prepare(`
      SELECT 
        CAST(strftime('%H', createdAt) AS INTEGER) as hour,
        COUNT(*) as orderCount,
        SUM(totalAmount) as totalSales
      FROM orders
      WHERE status = 'completed'
      GROUP BY hour
      ORDER BY hour
    `).all();
  }

  // 5. 실시간 대시보드 데이터
  getRealTimeStats() {
    const today = this.getTodayStats() || { orderCount: 0, totalSales: 0, avgOrderAmount: 0 };
    
    const pending = this.db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'accepted')
    `).get();

    const preparing = this.db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'preparing'
    `).get();

    const delivering = this.db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'delivering'
    `).get();

    const recentOrders = this.db.prepare(`
      SELECT orderId, customername, totalAmount, status, createdAt
      FROM orders
      ORDER BY id DESC
      LIMIT 5
    `).all();

    return {
      today: today,
      pending: pending.count,
      preparing: preparing.count,
      delivering: delivering.count,
      recentOrders: recentOrders
    };
  }

  // 주소에서 리(里) 추출 (SQLite용)
  extractRi(address) {
    if (!address) return '기타';
    const riMatch = address.match(/([가-힣]+리)(\s|$)/);
    return riMatch ? riMatch[1] : '기타';
  }

  // 주소에서 아파트 단지명 추출 (SQLite용)
  extractApartment(address) {
    if (!address) return '기타';
    const patterns = [
      /([가-힣]+아파트)/, /([가-힣]+마을)/, /([가-힣]+힐스)/, /([가-힣]+타운)/,
      /([가-힣]+빌라)/, /([가-힣]+주택)/, /([가-힣]+주공)/, /([가-힣]+단지)/,
      /([가-힣]+APT)/i, /([가-힣]+apartment)/i
    ];
    for (const pattern of patterns) {
      const match = address.match(pattern);
      if (match) return match[1];
    }
    return this.extractRi(address);
  }

  // 리 단위 통계
  getOrdersByRi() {
    const orders = this.db.prepare(`
      SELECT address, totalAmount, COUNT(*) as orderCount, SUM(totalAmount) as totalSales
      FROM orders
      WHERE status = 'completed'
      GROUP BY address
    `).all();
    
    const riMap = {};
    orders.forEach(order => {
      const ri = this.extractRi(order.address);
      if (!riMap[ri]) {
        riMap[ri] = { ri, orderCount: 0, totalSales: 0 };
      }
      riMap[ri].orderCount += order.orderCount;
      riMap[ri].totalSales += order.totalSales || 0;
    });
    
    return Object.values(riMap)
      .map(r => ({
        ...r,
        avgOrderAmount: r.orderCount > 0 ? r.totalSales / r.orderCount : 0
      }))
      .sort((a, b) => b.orderCount - a.orderCount);
  }

  // 아파트 단지 단위 통계
  getOrdersByApartment() {
    const orders = this.db.prepare(`
      SELECT address, customerphone, totalAmount, COUNT(*) as orderCount, SUM(totalAmount) as totalSales
      FROM orders
      WHERE status = 'completed'
      GROUP BY address, customerphone
    `).all();
    
    const aptMap = {};
    const customerSet = {};
    
    orders.forEach(order => {
      const apt = this.extractApartment(order.address);
      if (!aptMap[apt]) {
        aptMap[apt] = { apartment: apt, orderCount: 0, totalSales: 0, customerCount: new Set() };
      }
      aptMap[apt].orderCount += order.orderCount;
      aptMap[apt].totalSales += order.totalSales || 0;
      if (order.customerphone) {
        aptMap[apt].customerCount.add(order.customerphone);
      }
    });
    
    return Object.values(aptMap)
      .map(a => ({
        apartment: a.apartment,
        orderCount: a.orderCount,
        totalSales: a.totalSales,
        avgOrderAmount: a.orderCount > 0 ? a.totalSales / a.orderCount : 0,
        customerCount: a.customerCount.size
      }))
      .sort((a, b) => b.orderCount - a.orderCount);
  }

  // 리뷰
  createReview(orderId, userId, rating, comment) {
    const stmt = this.db.prepare('INSERT INTO reviews (orderId, userId, rating, comment, createdAt) VALUES (?, ?, ?, ?, ?)');
    return stmt.run(orderId, userId, rating, comment, new Date().toISOString());
  }

  getReviewsByOrderId(orderId) {
    return this.db.prepare('SELECT * FROM reviews WHERE orderId = ? ORDER BY reviewId DESC').all(orderId);
  }

  getAverageRating() {
    const result = this.db.prepare('SELECT AVG(rating) as avgRating, COUNT(*) as count FROM reviews').get();
    return {
      avgRating: result.avgRating || 0,
      count: result.count || 0
    };
  }

  // 영업시간 저장/조회
  saveBusinessHours(hours) {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS business_hours (
          id INTEGER PRIMARY KEY,
          open_hour REAL NOT NULL,
          close_hour REAL NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      
      const existing = this.db.prepare('SELECT * FROM business_hours WHERE id = 1').get();
      if (existing) {
        this.db.prepare('UPDATE business_hours SET open_hour = ?, close_hour = ?, updated_at = ? WHERE id = 1')
          .run(hours.open, hours.close, new Date().toISOString());
      } else {
        this.db.prepare('INSERT INTO business_hours (id, open_hour, close_hour, updated_at) VALUES (1, ?, ?, ?)')
          .run(hours.open, hours.close, new Date().toISOString());
      }
    } catch (e) {
      console.error('영업시간 저장 오류:', e);
    }
  }

  getBusinessHours() {
    try {
      const result = this.db.prepare('SELECT * FROM business_hours WHERE id = 1').get();
      if (result) {
        return {
          open: result.open_hour,
          close: result.close_hour
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ========== 쿠폰 시스템 ==========
  
  // 쿠폰 생성
  createCoupon(couponData) {
    const stmt = this.db.prepare(`
      INSERT INTO coupons (code, name, discountType, discountValue, minAmount, maxDiscount, validFrom, validTo, isActive, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      couponData.code,
      couponData.name,
      couponData.discountType,
      couponData.discountValue,
      couponData.minAmount || 0,
      couponData.maxDiscount || null,
      couponData.validFrom instanceof Date ? couponData.validFrom.toISOString() : couponData.validFrom,
      couponData.validTo instanceof Date ? couponData.validTo.toISOString() : couponData.validTo,
      couponData.isActive !== false ? 1 : 0,
      new Date().toISOString()
    );
    
    const coupon = this.getCouponById(result.lastInsertRowid);
    console.log('✅ 쿠폰 생성:', coupon);
    return coupon;
  }

  // 쿠폰 조회 (ID)
  getCouponById(id) {
    const coupon = this.db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
    if (coupon) {
      return {
        ...coupon,
        isActive: coupon.isActive === 1,
        validFrom: new Date(coupon.validFrom),
        validTo: new Date(coupon.validTo)
      };
    }
    return null;
  }

  // 쿠폰 조회 (코드)
  getCouponByCode(code) {
    const coupon = this.db.prepare('SELECT * FROM coupons WHERE code = ? AND isActive = 1').get(code);
    if (coupon) {
      return {
        ...coupon,
        isActive: coupon.isActive === 1,
        validFrom: new Date(coupon.validFrom),
        validTo: new Date(coupon.validTo)
      };
    }
    return null;
  }

  // 모든 쿠폰 조회
  getAllCoupons() {
    const coupons = this.db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
    return coupons.map(c => ({
      ...c,
      isActive: c.isActive === 1,
      validFrom: new Date(c.validFrom),
      validTo: new Date(c.validTo)
    }));
  }

  // 쿠폰 발급 (사용자에게 쿠폰 지급)
  issueCouponToUser(couponId, userId) {
    try {
      const coupon = this.getCouponById(couponId);
      if (!coupon) {
        console.error(`❌ 쿠폰을 찾을 수 없습니다. couponId: ${couponId}`);
        return null;
      }
      
      if (!coupon.isActive) {
        console.error(`❌ 쿠폰이 비활성화되어 있습니다. couponId: ${couponId}`);
        return null;
      }
      
      // 발급 횟수 증가
      this.db.prepare('UPDATE coupons SET issuedCount = COALESCE(issuedCount, 0) + 1 WHERE id = ?').run(couponId);
      
      // 쿠폰 사용 내역에 발급 기록 (usedAt은 null로 저장하여 미사용 상태 표시)
      const stmt = this.db.prepare('INSERT INTO coupon_usage (couponId, userId, usedAt) VALUES (?, ?, NULL)');
      stmt.run(couponId, userId);
      
      console.log(`✅ 쿠폰 발급 완료: couponId=${couponId}, userId=${userId}, code=${coupon.code}`);
      return coupon;
    } catch (error) {
      console.error(`❌ 쿠폰 발급 오류:`, error);
      return null;
    }
  }

  // 쿠폰 사용
  useCoupon(couponId, userId, orderId) {
    const coupon = this.getCouponById(couponId);
    if (!coupon) {
      return false;
    }
    
    // 사용 횟수 증가
    this.db.prepare('UPDATE coupons SET usedCount = usedCount + 1 WHERE id = ?').run(couponId);
    
    // 쿠폰 사용 내역 업데이트 (orderId 추가)
    if (orderId) {
      const usage = this.db.prepare('SELECT * FROM coupon_usage WHERE couponId = ? AND userId = ? AND orderId IS NULL ORDER BY id DESC LIMIT 1').get(couponId, userId);
      if (usage) {
        this.db.prepare('UPDATE coupon_usage SET orderId = ? WHERE id = ?').run(orderId, usage.id);
      } else {
        // 새로 추가
        this.db.prepare('INSERT INTO coupon_usage (couponId, userId, orderId, usedAt) VALUES (?, ?, ?, ?)')
          .run(couponId, userId, orderId, new Date().toISOString());
      }
    }
    
    return true;
  }

  // 사용자 쿠폰 조회
  getUserCoupons(userId) {
    const coupons = this.db.prepare(`
      SELECT c.*, cu.id as usageId, cu.orderId, cu.usedAt
      FROM coupons c
      INNER JOIN coupon_usage cu ON c.id = cu.couponId
      WHERE cu.userId = ? AND cu.orderId IS NULL
      ORDER BY cu.usedAt DESC
    `).all(userId);
    
    return coupons.map(c => ({
      ...c,
      isActive: c.isActive === 1,
      validFrom: new Date(c.validFrom),
      validTo: new Date(c.validTo)
    }));
  }

  // 쿠폰 통계
  getCouponStats() {
    const totalCoupons = this.db.prepare('SELECT COUNT(*) as count FROM coupons').get();
    const activeCoupons = this.db.prepare('SELECT COUNT(*) as count FROM coupons WHERE isActive = 1').get();
    const totalIssued = this.db.prepare('SELECT SUM(issuedCount) as total FROM coupons').get();
    const totalUsed = this.db.prepare('SELECT SUM(usedCount) as total FROM coupons').get();
    
    return {
      totalCoupons: totalCoupons.count,
      activeCoupons: activeCoupons.count,
      totalIssued: totalIssued.total || 0,
      totalUsed: totalUsed.total || 0
    };
  }

  // ========== 즐겨찾기 메뉴 ==========
  
  // 즐겨찾기 추가
  addFavoriteMenu(userId, menuId) {
    try {
      const stmt = this.db.prepare('INSERT OR IGNORE INTO favorite_menus (userId, menuId, createdAt) VALUES (?, ?, ?)');
      stmt.run(userId, menuId, new Date().toISOString());
      return true;
    } catch (e) {
      return false;
    }
  }

  // 즐겨찾기 제거
  removeFavoriteMenu(userId, menuId) {
    const stmt = this.db.prepare('DELETE FROM favorite_menus WHERE userId = ? AND menuId = ?');
    return stmt.run(userId, menuId).changes > 0;
  }

  // 사용자 즐겨찾기 목록
  getFavoriteMenus(userId) {
    return this.db.prepare(`
      SELECT m.*, fm.createdAt as favoritedAt
      FROM favorite_menus fm
      INNER JOIN menu m ON fm.menuId = m.id
      WHERE fm.userId = ?
      ORDER BY fm.createdAt DESC
    `).all(userId);
  }

  // 즐겨찾기 여부 확인
  isFavoriteMenu(userId, menuId) {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM favorite_menus WHERE userId = ? AND menuId = ?')
      .get(userId, menuId);
    return result.count > 0;
  }

  // ========== 주소록 ==========
  
  // 주소 저장
  saveAddress(userId, address, addressName, isDefault = false) {
    // 기본 주소로 설정 시 기존 기본 주소 해제
    if (isDefault) {
      this.db.prepare('UPDATE saved_addresses SET isDefault = 0 WHERE userId = ?').run(userId);
    }
    
    const stmt = this.db.prepare('INSERT INTO saved_addresses (userId, address, addressName, isDefault, createdAt) VALUES (?, ?, ?, ?, ?)');
    return stmt.run(userId, address, addressName, isDefault ? 1 : 0, new Date().toISOString());
  }

  // 주소 목록 조회
  getSavedAddresses(userId) {
    return this.db.prepare(`
      SELECT * FROM saved_addresses 
      WHERE userId = ? 
      ORDER BY isDefault DESC, createdAt DESC
    `).all(userId);
  }

  // 주소 삭제
  deleteAddress(userId, addressId) {
    const stmt = this.db.prepare('DELETE FROM saved_addresses WHERE id = ? AND userId = ?');
    return stmt.run(addressId, userId).changes > 0;
  }

  // 기본 주소 설정
  setDefaultAddress(userId, addressId) {
    this.db.prepare('UPDATE saved_addresses SET isDefault = 0 WHERE userId = ?').run(userId);
    const stmt = this.db.prepare('UPDATE saved_addresses SET isDefault = 1 WHERE id = ? AND userId = ?');
    return stmt.run(addressId, userId).changes > 0;
  }
}

module.exports = DB;

