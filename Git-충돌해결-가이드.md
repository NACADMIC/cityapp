# 🔧 Git 충돌 해결 가이드

## 문제 상황

원격 저장소(GitHub)에 로컬에 없는 변경사항이 있어서 push가 거부되었습니다.

---

## ✅ 해결 방법

### 방법 1: 원격 변경사항 가져오기 (추천)

**Git Bash 또는 CMD에서 실행:**

```bash
# 1. 원격 변경사항 가져오기
git pull origin main

# 2. 충돌이 있으면 해결 후
git add .
git commit -m "충돌 해결"

# 3. 다시 push
git push origin main
```

### 방법 2: 강제 push (주의!)

**⚠️ 주의: 원격 저장소의 변경사항이 사라질 수 있습니다!**

```bash
# 원격 변경사항을 무시하고 강제로 push
git push origin main --force
```

**또는 더 안전한 방법:**
```bash
git push origin main --force-with-lease
```

---

## 📝 단계별 해결

### 1단계: 원격 변경사항 확인

```bash
git fetch origin
git log HEAD..origin/main
```

### 2단계: 원격 변경사항 가져오기

```bash
git pull origin main
```

### 3단계: 충돌 해결 (충돌이 있는 경우)

충돌이 발생하면:
1. 충돌 파일 확인: `git status`
2. 충돌 파일 수정 (<<<<<<<, =======, >>>>>>> 표시 제거)
3. 충돌 해결 후:
   ```bash
   git add .
   git commit -m "충돌 해결"
   ```

### 4단계: 다시 push

```bash
git push origin main
```

---

## 🚀 빠른 해결 (추천)

**Git Bash에서 실행:**

```bash
# 원격 변경사항 가져오기
git pull origin main --no-rebase

# 충돌이 없으면 자동으로 merge됨
# 충돌이 있으면 수동으로 해결 필요

# 다시 push
git push origin main
```

---

## ⚠️ 주의사항

1. **강제 push는 신중하게 사용**
   - 다른 사람이 작업 중일 수 있음
   - 원격 변경사항이 사라질 수 있음

2. **충돌 해결 시 주의**
   - 로컬 변경사항과 원격 변경사항을 모두 확인
   - 필요한 변경사항을 모두 포함

3. **백업 권장**
   - push 전에 현재 상태 백업
   - `git branch backup-before-push`

---

## 💡 추천 순서

1. ✅ `git pull origin main` (원격 변경사항 가져오기)
2. ✅ 충돌 해결 (있는 경우)
3. ✅ `git push origin main` (다시 push)

---

## 🆘 문제 해결

### 충돌이 너무 많을 때
```bash
# 현재 상태 백업
git branch backup-$(date +%Y%m%d)

# 원격 상태로 리셋 (주의!)
git fetch origin
git reset --hard origin/main
```

### 원격 변경사항을 완전히 무시하고 싶을 때
```bash
# 로컬 변경사항만 push (원격 변경사항 덮어쓰기)
git push origin main --force-with-lease
```

---

위 명령어를 Git Bash나 CMD에서 실행하세요!

