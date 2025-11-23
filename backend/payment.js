// PG사 결제 모듈 (이니시스/나이스페이)
const axios = require('axios');

// I'mport 설정 (환경 변수)
const IMP_KEY = process.env.IMP_KEY || '';
const IMP_SECRET = process.env.IMP_SECRET || '';

// 결제 검증
async function verifyPayment(impUid, merchantUid) {
  try {
    // I'mport Access Token 발급
    const tokenResponse = await axios.post('https://api.iamport.kr/users/getToken', {
      imp_key: IMP_KEY,
      imp_secret: IMP_SECRET
    });
    
    const accessToken = tokenResponse.data.response.access_token;
    
    // 결제 정보 조회
    const paymentResponse = await axios.get(`https://api.iamport.kr/payments/${impUid}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    const payment = paymentResponse.data.response;
    
    // 결제 검증
    if (payment.merchant_uid !== merchantUid) {
      throw new Error('주문번호가 일치하지 않습니다.');
    }
    
    if (payment.status !== 'paid') {
      throw new Error('결제가 완료되지 않았습니다.');
    }
    
    return {
      success: true,
      payment: {
        impUid: payment.imp_uid,
        merchantUid: payment.merchant_uid,
        amount: payment.amount,
        status: payment.status,
        payMethod: payment.pay_method,
        paidAt: payment.paid_at
      }
    };
  } catch (error) {
    console.error('결제 검증 오류:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 결제 취소
async function cancelPayment(impUid, reason) {
  try {
    // I'mport Access Token 발급
    const tokenResponse = await axios.post('https://api.iamport.kr/users/getToken', {
      imp_key: IMP_KEY,
      imp_secret: IMP_SECRET
    });
    
    const accessToken = tokenResponse.data.response.access_token;
    
    // 결제 취소
    const cancelResponse = await axios.post('https://api.iamport.kr/payments/cancel', {
      imp_uid: impUid,
      reason: reason || '고객 요청'
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    return {
      success: true,
      cancel: cancelResponse.data.response
    };
  } catch (error) {
    console.error('결제 취소 오류:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  verifyPayment,
  cancelPayment
};

