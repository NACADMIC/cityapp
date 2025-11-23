# 🔐 GitHub 회원가입 가이드

## 1단계: GitHub 회원가입

### 1. GitHub 접속
https://github.com

### 2. 회원가입
1. 오른쪽 상단 **Sign up** 클릭
2. 또는 https://github.com/signup 접속

### 3. 정보 입력
- **Username**: 원하는 사용자명 (예: city-restaurant)
- **Email**: 이메일 주소
- **Password**: 비밀번호 (8자 이상, 영문+숫자+특수문자)
- **Verify your account**: 이메일 인증

### 4. 이메일 인증
- 입력한 이메일로 인증 메일 확인
- 메일의 **Verify email address** 클릭

### 5. 완료!
이제 GitHub 계정이 준비되었습니다! ✅

---

## 2단계: 새 저장소 만들기

### 1. 저장소 생성
1. GitHub 로그인 후
2. 오른쪽 상단 **+** 아이콘 클릭
3. **New repository** 선택

### 2. 저장소 정보 입력
- **Repository name**: `city-restaurant-app` (또는 원하는 이름)
- **Description**: `시티반점 주문 시스템` (선택사항)
- **Public** 선택 (무료)
- **Initialize this repository with a README** 체크 해제
- **Add .gitignore**: None
- **Choose a license**: None

### 3. Create repository 클릭

### 4. 저장소 주소 복사
생성된 페이지에서 주소 복사:
```
https://github.com/당신계정명/city-restaurant-app.git
```

---

## 3단계: 로컬에서 Git 설정

### 1. Git 사용자 정보 설정
```bash
git config --global user.name "당신이름"
git config --global user.email "당신이메일@example.com"
```

### 2. 저장소 연결
```bash
git remote add origin https://github.com/당신계정명/city-restaurant-app.git
```

---

## 4단계: 코드 업로드

### 1. 변경사항 추가
```bash
git add .
```

### 2. 커밋
```bash
git commit -m "시티반점 앱 초기 업로드"
```

### 3. 업로드
```bash
git push -u origin main
```

**첫 업로드 시:**
- GitHub 사용자명 입력
- GitHub 비밀번호 입력 (또는 Personal Access Token)

---

## 🔑 Personal Access Token (비밀번호 대신 사용)

GitHub는 2021년부터 비밀번호 대신 Personal Access Token을 사용합니다.

### Token 생성 방법:
1. GitHub → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token (classic)
4. **repo** 권한 선택
5. Generate token
6. **토큰 복사** (한 번만 보여줌!)
7. `git push` 시 비밀번호 대신 토큰 입력

---

## ✅ 완료 체크리스트

- [ ] GitHub 회원가입 완료
- [ ] 이메일 인증 완료
- [ ] 새 저장소 생성
- [ ] Git 사용자 정보 설정
- [ ] 저장소 연결
- [ ] 코드 업로드 완료

---

## 🚀 다음 단계

코드 업로드가 완료되면:
1. Railway 배포 진행
2. 자동 배포 완료
3. 도메인 받기

---

**회원가입 완료 후 알려주세요!** 다음 단계로 진행하겠습니다. 🎉

