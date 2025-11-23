# 🔑 SSH 키 생성 및 GitHub 등록 가이드

## SSH 키 생성 (선택사항)

### 1. SSH 키 생성
```bash
ssh-keygen -t ed25519 -C "opunitacitty@gmail.com"
```
- Enter 키 3번 (기본 설정 사용)
- 키가 생성됨: `C:\Users\opuni\.ssh\id_ed25519.pub`

### 2. 공개키 복사
```bash
cat ~/.ssh/id_ed25519.pub
```
또는
```bash
type C:\Users\opuni\.ssh\id_ed25519.pub
```

### 3. GitHub에 등록
1. https://github.com/settings/keys 접속
2. **New SSH key** 클릭
3. **Title**: `Windows PC` (설명)
4. **Key**: 복사한 공개키 붙여넣기
5. **Add SSH key** 클릭

### 4. 푸시
```bash
git push origin main
```

---

## 또는 HTTPS + Token 사용 (더 간단)

### 1. Personal Access Token 생성
1. https://github.com/settings/tokens
2. **Generate new token (classic)**
3. **repo** 권한 체크
4. 토큰 복사

### 2. 푸시
```bash
git push origin main
```
- Username: `opunitacity-ui`
- Password: **토큰 붙여넣기**

---

**어떤 방법을 사용하시겠습니까?**
1. SSH 키 생성 (한 번 설정하면 계속 사용)
2. HTTPS + Token (간단하지만 매번 토큰 필요)

