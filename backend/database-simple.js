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
      // 오늘의 메뉴
      { id: 1, name: '짜장면', category: '오늘의메뉴', price: 6000, image: 'https://via.placeholder.com/200x200/FFD700/1a1a1a?text=짜장면', bestseller: 1 },
      { id: 2, name: '짬뽕', category: '오늘의메뉴', price: 7000, image: 'https://via.placeholder.com/200x200/FF6B6B/ffffff?text=짬뽕', bestseller: 1 },
      
      // 추천 메뉴
      { id: 3, name: '탕수육', category: '추천메뉴', price: 15000, image: 'https://via.placeholder.com/200x200/FFA500/ffffff?text=탕수육', bestseller: 1 },
      { id: 4, name: '깐풍기', category: '추천메뉴', price: 18000, image: 'https://via.placeholder.com/200x200/FF4500/ffffff?text=깐풍기', bestseller: 1 },
      { id: 5, name: '양장피', category: '추천메뉴', price: 20000, image: 'https://via.placeholder.com/200x200/90EE90/1a1a1a?text=양장피', bestseller: 0 },
      
      // 면류
      { id: 6, name: '짜장면', category: '면류', price: 6000, image: 'https://via.placeholder.com/200x200/FFD700/1a1a1a?text=짜장면', bestseller: 0 },
      { id: 7, name: '짬뽕', category: '면류', price: 7000, image: 'https://via.placeholder.com/200x200/FF6B6B/ffffff?text=짬뽕', bestseller: 0 },
      { id: 8, name: '울면', category: '면류', price: 7000, image: 'https://via.placeholder.com/200x200/87CEEB/1a1a1a?text=울면', bestseller: 0 },
      { id: 9, name: '간짜장', category: '면류', price: 7000, image: 'https://via.placeholder.com/200x200/8B4513/ffffff?text=간짜장', bestseller: 0 },
      
      // 밥류
      { id: 10, name: '볶음밥', category: '밥류', price: 7000, image: 'https://via.placeholder.com/200x200/FFE4B5/1a1a1a?text=볶음밥', bestseller: 0 },
      { id: 11, name: '짜장밥', category: '밥류', price: 6500, image: 'https://via.placeholder.com/200x200/DEB887/1a1a1a?text=짜장밥', bestseller: 0 },
      { id: 12, name: '짬뽕밥', category: '밥류', price: 7500, image: 'https://via.placeholder.com/200x200/FA8072/ffffff?text=짬뽕밥', bestseller: 0 },
      
      // 디저트
      { id: 13, name: '군만두', category: '디저트', price: 5000, image: 'https://via.placeholder.com/200x200/F5DEB3/1a1a1a?text=군만두', bestseller: 0 },
      { id: 14, name: '물만두', category: '디저트', price: 5000, image: 'https://via.placeholder.com/200x200/E6E6FA/1a1a1a?text=물만두', bestseller: 0 },
      { id: 15, name: '짬뽕순두부', category: '디저트', price: 8000, image: 'https://via.placeholder.com/200x200/FFB6C1/1a1a1a?text=순두부', bestseller: 0 },
      
      // 음료
      { id: 16, name: '콜라', category: '음료', price: 2000, image: 'https://via.placeholder.com/200x200/8B0000/ffffff?text=콜라', bestseller: 0 },
      { id: 17, name: '사이다', category: '음료', price: 2000, image: 'https://via.placeholder.com/200x200/98FB98/1a1a1a?text=사이다', bestseller: 0 },
      { id: 18, name: '환타', category: '음료', price: 2000, image: 'https://via.placeholder.com/200x200/FFA500/ffffff?text=환타', bestseller: 0 },
      
      // 주류
      { id: 19, name: '소주', category: '주류', price: 4000, image: 'https://via.placeholder.com/200x200/32CD32/ffffff?text=소주', bestseller: 0 },
      { id: 20, name: '맥주', category: '주류', price: 4000, image: 'https://via.placeholder.com/200x200/FFD700/1a1a1a?text=맥주', bestseller: 0 },
      { id: 21, name: '칭따오', category: '주류', price: 4500, image: 'https://via.placeholder.com/200x200/4169E1/ffffff?text=칭따오', bestseller: 0 }
    ];
    console.log('✅ 메뉴 초기화 완료:', this.menu.length, '개');
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
      points: 10000, // 🎁 회원가입 시 10,000P 지급!
      createdat: new Date()
    };
    this.users.push(user);
    
    // 포인트 내역 추가
    this.pointHistory.push({
      id: this.pointHistory.length + 1,
      userid: user.userid,
      points: 10000,
      type: 'earn',
      description: '회원가입 축하 포인트',
      createdat: new Date()
    });
    
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

