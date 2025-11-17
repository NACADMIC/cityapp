# 🚀 Railway 배포 가이드

## ✅ 준비 완료!

모든 파일이 준비되었습니다. 이제 Railway에 배포하면 됩니다!

---

## 📋 Railway 배포 방법

### 방법 1: GitHub 연동 (추천! 가장 쉬움)

#### 1단계: GitHub 계정 만들기
- https://github.com 접속
- 회원가입 (무료)

#### 2단계: 프로젝트를 GitHub에 업로드

**Windows 명령어:**
```bash
# Git 설치 확인
git --version

# 없으면 https://git-scm.com/download/win 에서 다운로드

# 프로젝트 폴더에서 실행
cd C:\Users\j\시티반점앱
git init
git add .
git commit -m "시티반점 앱 첫 배포"

# GitHub에서 새 Repository 만들고 주소 복사 후:
git remote add origin https://github.com/당신아이디/시티반점앱.git
git branch -M main
git push -u origin main
```

#### 3단계: Railway 배포
1. https://railway.app 접속
2. "Start a New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. GitHub 연동 허용
5. 방금 만든 저장소 선택
6. 자동 배포 시작! ✨

#### 4단계: 주소 확인
- Settings → Domains → Generate Domain
- 예: `citybanjeom.up.railway.app`

---

### 방법 2: Railway CLI (고급 사용자용)

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성 및 배포
cd C:\Users\j\시티반점앱
railway init
railway up
```

---

## 🎯 배포 후 확인할 주소들

배포 완료 후 이런 주소를 받게 됩니다:

```
기본 주소: https://당신프로젝트.up.railway.app

고객 주문: https://당신프로젝트.up.railway.app/order-new
POS 접속: https://당신프로젝트.up.railway.app/pos/login.html
주문 추적: https://당신프로젝트.up.railway.app/track
```

---

## ✅ 영업시간 설정

현재 설정:
- **영업시간: 오전 11시 ~ 밤 11시**

변경하려면 `backend/server.js` 수정:

```javascript
const businessHours = {
  open: 11,   // 오전 11시
  close: 23   // 밤 11시
};
```

---

## 🎉 배포 완료 후

### 1. 모바일 웹 접속
- 고객에게 주소 공유: `https://당신주소.up.railway.app/order-new`

### 2. POS 접속
- 매장 PC 브라우저에서: `https://당신주소.up.railway.app/pos/login.html`
- 비밀번호: `1234`

### 3. 영업시간 외 테스트
- 주문 페이지 접속하면: "현재 영업시간이 아닙니다" 표시

---

## 💰 비용

- **Railway 무료 플랜:**
  - 500시간/월 (매달 리셋)
  - 하루 24시간 × 30일 = 720시간
  - **→ 하루 16시간 이상 사용 가능!**
  - 영업시간 12시간이면 **충분함!**

- **무료 티어 초과 시:**
  - 유료 플랜: $5/월
  - 무제한 사용 가능

---

## 🔧 문제 해결

### 배포 실패 시:
1. Railway 대시보드 → Deployments → Logs 확인
2. `npm install` 오류 → `package.json` 확인
3. PORT 오류 → Railway가 자동으로 PORT 설정함 (걱정 안해도 됨)

### 데이터베이스 초기화:
- Railway는 매번 새로 시작하므로 메뉴 데이터가 초기화됩니다
- 메뉴는 `database.js`의 `initMenu()`에서 자동 생성됩니다

---

## 📱 다음 단계

1. ✅ Railway 배포
2. ✅ 고정 주소 받기
3. ✅ 영업시간 체크
4. 📱 모바일 앱 개발 (React Native)
5. 🍎 앱스토어 배포

---

**준비 완료! Railway 계정만 만들면 바로 배포 가능합니다!** 🚀

