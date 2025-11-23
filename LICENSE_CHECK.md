# 📜 라이선스 확인서

현재 프로젝트에서 사용 중인 외부 라이브러리 및 리소스의 라이선스 정보입니다.

## ✅ 상업적 사용 가능 (문제 없음)

### 1. **Pretendard 폰트**
- **소스**: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard`
- **라이선스**: SIL Open Font License 1.1 (OFL-1.1)
- **상업적 사용**: ✅ **가능**
- **조건**: 
  - 폰트 파일 자체는 수정/재배포 가능
  - 폰트 이름 변경 불가
  - 라이선스 파일 포함 권장 (필수 아님)

### 2. **Chart.js 4.4.0**
- **소스**: `https://cdn.jsdelivr.net/npm/chart.js@4.4.0`
- **라이선스**: MIT License
- **상업적 사용**: ✅ **가능**
- **조건**: 
  - 라이선스 고지 포함 권장 (필수 아님)
  - 수정/재배포 가능

### 3. **Socket.IO 4.6.0**
- **소스**: `https://cdn.socket.io/4.6.0/socket.io.min.js`
- **라이선스**: MIT License
- **상업적 사용**: ✅ **가능**
- **조건**: 
  - 라이선스 고지 포함 권장 (필수 아님)

### 4. **Express.js**
- **라이선스**: MIT License
- **상업적 사용**: ✅ **가능**

### 5. **기타 npm 패키지들**
- `cors`: MIT License ✅
- `body-parser`: MIT License ✅
- `uuid`: MIT License ✅
- `axios`: MIT License ✅
- `bcrypt`: MIT License ✅
- `better-sqlite3`: MIT License ✅

## ⚠️ 주의 필요

### 1. **Font Awesome 6.4.0**
- **소스**: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`
- **라이선스**: 
  - **Font Awesome Free**: SIL Open Font License 1.1 (OFL-1.1) + Font Awesome Free License
  - **Font Awesome Pro**: 유료 라이선스 필요
- **현재 사용**: CDN의 무료 버전 사용 중으로 추정
- **상업적 사용**: ✅ **가능** (무료 버전 기준)
- **조건**:
  - 무료 버전 사용 시: 상업적 사용 가능
  - **라이선스 고지 필요**: HTML에 Font Awesome 사용 명시 권장
  - 아이콘 자체는 수정 불가

### 2. **Kakao Maps API**
- **현재 상태**: `YOUR_KAKAO_APP_KEY` 플레이스홀더 사용 중
- **상업적 사용**: 
  - ✅ **가능** (카카오 개발자 계정 필요)
  - 카카오 개발자 센터에서 앱 등록 및 API 키 발급 필요
  - 카카오 서비스 이용약관 준수 필요
- **주의사항**:
  - 실제 배포 시 유효한 API 키로 교체 필요
  - 카카오 서비스 이용약관 확인 필요

## 📋 권장 사항

### 1. **라이선스 고지 추가 (선택사항)**
프로젝트 루트에 `LICENSE` 또는 `NOTICES.txt` 파일을 추가하여 사용 중인 오픈소스 라이브러리를 명시하는 것을 권장합니다:

```
이 프로젝트는 다음 오픈소스 라이브러리를 사용합니다:

- Pretendard (SIL Open Font License 1.1)
- Chart.js (MIT License)
- Socket.IO (MIT License)
- Express.js (MIT License)
- Font Awesome Free (SIL Open Font License 1.1 + Font Awesome Free License)
```

### 2. **Font Awesome 고지 추가 (권장)**
HTML 파일 하단에 다음을 추가하는 것을 권장합니다:

```html
<!-- Font Awesome Free Icons -->
<!-- https://fontawesome.com/license/free -->
```

### 3. **Kakao Maps API 키 교체**
실제 배포 전에 카카오 개발자 센터에서 API 키를 발급받아 교체해야 합니다.

## ✅ 결론

**현재 상태에서 저작권 문제는 없습니다.**

모든 사용 중인 라이브러리와 폰트는 상업적 사용이 가능한 오픈소스 라이선스를 따르고 있습니다. 다만, Font Awesome의 경우 라이선스 고지를 추가하는 것을 권장하며, Kakao Maps API는 실제 배포 시 유효한 API 키로 교체해야 합니다.

---

**최종 확인일**: 2024년
**확인자**: AI Assistant

