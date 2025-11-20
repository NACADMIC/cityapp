// 프린터 모듈
// Windows 기본 프린터로 직접 출력
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
  console.log('설치: npm install printer');
}

// ESC/POS 프린터 (선택적, 기존 호환성 유지)
let escpos, escposUSB;
try {
  escpos = require('escpos');
  escposUSB = require('escpos-usb');
} catch (error) {
  escpos = null;
  escposUSB = null;
}

// 프린터 설정 (환경 변수 또는 기본값)
const PRINTER_VENDOR_ID = process.env.PRINTER_VENDOR_ID || null;
const PRINTER_PRODUCT_ID = process.env.PRINTER_PRODUCT_ID || null;

let escposPrinter = null;

// 프린터 초기화
function initPrinter() {
  // Windows 기본 프린터는 초기화 불필요 (항상 사용 가능)
  if (os.platform() === 'win32') {
    console.log('✅ Windows 기본 프린터 사용 준비 완료');
    
    // ESC/POS 프린터도 시도 (선택적)
    if (escpos && escposUSB) {
      try {
        if (PRINTER_VENDOR_ID && PRINTER_PRODUCT_ID) {
          const device = escposUSB.findPrinter(PRINTER_VENDOR_ID, PRINTER_PRODUCT_ID);
          if (device) {
            escposPrinter = new escpos.Printer(device);
            console.log('✅ ESC/POS 프린터도 연결됨');
          }
        }
      } catch (error) {
        console.log('⚠️ ESC/POS 프린터 연결 실패, Windows 기본 프린터 사용');
      }
    }
    
    return true;
  }
  
  // Windows가 아닌 경우 기존 방식 사용
  if (!escpos || !escposUSB) {
    console.log('⚠️ 프린터 라이브러리가 없어 프린터 기능을 사용할 수 없습니다.');
    return false;
  }
  
  try {
    if (PRINTER_VENDOR_ID && PRINTER_PRODUCT_ID) {
      const device = escposUSB.findPrinter(PRINTER_VENDOR_ID, PRINTER_PRODUCT_ID);
      if (device) {
        escposPrinter = new escpos.Printer(device);
        console.log('✅ 프린터 연결 성공');
        return true;
      }
    }
    
    console.log('⚠️ 프린터를 찾을 수 없습니다. 환경 변수를 확인하세요.');
    return false;
  } catch (error) {
    console.error('❌ 프린터 초기화 오류:', error.message);
    return false;
  }
}

// 주문서 출력
function printOrder(order) {
  try {
    console.log('🖨️ 프린터 출력 요청:', order.orderId);
    console.log('📋 주문 데이터:', JSON.stringify(order, null, 2));
    
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const orderDate = new Date(order.createdAt || new Date()).toLocaleString('ko-KR');
    
    console.log('📦 주문 아이템 수:', items.length);
    
    // 영수증 크기로 간결한 주문서 텍스트 생성
    let printText = '';
    printText += '━━━━━━━━━━━━━━\n';
    printText += '  시티반점\n';
    printText += '━━━━━━━━━━━━━━\n';
    printText += `주문번호: ${order.orderId}번\n`;
    printText += `${orderDate}\n`;
    printText += `${order.orderType === 'takeout' ? '포장' : '배달'}\n`;
    printText += '━━━━━━━━━━━━━━\n';
    printText += `${order.customerName}\n`;
    printText += `${order.phone}\n`;
    
    if (order.orderType !== 'takeout' && order.address) {
      printText += `${order.address}\n`;
    }
    
    printText += '━━━━━━━━━━━━━━\n';
    
    items.forEach(item => {
      const itemName = item.name || item.menuName || '메뉴';
      const quantity = item.quantity || 1;
      const price = (item.price || 0) * quantity;
      printText += `${itemName} x${quantity} ${price.toLocaleString()}원\n`;
    });
    
    printText += '━━━━━━━━━━━━━━\n';
    printText += `합계: ${(order.totalAmount || 0).toLocaleString()}원\n`;
    
    if (order.usedPoints > 0) {
      printText += `포인트: -${order.usedPoints.toLocaleString()}원\n`;
    }
    
    if (order.couponDiscount > 0) {
      printText += `쿠폰: -${order.couponDiscount.toLocaleString()}원\n`;
    }
    
    if (order.deliveryFee > 0) {
      printText += `배달료: +${order.deliveryFee.toLocaleString()}원\n`;
    }
    
    printText += '━━━━━━━━━━━━━━\n';
    printText += `총액: ${(order.finalAmount || order.totalAmount || 0).toLocaleString()}원\n`;
    printText += `${order.paymentMethod || '현금'}\n`;
    printText += '━━━━━━━━━━━━━━\n';
    printText += '감사합니다!\n';
    printText += '━━━━━━━━━━━━━━\n';
    printText += '시티반점을 이용해주시는\n';
    printText += '고객분들께 감사드리는\n';
    printText += '마음으로 직접주문을 통해서\n';
    printText += '이익을 고객님들께\n';
    printText += '돌려드리고자 합니다.\n';
    printText += '본 앱을 통해 직접 주문시\n';
    printText += '주문금액의 10%를 포인트로\n';
    printText += '적립하여 페이백 하고자\n';
    printText += '하오니 많은 이용 부탁드립니다.\n';
    printText += '━━━━━━━━━━━━━━\n';
    
    console.log('📄 생성된 주문서 텍스트 길이:', printText.length);
    console.log('🖥️ 운영체제:', os.platform());
    
    // Windows 기본 프린터로 출력 (비동기, fire and forget)
    if (os.platform() === 'win32') {
      console.log('🪟 Windows 환경 감지, 기본 프린터로 출력 시도');
      console.log('📋 주문서 미리보기 (처음 200자):');
      console.log(printText.substring(0, 200) + '...');
      
      // 프린터 출력 실행
      printToWindowsPrinter(printText, order.orderId)
        .then(result => {
          if (result) {
            console.log('✅ 프린터 출력 성공:', order.orderId);
          } else {
            console.log('⚠️ 프린터 출력 실패 (false 반환):', order.orderId);
          }
        })
        .catch(err => {
          console.error('❌ Windows 프린터 출력 실패:', err.message);
          console.error('❌ 에러 스택:', err.stack);
        });
      
      return true; // 비동기로 처리되므로 즉시 true 반환
    }
    
    // Linux/Unix 환경 (Railway 등) - 프린터 출력 불가, 로그만 출력
    if (os.platform() === 'linux' || os.platform() === 'darwin') {
      console.log('⚠️ Linux/Unix 환경: 프린터 출력 불가 (로컬 Windows PC에서만 출력 가능)');
      console.log('📄 주문서 내용:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(printText);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💡 팁: 로컬 Windows PC에서 서버를 실행하면 자동으로 프린터 출력됩니다.');
      return true; // 로그 출력은 성공으로 처리
    }
    
    // ESC/POS 프린터 사용 (기존 방식)
    if (escposPrinter) {
      console.log('🖨️ ESC/POS 프린터 사용');
      return printToEscpos(printText, order);
    }
    
    console.log('⚠️ 프린터가 연결되지 않았습니다. 주문 정보만 출력합니다.');
    console.log('📄 주문서:', JSON.stringify(order, null, 2));
    return false;
    
  } catch (error) {
    console.error('❌ 프린터 출력 오류:', error.message);
    console.error('❌ 에러 스택:', error.stack);
    return false;
  }
}

