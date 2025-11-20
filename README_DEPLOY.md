# 🚀 시티반점 앱 배포 가이드

## 내일 1차 시제품 완성을 위한 체크리스트

### ✅ 완료된 기능
- [x] 프린터 연결 (주문 접수 시 자동 출력)
- [x] PG사 결제 연동 (이니시스/나이스페이)
- [x] 서버 배포 설정 (Railway)
- [x] 데이터베이스 백업 스크립트
- [x] 환경 변수 설정

### 📋 배포 전 필수 작업

#### 1. I'mport 결제 설정
1. https://admin.iamport.kr 접속
2. 회원가입 및 사업자 정보 등록
3. 가맹점 코드 발급 받기
4. Railway 환경 변수에 추가:
   - `IMP_KEY`: 가맹점 식별코드
   - `IMP_SECRET`: REST API Secret

#### 2. 프린터 설정
- USB 프린터: `PRINTER_VENDOR_ID`, `PRINTER_PRODUCT_ID` 설정
- 네트워크 프린터: `PRINTER_IP`, `PRINTER_PORT` 설정
- 프린터 테스트: `/api/printer/test` 호출

#### 3. Railway 배포
1. GitHub에 코드 푸시
2. Railway에서 프로젝트 생성
3. GitHub 연동
4. 환경 변수 설정 (위 참고)
5. 자동 배포 확인

#### 4. 데이터베이스 백업
- 자동 백업: Railway Cron Job 설정
- 수동 백업: `npm run backup`

### 🔧 환경 변수 목록

```bash
# 서버
PORT=3000
NODE_ENV=production

# 결제
IMP_KEY=your_imp_key
IMP_SECRET=your_imp_secret

# 프린터 (USB)
PRINTER_VENDOR_ID=0x04f9
PRINTER_PRODUCT_ID=0x2042

# 프린터 (네트워크)
PRINTER_IP=192.168.0.100
PRINTER_PORT=9100
```

### 📦 패키지 설치

```bash
cd backend
npm install escpos escpos-usb iamport axios
```

### 🧪 테스트 체크리스트

- [ ] 회원가입 정상 작동
- [ ] 로그인 정상 작동
- [ ] 주문 생성 정상 작동
- [ ] 카드 결제 정상 작동
- [ ] 현금 결제 정상 작동
- [ ] 프린터 출력 정상 작동
- [ ] 주문 취소 정상 작동
- [ ] 리뷰 작성 정상 작동
- [ ] 즐겨찾기 정상 작동
- [ ] 주소록 정상 작동

### 🚨 문제 해결

#### 프린터가 작동하지 않을 때
1. 프린터 라이브러리 설치 확인: `npm list escpos escpos-usb`
2. 프린터 연결 확인 (USB/네트워크)
3. 환경 변수 확인
4. 로그 확인: Railway → Logs

#### 결제가 작동하지 않을 때
1. IMP_KEY 확인
2. I'mport 대시보드에서 결제 내역 확인
3. 브라우저 콘솔 에러 확인

#### 서버가 작동하지 않을 때
1. Railway 로그 확인
2. 환경 변수 확인
3. 포트 확인 (3000)
4. 데이터베이스 파일 확인

### 📞 지원

문제 발생 시:
1. Railway 로그 확인
2. 브라우저 콘솔 확인
3. 서버 로그 확인

---

**내일까지 완성하자! 화이팅! 💪**

