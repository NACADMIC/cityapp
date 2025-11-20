// 카카오 알림톡 모듈
// 카카오 알림톡 API 사용
const axios = require('axios');

// 카카오 알림톡 설정 (환경 변수)
const KAKAO_ALIMTALK_API_KEY = process.env.KAKAO_ALIMTALK_API_KEY || '';
const KAKAO_ALIMTALK_SECRET = process.env.KAKAO_ALIMTALK_SECRET || '';
const KAKAO_PLUS_FRIEND_ID = process.env.KAKAO_PLUS_FRIEND_ID || ''; // 플러스친구 ID
const KAKAO_TEMPLATE_CODE_ORDER = process.env.KAKAO_TEMPLATE_CODE_ORDER || ''; // 주문 접수 템플릿 코드
const KAKAO_TEMPLATE_CODE_DELIVERY = process.env.KAKAO_TEMPLATE_CODE_DELIVERY || ''; // 배달 출발 템플릿 코드
const KAKAO_TEMPLATE_CODE_COMPLETE = process.env.KAKAO_TEMPLATE_CODE_COMPLETE || ''; // 배달 완료 템플릿 코드

let accessToken = null;
let tokenExpiresAt = 0;

// 카카오 알림톡 Access Token 발급
async function getAccessToken() {
  // 토큰이 아직 유효하면 재사용
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }
  
  if (!KAKAO_ALIMTALK_API_KEY || !KAKAO_ALIMTALK_SECRET) {
    console.log('⚠️ 카카오 알림톡 설정이 없어 알림톡을 발송할 수 없습니다.');
    // 테스트 모드에서는 시뮬레이션
    if (process.env.KAKAO_TEST_MODE === 'true') {
      console.log('⚠️ 테스트 모드: 알림톡 발송 시뮬레이션');
      return 'test-token';
    }
    return null;
  }
  
  try {
    const response = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'client_credentials',
        client_id: KAKAO_ALIMTALK_API_KEY,
        client_secret: KAKAO_ALIMTALK_SECRET
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      }
    });
    
    accessToken = response.data.access_token;
    // 토큰 만료 시간 저장 (보통 6시간, 여유있게 5시간으로 설정)
    tokenExpiresAt = Date.now() + (response.data.expires_in - 3600) * 1000;
    
    return accessToken;
  } catch (error) {
    console.error('카카오 알림톡 토큰 발급 오류:', error.response?.data || error.message);
    return null;
  }
}

// 카카오 알림톡 발송
async function sendAlimTalk(phone, templateCode, templateArgs = {}) {
  const token = await getAccessToken();
  if (!token) {
    // 테스트 모드에서는 시뮬레이션
    if (process.env.KAKAO_TEST_MODE === 'true') {
      console.log('⚠️ 테스트 모드: 알림톡 발송 시뮬레이션');
      return { success: true, messageId: 'test-' + Date.now() };
    }
    return { success: false, error: '카카오 알림톡 토큰을 발급할 수 없습니다.' };
  }
  
  if (!phone || !templateCode) {
    return { success: false, error: '전화번호와 템플릿 코드가 필요합니다.' };
  }
  
  // 전화번호 정리 (하이픈 제거)
  const cleanPhone = phone.replace(/-/g, '');
  
  try {
    const response = await axios.post('https://kapi.kakao.com/v1/alimtalk/send', {
      receiver_uuids: [cleanPhone],
      template_code: templateCode,
      template_args: templateArgs,
      plus_friend_id: KAKAO_PLUS_FRIEND_ID
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.result_code === 'success') {
      return { success: true, messageId: response.data.message_id };
    } else {
      return { success: false, error: response.data.message || '알림톡 발송 실패' };
    }
  } catch (error) {
    console.error('카카오 알림톡 발송 오류:', error.response?.data || error.message);
    
    // 테스트 모드에서는 실패해도 계속 진행
    if (process.env.KAKAO_TEST_MODE === 'true') {
      console.log('⚠️ 테스트 모드: 알림톡 발송 시뮬레이션');
      return { success: true, messageId: 'test-' + Date.now() };
    }
    
    return { success: false, error: error.response?.data?.msg || error.message };
  }
}

// 주문 접수 알림톡
async function sendOrderReceivedSMS(order) {
  if (!KAKAO_TEMPLATE_CODE_ORDER) {
    console.log('⚠️ 주문 접수 템플릿 코드가 설정되지 않았습니다.');
    // 템플릿이 없어도 테스트 모드에서는 시뮬레이션
    if (process.env.KAKAO_TEST_MODE === 'true') {
      return { success: true, messageId: 'test-' + Date.now() };
    }
    return { success: false, error: '템플릿 코드가 없습니다.' };
  }
  
  return await sendAlimTalk(
    order.phone,
    KAKAO_TEMPLATE_CODE_ORDER,
    {
      '#{주문번호}': order.orderId,
      '#{예상시간}': '30-40분'
    }
  );
}

// 배달 출발 알림톡
async function sendDeliveryStartedSMS(order) {
  if (!KAKAO_TEMPLATE_CODE_DELIVERY) {
    console.log('⚠️ 배달 출발 템플릿 코드가 설정되지 않았습니다.');
    if (process.env.KAKAO_TEST_MODE === 'true') {
      return { success: true, messageId: 'test-' + Date.now() };
    }
    return { success: false, error: '템플릿 코드가 없습니다.' };
  }
  
  return await sendAlimTalk(
    order.phone,
    KAKAO_TEMPLATE_CODE_DELIVERY,
    {
      '#{주문번호}': order.orderId
    }
  );
}

// 배달 완료 알림톡
async function sendDeliveryCompletedSMS(order) {
  if (!KAKAO_TEMPLATE_CODE_COMPLETE) {
    console.log('⚠️ 배달 완료 템플릿 코드가 설정되지 않았습니다.');
    if (process.env.KAKAO_TEST_MODE === 'true') {
      return { success: true, messageId: 'test-' + Date.now() };
    }
    return { success: false, error: '템플릿 코드가 없습니다.' };
  }
  
  return await sendAlimTalk(
    order.phone,
    KAKAO_TEMPLATE_CODE_COMPLETE,
    {
      '#{주문번호}': order.orderId
    }
  );
}

module.exports = {
  sendAlimTalk,
  sendOrderReceivedSMS,
  sendDeliveryStartedSMS,
  sendDeliveryCompletedSMS
};
