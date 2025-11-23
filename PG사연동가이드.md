# 💳 PG사 연동 가이드

## 📋 개요

현재 시스템은 결제 방법만 선택하고 있습니다. 실제 결제 처리를 위해 PG사 연동이 필요합니다.

## 🔌 주요 PG사

### 1. 이니시스 (KG이니시스)
- **웹사이트**: https://www.inicis.com
- **특징**: 국내 대표 PG사, 다양한 결제 수단 지원
- **수수료**: 거래 건당 약 2.5~3.5%
- **지원 결제**: 신용카드, 계좌이체, 가상계좌, 휴대폰 결제

### 2. 나이스페이 (나이스정보통신)
- **웹사이트**: https://www.nicepay.co.kr
- **특징**: 중소기업 친화적, 합리적 수수료
- **수수료**: 거래 건당 약 2.3~3.0%
- **지원 결제**: 신용카드, 계좌이체, 가상계좌

### 3. 토스페이먼츠
- **웹사이트**: https://www.toss.im
- **특징**: 간편한 연동, 모바일 최적화
- **수수료**: 거래 건당 약 2.5~3.0%
- **지원 결제**: 신용카드, 계좌이체, 간편결제

### 4. 아임포트 (포트원)
- **웹사이트**: https://www.iamport.kr
- **특징**: 여러 PG사 통합 관리, 개발자 친화적
- **수수료**: PG사별 수수료 적용
- **지원 결제**: 모든 주요 PG사 통합

## 🚀 구현 방법

### 방법 1: 아임포트 사용 (추천)

아임포트는 여러 PG사를 통합 관리할 수 있어 편리합니다.

#### 1단계: 아임포트 가입 및 설정
```bash
1. https://admin.iamport.kr 회원가입
2. 가맹점 등록
3. REST API 키 발급 (imp_key, imp_secret)
```

#### 2단계: 패키지 설치
```bash
cd backend
npm install iamport
```

#### 3단계: 서버 코드 추가

`backend/server.js`에 추가:

```javascript
const { Iamport } = require('iamport');
const iamport = new Iamport({
  impKey: process.env.IMP_KEY,      // REST API 키
  impSecret: process.env.IMP_SECRET  // REST API Secret
});

// 결제 검증 API
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { imp_uid, merchant_uid } = req.body;
    
    // 아임포트에서 결제 정보 조회
    const paymentData = await iamport.payment.getByImpUid({ imp_uid });
    
    if (paymentData.status === 'paid' && paymentData.merchant_uid === merchant_uid) {
      // 결제 성공
      res.json({ 
        success: true, 
        amount: paymentData.amount,
        paymentMethod: paymentData.pay_method
      });
    } else {
      res.json({ success: false, error: '결제 검증 실패' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### 4단계: 프론트엔드 연동

`backend/public/order-new/index.html`에 추가:

```html
<!-- 아임포트 스크립트 -->
<script type="text/javascript" src="https://cdn.iamport.kr/js/iamport.payment-1.2.0.js"></script>
```

`backend/public/order-new/app.js`에 결제 함수 추가:

```javascript
// 결제 처리
async function processPayment(orderData) {
  return new Promise((resolve, reject) => {
    const IMP = window.IMP;
    IMP.init('YOUR_IMP_CODE'); // 아임포트 가맹점 식별코드
    
    IMP.request_pay({
      pg: 'html5_inicis', // PG사 선택 (이니시스)
      pay_method: orderData.paymentMethod === 'card' ? 'card' : 'trans',
      merchant_uid: orderData.orderId,
      name: '시티반점 주문',
      amount: orderData.finalAmount,
      buyer_name: orderData.customerName,
      buyer_tel: orderData.phone,
      buyer_addr: orderData.address,
      m_redirect_url: window.location.origin + '/order-new'
    }, async function(rsp) {
      if (rsp.success) {
        // 결제 성공 - 서버에서 검증
        const verifyRes = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imp_uid: rsp.imp_uid,
            merchant_uid: rsp.merchant_uid
          })
        });
        
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          resolve(verifyData);
        } else {
          reject(new Error('결제 검증 실패'));
        }
      } else {
        reject(new Error(rsp.error_msg));
      }
    });
  });
}
```

### 방법 2: 이니시스 직접 연동

#### 1단계: 이니시스 가입
```bash
1. https://www.inicis.com 회원가입
2. 가맹점 등록
3. MID, SignKey 발급
```

#### 2단계: 패키지 설치
```bash
npm install inicis
```

#### 3단계: 서버 코드 추가

```javascript
const inicis = require('inicis');

// 결제 요청
app.post('/api/payment/request', async (req, res) => {
  // 이니시스 결제 요청 로직
});
```

## 🔐 환경 변수 설정

`.env` 파일 생성:

```env
# 아임포트
IMP_KEY=your_imp_key
IMP_SECRET=your_imp_secret

# 또는 이니시스
INICIS_MID=your_mid
INICIS_SIGN_KEY=your_sign_key
```

## 📝 주문 프로세스 변경

현재: 주문 → 즉시 완료
변경: 주문 → 결제 → 결제 완료 → 주문 완료

### 수정 필요 파일:
1. `backend/public/order-new/app.js` - 결제 처리 로직 추가
2. `backend/server.js` - 결제 검증 API 추가
3. `backend/database.js` - 결제 정보 저장 필드 추가

## ⚠️ 주의사항

1. **결제 검증 필수**: 클라이언트에서 결제 성공 후 반드시 서버에서 검증해야 함
2. **환경 변수 보안**: API 키는 절대 클라이언트에 노출하지 말 것
3. **테스트 모드**: 개발 시 테스트 모드로 먼저 테스트
4. **SSL 인증서**: 실제 결제는 HTTPS 필수

## 🧪 테스트 방법

1. PG사 테스트 계정으로 결제 테스트
2. 결제 성공/실패 케이스 모두 테스트
3. 결제 취소 기능 테스트

## 📞 문의

- 이니시스: 1588-4954
- 아임포트: support@iamport.kr
- 토스페이먼츠: 1661-4055

