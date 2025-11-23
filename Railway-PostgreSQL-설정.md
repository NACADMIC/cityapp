# 🚀 Railway PostgreSQL 설정 가이드

## 베타 테스트를 위한 데이터 영구 저장 설정

### 문제점
- Railway에서 SQLite는 영구 저장이 안 될 수 있음
- 서버 재시작 시 데이터 손실 가능
- 베타 테스트 시 데이터 보존 필요

### 해결책: PostgreSQL 사용

---

## 📋 설정 단계

### 1단계: Railway에서 PostgreSQL 추가

1. Railway 대시보드 접속
2. 프로젝트 선택
3. **+ New** 버튼 클릭
4. **Database** → **Add PostgreSQL** 선택
5. 자동으로 PostgreSQL 서비스 생성됨

### 2단계: 환경 변수 자동 설정

Railway가 자동으로 `DATABASE_URL` 환경 변수를 설정합니다!
- 별도 설정 불필요
- 서버가 자동으로 PostgreSQL 사용

### 3단계: 코드 배포

```bash
git add .
git commit -m "PostgreSQL 지원 추가"
git push
```

Railway가 자동으로 배포하고 PostgreSQL에 연결합니다!

---

## ✅ 확인 방법

### 서버 로그 확인
Railway 대시보드 → **Deployments** → **Logs**에서:
```
✅ PostgreSQL 데이터베이스 사용 (Railway)
🔄 PostgreSQL 데이터베이스 초기화 중...
✅ PostgreSQL 테이블 생성 완료
✅ 메뉴 초기화 완료
```

### 데이터 확인
1. 회원가입 테스트
2. 주문 생성 테스트
3. 서버 재시작 후 데이터 확인 (데이터 유지됨!)

---

## 🔄 동작 방식

### 자동 선택
- **DATABASE_URL 있음** → PostgreSQL 사용 (Railway)
- **DATABASE_URL 없음** → SQLite 사용 (로컬 개발)

### 코드 변경 없음
- `server.js`가 자동으로 선택
- 모든 기능 동일하게 작동

---

## 💰 비용

### Railway 무료 플랜
- PostgreSQL: **월 5GB 무료**
- 충분한 용량 (베타 테스트용)

### 유료 플랜 필요 시
- 월 $5부터 시작
- 더 많은 용량 및 기능

---

## 🎯 베타 테스트 체크리스트

- [ ] Railway에 PostgreSQL 추가
- [ ] 환경 변수 확인 (DATABASE_URL 자동 설정됨)
- [ ] 코드 배포
- [ ] 회원가입 테스트
- [ ] 주문 생성 테스트
- [ ] 서버 재시작 후 데이터 확인

---

## 🚨 문제 해결

### PostgreSQL 연결 실패
1. Railway에서 PostgreSQL 서비스 확인
2. `DATABASE_URL` 환경 변수 확인
3. 서버 로그 확인

### 데이터가 보이지 않음
1. 테이블 생성 확인 (로그에서 확인)
2. 데이터베이스 직접 확인 (Railway → PostgreSQL → Data)

---

## 📞 완료!

이제 **데이터가 영구 저장**됩니다!
베타 테스트를 안심하고 진행하세요! 💪

