// 프린터 전용 서버 (로컬 PC에서 독립 실행)
// Railway 메인 서버에서 프린터 요청을 받아 처리
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// 프린터 모듈 (간단 버전)
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

// Windows 프린터 라이브러리 (선택적)
let nodePrinter = null;
try {
  nodePrinter = require('printer');
  console.log('✅ printer 패키지 로드 성공');
} catch (error) {
  console.log('⚠️ printer 패키지가 설치되지 않았습니다. Windows 기본 명령어를 사용합니다.');
}

// ESC/POS 프린터 (선택적)
let escpos, escposUSB, SerialPort;
try {
  escpos = require('escpos');
  escposUSB = require('escpos-usb');
  SerialPort = require('serialport');
} catch (error) {
  console.log('⚠️ 프린터 라이브러리가 설치되지 않았습니다.');
  escpos = null;
  escposUSB = null;
  SerialPort = null;
}

// 프린터 설정
const PRINTER_SERIAL_PORT = process.env.PRINTER_SERIAL_PORT || 'COM2';
const PRINTER_BAUD_RATE = parseInt(process.env.PRINTER_BAUD_RATE || '9600', 10);

let printerDevice = null;
let escposPrinter = null;

// 프린터 초기화
function initPrinter() {
  if (os.platform() === 'win32') {
    console.log('✅ Windows 기본 프린터 사용 준비 완료');
  }
  
  if (!escpos || !SerialPort) {
    console.log('⚠️ 프린터 라이브러리가 없어 시리얼 포트 프린터를 사용할 수 없습니다.');
    return false;
  }
  
  try {
    if (SerialPort && PRINTER_SERIAL_PORT) {
      const serialPort = new SerialPort({
        path: PRINTER_SERIAL_PORT,
        baudRate: PRINTER_BAUD_RATE,
        autoOpen: false
      });
      
      printerDevice = serialPort;
      escposPrinter = new escpos.Printer(serialPort);
      
      serialPort.open((err) => {
        if (err) {
          console.error(`❌ 시리얼 포트 ${PRINTER_SERIAL_PORT} 열기 실패:`, err.message);
          printerDevice = null;
          escposPrinter = null;
        } else {
          console.log(`✅ 시리얼 포트 프린터 연결 성공: ${PRINTER_SERIAL_PORT} (${PRINTER_BAUD_RATE} baud)`);
        }
      });
      
      return true;
    }
  } catch (error) {
    console.log(`⚠️ 시리얼 포트 ${PRINTER_SERIAL_PORT} 연결 실패:`, error.message);
  }
  
  return false;
}

