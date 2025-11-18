# ✅ SQLite + 비밀번호 암호화 적용 완료!

## 🎉 무엇이 바뀌었나요?

### 1. **영구 데이터 저장** 💾
```
기존 (메모리):
- 서버 재시작 → 모든 데이터 삭제

개선 (SQLite):
- 서버 재시작 → 데이터 안전하게 보존!
- restaurant.db 파일에 저장
```

### 2. **비밀번호 암호화** 🔒
```
기존:
password: "1234"  // 평문 저장 (위험!)

개선:
password: "$2b$10$..."  // bcrypt 암호화 (안전!)
```

### 3. **포인트 10,000P 지급** 🎁
```
회원가입 시 자동으로 10,000P 적립!
```

---

## 🚀 실행 방법:

### Windows:
```
backend/START.bat 더블클릭!
```

### 수동 실행:
```bash
cd backend
npm install
node server.js
```

---

## 📁 생성되는 파일:

```
backend/
├── restaurant.db  ← 모든 데이터 저장!
├── server.js      ← SQLite 버전
└── database.js    ← bcrypt 암호화
```

---

## 🔒 보안 개선:

### 회원가입:
```javascript
1. 사용자가 비밀번호 입력: "mypassword123"
2. bcrypt로 암호화: "$2b$10$xyz..."
3. DB에 암호화된 비밀번호만 저장
```

### 로그인:
```javascript
1. 사용자가 비밀번호 입력: "mypassword123"
2. DB에서 암호화된 비밀번호 가져오기
3. bcrypt.compare()로 검증
4. ✅ 일치하면 로그인 성공!
```

---

## 💾 데이터 백업:

### 방법 1: 파일 복사
```
backend/restaurant.db 파일 복사
→ 다른 폴더에 보관
```

### 방법 2: 자동 백업 (권장)
```bash
# 매일 자동 백업
copy backend\restaurant.db backup\restaurant_%date%.db
```

---

## ✅ 테스트 방법:

### 1. 서버 실행
```
START.bat 실행
```

### 2. 회원가입
```
전화번호: 010-1234-5678
비밀번호: test1234
```

### 3. 서버 재시작
```
Ctrl+C → START.bat 다시 실행
```

### 4. 로그인 시도
```
✅ 로그인 성공!
✅ 데이터가 남아있음!
```

---

## 📊 DB 확인 방법:

### SQLite Browser 사용:
```
1. https://sqlitebrowser.org/ 다운로드
2. restaurant.db 열기
3. users 테이블 확인
   → 비밀번호가 암호화되어 있음!
```

### 콘솔 확인:
```javascript
// backend/server.js에서
const user = db.getUserByPhone('010-1234-5678');
console.log(user);
// {
//   userId: 1,
//   phone: '010-1234-5678',
//   name: '홍길동',
//   password: '$2b$10$...',  // 암호화됨!
//   points: 10000
// }
```

---

## 🔧 문제 해결:

### "better-sqlite3 설치 실패"
```bash
npm install --build-from-source better-sqlite3
```

### "bcrypt 설치 실패"
```bash
npm install --build-from-source bcrypt
```

### "restaurant.db 파일이 없어요"
```
→ 처음 실행 시 자동으로 생성됩니다!
```

---

## 🌐 외부 접속:

### Cloudflare Tunnel:
```
1. START.bat 실행 (서버)
2. START-EXTERNAL.bat 실행 (터널)
3. https://xxx.trycloudflare.com 주소 복사
```

---

## 📈 다음 단계 (선택):

### 1. Railway 배포 (유료)
```
- 24/7 운영
- PostgreSQL 사용
- 월 $5~10
```

### 2. 자동 백업 스크립트
```batch
@echo off
set backup_folder=backup_%date:~0,4%%date:~5,2%%date:~8,2%
mkdir %backup_folder%
copy backend\restaurant.db %backup_folder%\
```

### 3. 관리자 페이지
```
- 회원 관리
- 주문 통계
- 매출 분석
```

---

## 🎯 주요 기능:

✅ 영구 데이터 저장 (SQLite)
✅ 비밀번호 암호화 (bcrypt)
✅ 회원가입 포인트 10,000P
✅ 포인트 10% 적립
✅ 주문 내역 저장
✅ 전화번호 인증
✅ 비회원 주문
✅ 실시간 주문 알림 (Socket.io)

---

**이제 실제 운영 가능한 안전한 시스템입니다!** 🎉🔒

