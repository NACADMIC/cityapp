// PostgreSQL 데이터베이스 모듈 (Railway용 - 베타 테스트)
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

class DB {
  constructor() {
    // Railway PostgreSQL 연결
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    });
    this.init();
  }

  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async init() {
    try {
      console.log('🔄 PostgreSQL 데이터베이스 초기화 중...');

      // 메뉴 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS menu (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          price INTEGER NOT NULL,
          emoji TEXT,
          image TEXT,
          bestseller INTEGER DEFAULT 0,
          "isAvailable" INTEGER DEFAULT 1
        )
      `);
      
      // isAvailable 컬럼 추가 (기존 테이블에 없으면)
      try {
        await this.query('ALTER TABLE menu ADD COLUMN "isAvailable" INTEGER DEFAULT 1');
      } catch (err) {
        // 컬럼이 이미 있으면 무시
      }

      // 회원 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          "userId" SERIAL PRIMARY KEY,
          phone TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          address TEXT,
          password TEXT NOT NULL,
          points INTEGER DEFAULT 0,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 주문 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          "orderId" TEXT UNIQUE NOT NULL,
          "userId" INTEGER,
          "customerName" TEXT NOT NULL,
          phone TEXT NOT NULL,
          address TEXT NOT NULL,
          items TEXT NOT NULL,
          "totalAmount" INTEGER NOT NULL,
          "usedPoints" INTEGER DEFAULT 0,
          "earnedPoints" INTEGER DEFAULT 0,
          "paymentMethod" TEXT DEFAULT 'cash',
          status TEXT DEFAULT 'pending',
          "orderType" TEXT DEFAULT 'delivery',
          "deliveryFee" INTEGER DEFAULT 0,
          "isGuest" INTEGER DEFAULT 0,
          "phoneVerified" INTEGER DEFAULT 0,
          "impUid" TEXT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 포인트 내역 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS point_history (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "orderId" TEXT,
          amount INTEGER NOT NULL,
          type TEXT NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 전화번호 인증 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS phone_verification (
          id SERIAL PRIMARY KEY,
          phone TEXT NOT NULL,
          code TEXT NOT NULL,
          verified BOOLEAN DEFAULT false,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 쿠폰 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS coupons (
          id SERIAL PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          "discountType" TEXT NOT NULL,
          "discountValue" INTEGER NOT NULL,
          "minAmount" INTEGER DEFAULT 0,
          "maxDiscount" INTEGER,
          "validFrom" TIMESTAMP NOT NULL,
          "validTo" TIMESTAMP NOT NULL,
          "isActive" INTEGER DEFAULT 1,
          "issuedCount" INTEGER DEFAULT 0,
          "usedCount" INTEGER DEFAULT 0,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 쿠폰 사용 내역 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS coupon_usage (
          id SERIAL PRIMARY KEY,
          "couponId" INTEGER NOT NULL,
          "userId" INTEGER NOT NULL,
          "orderId" TEXT,
          "usedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 즐겨찾기 메뉴 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS favorite_menus (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "menuId" INTEGER NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("userId", "menuId")
        )
      `);

      // 주소록 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS saved_addresses (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          address TEXT NOT NULL,
          "addressName" TEXT NOT NULL,
          "isDefault" INTEGER DEFAULT 0,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 리뷰 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          "reviewId" SERIAL PRIMARY KEY,
          "orderId" TEXT NOT NULL,
          "userId" INTEGER NOT NULL,
          rating INTEGER NOT NULL,
          comment TEXT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 라이더 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS riders (
          "riderId" SERIAL PRIMARY KEY,
          phone TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password TEXT NOT NULL,
          status TEXT DEFAULT 'available',
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 영업시간 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS business_hours (
          id INTEGER PRIMARY KEY DEFAULT 1,
          "openHour" REAL NOT NULL,
          "closeHour" REAL NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ PostgreSQL 테이블 생성 완료');
      await this.initMenu();
    } catch (err) {
      console.error('❌ 데이터베이스 초기화 오류:', err);
    }
  }

  async initMenu() {
    try {
      const result = await this.query('SELECT COUNT(*) as count FROM menu');
      if (parseInt(result.rows[0].count) > 0) {
        console.log('✅ 메뉴 이미 존재');
        return;
      }

      const menuItems = [
        // 오늘의 메뉴
        { name: '짜장면', category: '오늘의메뉴', price: 6000, emoji: '🍜', bestseller: 1 },
        { name: '짬뽕', category: '오늘의메뉴', price: 7000, emoji: '🌶️', bestseller: 1 },
        // 추천 메뉴
        { name: '탕수육', category: '추천메뉴', price: 15000, emoji: '🥘', bestseller: 1 },
        { name: '깐풍기', category: '추천메뉴', price: 18000, emoji: '🍗', bestseller: 1 },
        { name: '양장피', category: '추천메뉴', price: 20000, emoji: '🥗', bestseller: 0 },
        // 면류
        { name: '짜장면', category: '면류', price: 6000, emoji: '🍜', bestseller: 0 },
        { name: '짬뽕', category: '면류', price: 7000, emoji: '🌶️', bestseller: 0 },
        { name: '울면', category: '면류', price: 7000, emoji: '🍝', bestseller: 0 },
        { name: '간짜장', category: '면류', price: 7000, emoji: '🍜', bestseller: 0 },
        // 밥류
        { name: '볶음밥', category: '밥류', price: 7000, emoji: '🍚', bestseller: 0 },
        { name: '짜장밥', category: '밥류', price: 6500, emoji: '🍚', bestseller: 0 },
        { name: '짬뽕밥', category: '밥류', price: 7500, emoji: '🍚', bestseller: 0 },
        // 디저트
        { name: '군만두', category: '디저트', price: 5000, emoji: '🥟', bestseller: 0 },
        { name: '물만두', category: '디저트', price: 5000, emoji: '🥟', bestseller: 0 },
        { name: '짬뽕순두부', category: '디저트', price: 8000, emoji: '🥘', bestseller: 0 },
        // 음료
        { name: '코카콜라 2L', category: '음료', price: 3500, emoji: '🥤', bestseller: 0 },
        { name: '제로콜라', category: '음료', price: 2500, emoji: '🥤', bestseller: 0 },
        { name: '사이다', category: '음료', price: 2000, emoji: '🥤', bestseller: 0 },
        { name: '매실', category: '음료', price: 3000, emoji: '🍵', bestseller: 0 },
        // 맥주
        { name: '테라', category: '맥주', price: 4500, emoji: '🍺', bestseller: 0 },
        { name: '카스', category: '맥주', price: 4000, emoji: '🍺', bestseller: 0 },
        { name: '기네스', category: '맥주', price: 6000, emoji: '🍺', bestseller: 0 },
        { name: '아사히', category: '맥주', price: 5000, emoji: '🍺', bestseller: 0 },
        { name: '칭따오', category: '맥주', price: 4500, emoji: '🍺', bestseller: 0 },
        // 소주
        { name: '참이슬', category: '소주', price: 4500, emoji: '🍶', bestseller: 0 },
        { name: '처음처럼', category: '소주', price: 4500, emoji: '🍶', bestseller: 0 },
        { name: '연태고량주(중)', category: '소주', price: 25000, emoji: '🍶', bestseller: 0 }
      ];

      for (const item of menuItems) {
        await this.query(
          'INSERT INTO menu (name, category, price, emoji, bestseller) VALUES ($1, $2, $3, $4, $5)',
          [item.name, item.category, item.price, item.emoji, item.bestseller]
        );
      }

      console.log('✅ 메뉴 초기화 완료');
    } catch (err) {
      console.error('❌ 메뉴 초기화 오류:', err);
    }
  }

  // ========== 메뉴 ==========
  async getAllMenu() {
    const result = await this.query('SELECT * FROM menu ORDER BY category, name');
    return result.rows;
  }

  // ========== 회원 ==========
  async createUser(phone, name, email, address, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await this.query(
      'INSERT INTO users (phone, name, email, address, password, points, "createdAt") VALUES ($1, $2, $3, $4, $5, 0, CURRENT_TIMESTAMP) RETURNING *',
      [phone, name, email || null, address || null, hashedPassword]
    );
    
    const user = result.rows[0];
    const userId = user.userId;
    
    // 🎁 신규 회원 가입 쿠폰 자동 발급 (즉시 처리)
    try {
      // 쿠폰 생성
      const welcomeCoupon = await this.createCoupon({
        code: `WELCOME${userId}`,
        name: '신규 회원 가입 쿠폰',
        discountType: 'fixed',
        discountValue: 10000,
        minAmount: 25000,
        maxDiscount: null,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true
      });
      
      if (!welcomeCoupon) {
        console.error(`❌ 쿠폰 생성 실패: userId=${userId}`);
      } else {
        // 쿠폰 발급 (즉시 처리)
        await this.issueCouponToUser(welcomeCoupon.id, userId);
        console.log(`✅ 신규 회원 가입: ${name} (${phone}) - 쿠폰 발급 완료: ${welcomeCoupon.code} (10,000원, 25,000원 이상 주문 시 사용 가능)`);
      }
    } catch (error) {
      // 쿠폰 발급 실패해도 회원가입은 성공 (나중에 수동 발급 가능)
      console.error(`❌ 회원가입 쿠폰 발급 오류 (userId=${userId}):`, error);
      console.error(`⚠️ 회원가입은 성공했으나 쿠폰 발급에 실패했습니다. 수동으로 발급해주세요.`);
    }
    
    return user;
  }

  async getUserByPhone(phone) {
    const result = await this.query('SELECT * FROM users WHERE phone = $1', [phone]);
    return result.rows[0] || null;
  }

  async getUserById(userId) {
    const result = await this.query('SELECT * FROM users WHERE "userId" = $1', [userId]);
    return result.rows[0] || null;
  }

  async getUserByName(name) {
    const result = await this.query('SELECT * FROM users WHERE name = $1', [name]);
    return result.rows;
  }

  async updatePassword(phone, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await this.query('UPDATE users SET password = $1 WHERE phone = $2', [hashedPassword, phone]);
    return result.rowCount > 0;
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async addPoints(userId, points) {
    await this.query('UPDATE users SET points = points + $1 WHERE "userId" = $2', [points, userId]);
  }

  async addPointHistory(userId, orderId, amount, type) {
    await this.query(
      'INSERT INTO point_history ("userId", "orderId", amount, type, "createdAt") VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
      [userId, orderId, amount, type]
    );
  }

  async getPointHistory(userId) {
    const result = await this.query(
      'SELECT * FROM point_history WHERE "userId" = $1 ORDER BY "createdAt" DESC',
      [userId]
    );
    return result.rows;
  }

  // ========== 주문 ==========
  async createOrder(orderData) {
    const result = await this.query(
      `INSERT INTO orders (
        "orderId", "userId", "customerName", phone, address, items, 
        "totalAmount", "usedPoints", "earnedPoints", "paymentMethod", 
        status, "orderType", "deliveryFee", "isGuest", "phoneVerified", "impUid", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP) RETURNING *`,
      [
        orderData.orderId,
        orderData.userId || null,
        orderData.customerName,
        orderData.phone,
        orderData.address,
        JSON.stringify(orderData.items),
        orderData.totalAmount,
        orderData.usedPoints || 0,
        orderData.earnedPoints || 0,
        orderData.paymentMethod || 'cash',
        orderData.status || 'pending',
        orderData.orderType || 'delivery',
        orderData.deliveryFee || 0,
        orderData.isGuest ? 1 : 0,
        orderData.phoneVerified ? 1 : 0,
        orderData.impUid || null
      ]
    );
    
    const order = result.rows[0];
    return {
      ...order,
      items: JSON.parse(order.items)
    };
  }

  async getAllOrders() {
    const result = await this.query('SELECT * FROM orders ORDER BY "createdAt" DESC');
    return result.rows.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));
  }

  async getOrderById(orderId) {
    const result = await this.query('SELECT * FROM orders WHERE "orderId" = $1', [orderId]);
    if (result.rows.length === 0) return null;
    const order = result.rows[0];
    return {
      ...order,
      items: JSON.parse(order.items)
    };
  }

  async updateOrderStatus(orderId, status) {
    await this.query('UPDATE orders SET status = $1 WHERE "orderId" = $2', [status, orderId]);
  }

  // ========== 전화번호 인증 ==========
  async createVerification(phone, code) {
    const result = await this.query(
      'INSERT INTO phone_verification (phone, code, "createdAt") VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *',
      [phone, code]
    );
    return result.rows[0];
  }

  async verifyPhone(phone, code) {
    const result = await this.query(
      'SELECT * FROM phone_verification WHERE phone = $1 AND code = $2 AND verified = false ORDER BY "createdAt" DESC LIMIT 1',
      [phone, code]
    );
    
    if (result.rows.length === 0) return false;
    
    const verification = result.rows[0];
    const now = new Date();
    const createdAt = new Date(verification.createdAt);
    const diff = (now - createdAt) / 1000 / 60;
    
    if (diff > 5) return false;
    
    await this.query('UPDATE phone_verification SET verified = true WHERE id = $1', [verification.id]);
    return true;
  }

  // ========== 쿠폰 ==========
  async createCoupon(couponData) {
    const result = await this.query(
      `INSERT INTO coupons (
        code, name, "discountType", "discountValue", "minAmount", "maxDiscount", 
        "validFrom", "validTo", "isActive", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP) RETURNING *`,
      [
        couponData.code,
        couponData.name,
        couponData.discountType,
        couponData.discountValue,
        couponData.minAmount || 0,
        couponData.maxDiscount || null,
        couponData.validFrom instanceof Date ? couponData.validFrom : new Date(couponData.validFrom),
        couponData.validTo instanceof Date ? couponData.validTo : new Date(couponData.validTo),
        couponData.isActive !== false ? 1 : 0
      ]
    );
    return result.rows[0];
  }

  async getCouponById(id) {
    const result = await this.query('SELECT * FROM coupons WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getCouponByCode(code) {
    const result = await this.query('SELECT * FROM coupons WHERE code = $1 AND "isActive" = 1', [code]);
    return result.rows[0] || null;
  }

  async getAllCoupons() {
    const result = await this.query('SELECT * FROM coupons ORDER BY id DESC');
    return result.rows;
  }

  async issueCouponToUser(couponId, userId) {
    try {
      await this.query('UPDATE coupons SET "issuedCount" = COALESCE("issuedCount", 0) + 1 WHERE id = $1', [couponId]);
      // usedAt을 NULL로 저장하여 미사용 상태 표시
      await this.query(
        'INSERT INTO coupon_usage ("couponId", "userId", "usedAt") VALUES ($1, $2, NULL)',
        [couponId, userId]
      );
      console.log(`✅ 쿠폰 발급 완료 (PG): couponId=${couponId}, userId=${userId}`);
    } catch (error) {
      console.error(`❌ 쿠폰 발급 오류 (PG):`, error);
      throw error;
    }
  }

  async useCoupon(couponId, userId, orderId) {
    // 이미 사용한 쿠폰인지 확인
    const existingUsage = await this.query(
      'SELECT * FROM coupon_usage WHERE "couponId" = $1 AND "userId" = $2 AND ("orderId" IS NOT NULL OR "usedAt" IS NOT NULL) ORDER BY id DESC LIMIT 1',
      [couponId, userId]
    );
    
    if (existingUsage.rows.length > 0 && (existingUsage.rows[0].orderId || existingUsage.rows[0].usedAt)) {
      console.error('❌ 이미 사용한 쿠폰입니다:', couponId, userId);
      return false;
    }
    
    // 사용 횟수 증가
    await this.query('UPDATE coupons SET "usedCount" = COALESCE("usedCount", 0) + 1 WHERE id = $1', [couponId]);
    
    // 쿠폰 사용 내역 업데이트 (orderId와 usedAt 추가)
    const usage = await this.query(
      'SELECT * FROM coupon_usage WHERE "couponId" = $1 AND "userId" = $2 AND ("orderId" IS NULL AND "usedAt" IS NULL) ORDER BY id DESC LIMIT 1',
      [couponId, userId]
    );
    
    if (usage.rows.length > 0) {
      // 기존 발급 내역 업데이트
      await this.query('UPDATE coupon_usage SET "orderId" = $1, "usedAt" = CURRENT_TIMESTAMP WHERE id = $2', [orderId, usage.rows[0].id]);
    } else {
      // 새로 추가 (발급되지 않은 경우)
      await this.query(
        'INSERT INTO coupon_usage ("couponId", "userId", "orderId", "usedAt") VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
        [couponId, userId, orderId]
      );
    }
    
    console.log(`✅ 쿠폰 사용 완료 (PG): couponId=${couponId}, userId=${userId}, orderId=${orderId}`);
    return true;
  }

  async getUserCoupons(userId) {
    // 사용하지 않은 쿠폰 조회 (orderId가 NULL이고 usedAt이 NULL인 경우)
    const result = await this.query(`
      SELECT c.*, cu.id as "usageId", cu."orderId", cu."usedAt"
      FROM coupons c
      INNER JOIN coupon_usage cu ON c.id = cu."couponId"
      WHERE cu."userId" = $1 AND (cu."orderId" IS NULL OR cu."usedAt" IS NULL)
      ORDER BY cu.id DESC
    `, [userId]);
    return result.rows.map(c => ({
      ...c,
      isActive: c.isActive === 1 || c.isActive === true,
      validFrom: new Date(c.validFrom),
      validTo: new Date(c.validTo)
    }));
  }

  // ========== 즐겨찾기 ==========
  async addFavoriteMenu(userId, menuId) {
    try {
      await this.query(
        'INSERT INTO favorite_menus ("userId", "menuId", "createdAt") VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING',
        [userId, menuId]
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  async removeFavoriteMenu(userId, menuId) {
    const result = await this.query('DELETE FROM favorite_menus WHERE "userId" = $1 AND "menuId" = $2', [userId, menuId]);
    return result.rowCount > 0;
  }

  async getFavoriteMenus(userId) {
    const result = await this.query(`
      SELECT m.*, fm."createdAt" as "favoritedAt"
      FROM favorite_menus fm
      INNER JOIN menu m ON fm."menuId" = m.id
      WHERE fm."userId" = $1
      ORDER BY fm."createdAt" DESC
    `, [userId]);
    return result.rows;
  }

  async isFavoriteMenu(userId, menuId) {
    const result = await this.query('SELECT COUNT(*) as count FROM favorite_menus WHERE "userId" = $1 AND "menuId" = $2', [userId, menuId]);
    return parseInt(result.rows[0].count) > 0;
  }

  // ========== 주소록 ==========
  async saveAddress(userId, address, addressName, isDefault = false) {
    if (isDefault) {
      await this.query('UPDATE saved_addresses SET "isDefault" = 0 WHERE "userId" = $1', [userId]);
    }
    const result = await this.query(
      'INSERT INTO saved_addresses ("userId", address, "addressName", "isDefault", "createdAt") VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
      [userId, address, addressName, isDefault ? 1 : 0]
    );
    return result.rows[0];
  }

  async getSavedAddresses(userId) {
    const result = await this.query(
      'SELECT * FROM saved_addresses WHERE "userId" = $1 ORDER BY "isDefault" DESC, "createdAt" DESC',
      [userId]
    );
    return result.rows;
  }

  async deleteAddress(userId, addressId) {
    const result = await this.query('DELETE FROM saved_addresses WHERE id = $1 AND "userId" = $2', [addressId, userId]);
    return result.rowCount > 0;
  }

  async setDefaultAddress(userId, addressId) {
    await this.query('UPDATE saved_addresses SET "isDefault" = 0 WHERE "userId" = $1', [userId]);
    const result = await this.query('UPDATE saved_addresses SET "isDefault" = 1 WHERE id = $1 AND "userId" = $2', [addressId, userId]);
    return result.rowCount > 0;
  }

  // ========== 리뷰 ==========
  async createReview(orderId, userId, rating, comment) {
    await this.query(
      'INSERT INTO reviews ("orderId", "userId", rating, comment, "createdAt") VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
      [orderId, userId, rating, comment || null]
    );
  }

  async getReviewsByOrderId(orderId) {
    const result = await this.query('SELECT * FROM reviews WHERE "orderId" = $1 ORDER BY "reviewId" DESC', [orderId]);
    return result.rows;
  }

  // ========== 라이더 ==========
  async createRider(phone, name, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await this.query(
      'INSERT INTO riders (phone, name, password, "createdAt") VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING *',
      [phone, name, hashedPassword]
    );
    return result.rows[0];
  }

  async getRiderByPhone(phone) {
    const result = await this.query('SELECT * FROM riders WHERE phone = $1', [phone]);
    return result.rows[0] || null;
  }

  async updateRiderStatus(riderId, status) {
    await this.query('UPDATE riders SET status = $1 WHERE "riderId" = $2', [status, riderId]);
  }

  // ========== 영업시간 ==========
  async saveBusinessHours(hours) {
    const existing = await this.query('SELECT * FROM business_hours WHERE id = 1');
    if (existing.rows.length > 0) {
      await this.query('UPDATE business_hours SET "openHour" = $1, "closeHour" = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE id = 1', [hours.open, hours.close]);
    } else {
      await this.query('INSERT INTO business_hours (id, "openHour", "closeHour", "updatedAt") VALUES (1, $1, $2, CURRENT_TIMESTAMP)', [hours.open, hours.close]);
    }
  }

  async getBusinessHours() {
    const result = await this.query('SELECT * FROM business_hours WHERE id = 1');
    if (result.rows.length > 0) {
      return {
        open: result.rows[0].openHour,
        close: result.rows[0].closeHour
      };
    }
    return null;
  }

  // 요일별 영업시간 저장/조회
  async saveBusinessHoursByDay(hours) {
    try {
      // 테이블 생성
      await this.query(`
        CREATE TABLE IF NOT EXISTS business_hours_by_day (
          day INTEGER PRIMARY KEY,
          "openHour" REAL NOT NULL,
          "closeHour" REAL NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // 트랜잭션 사용하여 안전하게 저장
      for (const [day, time] of Object.entries(hours)) {
        if (!time || typeof time.open !== 'number' || typeof time.close !== 'number') {
          console.warn(`⚠️ 잘못된 영업시간 데이터 건너뜀: day=${day}, time=`, time);
          continue;
        }
        
        const dayNum = parseInt(day);
        if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) {
          console.warn(`⚠️ 잘못된 요일 번호 건너뜀: ${day}`);
          continue;
        }
        
        try {
          const existing = await this.query('SELECT * FROM business_hours_by_day WHERE day = $1', [dayNum]);
          if (existing.rows.length > 0) {
            await this.query('UPDATE business_hours_by_day SET "openHour" = $1, "closeHour" = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE day = $3', 
              [time.open, time.close, dayNum]);
          } else {
            await this.query('INSERT INTO business_hours_by_day (day, "openHour", "closeHour", "updatedAt") VALUES ($1, $2, $3, CURRENT_TIMESTAMP)', 
              [dayNum, time.open, time.close]);
          }
        } catch (err) {
          console.error(`❌ 요일 ${day} 저장 오류:`, err);
          throw err; // 에러를 다시 던져서 상위에서 처리할 수 있도록
        }
      }
      console.log('✅ 요일별 영업시간 저장 완료 (PG)');
    } catch (e) {
      console.error('❌ 요일별 영업시간 저장 오류 (PG):', e);
      throw e; // 에러를 다시 던져서 상위에서 처리할 수 있도록
    }
  }

  async getBusinessHoursByDay() {
    try {
      await this.query(`
        CREATE TABLE IF NOT EXISTS business_hours_by_day (
          day INTEGER PRIMARY KEY,
          "openHour" REAL NOT NULL,
          "closeHour" REAL NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const result = await this.query('SELECT * FROM business_hours_by_day');
      const hours = {};
      result.rows.forEach(row => {
        hours[row.day] = {
          open: row.openHour,
          close: row.closeHour
        };
      });
      return hours;
    } catch (e) {
      console.error('요일별 영업시간 조회 오류 (PG):', e);
      return {};
    }
  }

  // 브레이크타임 저장/조회
  async saveBreakTime(breakTimes) {
    try {
      await this.query(`
        CREATE TABLE IF NOT EXISTS break_time (
          day INTEGER PRIMARY KEY,
          "startHour" REAL,
          "endHour" REAL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      for (const [day, bt] of Object.entries(breakTimes)) {
        const dayNum = parseInt(day);
        const existing = await this.query('SELECT * FROM break_time WHERE day = $1', [dayNum]);
        if (existing.rows.length > 0) {
          await this.query('UPDATE break_time SET "startHour" = $1, "endHour" = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE day = $3', 
            [bt.start || null, bt.end || null, dayNum]);
        } else {
          await this.query('INSERT INTO break_time (day, "startHour", "endHour", "updatedAt") VALUES ($1, $2, $3, CURRENT_TIMESTAMP)', 
            [dayNum, bt.start || null, bt.end || null]);
        }
      }
      console.log('✅ 브레이크타임 저장 완료 (PG)');
    } catch (e) {
      console.error('브레이크타임 저장 오류 (PG):', e);
    }
  }

  async getBreakTime() {
    try {
      await this.query(`
        CREATE TABLE IF NOT EXISTS break_time (
          day INTEGER PRIMARY KEY,
          "startHour" REAL,
          "endHour" REAL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const result = await this.query('SELECT * FROM break_time');
      const breakTimes = {};
      result.rows.forEach(row => {
        if (row.startHour !== null && row.endHour !== null) {
          breakTimes[row.day] = {
            start: row.startHour,
            end: row.endHour
          };
        }
      });
      return breakTimes;
    } catch (e) {
      console.error('브레이크타임 조회 오류 (PG):', e);
      return {};
    }
  }

  // 임시휴업 설정 저장/조회
  async saveTemporaryClosed(closed) {
    try {
      await this.query(`
        CREATE TABLE IF NOT EXISTS store_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          "temporaryClosed" INTEGER DEFAULT 0,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const existing = await this.query('SELECT * FROM store_settings WHERE id = 1');
      if (existing.rows.length > 0) {
        await this.query('UPDATE store_settings SET "temporaryClosed" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = 1', [closed ? 1 : 0]);
      } else {
        await this.query('INSERT INTO store_settings (id, "temporaryClosed", "updatedAt") VALUES (1, $1, CURRENT_TIMESTAMP)', [closed ? 1 : 0]);
      }
      console.log('✅ 임시휴업 설정 저장 완료 (PG):', closed);
    } catch (e) {
      console.error('임시휴업 설정 저장 오류 (PG):', e);
    }
  }

  async getTemporaryClosed() {
    try {
      await this.query(`
        CREATE TABLE IF NOT EXISTS store_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          "temporaryClosed" INTEGER DEFAULT 0,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const result = await this.query('SELECT * FROM store_settings WHERE id = 1');
      return result.rows.length > 0 ? (result.rows[0].temporaryClosed === 1) : false;
    } catch (e) {
      console.error('임시휴업 설정 조회 오류 (PG):', e);
      return false;
    }
  }

  // 가게 정보 저장/조회
  async saveStoreInfo(storeInfo) {
    try {
      await this.query(`
        CREATE TABLE IF NOT EXISTS store_info (
          id INTEGER PRIMARY KEY DEFAULT 1,
          name TEXT DEFAULT '시티반점',
          owner TEXT,
          phone TEXT,
          license TEXT,
          address TEXT,
          "kakaoChannelUrl" TEXT,
          "chatServiceUrl" TEXT,
          "deliveryFee" INTEGER DEFAULT 3000,
          "minOrderAmount" INTEGER DEFAULT 15000,
          "freeDeliveryThreshold" INTEGER DEFAULT 30000,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const existing = await this.query('SELECT * FROM store_info WHERE id = 1');
      if (existing.rows.length > 0) {
        await this.query(`
          UPDATE store_info 
          SET name = $1, owner = $2, phone = $3, license = $4, address = $5, 
              "kakaoChannelUrl" = $6, "chatServiceUrl" = $7, "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = 1
        `, [
          storeInfo.name || '시티반점',
          storeInfo.owner || null,
          storeInfo.phone || null,
          storeInfo.license || null,
          storeInfo.address || null,
          storeInfo.kakaoChannelUrl || null,
          storeInfo.chatServiceUrl || null
        ]);
      } else {
        await this.query(`
          INSERT INTO store_info (id, name, owner, phone, license, address, "kakaoChannelUrl", "chatServiceUrl", "updatedAt")
          VALUES (1, $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        `, [
          storeInfo.name || '시티반점',
          storeInfo.owner || null,
          storeInfo.phone || null,
          storeInfo.license || null,
          storeInfo.address || null,
          storeInfo.kakaoChannelUrl || null,
          storeInfo.chatServiceUrl || null
        ]);
      }
      console.log('✅ 가게 정보 저장 완료 (PG)');
    } catch (e) {
      console.error('가게 정보 저장 오류 (PG):', e);
    }
  }

  async getStoreInfo() {
    try {
      await this.query(`
        CREATE TABLE IF NOT EXISTS store_info (
          id INTEGER PRIMARY KEY DEFAULT 1,
          name TEXT DEFAULT '시티반점',
          owner TEXT,
          phone TEXT,
          license TEXT,
          address TEXT,
          "kakaoChannelUrl" TEXT,
          "chatServiceUrl" TEXT,
          "deliveryFee" INTEGER DEFAULT 3000,
          "minOrderAmount" INTEGER DEFAULT 15000,
          "freeDeliveryThreshold" INTEGER DEFAULT 30000,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const result = await this.query('SELECT * FROM store_info WHERE id = 1');
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          name: row.name || '시티반점',
          owner: row.owner || '',
          phone: row.phone || '',
          license: row.license || '',
          address: row.address || '',
          kakaoChannelUrl: row.kakaoChannelUrl || '',
          chatServiceUrl: row.chatServiceUrl || '',
          deliveryFee: row.deliveryFee || 3000,
          minOrderAmount: row.minOrderAmount || 15000,
          freeDeliveryThreshold: row.freeDeliveryThreshold || 30000
        };
      }
      return {
        name: '시티반점',
        owner: '',
        phone: '',
        license: '',
        address: '',
        kakaoChannelUrl: '',
        chatServiceUrl: '',
        deliveryFee: 3000,
        minOrderAmount: 15000,
        freeDeliveryThreshold: 30000
      };
    } catch (e) {
      console.error('가게 정보 조회 오류 (PG):', e);
      return {
        name: '시티반점',
        owner: '',
        phone: '',
        license: '',
        address: '',
        kakaoChannelUrl: '',
        chatServiceUrl: '',
        deliveryFee: 3000,
        minOrderAmount: 15000,
        freeDeliveryThreshold: 30000
      };
    }
  }

  // ========== 통계 ==========
  async getCouponStats() {
    const total = await this.query('SELECT COUNT(*) as count FROM coupons');
    const active = await this.query('SELECT COUNT(*) as count FROM coupons WHERE "isActive" = 1');
    const issued = await this.query('SELECT SUM("issuedCount") as total FROM coupons');
    const used = await this.query('SELECT SUM("usedCount") as total FROM coupons');
    
    return {
      totalCoupons: parseInt(total.rows[0].count),
      activeCoupons: parseInt(active.rows[0].count),
      totalIssued: parseInt(issued.rows[0].total || 0),
      totalUsed: parseInt(used.rows[0].total || 0)
    };
  }
}

module.exports = DB;

