// 메모리 기반 간단 DB (Railway용)
class DB {
  constructor() {
    this.menu = [];
    this.users = [];
    this.orders = [];
    this.pointHistory = [];
    this.phoneVerification = [];
    this.businessHours = null; // 요일별 영업시간 { 0: {open, close}, 1: {open, close}, ... } (0=일요일, 6=토요일)
    this.temporaryClosed = false; // 임시휴업 상태
    this.breakTime = null; // 요일별 브레이크타임 { 0: {start, end}, 1: {start, end}, ... }
    this.menuCosts = {}; // 메뉴별 원가 { menuId: cost }
    this.menuDiscounts = {}; // 메뉴별 할인 { menuId: { type: 'percent'|'fixed', value: number } }
    this.menuOptions = {}; // 메뉴별 옵션 { menuId: [{ name, price }] }
    this.initialized = false;
    this.init();
  }

  async init() {
    console.log('✅ 메모리 DB 초기화');
    await this.initMenu();
    this.initialized = true;
    console.log('✅ DB 초기화 완료');
  }
  
  isInitialized() {
    return this.initialized && this.menu.length > 0;
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
    
    // 메뉴별 기본 원가 설정 (판매가의 40% 가정)
    this.menu.forEach(menu => {
      if (!this.menuCosts[menu.id]) {
        this.menuCosts[menu.id] = Math.round(menu.price * 0.4); // 기본 원가: 판매가의 40%
      }
    });
    
    console.log('✅ 메뉴 초기화 완료:', this.menu.length, '개');
  }

  getAllMenu() {
    return this.menu;
  }

  // 메뉴 관리
  createMenu(menuData) {
    const newId = this.menu.length > 0 ? Math.max(...this.menu.map(m => m.id)) + 1 : 1;
    const newMenu = {
      id: newId,
      name: menuData.name,
      category: menuData.category || '기타',
      price: menuData.price || 0,
      image: menuData.image || '',
      bestseller: menuData.bestseller || 0
    };
    this.menu.push(newMenu);
    // 기본 원가 설정
    if (!this.menuCosts[newId]) {
      this.menuCosts[newId] = Math.round(newMenu.price * 0.4);
    }
    console.log('✅ 메뉴 생성:', newMenu);
    return newMenu;
  }

  updateMenu(menuId, menuData) {
    const index = this.menu.findIndex(m => m.id === menuId);
    if (index === -1) {
      throw new Error('메뉴를 찾을 수 없습니다.');
    }
    this.menu[index] = { ...this.menu[index], ...menuData };
    console.log('✅ 메뉴 수정:', this.menu[index]);
    return this.menu[index];
  }

  deleteMenu(menuId) {
    const index = this.menu.findIndex(m => m.id === menuId);
    if (index === -1) {
      throw new Error('메뉴를 찾을 수 없습니다.');
    }
    const deleted = this.menu.splice(index, 1)[0];
    // 관련 데이터 삭제
    delete this.menuCosts[menuId];
    delete this.menuDiscounts[menuId];
    delete this.menuOptions[menuId];
    console.log('✅ 메뉴 삭제:', deleted);
    return deleted;
  }

  getMenuById(menuId) {
    return this.menu.find(m => m.id === menuId);
  }

  // 할인 관리
  setMenuDiscount(menuId, discount) {
    if (!discount || (discount.type !== 'percent' && discount.type !== 'fixed')) {
      delete this.menuDiscounts[menuId];
      console.log('✅ 메뉴 할인 해제:', menuId);
      return null;
    }
    this.menuDiscounts[menuId] = {
      type: discount.type,
      value: discount.value || 0
    };
    console.log('✅ 메뉴 할인 설정:', menuId, this.menuDiscounts[menuId]);
    return this.menuDiscounts[menuId];
  }

  getMenuDiscount(menuId) {
    return this.menuDiscounts[menuId] || null;
  }

  getAllMenuDiscounts() {
    return { ...this.menuDiscounts };
  }

