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
      { id: 1, name: '짜장면', category: '오늘의메뉴', price: 6000, image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=400&fit=crop', bestseller: 1 },
      { id: 2, name: '짬뽕', category: '오늘의메뉴', price: 7000, image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=400&fit=crop', bestseller: 1 },
      
      // 추천 메뉴
      { id: 3, name: '탕수육', category: '추천메뉴', price: 15000, image: 'https://images.unsplash.com/photo-1626776876729-bab4eda639c7?w=400&h=400&fit=crop', bestseller: 1 },
      { id: 4, name: '깐풍기', category: '추천메뉴', price: 18000, image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=400&fit=crop', bestseller: 1 },
      { id: 5, name: '양장피', category: '추천메뉴', price: 20000, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop', bestseller: 0 },
      
      // 면류
      { id: 6, name: '짜장면', category: '면류', price: 6000, image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 7, name: '짬뽕', category: '면류', price: 7000, image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 8, name: '울면', category: '면류', price: 7000, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 9, name: '간짜장', category: '면류', price: 7000, image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=400&fit=crop', bestseller: 0 },
      
      // 밥류
      { id: 10, name: '볶음밥', category: '밥류', price: 7000, image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 11, name: '짜장밥', category: '밥류', price: 6500, image: 'https://images.unsplash.com/photo-1645177628172-a94c30a5f0cc?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 12, name: '짬뽕밥', category: '밥류', price: 7500, image: 'https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400&h=400&fit=crop', bestseller: 0 },
      
      // 디저트
      { id: 13, name: '군만두', category: '디저트', price: 5000, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 14, name: '물만두', category: '디저트', price: 5000, image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 15, name: '짬뽕순두부', category: '디저트', price: 8000, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=400&fit=crop', bestseller: 0 },
      
      // 음료
      { id: 16, name: '코카콜라 2L', category: '음료', price: 3500, image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 17, name: '제로콜라', category: '음료', price: 2500, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 18, name: '사이다', category: '음료', price: 2000, image: 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 19, name: '매실', category: '음료', price: 3000, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop', bestseller: 0 },
      
      // 맥주
      { id: 20, name: '테라', category: '맥주', price: 4500, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 21, name: '카스', category: '맥주', price: 4000, image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 22, name: '기네스', category: '맥주', price: 6000, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 23, name: '아사히', category: '맥주', price: 5000, image: 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 24, name: '칭따오', category: '맥주', price: 4500, image: 'https://images.unsplash.com/photo-1612528443702-f6741f70a049?w=400&h=400&fit=crop', bestseller: 0 },
      
      // 소주
      { id: 25, name: '참이슬', category: '소주', price: 4500, image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 26, name: '처음처럼', category: '소주', price: 4500, image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400&h=400&fit=crop', bestseller: 0 },
      { id: 27, name: '연태고량주(중)', category: '소주', price: 25000, image: 'https://images.unsplash.com/photo-1596040008861-378f1a2c8e62?w=400&h=400&fit=crop', bestseller: 0 }
    ];
    console.log('✅ 메뉴 초기화 완료:', this.menu.length, '개');
  }

  async getAllMenu() {
    return this.menu;
  }

  async createUser(phone, name, email, address, password) {
    const user = {
      userid: this.users.length + 1,
      phone,
      name,
      email: email || null,
      address: address || null,
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

