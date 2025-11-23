# 🚀 시티반점 앱 배포 가이드

## ✅ 배포 준비 완료!

모든 기능이 구현되었고, 배포 설정이 완료되었습니다.

---

## 📋 배포 단계

### 1. Git 커밋 및 푸시

```bash
git add .
git commit -m "모든 기능 구현 완료"
git push origin main
```

### 2. Railway 자동 배포

Railway가 GitHub와 연동되어 있으면 자동으로 배포됩니다!

**확인 사항:**
- Railway 대시보드 → Deployments 탭
- 최신 커밋이 자동 배포되는지 확인

### 3. 환경 변수 설정

Railway Variables 탭에서 추가:

**필수:**
```
DATABASE_URL (Railway PostgreSQL 자동 생성)
```

**선택 (카카오 알림톡):**
```
KAKAO_ALIMTALK_API_KEY=your_key
KAKAO_ALIMTALK_SECRET=your_secret
KAKAO_PLUS_FRIEND_ID=@시티반점
KAKAO_TEMPLATE_CODE_ORDER=템플릿코드
KAKAO_TEMPLATE_CODE_DELIVERY=템플릿코드
KAKAO_TEMPLATE_CODE_COMPLETE=템플릿코드
KAKAO_TEST_MODE=true (테스트용)
```

**선택 (프린터):**
```
PRINTER_SERVER_URL=http://your-local-ip:3001
```

**선택 (PG 결제):**
```
IMP_KEY=your_imp_key
IMP_SECRET=your_imp_secret
```

---

## 🔍 배포 확인

### 1. 서버 실행 확인
- Railway Logs 탭에서 확인
- "✅ 서버 실행 중" 메시지 확인

### 2. URL 확인
- Railway에서 제공하는 URL 확인
- 예: `https://your-app.railway.app`

### 3. 기능 테스트
- 주문 페이지 접속: `https://your-app.railway.app/order-new`
- POS 페이지 접속: `https://your-app.railway.app/pos`

---

## 📝 배포 파일 확인

✅ `railway.json` - Railway 배포 설정
✅ `Procfile` - 시작 명령어
✅ `backend/package.json` - Node.js 설정
✅ `backend/server.js` - 메인 서버 파일

---

## 🎉 배포 완료!

배포가 완료되면 Railway URL로 접속하여 서비스를 사용할 수 있습니다!

---

## 💡 추가 팁

1. **로컬 프린터 서버**
   - `프린터서버-시작.bat` 실행
   - Cloudflare Tunnel로 외부 접속 가능하게 설정

2. **카카오 알림톡**
   - 템플릿 승인 후 환경 변수 설정
   - 테스트 모드로 먼저 확인

3. **데이터베이스**
   - Railway PostgreSQL 자동 생성
   - 백업 정기적으로 확인

---

## 🆘 문제 해결

**배포 실패 시:**
1. Railway Logs 확인
2. 환경 변수 확인
3. Node.js 버전 확인 (18.x 이상)

**데이터베이스 오류:**
- `DATABASE_URL` 확인
- Railway PostgreSQL 서비스 확인

---

배포 성공을 기원합니다! 🎊

