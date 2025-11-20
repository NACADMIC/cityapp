// 프린터 모듈
// 프린터 라이브러리는 선택적 로드 (설치되지 않아도 서버는 동작)
let escpos, escposUSB;
try {
  escpos = require('escpos');
  escposUSB = require('escpos-usb');
} catch (error) {
  console.log('⚠️ 프린터 라이브러리가 설치되지 않았습니다. 프린터 기능을 사용할 수 없습니다.');
  console.log('설치: npm install escpos escpos-usb');
  // 프린터 기능 비활성화
  escpos = null;
  escposUSB = null;
}

// 프린터 설정 (환경 변수 또는 기본값)
const PRINTER_VENDOR_ID = process.env.PRINTER_VENDOR_ID || null;
const PRINTER_PRODUCT_ID = process.env.PRINTER_PRODUCT_ID || null;

let printer = null;

// 프린터 초기화
function initPrinter() {
  // 프린터 라이브러리가 없으면 초기화하지 않음
  if (!escpos || !escposUSB) {
    console.log('⚠️ 프린터 라이브러리가 없어 프린터 기능을 사용할 수 없습니다.');
    return false;
  }
  
  try {
    // USB 프린터 연결 시도
    if (PRINTER_VENDOR_ID && PRINTER_PRODUCT_ID) {
      const device = escposUSB.findPrinter(PRINTER_VENDOR_ID, PRINTER_PRODUCT_ID);
      if (device) {
        printer = new escpos.Printer(device);
        console.log('✅ 프린터 연결 성공');
        return true;
      }
    }
    
    // 네트워크 프린터 (IP 주소)
    const PRINTER_IP = process.env.PRINTER_IP || '192.168.0.100';
    const PRINTER_PORT = process.env.PRINTER_PORT || 9100;
    
    // 네트워크 프린터는 escpos-network 사용 필요
    // 일단 USB만 지원
    
    console.log('⚠️ 프린터를 찾을 수 없습니다. 환경 변수를 확인하세요.');
    return false;
  } catch (error) {
    console.error('❌ 프린터 초기화 오류:', error.message);
    return false;
  }
}

// 주문서 출력
function printOrder(order) {
  if (!printer) {
    console.log('⚠️ 프린터가 연결되지 않았습니다. 주문 정보만 출력합니다.');
    console.log('📄 주문서:', JSON.stringify(order, null, 2));
    return false;
  }
  
  try {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const orderDate = new Date(order.createdAt || new Date()).toLocaleString('ko-KR');
    
    printer
      .font('a')
      .align('ct')
      .size(1, 1)
      .text('━━━━━━━━━━━━━━━━━━━━')
      .text('   시티반점 주문서')
      .text('━━━━━━━━━━━━━━━━━━━━')
      .feed(1)
      .size(0, 0)
      .text(`주문번호: ${order.orderId}`)
      .text(`주문시간: ${orderDate}`)
      .text(`주문타입: ${order.orderType === 'takeout' ? '포장' : '배달'}`)
      .feed(1)
      .text('━━━━━━━━━━━━━━━━━━━━')
      .feed(1)
      .text(`고객명: ${order.customerName}`)
      .text(`전화번호: ${order.phone}`);
    
    if (order.orderType !== 'takeout' && order.address) {
      printer.text(`주소: ${order.address}`);
    }
    
    printer
      .feed(1)
      .text('━━━━━━━━━━━━━━━━━━━━')
      .feed(1)
      .text('주문 내역')
      .text('━━━━━━━━━━━━━━━━━━━━')
      .feed(1);
    
    items.forEach(item => {
      const itemName = item.name || item.menuName || '메뉴';
      const quantity = item.quantity || 1;
      const price = (item.price || 0) * quantity;
      printer
        .text(`${itemName} x${quantity}`)
        .text(`  ${price.toLocaleString()}원`)
        .feed(1);
    });
    
    printer
      .feed(1)
      .text('━━━━━━━━━━━━━━━━━━━━')
      .feed(1)
      .align('rt')
      .text(`주문금액: ${(order.totalAmount || 0).toLocaleString()}원`);
    
    if (order.usedPoints > 0) {
      printer.text(`포인트 사용: -${order.usedPoints.toLocaleString()}원`);
    }
    
    if (order.couponDiscount > 0) {
      printer.text(`쿠폰 할인: -${order.couponDiscount.toLocaleString()}원`);
    }
    
    if (order.deliveryFee > 0) {
      printer.text(`배달료: +${order.deliveryFee.toLocaleString()}원`);
    }
    
    printer
      .feed(1)
      .text('━━━━━━━━━━━━━━━━━━━━')
      .feed(1)
      .align('ct')
      .size(1, 1)
      .text(`최종 결제금액`)
      .text(`${(order.finalAmount || order.totalAmount || 0).toLocaleString()}원`)
      .feed(1)
      .text(`결제방법: ${order.paymentMethod || '현금'}`)
      .feed(2)
      .text('━━━━━━━━━━━━━━━━━━━━')
      .feed(1)
      .text('감사합니다!')
      .feed(2)
      .cut()
      .close();
    
    console.log('✅ 주문서 출력 완료:', order.orderId);
    return true;
  } catch (error) {
    console.error('❌ 프린터 출력 오류:', error.message);
    // 프린터 오류 시에도 주문은 정상 처리
    return false;
  }
}

// 간단한 텍스트 출력 (테스트용)
function printTest() {
  // 프린터 라이브러리가 없으면 테스트 불가
  if (!escpos || !printer) {
    console.log('⚠️ 프린터가 연결되지 않았습니다.');
    return false;
  }
  
  try {
    printer
      .font('a')
      .align('ct')
      .size(1, 1)
      .text('프린터 테스트')
      .feed(2)
      .cut()
      .close();
    
    console.log('✅ 프린터 테스트 완료');
    return true;
  } catch (error) {
    console.error('❌ 프린터 테스트 오류:', error.message);
    return false;
  }
}

module.exports = {
  initPrinter,
  printOrder,
  printTest
};

