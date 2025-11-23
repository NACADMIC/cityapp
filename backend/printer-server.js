// 프린터 전용 서버 (로컬 PC에서 실행)
// Railway 메인 서버에서 프린터 요청을 받아 처리
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const printer = require('./printer');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PRINTER_PORT || 3001;

// 프린터 초기화
printer.initPrinter();

// 프린터 테스트
app.get('/test', (req, res) => {
  const result = printer.printTest();
  res.json({ success: result, message: result ? '프린터 테스트 완료' : '프린터 테스트 실패' });
});

// 주문서 출력
app.post('/print', (req, res) => {
  const order = req.body;
  const result = printer.printOrder(order);
  res.json({ 
    success: result, 
    message: result ? '주문서 출력 완료' : '주문서 출력 실패',
    orderId: order.orderId 
  });
});

// 프린터 상태 확인
app.get('/status', (req, res) => {
  res.json({ 
    success: true, 
    printer: 'LKT-20',
    port: process.env.PRINTER_SERIAL_PORT || 'COM2',
    baudRate: process.env.PRINTER_BAUD_RATE || '9600'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🖨️  프린터 서버 실행 중');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  PORT: ${PORT}`);
  console.log(`  프린터: LKT-20 (${process.env.PRINTER_SERIAL_PORT || 'COM2'})`);
  console.log(`  통신속도: ${process.env.PRINTER_BAUD_RATE || '9600'} baud`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📡 Railway 서버에서 프린터 요청을 받을 준비 완료!');
  console.log('');
});

