const { Pool } = require('pg');

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
      console.log('🔄 데이터베이스 초기화 중...');

      // 메뉴 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS menu (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          price INTEGER NOT NULL,
          emoji TEXT,
          bestseller INTEGER DEFAULT 0
        )
      `);

      // 회원 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          userId SERIAL PRIMARY KEY,
          phone TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password TEXT NOT NULL,
          points INTEGER DEFAULT 0,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 주문 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          orderId TEXT UNIQUE NOT NULL,
          userId INTEGER,
          customerName TEXT NOT NULL,
          customerPhone TEXT NOT NULL,
          address TEXT NOT NULL,
          items TEXT NOT NULL,
          totalPrice INTEGER NOT NULL,
          usedPoints INTEGER DEFAULT 0,
          earnedPoints INTEGER DEFAULT 0,
          isGuest BOOLEAN DEFAULT false,
          phoneVerified BOOLEAN DEFAULT false,
          status TEXT DEFAULT 'pending',
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 포인트 내역 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS point_history (
          id SERIAL PRIMARY KEY,
          userId INTEGER NOT NULL,
          points INTEGER NOT NULL,
          type TEXT NOT NULL,
          description TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 전화번호 인증 테이블
      await this.query(`
        CREATE TABLE IF NOT EXISTS phone_verification (
          id SERIAL PRIMARY KEY,
          phone TEXT NOT NULL,
          code TEXT NOT NULL,
          verified BOOLEAN DEFAULT false,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ 데이터베이스 테이블 생성 완료');
      await this.initMenu();
    } catch (err) {
      console.error('❌ 데이터베이스 초기화 오류:', err);
    }
  }

  async initMenu() {
    try {
      const result = await this.query('SELECT COUNT(*) as count FROM menu');
      if (result.rows[0].count > 0) {
        console.log('✅ 메뉴 이미 존재');
        return;
      }

      const menuItems = [
        { name: '짜장면', category: '면류', price: 6000, emoji: '🍜', bestseller: 1 },
        { name: '짬뽕', category: '면류', price: 7000, emoji: '🌶️', bestseller: 1 },
        { name: '탕수육', category: '요리', price: 15000, emoji: '🥘', bestseller: 1 },
        { name: '군만두', category: '요리', price: 5000, emoji: '🥟', bestseller: 0 },
        { name: '볶음밥', category: '밥류', price: 7000, emoji: '🍚', bestseller: 0 },
        { name: '울면', category: '면류', price: 7000, emoji: '🍝', bestseller: 0 },
        { name: '깐풍기', category: '요리', price: 18000, emoji: '🍗', bestseller: 1 },
        { name: '양장피', category: '요리', price: 20000, emoji: '🥗', bestseller: 0 }
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

  getAllMenu() {
    return this.query('SELECT * FROM menu ORDER BY category, name')
      .then(result => result.rows);
  }

  createUser(phone, name, password) {
    return this.query(
      'INSERT INTO users (phone, name, password, points, createdAt) VALUES ($1, $2, $3, 0, CURRENT_TIMESTAMP) RETURNING *',
      [phone, name, password]
    ).then(result => result.rows[0]);
  }

  getUserByPhone(phone) {
    return this.query('SELECT * FROM users WHERE phone = $1', [phone])
      .then(result => result.rows[0]);
  }

  getUserById(userId) {
    return this.query('SELECT * FROM users WHERE userId = $1', [userId])
      .then(result => result.rows[0]);
  }

  addPoints(userId, points, type, description) {
    return this.pool.connect().then(async (client) => {
      try {
        await client.query('BEGIN');
        
        await client.query(
          'UPDATE users SET points = points + $1 WHERE userId = $2',
          [points, userId]
        );
        
        await client.query(
          'INSERT INTO point_history (userId, points, type, description) VALUES ($1, $2, $3, $4)',
          [userId, points, type, description]
        );
        
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });
  }

  getPointHistory(userId) {
    return this.query(
      'SELECT * FROM point_history WHERE userId = $1 ORDER BY createdAt DESC',
      [userId]
    ).then(result => result.rows);
  }

  createOrder(orderData) {
    return this.query(
      `INSERT INTO orders (
        orderId, userId, customerName, customerPhone, address, items, 
        totalPrice, usedPoints, earnedPoints, isGuest, phoneVerified, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        orderData.orderId,
        orderData.userId || null,
        orderData.customerName,
        orderData.customerPhone,
        orderData.address,
        JSON.stringify(orderData.items),
        orderData.totalPrice,
        orderData.usedPoints || 0,
        orderData.earnedPoints || 0,
        orderData.isGuest || false,
        orderData.phoneVerified || false,
        'pending'
      ]
    ).then(result => result.rows[0]);
  }

  getAllOrders() {
    return this.query('SELECT * FROM orders ORDER BY createdAt DESC')
      .then(result => result.rows.map(order => ({
        ...order,
        items: JSON.parse(order.items)
      })));
  }

  getOrderById(orderId) {
    return this.query('SELECT * FROM orders WHERE orderId = $1', [orderId])
      .then(result => {
        if (result.rows.length === 0) return null;
        const order = result.rows[0];
        return {
          ...order,
          items: JSON.parse(order.items)
        };
      });
  }

  updateOrderStatus(orderId, status) {
    return this.query(
      'UPDATE orders SET status = $1 WHERE orderId = $2',
      [status, orderId]
    );
  }

  createVerification(phone, code) {
    return this.query(
      'INSERT INTO phone_verification (phone, code) VALUES ($1, $2) RETURNING *',
      [phone, code]
    ).then(result => result.rows[0]);
  }

  verifyPhone(phone, code) {
    return this.query(
      'SELECT * FROM phone_verification WHERE phone = $1 AND code = $2 AND verified = false ORDER BY createdAt DESC LIMIT 1',
      [phone, code]
    ).then(async (result) => {
      if (result.rows.length === 0) return false;
      
      const verification = result.rows[0];
      const now = new Date();
      const createdAt = new Date(verification.createdat);
      const diff = (now - createdAt) / 1000 / 60; // 분 단위
      
      if (diff > 5) return false; // 5분 초과
      
      await this.query(
        'UPDATE phone_verification SET verified = true WHERE id = $1',
        [verification.id]
      );
      
      return true;
    });
  }
}

module.exports = DB;