  // 옵션 관리
  setMenuOptions(menuId, options) {
    if (!options || !Array.isArray(options)) {
      delete this.menuOptions[menuId];
      console.log('✅ 메뉴 옵션 해제:', menuId);
      return [];
    }
    this.menuOptions[menuId] = options;
    console.log('✅ 메뉴 옵션 설정:', menuId, options);
    return this.menuOptions[menuId];
  }

  getMenuOptions(menuId) {
    return this.menuOptions[menuId] || [];
  }

  getAllMenuOptions() {
    return { ...this.menuOptions };
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
    // 숫자와 문자열 모두 비교 가능하도록 == 사용
    const user = this.users.find(u => u.userid == userId || String(u.userid) === String(userId));
    if (!user) {
      console.log('🔍 getUserById 실패:', {
        요청한userId: userId,
        요청한userId타입: typeof userId,
        전체사용자수: this.users.length,
        사용자userid목록: this.users.map(u => ({ userid: u.userid, 타입: typeof u.userid }))
      });
    }
    return user;
  }

  async getUserByName(name) {
    return this.users.filter(u => u.name === name);
  }

  updatePassword(phone, newPassword) {
    const user = this.users.find(u => u.phone === phone);
    if (user) {
      user.password = newPassword;
      return true;
    }
    return false;
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

  createOrder(orderData) {
    const order = {
      id: this.orders.length + 1,
      userid: orderData.userId || null,
      orderid: orderData.orderId,
      customername: orderData.customerName,
      customerphone: orderData.phone,
      address: orderData.address,
      items: JSON.stringify(orderData.items),
      totalprice: orderData.totalAmount,
      usedpoints: orderData.usedPoints || 0,
      earnedpoints: orderData.earnedPoints || 0,
      paymentmethod: orderData.paymentMethod || 'cash',
      status: orderData.status || 'pending',
      isguest: orderData.userId ? 0 : 1,
      phoneverified: 1,
      createdat: orderData.createdAt || new Date().getTime()
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

  // ========== 통계 및 분석 ==========
  
  // 지역별 주문 분석
  getOrdersByRegion() {
    const regionMap = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        const address = order.address || '';
        let region = '기타';
        
        if (address.includes('공도') || address.includes('공도읍')) {
          region = '공도읍';
        } else if (address.includes('미양') || address.includes('미양면')) {
          region = '미양면';
        } else if (address.includes('대덕') || address.includes('대덕면')) {
          region = '대덕면';
        } else if (address.includes('양성') || address.includes('양성면')) {
          region = '양성면';
        }
        
        if (!regionMap[region]) {
          regionMap[region] = {
            region,
            orderCount: 0,
            totalSales: 0,
            avgOrderAmount: 0
          };
        }
        
        regionMap[region].orderCount++;
        regionMap[region].totalSales += order.totalprice || order.totalAmount || 0;
      });
    
    const result = Object.values(regionMap).map(r => ({
      ...r,
      avgOrderAmount: r.orderCount > 0 ? r.totalSales / r.orderCount : 0
    }));
    
    return result.sort((a, b) => b.orderCount - a.orderCount);
  }

  // 일별 매출
  getDailySales(days = 30) {
    const now = new Date();
    const result = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        const orderDate = new Date(order.createdat || order.createdAt);
        const daysAgo = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
        
        if (daysAgo < days) {
          const dateKey = orderDate.toISOString().split('T')[0];
          
          if (!result[dateKey]) {
            result[dateKey] = {
              date: dateKey,
              orderCount: 0,
              totalSales: 0,
              totalPointsUsed: 0,
              totalPointsEarned: 0,
              cardSales: 0,
              cashSales: 0
            };
          }
          
          result[dateKey].orderCount++;
          result[dateKey].totalSales += order.totalprice || order.totalAmount || 0;
          result[dateKey].totalPointsUsed += order.usedpoints || order.usedPoints || 0;
          result[dateKey].totalPointsEarned += order.earnedpoints || order.earnedPoints || 0;
          
          if ((order.paymentmethod || order.paymentMethod) === 'card') {
            result[dateKey].cardSales += order.totalprice || order.totalAmount || 0;
          } else {
            result[dateKey].cashSales += order.totalprice || order.totalAmount || 0;
          }
        }
      });
    
