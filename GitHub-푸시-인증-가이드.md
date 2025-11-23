# 🔐 GitHub 푸시 인증 가이드

## Personal Access Token 생성 방법

### 1. GitHub에서 Token 생성
1. GitHub 로그인
2. 오른쪽 상단 프로필 클릭 → **Settings**
3. 왼쪽 메뉴 맨 아래 **Developer settings**
4. **Personal access tokens** → **Tokens (classic)**
5. **Generate new token** → **Generate new token (classic)**
6. **Note**: `city2-push` (설명)
7. **Expiration**: 원하는 기간 선택 (90 days 권장)
8. **Select scopes**: **repo** 체크 (전체 권한)
9. 맨 아래 **Generate token** 클릭
10. **토큰 복사** (한 번만 보여줌! 저장해두세요)

### 2. 푸시 시 사용
```bash
git push origin main
```
- Username: `opunitacity-ui`
- Password: **복사한 토큰 붙여넣기**

---

## 또는 Git Credential Manager 사용

### Windows에서 자동 인증 설정
```bash
git config --global credential.helper manager-core
```

이후 푸시 시:
- 첫 푸시에서 사용자명/토큰 입력
- 이후 자동으로 저장되어 사용

---

## 빠른 푸시 방법

### 방법 1: Token 직접 사용
```bash
git push https://토큰@github.com/opunitacity-ui/city2.git main
```

### 방법 2: SSH 키 사용 (추천)
1. SSH 키 생성
2. GitHub에 공개키 등록
3. 원격 저장소를 SSH로 변경

---

**Token 생성 후 알려주시면 푸시를 진행하겠습니다!**

