# 🚂 Railway 배포 가이드

## ✅ 현재 상태

Railway에는 **메모리 DB 버전**이 배포되어 있습니다:
- `server-simple.js` 사용
- `database-simple.js` (메모리 저장)
- 서버 재시작 시 데이터 초기화됨

## 🔄 새 기능 배포하기

### 1단계: Git에 푸시
```cmd
cd C:\Users\j\시티반점앱
git add .
git commit -m "아이디/비번 찾기, 마이배민 개선"
git push origin main
```

### 2단계: Railway 자동 배포
```
Railway가 자동으로 감지하고 배포합니다.
약 2-3분 소요됩니다.
```

### 3단계: 확인
```
Railway 대시보드에서 배포 상태 확인
→ 배포 완료 후 도메인 접속
```

## 📱 Railway 주소 확인

Railway 대시보드에서:
```
1. 프로젝트 선택
2. Settings → Domains
3. 생성된 URL 복사
   (예: https://your-app.railway.app)
```

## 🆚 로컬 vs Railway

### 로컬 서버 (server.js):
```
✅ SQLite 데이터베이스
✅ 데이터 영구 저장
✅ 비밀번호 bcrypt 암호화
✅ 개발/테스트용
```

### Railway (server-simple.js):
```
✅ 메모리 데이터베이스
⚠️ 서버 재시작 시 데이터 초기화
✅ 배포 간편
✅ 외부 접속 가능
```

## 🎯 추천 사용법

### 개발/테스트:
```
→ 로컬 서버 사용 (server.js)
→ http://localhost:3000
```

### 외부 테스트/데모:
```
→ Railway 사용 (server-simple.js)
→ https://your-app.railway.app
```

### 실제 운영:
```
→ Railway + PostgreSQL
   또는
→ AWS/GCP 등 클라우드 서비스
```

## 🚀 빠른 배포 명령어

```cmd
# Windows
cd C:\Users\j\시티반점앱
git add .
git commit -m "업데이트"
git push

# Railway가 자동으로 배포합니다!
```

## ⚠️ 주의사항

Railway 무료 플랜:
```
- 월 500시간 무료
- 데이터 초기화 (메모리 DB)
- 유휴 시 슬립 모드
```

실제 운영 시:
```
→ PostgreSQL 연결 필요
→ 또는 유료 플랜 사용
```

## 🔗 Railway URL

Railway 대시보드:
```
https://railway.app/project/your-project-id
```

배포된 앱:
```
https://your-app-name.railway.app/order-new
```

## 💡 문제 해결

### 배포 실패:
```
1. Railway 대시보드 → Deployments
2. 로그 확인
3. 오류 메시지 확인
```

### 앱이 안 열려요:
```
1. Railway 대시보드 → Settings
2. PORT 환경변수 확인
3. server-simple.js의 PORT 설정 확인
```

### 데이터가 사라져요:
```
→ 정상입니다! (메모리 DB)
→ PostgreSQL 연결 필요
```



