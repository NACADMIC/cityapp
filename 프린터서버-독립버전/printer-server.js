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

// ESC/POS 프린터 (LKT-20 시리얼 프린터 전용)
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

// 프린터 초기화 (LKT-20 시리얼 프린터 전용)
function initPrinter() {
  if (!escpos || !SerialPort) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('⚠️  프린터 라이브러리 없음');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ serialport 패키지가 설치되지 않았습니다.');
    console.error('');
    console.error('📝 해결 방법:');
    console.error('   1. Python 설치 (https://www.python.org/downloads/)');
    console.error('   2. 설치 시 "Add Python to PATH" 체크');
    console.error('   3. npm install serialport@8.0.9');
    console.error('');
    console.error('💡 서버는 실행되지만 프린터는 작동하지 않습니다.');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    return false;
  }
  
  try {
    if (SerialPort && PRINTER_SERIAL_PORT) {
      // serialport v9.x API 사용
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
          
          // 일반 전표용지(80mm) 사이즈 설정
          // GS w n: 폭 설정 (n = 0~255, 단위는 dot)
          // 80mm = 약 576 dots (203 DPI 기준) = 0x0240 (576 in hex)
          // 하지만 일반적으로 48-58 문자 폭으로 설정
          try {
            // ESC @ - 초기화
            serialPort.write(Buffer.from([0x1B, 0x40]));
            // GS w n - 폭 설정 (n = 48 = 0x30, 80mm 전표용지)
            serialPort.write(Buffer.from([0x1D, 0x77, 0x30]));
            console.log('✅ 전표용지(80mm) 사이즈 설정 완료');
          } catch (widthError) {
            console.log('⚠️ 폭 설정 오류 (무시됨):', widthError.message);
          }
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
    if (!escposPrinter || !printerDevice) {
      console.error('❌ LKT-20 시리얼 프린터에 연결되지 않았습니다!');
      console.error(`   프린터 포트: ${PRINTER_SERIAL_PORT}`);
      console.error('   프린터가 COM2에 연결되어 있는지 확인하세요.');
      return false;
    }
    
    console.log('🖨️ LKT-20 프린터 테스트 인쇄 시작...');
    
    // 전표용지(80mm) 사이즈 설정
    try {
      printerDevice.write(Buffer.from([0x1B, 0x40])); // 초기화
      printerDevice.write(Buffer.from([0x1D, 0x77, 0x30])); // 80mm 폭 설정
    } catch (e) {
      // 무시
    }
    
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
    
    console.log('✅ 프린터 테스트 인쇄 완료!');
    return true;
  } catch (error) {
    console.error('❌ 프린터 테스트 오류:', error);
    return false;
  }
}

// 주문서 출력
function printOrder(order) {
  try {
    if (!escposPrinter || !printerDevice) {
      console.error('❌ LKT-20 시리얼 프린터에 연결되지 않았습니다!');
      console.error(`   프린터 포트: ${PRINTER_SERIAL_PORT}`);
      console.error('   주문번호:', order.orderId);
      return false;
    }
    
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    console.log('🖨️ 주문서 인쇄 시작:', order.orderId);
    
    // 전표용지(80mm) 사이즈 설정
    try {
      printerDevice.write(Buffer.from([0x1B, 0x40])); // 초기화
      printerDevice.write(Buffer.from([0x1D, 0x77, 0x30])); // 80mm 폭 설정
    } catch (e) {
      // 무시
    }
    
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
    
    console.log('✅ 주문서 인쇄 완료:', order.orderId);
    return true;
  } catch (error) {
    console.error('❌ 주문서 출력 오류:', error);
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
    connected: escposPrinter !== null && printerDevice !== null
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
  if (!escposPrinter || !printerDevice) {
    console.log(`  상태: ⚠️  프린터 미연결 (serialport 패키지 필요)`);
  } else {
    console.log(`  상태: ✅ 프린터 연결됨`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📡 Railway 서버에서 프린터 요청을 받을 준비 완료!');
  if (!escposPrinter || !printerDevice) {
    console.log('');
    console.log('⚠️  주의: 프린터가 연결되지 않았습니다!');
    console.log('   인쇄 요청은 실패할 수 있습니다.');
  }
  console.log('');
  console.log('⚠️  이 창을 닫지 마세요!');
  console.log('');
});

