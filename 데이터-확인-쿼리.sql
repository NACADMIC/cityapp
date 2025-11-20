-- Railway PostgreSQL 데이터 확인 쿼리
-- Railway → PostgreSQL 서비스 → Data → Query에서 실행

-- 1. 전체 회원 수 확인
SELECT COUNT(*) as total_users FROM users;

-- 2. 최근 가입 회원 (최신 10명)
SELECT 
    "userId", 
    name, 
    phone, 
    points,
    "createdAt"
FROM users 
ORDER BY "createdAt" DESC 
LIMIT 10;

-- 3. 전체 주문 수 확인
SELECT COUNT(*) as total_orders FROM orders;

-- 4. 최근 주문 (최신 10건)
SELECT 
    "orderId", 
    "customerName", 
    phone, 
    status,
    "totalAmount",
    "createdAt"
FROM orders
ORDER BY "createdAt" DESC
LIMIT 10;

-- 5. 메뉴 수 확인
SELECT COUNT(*) as total_menu FROM menu;

-- 6. 메뉴 목록 확인
SELECT id, name, category, price, "isAvailable"
FROM menu
ORDER BY category, name;

-- 7. 쿠폰 수 확인
SELECT COUNT(*) as total_coupons FROM coupons;

-- 8. 포인트 내역 확인
SELECT COUNT(*) as total_point_history FROM point_history;

-- 9. 전체 테이블 목록
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 10. 데이터베이스 크기 확인
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size;