    return Object.values(result).sort((a, b) => b.date.localeCompare(a.date));
  }

  // 월별 매출
  getMonthlySales(months = 12) {
    const result = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        const orderDate = new Date(order.createdat || order.createdAt);
        const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!result[monthKey]) {
          result[monthKey] = {
            month: monthKey,
            orderCount: 0,
            totalSales: 0,
            avgOrderAmount: 0
          };
        }
        
        result[monthKey].orderCount++;
        result[monthKey].totalSales += order.totalprice || order.totalAmount || 0;
      });
    
    return Object.values(result)
      .map(r => ({
        ...r,
        avgOrderAmount: r.orderCount > 0 ? r.totalSales / r.orderCount : 0
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, months);
  }

  // 오늘 통계
  getTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = this.orders.filter(o => {
      const orderDate = new Date(o.createdat || o.createdAt).toISOString().split('T')[0];
      return orderDate === today && o.status === 'completed';
    });
    
    const totalSales = todayOrders.reduce((sum, o) => sum + (o.totalprice || o.totalAmount || 0), 0);
    const amounts = todayOrders.map(o => o.totalprice || o.totalAmount || 0).filter(a => a > 0);
    
    return {
      orderCount: todayOrders.length,
      totalSales,
      avgOrderAmount: amounts.length > 0 ? totalSales / amounts.length : 0,
      maxOrderAmount: amounts.length > 0 ? Math.max(...amounts) : 0,
      minOrderAmount: amounts.length > 0 ? Math.min(...amounts) : 0
    };
  }

  // 정산 정보
  getSettlement(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const orders = this.orders.filter(o => {
      const orderDate = new Date(o.createdat || o.createdAt);
      return orderDate >= start && orderDate <= end && o.status === 'completed';
    });
    
    const grossSales = orders.reduce((sum, o) => sum + (o.totalprice || o.totalAmount || 0), 0);
    const pointsRedeemed = orders.reduce((sum, o) => sum + (o.usedpoints || o.usedPoints || 0), 0);
    const pointsIssued = orders.reduce((sum, o) => sum + (o.earnedpoints || o.earnedPoints || 0), 0);
    
    const cardPayments = orders
      .filter(o => (o.paymentmethod || o.paymentMethod) === 'card')
      .reduce((sum, o) => sum + (o.totalprice || o.totalAmount || 0), 0);
    
    const cashPayments = orders
      .filter(o => (o.paymentmethod || o.paymentMethod) !== 'card')
      .reduce((sum, o) => sum + (o.totalprice || o.totalAmount || 0), 0);
    
    return {
      totalOrders: orders.length,
      grossSales,
      pointsRedeemed,
      pointsIssued,
      cardPayments,
      cashPayments
    };
  }

  // 상위 고객
  getTopCustomers(limit = 10) {
    const customerMap = {};
    
    this.orders
      .filter(o => o.status === 'completed' && o.userid)
      .forEach(order => {
        const userId = order.userid;
        
        if (!customerMap[userId]) {
          customerMap[userId] = {
            userId,
            customerName: order.customername || order.customerName,
            phone: order.customerphone || order.phone,
            orderCount: 0,
            totalSpent: 0,
            avgOrderAmount: 0,
            lastOrderDate: order.createdat || order.createdAt
          };
        }
        
        customerMap[userId].orderCount++;
        customerMap[userId].totalSpent += order.totalprice || order.totalAmount || 0;
        
        const orderDate = new Date(order.createdat || order.createdAt);
        const lastDate = new Date(customerMap[userId].lastOrderDate);
        if (orderDate > lastDate) {
          customerMap[userId].lastOrderDate = order.createdat || order.createdAt;
        }
      });
    
    return Object.values(customerMap)
      .map(c => ({
        ...c,
        avgOrderAmount: c.orderCount > 0 ? c.totalSpent / c.orderCount : 0
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }

  // 인기 메뉴
  getPopularMenus(limit = 10) {
    const menuMap = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          
          if (Array.isArray(items)) {
            items.forEach(item => {
              const menuName = item.name;
              
              if (!menuMap[menuName]) {
                menuMap[menuName] = {
                  menuName,
                  totalQuantity: 0,
                  totalRevenue: 0,
                  orderCount: 0
                };
              }
              
              menuMap[menuName].totalQuantity += item.quantity || 1;
              menuMap[menuName].totalRevenue += (item.price || 0) * (item.quantity || 1);
              menuMap[menuName].orderCount++;
            });
          }
        } catch (e) {
          // JSON 파싱 오류 무시
        }
      });
    
    return Object.values(menuMap)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit);
  }

  // 시간대별 주문
  getTimeDistribution() {
    const hourMap = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        const orderDate = new Date(o.createdat || o.createdAt);
        const hour = orderDate.getHours();
        
        if (!hourMap[hour]) {
          hourMap[hour] = {
            hour,
            orderCount: 0,
            totalSales: 0
          };
        }
        
        hourMap[hour].orderCount++;
        hourMap[hour].totalSales += order.totalprice || order.totalAmount || 0;
      });
    
    return Object.values(hourMap).sort((a, b) => a.hour - b.hour);
  }

  // 실시간 통계
  getRealTimeStats() {
    const today = this.getTodayStats();
    
    const pending = this.orders.filter(o => o.status === 'pending' || o.status === 'accepted').length;
    const preparing = this.orders.filter(o => o.status === 'preparing').length;
    const delivering = this.orders.filter(o => o.status === 'delivering').length;
    
    const recentOrders = this.orders
      .slice()
      .sort((a, b) => {
        const timeA = a.createdat || a.createdAt || 0;
        const timeB = b.createdat || b.createdAt || 0;
        return timeB - timeA;
      })
      .slice(0, 5)
      .map(o => ({
        orderId: o.orderid || o.orderId,
        customerName: o.customername || o.customerName,
        totalAmount: o.totalprice || o.totalAmount,
        status: o.status,
        createdAt: o.createdat || o.createdAt
      }));
    
    return {
      today,
      pending,
      preparing,
      delivering,
      recentOrders
    };
  }

  // 주소에서 리(里) 추출
  extractRi(address) {
    if (!address) return '기타';
    
    // 리 패턴 찾기: "만정리", "진사리", "개소리" 등
    const riMatch = address.match(/([가-힣]+리)(\s|$)/);
    if (riMatch) {
      return riMatch[1]; // "만정리"
    }
    
    return '기타';
  }

  // 주소에서 아파트 단지명 추출
  extractApartment(address) {
    if (!address) return '기타';
    
    // 아파트 패턴 찾기
    const patterns = [
      /([가-힣]+아파트)/,           // "공도아파트"
      /([가-힣]+마을)/,              // "만정마을"
      /([가-힣]+힐스)/,              // "공도힐스"
      /([가-힣]+타운)/,              // "공도타운"
      /([가-힣]+빌라)/,              // "공도빌라"
      /([가-힣]+주택)/,              // "공도주택"
      /([가-힣]+주공)/,              // "공도주공"
      /([가-힣]+단지)/,              // "공도단지"
      /([가-힣]+APT)/i,              // "공도APT"
      /([가-힣]+apartment)/i         // "공도apartment"
    ];
    
    for (const pattern of patterns) {
      const match = address.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    // 아파트 단지명이 없으면 리 단위로 분류
    return this.extractRi(address);
  }

  // 리 단위 통계
  getOrdersByRi() {
    const riMap = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        const address = order.address || '';
        const ri = this.extractRi(address);
        
        if (!riMap[ri]) {
          riMap[ri] = {
            ri,
            orderCount: 0,
            totalSales: 0,
            avgOrderAmount: 0
          };
        }
        
        riMap[ri].orderCount++;
        riMap[ri].totalSales += order.totalprice || order.totalAmount || 0;
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
    const aptMap = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        const address = order.address || '';
        const apt = this.extractApartment(address);
        
        if (!aptMap[apt]) {
          aptMap[apt] = {
            apartment: apt,
            orderCount: 0,
            totalSales: 0,
            avgOrderAmount: 0,
            customerCount: new Set()
          };
        }
        
        aptMap[apt].orderCount++;
        aptMap[apt].totalSales += order.totalprice || order.totalAmount || 0;
        
        // 고객 수 계산 (전화번호 기준)
        const phone = order.customerphone || order.phone || '';
        if (phone) {
          aptMap[apt].customerCount.add(phone);
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

  // 영업시간 저장/조회 (요일별)
  saveBusinessHours(hours) {
    // hours는 { 0: {open, close}, 1: {open, close}, ... } 형식
    this.businessHours = hours ? { ...hours } : null;
    console.log('✅ 영업시간 저장:', this.businessHours);
  }

  getBusinessHours() {
    return this.businessHours || null;
  }

  // 임시휴업 설정
  setTemporaryClosed(closed) {
    this.temporaryClosed = closed;
    console.log('✅ 임시휴업 설정:', closed ? 'ON' : 'OFF');
  }

  getTemporaryClosed() {
    return this.temporaryClosed || false;
  }

  // 브레이크타임 설정 (요일별)
  setBreakTime(breakTime) {
    // breakTime은 { 0: {start, end}, 1: {start, end}, ... } 형식 또는 null
    this.breakTime = breakTime ? { ...breakTime } : null;
    console.log('✅ 브레이크타임 설정:', this.breakTime);
  }

  getBreakTime() {
    return this.breakTime || null;
  }

  // 메뉴 원가 설정
  setMenuCost(menuId, cost) {
    this.menuCosts[menuId] = cost;
    console.log(`✅ 메뉴 원가 설정: ID ${menuId} = ${cost}원`);
  }

  getMenuCost(menuId) {
    return this.menuCosts[menuId] || 0;
  }

  getAllMenuCosts() {
    return { ...this.menuCosts };
  }

  // 메뉴별 판매 분석 (판매량, 원가, 수익)
  getMenuSalesAnalysis() {
    const menuMap = {};
    
    // 메뉴 정보 매핑
    const menuInfoMap = {};
    this.menu.forEach(menu => {
      menuInfoMap[menu.name] = {
        id: menu.id,
        name: menu.name,
        price: menu.price,
        category: menu.category,
        cost: this.menuCosts[menu.id] || Math.round(menu.price * 0.4)
      };
    });
    
    // 주문 데이터 분석
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          
          if (Array.isArray(items)) {
            items.forEach(item => {
              const menuName = item.name;
              const menuInfo = menuInfoMap[menuName];
              
              if (!menuInfo) return;
              
              if (!menuMap[menuName]) {
                menuMap[menuName] = {
                  menuId: menuInfo.id,
                  menuName: menuInfo.name,
                  category: menuInfo.category,
                  price: menuInfo.price,
                  cost: menuInfo.cost,
                  totalQuantity: 0,
                  totalRevenue: 0,
                  totalCost: 0,
                  totalProfit: 0,
                  orderCount: 0
                };
              }
              
              const quantity = item.quantity || 1;
              const itemPrice = item.price || menuInfo.price;
              const itemCost = menuInfo.cost;
              
              menuMap[menuName].totalQuantity += quantity;
              menuMap[menuName].totalRevenue += itemPrice * quantity;
              menuMap[menuName].totalCost += itemCost * quantity;
              menuMap[menuName].totalProfit += (itemPrice - itemCost) * quantity;
              menuMap[menuName].orderCount++;
            });
          }
        } catch (e) {
          // JSON 파싱 오류 무시
        }
      });
    
    // 수익률 계산
    const result = Object.values(menuMap).map(menu => ({
      ...menu,
      profitMargin: menu.totalRevenue > 0 
        ? Math.round((menu.totalProfit / menu.totalRevenue) * 100 * 100) / 100 
        : 0,
      avgProfitPerUnit: menu.totalQuantity > 0 
        ? Math.round(menu.totalProfit / menu.totalQuantity) 
        : 0
    }));
    
    return result.sort((a, b) => b.totalProfit - a.totalProfit);
  }
}

module.exports = DB;