// Windows 기본 프린터로 출력
function printToWindowsPrinter(text, orderId) {
  return new Promise((resolve) => {
    try {
      console.log('🖨️ Windows 프린터 출력 시작:', orderId);
      
      // 임시 파일 생성
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `order_${orderId}_${Date.now()}.txt`);
      
      console.log('📄 임시 파일 생성:', tempFile);
      
      // 텍스트 파일로 저장 (UTF-8 with BOM for Windows)
      const BOM = '\ufeff';
      fs.writeFileSync(tempFile, BOM + text, 'utf8');
      
      console.log('✅ 파일 저장 완료, 크기:', fs.statSync(tempFile).size, 'bytes');
      
      // 방법 1: PowerShell 사용 (가장 안정적)
      // 파일 경로를 이스케이프 처리 (Windows 경로 형식 유지)
      // 작은따옴표를 이스케이프하고, 백슬래시는 그대로 유지
      const escapedPath = tempFile.replace(/'/g, "''");
      const powershellCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$content = Get-Content -Path '${escapedPath}' -Raw -Encoding UTF8; $content | Out-Printer"`;
      
      console.log('🖨️ PowerShell 명령어 실행 중...');
      console.log('📝 원본 파일 경로:', tempFile);
      console.log('📝 이스케이프된 경로:', escapedPath);
      
      exec(powershellCommand, { 
        shell: true,
        timeout: 10000 // 10초 타임아웃
      }, (error, stdout, stderr) => {
        if (error) {
          console.log('⚠️ PowerShell 실패, print 명령어 시도:', error.message);
          if (stderr) console.log('⚠️ stderr:', stderr);
          
          // 방법 2: print 명령어 사용 (fallback)
          const printCommand = `print /D:"%PRINTER%" "${tempFile}"`;
          
          exec(printCommand, { shell: true, timeout: 10000 }, (error2, stdout2, stderr2) => {
            // 파일 삭제 (비동기)
            setTimeout(() => {
              try {
                if (fs.existsSync(tempFile)) {
                  fs.unlinkSync(tempFile);
                  console.log('🗑️ 임시 파일 삭제 완료');
                }
              } catch (e) {
                console.log('⚠️ 파일 삭제 실패 (무시):', e.message);
              }
            }, 3000);
            
            if (error2) {
              console.error('❌ print 명령어도 실패:', error2.message);
              if (stderr2) console.error('❌ stderr2:', stderr2);
              // printer 패키지 시도
              tryPrintWithPrinterPackage(text, orderId, resolve);
              return;
            }
            
            console.log('✅ 주문서 출력 완료 (print 명령어):', orderId);
            resolve(true);
          });
          return;
        }
        
        // 파일 삭제 (비동기)
        setTimeout(() => {
          try {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
              console.log('🗑️ 임시 파일 삭제 완료');
            }
          } catch (e) {
            console.log('⚠️ 파일 삭제 실패 (무시):', e.message);
          }
        }, 3000);
        
        if (stdout) console.log('📤 stdout:', stdout);
        if (stderr) console.log('⚠️ stderr:', stderr);
        
        console.log('✅ 주문서 출력 완료 (PowerShell):', orderId);
        resolve(true);
      });
    } catch (error) {
      console.error('❌ Windows 프린터 출력 오류:', error.message);
      console.error('❌ 스택:', error.stack);
      tryPrintWithPrinterPackage(text, orderId, resolve);
    }
  });
}

