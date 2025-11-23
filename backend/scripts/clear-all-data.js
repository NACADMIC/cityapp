// 모든 사용자/주문 데이터 삭제 스크립트 (메뉴는 유지)
const DB = require('../database');
const db = new DB();

console.log('⚠️ 경고: 모든 사용자 및 주문 데이터를 삭제합니다!');
console.log('메뉴 데이터는 유지됩니다.\n');

// 확인을 위해 3초 대기
setTimeout(() => {
  try {
    console.log('🗑️ 데이터 삭제 시작...\n');
    
    // 모든 관련 데이터 삭제
    db.db.prepare('DELETE FROM point_history').run();
    db.db.prepare('DELETE FROM coupon_usage').run();
    db.db.prepare('DELETE FROM favorite_menus').run();
    db.db.prepare('DELETE FROM saved_addresses').run();
    db.db.prepare('DELETE FROM reviews').run();
    db.db.prepare('DELETE FROM phone_verification').run();
    db.db.prepare('DELETE FROM orders').run();
    db.db.prepare('DELETE FROM users').run();
    
    // 쿠폰도 삭제 (선택적 - 원하면 주석 처리)
    // db.db.prepare('DELETE FROM coupons').run();
    
    console.log('✅ 모든 사용자 및 주문 데이터 삭제 완료');
    console.log('💡 메뉴 데이터는 유지되었습니다.');
    console.log('\n이제 실제 가입 데이터만 저장됩니다.');
    
  } catch (error) {
    console.error('❌ 삭제 오류:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}, 3000);

