const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

class DB {
  constructor() {
    this.db = new Database(path.join(__dirname, 'restaurant.db'));
    this.init();
  }

  init() {
    // 기존 테이블 삭제 (개발 단계)
    try {
      this.db.exec('DROP TABLE IF EXISTS orders');
      this.db.exec('DROP TABLE IF EXISTS point_history');
      this.db.exec('DROP TABLE IF EXISTS phone_verification');
      console.log('✅ 기존 테이블 삭제 완료');
    } catch (err) {
      console.log('⚠️ 테이블 삭제 오류:', err.message);
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
        points INTEGER DEFAULT 10000,
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
    
    const stmt = this.db.prepare('INSERT INTO users (phone, name, email, address, password, points, createdAt) VALUES (?, ?, ?, ?, ?, 10000, ?)');
    const result = stmt.run(phone, name, email, address, hashedPassword, createdAt);
    
    // 포인트 내역 추가
    this.addPointHistory(result.lastInsertRowid, null, 10000, 'earn');
    
    return this.getUserById(result.lastInsertRowid);
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
}

module.exports = DB;

