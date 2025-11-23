// PostgreSQL 테스트 데이터 삭제 스크립트
const DB = require('../database-pg-complete');
const db = new DB();

console.log('🗑️ PostgreSQL 테스트 데이터 삭제 시작...\n');

(async () => {
  try {
    // 테스트 사용자 삭제 (특정 패턴의 전화번호나 이름으로 구분)
    const testPhones = [
      '010-0000-0000',
      '010-1111-1111',
      '010-2222-2222',
      '010-3333-3333',
      '010-4444-4444',
      '010-5555-5555',
      '010-6666-6666',
      '010-7777-7777',
      '010-8888-8888',
      '010-9999-9999'
    ];
    
    const testNames = ['테스트', 'test', 'Test', 'TEST'];
    
    // 테스트 사용자 찾기 및 삭제
    const allUsers = await db.query('SELECT * FROM users');
    let deletedUsers = 0;
    
    for (const user of allUsers.rows) {
      const isTestUser = 
        testPhones.includes(user.phone) ||
        testNames.some(name => user.name.includes(name)) ||
        user.name.includes('테스트') ||
        (user.email && user.email.includes('test'));
      
      if (isTestUser) {
        const userId = user.userId;
        
        // 관련 데이터 삭제
        await db.query('DELETE FROM point_history WHERE "userId" = $1', [userId]);
        await db.query('DELETE FROM coupon_usage WHERE "userId" = $1', [userId]);
        await db.query('DELETE FROM favorite_menus WHERE "userId" = $1', [userId]);
        await db.query('DELETE FROM saved_addresses WHERE "userId" = $1', [userId]);
        await db.query('DELETE FROM reviews WHERE "userId" = $1', [userId]);
        
        // 주문 삭제
        await db.query('DELETE FROM orders WHERE "userId" = $1', [userId]);
        
        // 사용자 삭제
        await db.query('DELETE FROM users WHERE "userId" = $1', [userId]);
        
        deletedUsers++;
        console.log(`  삭제: ${user.name} (${user.phone})`);
      }
    }
    
    // 테스트 주문 삭제 (비회원 주문 중 테스트 데이터)
    const testOrders = await db.query(`
      SELECT * FROM orders 
      WHERE ("customerName" LIKE '%테스트%' OR "customerName" LIKE '%test%' OR "customerName" LIKE '%Test%')
      OR (phone LIKE '010-0000-%' OR phone LIKE '010-1111-%' OR phone LIKE '010-2222-%')
    `);
    
    let deletedOrders = 0;
    for (const order of testOrders.rows) {
      await db.query('DELETE FROM orders WHERE "orderId" = $1', [order.orderId]);
      deletedOrders++;
    }
    
    console.log(`\n✅ 삭제 완료:`);
    console.log(`   - 테스트 사용자: ${deletedUsers}명`);
    console.log(`   - 테스트 주문: ${deletedOrders}건`);
    console.log(`\n💡 실제 가입 데이터는 그대로 유지됩니다.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 삭제 오류:', error.message);
    process.exit(1);
  }
})();

