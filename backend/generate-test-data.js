const DB = require('./database.js');
const db = new DB();

console.log('🎲 테스트 데이터 생성 시작...\n');

// 샘플 메뉴 (실제 데이터베이스에서 가져오기)
const menus = db.getAllMenu();

// 랜덤 함수들
function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(array) {
  return array[random(0, array.length - 1)];
}

function randomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(random(11, 20), random(0, 59), random(0, 59));
  return date.toISOString();
}

// 배달 지역
const regions = [
  { name: '공도읍', weight: 50 }, // 50% 확률
  { name: '미양면', weight: 25 }, // 25% 확률
  { name: '대덕면', weight: 15 }, // 15% 확률
  { name: '양성면', weight: 10 }  // 10% 확률
];

// 상세 주소
const addresses = {
  '공도읍': [
    '경기도 안성시 공도읍 만정리 123-45',
    '경기도 안성시 공도읍 진사리 234-56',
    '경기도 안성시 공도읍 양복리 345-67',
    '경기도 안성시 공도읍 당왕리 456-78',
    '경기도 안성시 공도읍 덕봉리 567-89'
  ],
  '미양면': [
    '경기도 안성시 미양면 개소리 111-22',
    '경기도 안성시 미양면 대신리 222-33',
    '경기도 안성시 미양면 금곡리 333-44'
  ],
  '대덕면': [
    '경기도 안성시 대덕면 모산리 444-55',
    '경기도 안성시 대덕면 건지리 555-66',
    '경기도 안성시 대덕면 내리 666-77'
  ],
  '양성면': [
    '경기도 안성시 양성면 덕봉리 777-88',
    '경기도 안성시 양성면 동항리 888-99',
    '경기도 안성시 양성면 미산리 999-00'
  ]
};

// 고객 이름
const names = [
  '김민수', '이영희', '박철수', '정수진', '최동욱',
  '강미정', '윤지훈', '임소연', '한준호', '오세영',
  '신은지', '조현우', '배수지', '송지아', '황태희',
  '노승민', '문채원', '서민준', '안유진', '장하늘'
];

// 전화번호 생성
function generatePhone() {
  return `010-${random(1000, 9999)}-${random(1000, 9999)}`;
}

// 지역 선택 (가중치 적용)
function selectRegion() {
  const totalWeight = regions.reduce((sum, r) => sum + r.weight, 0);
  let rand = random(1, totalWeight);
  
  for (const region of regions) {
    rand -= region.weight;
    if (rand <= 0) return region.name;
  }
  return regions[0].name;
}

// 주문 생성
function generateOrder(daysAgo, userId = null) {
  const region = selectRegion();
  const address = randomElement(addresses[region]);
  const customerName = randomElement(names);
  const phone = generatePhone();
  
  // 랜덤 메뉴 선택 (1~4개)
  const itemCount = random(1, 4);
  const items = [];
  const selectedMenus = new Set();
  
  while (items.length < itemCount) {
    const menu = randomElement(menus);
    if (!selectedMenus.has(menu.id)) {
      selectedMenus.add(menu.id);
      items.push({
        id: menu.id,
        name: menu.name,
        price: menu.price,
        quantity: random(1, 3)
      });
    }
  }
  
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const usedPoints = userId && random(0, 100) < 30 ? random(0, Math.min(3000, totalAmount)) : 0; // 30% 확률로 포인트 사용
  const finalAmount = totalAmount - usedPoints;
  const earnedPoints = userId ? Math.floor(finalAmount * 0.10) : 0;
  
  const paymentMethod = random(0, 100) < 60 ? 'card' : 'cash'; // 60% 카드, 40% 현금
  const status = 'completed'; // 모두 완료된 주문으로
  
  const orderId = 'TEST-' + Date.now() + '-' + random(1000, 9999);
  const createdAt = randomDate(daysAgo);
  
  return {
    orderId,
    userId: userId || null,
    customerName,
    phone,
    address,
    items: JSON.stringify(items),
    totalAmount: finalAmount,
    usedPoints,
    earnedPoints,
    paymentMethod,
    status,
    isGuest: userId ? 0 : 1,
    phoneVerified: 1,
    createdAt
  };
}

// 메인 실행 함수
(async function main() {
  // 테스트 회원 생성
  console.log('👥 테스트 회원 생성 중...');
  const testUsers = [];
  for (let i = 0; i < 10; i++) {
    const phone = `010-9000-${String(i + 1).padStart(4, '0')}`;
    const password = '1234';
    const name = randomElement(names);
    const email = `test${i + 1}@test.com`;
    const address = randomElement(addresses[selectRegion()]);
    
    try {
      await db.createUser(phone, name, email, address, password);
      const user = db.getUserByPhone(phone);
      testUsers.push(user.userId);
      console.log(`✅ ${name} (${phone})`);
    } catch (error) {
      // 이미 존재하는 경우 무시
      const user = db.getUserByPhone(phone);
      if (user) testUsers.push(user.userId);
    }
  }

  console.log(`\n📦 테스트 주문 생성 중 (최근 60일)...\n`);

  // 최근 60일간 주문 생성
  let totalOrders = 0;
  for (let day = 0; day < 60; day++) {
    // 하루에 3~8개 주문
    const ordersPerDay = random(3, 8);
    
    for (let i = 0; i < ordersPerDay; i++) {
      // 70% 회원, 30% 비회원
      const userId = random(0, 100) < 70 ? randomElement(testUsers) : null;
      const orderData = generateOrder(day, userId);
      
      try {
        db.createOrder(orderData);
        
        // 포인트 처리
        if (userId) {
          if (orderData.usedPoints > 0) {
            db.addPoints(userId, -orderData.usedPoints);
            db.addPointHistory(userId, orderData.orderId, -orderData.usedPoints, 'use');
          }
          if (orderData.earnedPoints > 0) {
            db.addPoints(userId, orderData.earnedPoints);
            db.addPointHistory(userId, orderData.orderId, orderData.earnedPoints, 'earn');
          }
        }
        
        totalOrders++;
        
        if (totalOrders % 50 === 0) {
          console.log(`📊 생성됨: ${totalOrders}건...`);
        }
      } catch (error) {
        console.error('주문 생성 오류:', error.message);
      }
    }
  }

  console.log('\n✅ 완료!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 총 생성된 주문: ${totalOrders}건`);
  console.log(`👥 총 생성된 회원: ${testUsers.length}명`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎉 테스트 데이터 생성 완료!');
  console.log('💡 이제 POS 대시보드에서 통계를 확인하세요!\n');

  process.exit(0);
})();

