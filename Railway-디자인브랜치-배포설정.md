# Railway 디자인 브랜치 배포 설정 가이드

## ✅ 완료된 작업
1. ✅ `design` 브랜치 생성 완료
2. ✅ 디자인 변경사항 커밋 완료
3. ✅ 원격 저장소에 `design` 브랜치 푸시 완료

## 🚀 Railway에서 design 브랜치 배포 설정하기

### 방법 1: 새 서비스로 배포 (권장)
디자인 작업을 독립적으로 테스트하고 싶다면:

1. **Railway 대시보드 접속**
   - https://railway.app 접속
   - 로그인

2. **새 프로젝트 생성**
   - "New Project" 클릭
   - "Deploy from GitHub repo" 선택
   - `NACADMIC/cityapp` 저장소 선택

3. **브랜치 설정**
   - "Settings" → "Source" 섹션
   - "Branch" 드롭다운에서 `design` 선택
   - 자동으로 배포 시작됨

### 방법 2: 기존 서비스에 브랜치 변경
기존 서비스를 design 브랜치로 전환:

1. **Railway 대시보드 접속**
   - 기존 프로젝트 선택

2. **브랜치 변경**
   - "Settings" → "Source" 섹션
   - "Branch" 드롭다운에서 `design` 선택
   - 자동으로 재배포됨

### 방법 3: 환경별 서비스 분리 (추천)
- **Production**: `main` 브랜치 (기능 담당자 작업)
- **Design Preview**: `design` 브랜치 (디자인 작업)

이렇게 하면:
- 각자 독립적으로 작업 가능
- 서로 영향을 주지 않음
- 나중에 main에 merge하기 쉬움

## 📝 브랜치 관리 가이드

### 일상적인 작업 흐름

```bash
# 1. design 브랜치로 전환
git checkout design

# 2. 작업 후 커밋
git add .
git commit -m "디자인: [작업 내용]"

# 3. 원격에 푸시
git push origin design
# Railway가 자동으로 배포함
```

### 나중에 main 브랜치와 합치기

```bash
# 1. main 브랜치로 전환
git checkout main

# 2. 최신 상태로 업데이트
git pull origin main

# 3. design 브랜치를 main에 merge
git merge design

# 4. 충돌 해결 후 푸시
git push origin main
```

## 🔄 현재 브랜치 확인

```bash
# 현재 브랜치 확인
git branch

# 모든 브랜치 확인 (원격 포함)
git branch -a
```

## ⚠️ 주의사항

1. **Railway 환경 변수**
   - design 브랜치 서비스에도 동일한 환경 변수 설정 필요
   - Database URL, API Keys 등

2. **데이터베이스**
   - 같은 DB를 사용할지, 별도 DB를 사용할지 결정
   - 테스트용이면 별도 DB 권장

3. **도메인**
   - design 브랜치는 별도 도메인/URL로 배포됨
   - 테스트용 URL 확인 필요

## 📞 문제 해결

### Railway에서 design 브랜치가 보이지 않을 때
- GitHub에서 브랜치가 제대로 푸시되었는지 확인
- Railway에서 "Redeploy" 클릭
- Railway 로그 확인: "View Logs" 버튼

### 배포가 실패할 때
- Railway 로그 확인
- `railway.json` 설정 확인
- `package.json` 의존성 확인

