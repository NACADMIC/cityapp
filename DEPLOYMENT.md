# 배포 가이드

## 1. Railway 배포

### 1.1 Railway 계정 생성 및 프로젝트 생성
1. https://railway.app 접속
2. GitHub 연동 또는 직접 배포
3. New Project → Deploy from GitHub repo 선택

### 1.2 환경 변수 설정
Railway 대시보드 → Variables 탭에서 다음 변수 설정:

```
PORT=3000
NODE_ENV=production
IMP_KEY=your_imp_key
IMP_SECRET=your_imp_secret
PRINTER_VENDOR_ID=0x04f9
PRINTER_PRODUCT_ID=0x2042
PRINTER_IP=192.168.0.100
PRINTER_PORT=9100
```

### 1.3 배포
- GitHub에 push하면 자동 배포
- 또는 Railway CLI 사용: `railway up`

## 2. I'mport 결제 설정

### 2.1 I'mport 가입
1. https://admin.iamport.kr 접속
2. 회원가입 및 사업자 정보 등록
3. 가맹점 코드 발급

### 2.2 환경 변수 설정
- `IMP_KEY`: I'mport 가맹점 식별코드
- `IMP_SECRET`: I'mport REST API Secret

### 2.3 프론트엔드 설정
`backend/public/order-new/index.html`에서 IMP_KEY 수정:
```javascript
const IMP_KEY = 'your_imp_key'; // 실제 가맹점 코드로 변경
```

## 3. 프린터 설정

### 3.1 USB 프린터
1. 프린터를 서버에 연결
2. 환경 변수 설정:
   - `PRINTER_VENDOR_ID`: USB Vendor ID
   - `PRINTER_PRODUCT_ID`: USB Product ID

### 3.2 네트워크 프린터
1. 프린터 IP 주소 확인
2. 환경 변수 설정:
   - `PRINTER_IP`: 프린터 IP 주소
   - `PRINTER_PORT`: 포트 번호 (기본: 9100)

### 3.3 프린터 테스트
```bash
curl -X POST https://your-domain.com/api/printer/test
```

## 4. 데이터베이스 백업

### 4.1 자동 백업 설정
Railway에서 Cron Job 추가:
```bash
# 매일 새벽 3시 백업
0 3 * * * node backend/scripts/backup-db.js
```

### 4.2 수동 백업
```bash
node backend/scripts/backup-db.js
```

## 5. 도메인 설정

### 5.1 Railway 도메인
1. Railway 대시보드 → Settings → Domains
2. Custom Domain 추가 또는 Railway 제공 도메인 사용

### 5.2 SSL 인증서
Railway에서 자동으로 SSL 인증서 발급

## 6. 모니터링

### 6.1 Railway 로그
- Railway 대시보드 → Deployments → Logs

### 6.2 에러 알림
- Railway → Settings → Notifications 설정

## 7. 데이터 마이그레이션

### 7.1 로컬 → 프로덕션
```bash
# 로컬 DB 백업
node backend/scripts/backup-db.js

# Railway에 파일 업로드 후 복원
# Railway → Files → Upload
```

## 8. 보안 체크리스트

- [ ] 환경 변수에 민감한 정보 저장 (하드코딩 금지)
- [ ] HTTPS 사용 (Railway 자동)
- [ ] 데이터베이스 백업 정기 실행
- [ ] 결제 API 키 보안 관리
- [ ] 프린터 접근 제한 (방화벽 설정)

