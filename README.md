# 🏮 시티반점 주문 시스템

배달 주문을 받고 관리하는 시스템입니다.

---

## 📋 기능

### 고객 앱 (`/order-new`)
- 회원가입 / 로그인
- 비회원 주문 (전화 인증)
- 메뉴 주문
- 포인트 적립/사용 (7%)
- 배달 현황 추적

### POS (`/pos/login.html`)
- 실시간 주문 수신
- 주문 수락/거절 팝업
- 소요시간 설정
- 음성 알림 (30초 반복)
- 배달 상태 관리
- 통계 확인

---

## 🚀 로컬 실행

### 1. 서버 시작
```
재설치-서버시작.bat 실행
```

### 2. 외부 접속 (Cloudflare)
```
START-EXTERNAL.bat 실행
→ https 주소 복사
```

---

## ☁️ Railway 배포

### 1. GitHub 푸시
```
서버배포.bat 실행
```

### 2. Railway 설정
1. https://railway.app 접속
2. cityapp 프로젝트 클릭
3. 자동 배포 대기
4. Settings → Networking → Generate Domain
5. Port: 3000 입력

### 3. 완료!
```
https://당신주소.up.railway.app/order-new
https://당신주소.up.railway.app/pos/login.html
```

---

## 📂 파일 구조

```
backend/
├── server-simple.js      # 메인 서버 (메모리 DB)
├── database-simple.js    # 메모리 기반 데이터베이스
├── package.json          # 의존성
└── public/
    ├── order-new/        # 고객 주문 앱
    ├── pos/              # POS 시스템
    └── track/            # 주문 추적
```

---

## ⚙️ 설정

### 영업시간 변경
`backend/server-simple.js` (24-27번째 줄):
```javascript
const businessHours = {
  open: 11,   // 시작 시간
  close: 23   // 종료 시간
};
```

### POS 비밀번호
`backend/public/pos/login.html` (23번째 줄):
```javascript
if (password === '1234') {  // 여기서 변경
```

---

## 💡 주의사항

- 메모리 DB 사용 (서버 재시작하면 데이터 초기화)
- 메뉴는 자동으로 재생성됨
- 프로덕션 사용 시 PostgreSQL 전환 권장

---

## 📱 연락처

문의사항이 있으면 알려주세요!