// 프린터 테스트
function printTest() {
  try {
    if (escposPrinter && printerDevice) {
      escposPrinter
        .font('A')
        .align('CT')
        .style('BU')
        .size(1, 1)
        .text('시티반점 프린터 테스트')
        .text('')
        .text('이 메시지가 보이면 프린터가 정상 작동합니다!')
        .text('')
        .text('─────────────────────')
        .text('테스트 시간: ' + new Date().toLocaleString('ko-KR'))
        .text('─────────────────────')
        .cut()
        .close();
      
      return true;
    } else if (nodePrinter && os.platform() === 'win32') {
      // Windows 기본 프린터 사용
      const testContent = `
시티반점 프린터 테스트

이 메시지가 보이면 프린터가 정상 작동합니다!

─────────────────────
테스트 시간: ${new Date().toLocaleString('ko-KR')}
─────────────────────
`;
      
      const printer = nodePrinter.getDefaultPrinterName();
      if (printer) {
        exec(`echo ${testContent} > PRN`, (error) => {
          if (error) {
            console.error('프린터 오류:', error);
            return false;
          }
        });
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('프린터 테스트 오류:', error);
    return false;
  }
}

// 주문서 출력
function printOrder(order) {
  try {
    if (escposPrinter && printerDevice) {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      
      escposPrinter
        .font('A')
        .align('CT')
        .style('BU')
        .size(2, 2)
        .text('시티반점')
        .text('')
        .size(1, 1)
        .style('NORMAL')
        .text('─────────────────────')
        .text(`주문번호: ${order.orderId}`)
        .text(`주문시간: ${new Date(order.createdAt || new Date()).toLocaleString('ko-KR')}`)
        .text('─────────────────────')
        .text('')
        .text(`고객명: ${order.customerName}`)
        .text(`전화: ${order.phone}`)
        if (order.address) {
          escposPrinter.text(`주소: ${order.address}`);
        }
        escposPrinter
          .text(`주문형태: ${order.orderType === 'takeout' ? '포장' : '배달'}`)
          .text('')
          .text('─────────────────────')
          .text('주문 내역')
          .text('─────────────────────');
      
      items.forEach(item => {
        escposPrinter
          .text(`${item.name} x${item.quantity}`)
          .text(`  ${(item.price * item.quantity).toLocaleString()}원`);
      });
      
      escposPrinter
        .text('─────────────────────');
      
      if (order.deliveryFee > 0) {
        escposPrinter.text(`배달비: ${order.deliveryFee.toLocaleString()}원`);
      }
      if (order.usedPoints > 0) {
        escposPrinter.text(`포인트 사용: -${order.usedPoints.toLocaleString()}원`);
      }
      if (order.couponDiscount > 0) {
        escposPrinter.text(`쿠폰 할인: -${order.couponDiscount.toLocaleString()}원`);
      }
      
      escposPrinter
        .text('─────────────────────')
        .style('BU')
        .text(`총 결제금액: ${order.finalAmount.toLocaleString()}원`)
        .style('NORMAL')
        .text(`결제수단: ${order.paymentMethod === 'card' ? '카드' : '현금'}`)
        .text('')
        .text('─────────────────────')
        .text('')
        .cut()
        .close();
      
      return true;
    } else if (nodePrinter && os.platform() === 'win32') {
      // Windows 기본 프린터 사용
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      let content = `
시티반점 주문서

─────────────────────
주문번호: ${order.orderId}
주문시간: ${new Date(order.createdAt || new Date()).toLocaleString('ko-KR')}
─────────────────────

고객명: ${order.customerName}
전화: ${order.phone}
${order.address ? `주소: ${order.address}` : ''}
주문형태: ${order.orderType === 'takeout' ? '포장' : '배달'}

─────────────────────
주문 내역
─────────────────────
`;
      
      items.forEach(item => {
        content += `${item.name} x${item.quantity}\n`;
        content += `  ${(item.price * item.quantity).toLocaleString()}원\n`;
      });
      
      content += `─────────────────────\n`;
      if (order.deliveryFee > 0) {
        content += `배달비: ${order.deliveryFee.toLocaleString()}원\n`;
      }
      if (order.usedPoints > 0) {
        content += `포인트 사용: -${order.usedPoints.toLocaleString()}원\n`;
      }
      if (order.couponDiscount > 0) {
        content += `쿠폰 할인: -${order.couponDiscount.toLocaleString()}원\n`;
      }
      content += `─────────────────────\n`;
      content += `총 결제금액: ${order.finalAmount.toLocaleString()}원\n`;
      content += `결제수단: ${order.paymentMethod === 'card' ? '카드' : '현금'}\n`;
      
      const printer = nodePrinter.getDefaultPrinterName();
      if (printer) {
        exec(`echo ${content} > PRN`, (error) => {
          if (error) {
            console.error('프린터 오류:', error);
            return false;
          }
        });
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('주문서 출력 오류:', error);
    return false;
  }
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PRINTER_PORT || 3001;

// 프린터 초기화
initPrinter();

// 프린터 테스트
app.get('/test', (req, res) => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 프린터 테스트 요청 수신!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const result = printTest();
  if (result) {
    console.log('✅ 프린터 테스트 성공!');
  } else {
    console.error('❌ 프린터 테스트 실패!');
  }
  res.json({ success: result, message: result ? '프린터 테스트 완료' : '프린터 테스트 실패' });
});

// 주문서 출력
app.post('/print', (req, res) => {
  try {
    const order = req.body;
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 프린터 출력 요청 수신!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('주문번호:', order.orderId);
    console.log('고객명:', order.customerName);
    console.log('주문항목 수:', Array.isArray(order.items) ? order.items.length : 'N/A');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const result = printOrder(order);
    
    if (result) {
      console.log('✅ 프린터 출력 성공!');
      res.json({ 
        success: true, 
        message: '주문서 출력 완료',
        orderId: order.orderId 
      });
    } else {
      console.error('❌ 프린터 출력 실패!');
      res.status(500).json({ 
        success: false, 
        message: '주문서 출력 실패 - 프린터 연결을 확인하세요',
        orderId: order.orderId 
      });
    }
  } catch (error) {
    console.error('❌ 프린터 출력 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.message
    });
  }
});

// 프린터 상태 확인
app.get('/status', (req, res) => {
  res.json({ 
    success: true, 
    printer: 'LKT-20',
    port: PRINTER_SERIAL_PORT,
    baudRate: PRINTER_BAUD_RATE,
    connected: escposPrinter !== null || nodePrinter !== null
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🖨️  프린터 서버 실행 중');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  PORT: ${PORT}`);
  console.log(`  프린터: LKT-20 (${PRINTER_SERIAL_PORT})`);
  console.log(`  통신속도: ${PRINTER_BAUD_RATE} baud`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📡 Railway 서버에서 프린터 요청을 받을 준비 완료!');
  console.log('');
  console.log('⚠️  이 창을 닫지 마세요!');
  console.log('');
});

