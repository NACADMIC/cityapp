// 메모리 기반 간단 DB (Railway용)
class DB {
  constructor() {
    this.menu = [];
    this.users = [];
    this.orders = [];
    this.pointHistory = [];
    this.phoneVerification = [];
    this.init();
  }

  async init() {
    console.log('✅ 메모리 DB 초기화');
    await this.initMenu();
  }

  async initMenu() {
    this.menu = [
      { id: 1, name: '짜장면', category: '면류', price: 6000, emoji: '🍜', bestseller: 1 },
      { id: 2, name: '짬뽕', category: '면류', price: 7000, emoji: '🌶️', bestseller: 1 },
      { id: 3, name: '탕수육', category: '요리', price: 15000, emoji: '🥘', bestseller: 1 },
      { id: 4, name: '군만두', category: '요리', price: 5000, emoji: '🥟', bestseller: 0 },
      { id: 5, name: '볶음밥', category: '밥류', price: 7000, emoji: '🍚', bestseller: 0 },
      { id: 6, name: '울면', category: '면류', price: 7000, emoji: '🍝', bestseller: 0 },
      { id: 7, name: '깐풍기', category: '요리', price: 18000, emoji: '🍗', bestseller: 1 },
      { id: 8, name: '양장피', category: '요리', price: 20000, emoji: '🥗', bestseller: 0 }
    ];
    console.log('✅ 메뉴 초기화 완료');
  }

  async getAllMenu() {
    return this.menu;
  }

  async createUser(phone, name, password) {
    const user = {
      userid: this.users.length + 1,
      phone,
      name,
      password,
      points: 0,
      createdat: new Date()
    };
    this.users.push(user);
    return user;
  }

  async getUserByPhone(phone) {
    return this.users.find(u => u.phone === phone);
  }

  async getUserById(userId) {
    return this.users.find(u => u.userid == userId);
  }

  async addPoints(userId, points, type, description) {
    const user = this.users.find(u => u.userid == userId);
    if (user) {
      user.points += points;
      this.pointHistory.push({
        id: this.pointHistory.length + 1,
        userid: userId,
        points,
        type,
        description,
        createdat: new Date()
      });
    }
  }

  async getPointHistory(userId) {
    return this.pointHistory.filter(p => p.userid == userId);
  }

  async createOrder(orderData) {
    const order = {
      id: this.orders.length + 1,
      userid: orderData.userId || null,
      ...orderData,
      createdat: new Date()
    };
    this.orders.push(order);
    return order;
  }

  async getAllOrders() {
    return this.orders;
  }

  async getOrderById(orderId) {
    return this.orders.find(o => o.orderid === orderId);
  }

  async updateOrderStatus(orderId, status) {
    const order = this.orders.find(o => o.orderid === orderId);
    if (order) {
      order.status = status;
    }
  }

  async createVerification(phone, code) {
    const verification = {
      id: this.phoneVerification.length + 1,
      phone,
      code,
      verified: false,
      createdat: new Date()
    };
    this.phoneVerification.push(verification);
    return verification;
  }

  async verifyPhone(phone, code) {
    const verification = this.phoneVerification
      .filter(v => v.phone === phone && v.code === code && !v.verified)
      .sort((a, b) => b.createdat - a.createdat)[0];
    
    if (!verification) return false;
    
    const now = new Date();
    const diff = (now - verification.createdat) / 1000 / 60;
    
    if (diff > 5) return false;
    
    verification.verified = true;
    return true;
  }
}

module.exports = DB;

