// 데이터베이스 초기 데이터 시드 스크립트
// 재배포 후 데이터가 없을 때 실행

const { Pool } = require('pg');

async function seedDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL이 설정되지 않았습니다. PostgreSQL 데이터베이스가 필요합니다.');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 데이터베이스 시드 시작...');

    // 메뉴 확인
    const menuCheck = await pool.query('SELECT COUNT(*) as count FROM menu');
    if (parseInt(menuCheck.rows[0].count) === 0) {
      console.log('📝 메뉴 데이터 시드 중...');
      
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
        await pool.query(
          'INSERT INTO menu (name, category, price, emoji, bestseller, "isAvailable") VALUES ($1, $2, $3, $4, $5, 1)',
          [item.name, item.category, item.price, item.emoji, item.bestseller]
        );
      }

      console.log('✅ 메뉴 데이터 시드 완료');
    } else {
      console.log('✅ 메뉴 데이터 이미 존재 (시드 건너뜀)');
    }

    // 영업시간 확인
    const hoursCheck = await pool.query('SELECT COUNT(*) as count FROM business_hours');
    if (parseInt(hoursCheck.rows[0].count) === 0) {
      console.log('📝 영업시간 데이터 시드 중...');
      await pool.query(
        'INSERT INTO business_hours (id, "openHour", "closeHour") VALUES (1, 10, 22) ON CONFLICT (id) DO NOTHING'
      );
      console.log('✅ 영업시간 데이터 시드 완료');
    } else {
      console.log('✅ 영업시간 데이터 이미 존재 (시드 건너뜀)');
    }

    console.log('✅ 데이터베이스 시드 완료!');
  } catch (error) {
    console.error('❌ 데이터베이스 시드 오류:', error);
  } finally {
    await pool.end();
  }
}

// 직접 실행 시
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

