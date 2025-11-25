# 🚀 Railway에 design 브랜치 배포하기

## ✅ 현재 상태
- ✅ `design` 브랜치 생성 완료
- ✅ GitHub에 푸시 완료
- ✅ `railway.json` 설정 파일 있음

## 📋 Railway 대시보드에서 설정하기 (가장 쉬운 방법)

### 방법 1: 기존 프로젝트에 design 브랜치 연결

1. **Railway 대시보드 접속**
   - https://railway.app 접속
   - 로그인

2. **기존 프로젝트 선택**
   - 현재 배포 중인 프로젝트 클릭

3. **브랜치 변경**
   - **Settings** 탭 클릭
   - **Source** 섹션 찾기
   - **Branch** 드롭다운에서 `design` 선택
   - 자동으로 재배포 시작됨! 🎉

### 방법 2: 새 서비스로 별도 배포 (추천!)

디자인 작업을 독립적으로 테스트하려면:

1. **Railway 대시보드 접속**
   - https://railway.app 접속
   - 로그인

2. **새 서비스 추가**
   - 기존 프로젝트 내에서 **+ New** 클릭
   - **GitHub Repo** 선택
   - `NACADMIC/cityapp` 저장소 선택

3. **브랜치 설정**
   - **Settings** → **Source** 섹션
   - **Branch** 드롭다운에서 `design` 선택
   - 자동으로 배포 시작됨!

4. **별도 도메인 생성**
   - **Settings** → **Networking**
   - **Generate Domain** 클릭
   - 예: `cityapp-design.up.railway.app`

## 🎯 이렇게 하면:

- **main 브랜치**: 기능 담당자 작업 → `cityapp-production.up.railway.app`
- **design 브랜치**: 디자인 작업 → `cityapp-design.up.railway.app`

각자 독립적으로 작업하고 테스트 가능! ✅

## 🔄 앞으로 작업할 때

```bash
# design 브랜치에서 작업
git add .
git commit -m "디자인: 작업 내용"
git push origin design

# Railway가 자동으로 배포합니다! (2-3분 소요)
```

## ⚙️ 환경 변수 설정

design 브랜치 서비스에도 동일한 환경 변수 설정 필요:

1. Railway 대시보드 → design 서비스 선택
2. **Variables** 탭
3. 기존 main 서비스와 동일한 변수 추가:
   - `NODE_ENV=production`
   - `PORT=3000`
   - 기타 필요한 API 키들

## 📱 배포 확인

1. Railway 대시보드 → **Deployments** 탭
2. 배포 상태 확인 (약 2-3분 소요)
3. 배포 완료 후 도메인으로 접속 테스트

## ✅ 완료!

이제 design 브랜치에 푸시하면 Railway에 자동 배포됩니다!

---

## 💡 팁

- **배포 로그 확인**: Railway 대시보드 → **Logs** 탭
- **배포 취소**: 배포 중 취소하려면 **Deployments** → **Redeploy** 클릭
- **이전 버전으로 롤백**: **Deployments** → 이전 배포 선택 → **Redeploy**