// printer 패키지로 출력 시도 (fallback)
function tryPrintWithPrinterPackage(text, orderId, resolve) {
  if (!nodePrinter) {
    console.log('⚠️ Windows 기본 프린터 출력 실패.');
    console.log('💡 해결 방법:');
    console.log('   1. Windows 기본 프린터가 설정되어 있는지 확인');
    console.log('   2. 프린터가 켜져 있고 연결되어 있는지 확인');
    console.log('   3. 또는 printer 패키지 설치: npm install printer');
    
    // 최종 방법: notepad로 열어서 수동 인쇄 가능하도록
    try {
      const tempDir = os.tmpdir();
      const safeOrderId = orderId.toString().replace(/[^a-zA-Z0-9]/g, '_');
      const tempFile = path.join(tempDir, `order_${safeOrderId}_${Date.now()}.txt`);
      fs.writeFileSync(tempFile, text, 'utf8');
      
      // notepad로 열기 (사용자가 수동으로 인쇄 가능)
      exec(`notepad "${tempFile}"`, { shell: true }, () => {
        console.log('📝 Notepad로 주문서를 열었습니다. Ctrl+P로 수동 인쇄하세요.');
      });
    } catch (e) {
      console.error('❌ Notepad 열기 실패:', e.message);
    }
    
    resolve(false);
    return;
  }
  
  try {
    console.log('🖨️ printer 패키지로 출력 시도...');
    const printers = nodePrinter.getPrinters();
    console.log('📋 사용 가능한 프린터:', printers.length, '개');
    
    if (printers.length === 0) {
      console.log('⚠️ 사용 가능한 프린터가 없습니다.');
      resolve(false);
      return;
    }
    
    // 기본 프린터 찾기
    const defaultPrinter = printers.find(p => p.isDefault) || printers[0];
    
    if (!defaultPrinter) {
      console.log('⚠️ 기본 프린터를 찾을 수 없습니다.');
      resolve(false);
      return;
    }
    
    console.log('🖨️ 기본 프린터:', defaultPrinter.name);
    
    // 프린터로 출력
    nodePrinter.printDirect({
      data: text,
      printer: defaultPrinter.name,
      type: 'TEXT',
      success: () => {
        console.log('✅ 주문서 출력 완료 (printer 패키지):', orderId);
        resolve(true);
      },
      error: (err) => {
        console.error('❌ 프린터 출력 오류:', err);
        resolve(false);
      }
    });
  } catch (error) {
    console.error('❌ printer 패키지 오류:', error.message);
    console.error('❌ 스택:', error.stack);
    resolve(false);
  }
}

// ESC/POS 프린터로 출력 (기존 방식)
function printToEscpos(text, order) {
  if (!escposPrinter) {
    return false;
  }
  
  try {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const orderDate = new Date(order.createdAt || new Date()).toLocaleString('ko-KR');
    
    escposPrinter
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
      escposPrinter.text(`주소: ${order.address}`);
    }
    
    escposPrinter
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
      escposPrinter
        .text(`${itemName} x${quantity}`)
        .text(`  ${price.toLocaleString()}원`)
        .feed(1);
    });
    
    escposPrinter
      .feed(1)
      .text('━━━━━━━━━━━━━━━━━━━━')
      .feed(1)
      .align('rt')
      .text(`주문금액: ${(order.totalAmount || 0).toLocaleString()}원`);
    
    if (order.usedPoints > 0) {
      escposPrinter.text(`포인트 사용: -${order.usedPoints.toLocaleString()}원`);
    }
    
    if (order.couponDiscount > 0) {
      escposPrinter.text(`쿠폰 할인: -${order.couponDiscount.toLocaleString()}원`);
    }
    
    if (order.deliveryFee > 0) {
      escposPrinter.text(`배달료: +${order.deliveryFee.toLocaleString()}원`);
    }
    
    escposPrinter
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
    
    console.log('✅ 주문서 출력 완료 (ESC/POS):', order.orderId);
    return true;
  } catch (error) {
    console.error('❌ ESC/POS 프린터 출력 오류:', error.message);
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

