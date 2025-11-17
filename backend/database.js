const Database = require('better-sqlite3');
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

    // 기본 메뉴 데이터
    const count = this.db.prepare('SELECT COUNT(*) as count FROM menu').get();
    if (count.count === 0) {
      const insert = this.db.prepare('INSERT INTO menu (name, category, price, emoji, bestseller) VALUES (?, ?, ?, ?, ?)');
      
      insert.run('짜장면', '면류', 6000, '🍜', 1);
      insert.run('짬뽕', '면류', 7000, '🍲', 1);
      insert.run('탕수육', '요리', 15000, '🍖', 1);
      insert.run('볶음밥', '밥류', 7000, '🍚', 0);
      insert.run('유산슬', '요리', 18000, '🥘', 0);
      insert.run('깐풍기', '요리', 16000, '🍗', 0);
    }
  }

  // 메뉴
  getAllMenu() {
    return this.db.prepare('SELECT * FROM menu').all();
  }

  // 회원
  createUser(data) {
    const stmt = this.db.prepare('INSERT INTO users (phone, name, password, createdAt) VALUES (?, ?, ?, ?)');
    return stmt.run(data.phone, data.name, data.password, data.createdAt);
  }

  getUserByPhone(phone) {
    return this.db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  }

  getUserById(userId) {
    return this.db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
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

