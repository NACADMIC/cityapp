// 프린터 모듈
// 프린터 라이브러리는 선택적 로드 (설치되지 않아도 서버는 동작)
let escpos, escposUSB, SerialPort;
try {
  escpos = require('escpos');
  escposUSB = require('escpos-usb');
  SerialPort = require('serialport');
} catch (error) {
  console.log('⚠️ 프린터 라이브러리가 설치되지 않았습니다. 프린터 기능을 사용할 수 없습니다.');
  console.log('설치: npm install escpos escpos-usb serialport');
  // 프린터 기능 비활성화
  escpos = null;
  escposUSB = null;
  SerialPort = null;
}

// 프린터 설정 (환경 변수 또는 기본값)
const PRINTER_VENDOR_ID = process.env.PRINTER_VENDOR_ID || null;
const PRINTER_PRODUCT_ID = process.env.PRINTER_PRODUCT_ID || null;

// 시리얼 포트 프린터 설정 (LKT-20)
const PRINTER_SERIAL_PORT = process.env.PRINTER_SERIAL_PORT || 'COM2';
const PRINTER_BAUD_RATE = parseInt(process.env.PRINTER_BAUD_RATE || '9600', 10);

let printer = null;
let printerDevice = null;

// 프린터 초기화
function initPrinter() {
  // 프린터 라이브러리가 없으면 초기화하지 않음
  if (!escpos) {
    console.log('⚠️ 프린터 라이브러리가 없어 프린터 기능을 사용할 수 없습니다.');
    return false;
  }
  
  try {
    // 1순위: 시리얼 포트 프린터 (LKT-20 등)
    if (SerialPort && PRINTER_SERIAL_PORT) {
      try {
        const serialPort = new SerialPort({
          path: PRINTER_SERIAL_PORT,
          baudRate: PRINTER_BAUD_RATE,
          autoOpen: false
        });
        
        printerDevice = serialPort;
        printer = new escpos.Printer(serialPort);
        
        serialPort.open((err) => {
          if (err) {
            console.error(`❌ 시리얼 포트 ${PRINTER_SERIAL_PORT} 열기 실패:`, err.message);
            printer = null;
            printerDevice = null;
          } else {
            console.log(`✅ 시리얼 포트 프린터 연결 성공: ${PRINTER_SERIAL_PORT} (${PRINTER_BAUD_RATE} baud)`);
          }
        });
        
        return true;
      } catch (error) {
        console.log(`⚠️ 시리얼 포트 ${PRINTER_SERIAL_PORT} 연결 실패:`, error.message);
      }
    }
    
    // 2순위: USB 프린터 연결 시도
    if (escposUSB && PRINTER_VENDOR_ID && PRINTER_PRODUCT_ID) {
      try {
        const device = escposUSB.findPrinter(PRINTER_VENDOR_ID, PRINTER_PRODUCT_ID);
        if (device) {
          printerDevice = device;
          printer = new escpos.Printer(device);
          console.log('✅ USB 프린터 연결 성공');
          return true;
        }
      } catch (error) {
        console.log('⚠️ USB 프린터 연결 실패:', error.message);
      }
    }
    
    // 3순위: 네트워크 프린터 (IP 주소)
    const PRINTER_IP = process.env.PRINTER_IP || null;
    const PRINTER_PORT = process.env.PRINTER_PORT || 9100;
    
    if (PRINTER_IP) {
      try {
        const escposNetwork = require('escpos-network');
        const device = new escposNetwork(PRINTER_IP, PRINTER_PORT);
        printerDevice = device;
        printer = new escpos.Printer(device);
        console.log(`✅ 네트워크 프린터 연결 성공: ${PRINTER_IP}:${PRINTER_PORT}`);
        return true;
      } catch (error) {
        console.log('⚠️ 네트워크 프린터 연결 실패:', error.message);
      }
    }
    
    console.log('⚠️ 프린터를 찾을 수 없습니다. 환경 변수를 확인하세요.');
    console.log('시리얼 포트: PRINTER_SERIAL_PORT, PRINTER_BAUD_RATE');
    console.log('USB: PRINTER_VENDOR_ID, PRINTER_PRODUCT_ID');
    console.log('네트워크: PRINTER_IP, PRINTER_PORT');
    return false;
  } catch (error) {
    console.error('❌ 프린터 초기화 오류:', error.message);
    return false;
  }
}

// 주문서 출력
function printOrder(order) {
  if (!printer || !printerDevice) {
    console.log('⚠️ 프린터가 연결되지 않았습니다. 주문 정보만 출력합니다.');
    console.log('📄 주문서:', JSON.stringify(order, null, 2));
    return false;
  }
  
  // 시리얼 포트가 닫혀있으면 다시 열기
  if (printerDevice && printerDevice.isOpen === false) {
    try {
      printerDevice.open((err) => {
        if (err) {
          console.error('❌ 프린터 포트 열기 실패:', err.message);
          return false;
        }
      });
    } catch (error) {
      console.error('❌ 프린터 포트 열기 오류:', error.message);
    }
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
  // 프린터 라이브러리가 없으면 일반 프린터로 테스트
  if (!escpos || !printer) {
    console.log('⚠️ ESC/POS 프린터가 연결되지 않았습니다. 일반 프린터로 테스트합니다.');
    return printTestGeneral();
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
    return printTestGeneral();
  }
}

// 일반 프린터 테스트 (브라우저 인쇄 기능 사용)
function printTestGeneral() {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.log('⚠️ 팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
      return false;
    }
    
    const testContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>프린터 테스트</title>
        <style>
          @media print {
            @page { margin: 10mm; }
            body { margin: 0; padding: 0; }
          }
          body {
            font-family: 'Courier New', monospace;
            padding: 20px;
            text-align: center;
          }
          .test-header {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .test-info {
            font-size: 14px;
            line-height: 1.8;
            margin: 20px 0;
          }
          .test-footer {
            margin-top: 30px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="test-header">프린터 테스트</div>
        <div class="test-info">
          <p>시티반점 주문 시스템</p>
          <p>테스트 일시: ${new Date().toLocaleString('ko-KR')}</p>
          <p>이 전표가 정상적으로 출력되면 프린터가 정상 작동합니다.</p>
        </div>
        <div class="test-footer">
          <p>━━━━━━━━━━━━━━━━━━━━</p>
          <p>테스트 완료</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(testContent);
    printWindow.document.close();
    printWindow.focus();
    
    // 자동 인쇄
    setTimeout(() => {
      printWindow.print();
      console.log('✅ 일반 프린터 테스트 완료 (인쇄 대화상자 열림)');
    }, 500);
    
    return true;
  } catch (error) {
    console.error('❌ 일반 프린터 테스트 오류:', error.message);
    return false;
  }
}

module.exports = {
  initPrinter,
  printOrder,
  printTest
};

