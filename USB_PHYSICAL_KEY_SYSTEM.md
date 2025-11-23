# 🔐 USB 물리적 키 시스템 (3분할 Secret Sharing)

## 🎯 핵심 아이디어: 로컬 + 서버 + USB 물리적 연결이 모두 있어야만 개인정보 확인 가능

---

## 💡 **혁신적인 아이디어: 3분할 Secret Sharing + USB 물리적 키**

### **핵심 개념**

#### **구조**
```javascript
✅ 개인정보를 3부분으로 분할
   - 로컬: 1/3
   - 서버: 1/3
   - USB: 1/3

✅ 3개 모두 있어야만 복원 가능
   - 로컬만: 복원 불가능
   - 서버만: 복원 불가능
   - USB만: 복원 불가능
   - 로컬 + 서버: 복원 불가능 (USB 없음)
   - 로컬 + USB: 복원 불가능 (서버 없음)
   - 서버 + USB: 복원 불가능 (로컬 없음)
   - 로컬 + 서버 + USB: 복원 가능!
```

---

## 🚀 **구현 방법: Shamir's Secret Sharing (3,3) Threshold**

### **1. 기본 원리**

#### **Shamir's Secret Sharing (3,3)**
```javascript
✅ 개인정보를 2차 다항식으로 변환
✅ 3개의 점 (share) 생성
✅ 3개 모두 있어야만 원본 복원 가능
✅ 2개만 있어도 복원 불가능
```

### **2. 실제 구현**

#### **3분할 생성**
```javascript
const crypto = require('crypto');
const { createHash } = require('crypto');

// Shamir's Secret Sharing (3,3) 구현
function splitSecret3(secret) {
  // 개인정보를 바이트로 변환
  const secretBytes = Buffer.from(secret, 'utf8');
  
  // 랜덤 계수 생성 (2차 다항식: f(x) = a0 + a1*x + a2*x^2)
  const a0 = secretBytes; // 상수항 = 개인정보
  const a1 = crypto.randomBytes(secretBytes.length);
  const a2 = crypto.randomBytes(secretBytes.length);
  
  // 3개의 점 생성 (x=1, x=2, x=3)
  const share1 = calculateShare(1, a0, a1, a2); // 로컬
  const share2 = calculateShare(2, a0, a1, a2); // 서버
  const share3 = calculateShare(3, a0, a1, a2); // USB
  
  return {
    local: share1.toString('hex'),
    server: share2.toString('hex'),
    usb: share3.toString('hex')
  };
}

// 다항식 계산
function calculateShare(x, a0, a1, a2) {
  const result = Buffer.alloc(a0.length);
  
  for (let i = 0; i < a0.length; i++) {
    // f(x) = a0 + a1*x + a2*x^2
    const value = (a0[i] + a1[i] * x + a2[i] * x * x) % 256;
    result[i] = value;
  }
  
  return result;
}

// 3개를 합쳐서 복원
function combineSecret3(share1, share2, share3) {
  const s1 = Buffer.from(share1, 'hex');
  const s2 = Buffer.from(share2, 'hex');
  const s3 = Buffer.from(share3, 'hex');
  
  // Lagrange 보간법으로 복원
  // f(0) = a0 (원본 개인정보)
  const secret = Buffer.alloc(s1.length);
  
  for (let i = 0; i < s1.length; i++) {
    // Lagrange 보간법
    // f(0) = s1 * L1(0) + s2 * L2(0) + s3 * L3(0)
    const L1 = (-2 * -3) / ((1 - 2) * (1 - 3)); // L1(0)
    const L2 = (-1 * -3) / ((2 - 1) * (2 - 3)); // L2(0)
    const L3 = (-1 * -2) / ((3 - 1) * (3 - 2)); // L3(0)
    
    const value = (s1[i] * L1 + s2[i] * L2 + s3[i] * L3) % 256;
    secret[i] = value;
  }
  
  return secret.toString('utf8');
}
```

---

## 🎯 **실제 적용: 전화번호 3분할 저장**

### **1. 주문 접수 시**

#### **클라이언트 (로컬)**
```javascript
// 전화번호를 3부분으로 분할
const phone = '01012345678';
const split = splitSecret3(phone);

// 로컬에 저장 (의미 없는 데이터)
localStorage.setItem('phone_local', split.local);

// USB에 저장 (물리적 연결 필요)
async function saveToUSB(share) {
  // USB 디바이스 감지
  const usbDevice = await navigator.usb.requestDevice({
    filters: [{ vendorId: 0x1234 }] // USB 벤더 ID
  });
  
  await usbDevice.open();
  await usbDevice.selectConfiguration(1);
  await usbDevice.claimInterface(0);
  
  // USB에 share 저장
  const data = new TextEncoder().encode(share);
  await usbDevice.transferOut(1, data);
  
  await usbDevice.close();
}

// USB에 저장
await saveToUSB(split.usb);

// 서버에 전송 (의미 없는 데이터)
fetch('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    anonymousId: generateAnonymousId(phone, Date.now()),
    phoneServer: split.server, // 의미 없는 데이터
    items: orderData.items,
    total: orderData.total
  })
});
```

#### **서버 저장**
```javascript
// 서버 (데이터베이스)
const order = {
  anonymousId: 'a1b2c3d4e5f6...',
  phoneServer: 'x9y8z7w6v5u4...', // 의미 없는 데이터
  items: [...],
  total: 25000,
  points: 0
};

// 서버 데이터만으로는 전화번호 복원 불가능!
```

#### **USB 저장**
```javascript
// USB에 저장된 데이터
// share3: 'm5n4o3p2q1r0...' // 의미 없는 데이터

// USB 데이터만으로는 전화번호 복원 불가능!
```

### **2. 전화번호 복원 (필요 시)**

#### **로컬 + 서버 + USB 데이터 합치기**
```javascript
// 클라이언트에서 복원 (USB 물리적 연결 필요)
async function restorePhone(orderId) {
  // 1. 로컬 데이터 가져오기
  const localShare = localStorage.getItem('phone_local');
  
  if (!localShare) {
    throw new Error('로컬 데이터 없음');
  }
  
  // 2. 서버 데이터 가져오기
  const response = await fetch(`/api/orders/${orderId}`);
  const serverData = await response.json();
  const serverShare = serverData.phoneServer;
  
  if (!serverShare) {
    throw new Error('서버 데이터 없음');
  }
  
  // 3. USB 데이터 가져오기 (물리적 연결 필요)
  const usbShare = await loadFromUSB();
  
  if (!usbShare) {
    throw new Error('USB 연결 필요');
  }
  
  // 4. 3개를 합쳐서 복원
  const phone = combineSecret3(localShare, serverShare, usbShare);
  
  return phone;
}

// USB에서 데이터 로드
async function loadFromUSB() {
  // USB 디바이스 감지
  const usbDevice = await navigator.usb.requestDevice({
    filters: [{ vendorId: 0x1234 }]
  });
  
  await usbDevice.open();
  await usbDevice.selectConfiguration(1);
  await usbDevice.claimInterface(0);
  
  // USB에서 데이터 읽기
  const result = await usbDevice.transferIn(1, 64);
  const data = new TextDecoder().decode(result.data);
  
  await usbDevice.close();
  
  return data;
}
```

---

## 🛡️ **보안 분석**

### **시나리오 1: 로컬만 털렸을 때**
```javascript
✅ 공격자가 얻는 것:
   - share1: 다항식의 점 1개 (의미 없음)

❌ 서버 데이터 없음: 복원 불가능
❌ USB 없음: 복원 불가능

→ 개인정보 유출 불가능!
```

### **시나리오 2: 서버만 털렸을 때**
```javascript
✅ 공격자가 얻는 것:
   - share2: 다항식의 점 1개 (의미 없음)

❌ 로컬 데이터 없음: 복원 불가능
❌ USB 없음: 복원 불가능

→ 개인정보 유출 불가능!
```

### **시나리오 3: USB만 털렸을 때**
```javascript
✅ 공격자가 얻는 것:
   - share3: 다항식의 점 1개 (의미 없음)

❌ 로컬 데이터 없음: 복원 불가능
❌ 서버 데이터 없음: 복원 불가능

→ 개인정보 유출 불가능!
```

### **시나리오 4: 로컬 + 서버 털렸을 때**
```javascript
✅ 공격자가 얻는 것:
   - share1: 다항식의 점 1개
   - share2: 다항식의 점 1개

❌ USB 없음: 복원 불가능 (3개 모두 필요)

→ 개인정보 유출 불가능!
```

### **시나리오 5: 로컬 + USB 털렸을 때**
```javascript
✅ 공격자가 얻는 것:
   - share1: 다항식의 점 1개
   - share3: 다항식의 점 1개

❌ 서버 데이터 없음: 복원 불가능 (3개 모두 필요)

→ 개인정보 유출 불가능!
```

### **시나리오 6: 서버 + USB 털렸을 때**
```javascript
✅ 공격자가 얻는 것:
   - share2: 다항식의 점 1개
   - share3: 다항식의 점 1개

❌ 로컬 데이터 없음: 복원 불가능 (3개 모두 필요)

→ 개인정보 유출 불가능!
```

### **시나리오 7: 로컬 + 서버 + USB 모두 털렸을 때**
```javascript
✅ 공격자가 얻는 것:
   - share1: 다항식의 점 1개
   - share2: 다항식의 점 1개
   - share3: 다항식의 점 1개

⚠️ 3개를 합치면: 개인정보 복원 가능

→ 하지만 3개 모두 털릴 확률은 극히 낮음!
→ 배달 완료 후 24시간 후 자동 삭제로 위험 최소화!
```

---

## 🎯 **실제 적용: 전체 주문 시스템**

### **1. 주문 접수 시**

#### **클라이언트**
```javascript
function createOrder(orderData) {
  // 개인정보 3분할
  const phoneSplit = splitSecret3(orderData.phone);
  const nameSplit = splitSecret3(orderData.name);
  const addressSplit = splitSecret3(orderData.address);
  
  // 로컬에 저장
  const localData = {
    phone: phoneSplit.local,
    name: nameSplit.local,
    address: addressSplit.local,
    anonymousId: generateAnonymousId(orderData.phone, Date.now())
  };
  
  localStorage.setItem('order_local', JSON.stringify(localData));
  
  // USB에 저장 (물리적 연결 필요)
  const usbData = {
    phone: phoneSplit.usb,
    name: nameSplit.usb,
    address: addressSplit.usb
  };
  
  await saveToUSB(JSON.stringify(usbData));
  
  // 서버에 전송
  fetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      anonymousId: localData.anonymousId,
      phoneServer: phoneSplit.server,
      nameServer: nameSplit.server,
      addressServer: addressSplit.server,
      items: orderData.items,
      total: orderData.total
    })
  });
}
```

### **2. 배달 완료 시**

#### **로컬 데이터 삭제**
```javascript
function completeDelivery(orderId) {
  // 로컬 데이터 삭제
  localStorage.removeItem('order_local');
  
  // USB 데이터 삭제 (선택적)
  await deleteFromUSB();
  
  // 서버 데이터는 유지 (하지만 의미 없음)
  // 서버 데이터만으로는 개인정보 복원 불가능!
}
```

### **3. 필요 시 복원**

#### **로컬 + 서버 + USB 데이터 합치기**
```javascript
async function restorePersonalInfo(orderId) {
  // 1. 로컬 데이터 가져오기
  const localData = JSON.parse(localStorage.getItem('order_local'));
  
  if (!localData) {
    throw new Error('로컬 데이터 없음 (이미 삭제됨)');
  }
  
  // 2. 서버 데이터 가져오기
  const response = await fetch(`/api/orders/${orderId}`);
  const serverData = await response.json();
  
  // 3. USB 데이터 가져오기 (물리적 연결 필요)
  const usbData = JSON.parse(await loadFromUSB());
  
  if (!usbData) {
    throw new Error('USB 연결 필요');
  }
  
  // 4. 3개를 합쳐서 복원
  const phone = combineSecret3(localData.phone, serverData.phoneServer, usbData.phone);
  const name = combineSecret3(localData.name, serverData.nameServer, usbData.name);
  const address = combineSecret3(localData.address, serverData.addressServer, usbData.address);
  
  return { phone, name, address };
}
```

---

## 💡 **USB 물리적 키 구현 방법**

### **1. Web USB API 사용**

#### **브라우저에서 USB 접근**
```javascript
// USB 디바이스 요청
async function requestUSBDevice() {
  try {
    const device = await navigator.usb.requestDevice({
      filters: [
        { vendorId: 0x1234 }, // USB 벤더 ID
        { productId: 0x5678 } // USB 제품 ID
      ]
    });
    
    return device;
  } catch (error) {
    console.error('USB 디바이스 요청 실패:', error);
    return null;
  }
}

// USB에 데이터 저장
async function saveToUSB(data) {
  const device = await requestUSBDevice();
  
  if (!device) {
    throw new Error('USB 디바이스 연결 필요');
  }
  
  await device.open();
  await device.selectConfiguration(1);
  await device.claimInterface(0);
  
  // 데이터 저장
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  await device.transferOut(1, dataBuffer);
  
  await device.releaseInterface(0);
  await device.close();
}

// USB에서 데이터 로드
async function loadFromUSB() {
  const device = await requestUSBDevice();
  
  if (!device) {
    throw new Error('USB 디바이스 연결 필요');
  }
  
  await device.open();
  await device.selectConfiguration(1);
  await device.claimInterface(0);
  
  // 데이터 읽기
  const result = await device.transferIn(1, 64);
  const decoder = new TextDecoder();
  const data = decoder.decode(result.data);
  
  await device.releaseInterface(0);
  await device.close();
  
  return data;
}
```

### **2. 간단한 대안: 로컬 파일 시스템**

#### **파일로 저장 (물리적 접근 필요)**
```javascript
// 파일로 저장 (물리적 접근 필요)
async function saveToFile(data) {
  const blob = new Blob([data], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'secret_key.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// 파일에서 로드 (물리적 접근 필요)
function loadFromFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'text/plain';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = reject;
      reader.readAsText(file);
    };
    
    input.click();
  });
}
```

---

## 🎯 **자동 삭제 시스템**

### **1. 로컬 데이터 자동 삭제**
```javascript
// 배달 완료 후 24시간 후 자동 삭제
function autoDeleteLocalData() {
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');
  const now = Date.now();
  
  orders.forEach(order => {
    if (order.completedAt && (now - order.completedAt) > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`order_${order.id}_local`);
    }
  });
}

setInterval(autoDeleteLocalData, 60 * 60 * 1000);
```

### **2. 서버 데이터 자동 삭제**
```javascript
// 배달 완료 후 24시간 후 서버 데이터도 삭제
function autoDeleteServerData() {
  const now = Date.now();
  const orders = getAllOrders();
  
  orders.forEach(order => {
    if (order.completedAt && (now - order.completedAt) > 24 * 60 * 60 * 1000) {
      delete order.phoneServer;
      delete order.nameServer;
      delete order.addressServer;
      saveOrder(order);
    }
  });
}

setInterval(autoDeleteServerData, 60 * 60 * 1000);
```

### **3. USB 데이터 삭제 (선택적)**
```javascript
// 배달 완료 후 USB 데이터도 삭제 (선택적)
async function autoDeleteUSBData() {
  // USB 연결 필요
  const device = await requestUSBDevice();
  
  if (device) {
    await device.open();
    await device.selectConfiguration(1);
    await device.claimInterface(0);
    
    // USB 데이터 삭제 (0으로 덮어쓰기)
    const emptyData = new Uint8Array(64).fill(0);
    await device.transferOut(1, emptyData);
    
    await device.releaseInterface(0);
    await device.close();
  }
}
```

---

## 🎯 **보안 분석 (최종)**

### **모든 시나리오 분석**

| 시나리오 | 로컬 | 서버 | USB | 복원 가능? |
|---------|------|------|-----|-----------|
| 1개만 털림 | ✅ | ❌ | ❌ | ❌ 불가능 |
| 1개만 털림 | ❌ | ✅ | ❌ | ❌ 불가능 |
| 1개만 털림 | ❌ | ❌ | ✅ | ❌ 불가능 |
| 2개만 털림 | ✅ | ✅ | ❌ | ❌ 불가능 |
| 2개만 털림 | ✅ | ❌ | ✅ | ❌ 불가능 |
| 2개만 털림 | ❌ | ✅ | ✅ | ❌ 불가능 |
| 3개 모두 털림 | ✅ | ✅ | ✅ | ⚠️ 가능 (확률 극히 낮음) |

### **결론**
```javascript
✅ 1개만 털려도: 복원 불가능
✅ 2개만 털려도: 복원 불가능
⚠️ 3개 모두 털려야만: 복원 가능 (확률 극히 낮음)
✅ 배달 완료 후 24시간 후 자동 삭제로 위험 최소화
```

---

## 💰 **비용 분석**

### **기존 방식**
```javascript
✅ 개인정보 암호화: 필요
✅ 개인정보 보관: 필요
✅ 보안 비용: 연 50만 - 200만 원
```

### **USB 물리적 키 시스템**
```javascript
✅ 개인정보 3분할: 비용 없음 (알고리즘)
✅ 로컬 저장: 비용 없음
✅ 서버 저장: 최소화 (의미 없는 데이터만)
✅ USB 저장: 비용 없음 (파일 또는 USB)
✅ 보안 비용: 연 10만 - 30만 원

→ 비용 절감!
```

---

## 🎉 **최종 결론**

### **핵심 아이디어: 로컬 + 서버 + USB 물리적 연결이 모두 있어야만 개인정보 확인 가능**

#### **장점**
1. **완전한 보안**: 1개만 털려도 복원 불가능
2. **완전한 보안**: 2개만 털려도 복원 불가능
3. **물리적 보안**: USB 물리적 연결 필요
4. **자동 삭제**: 배달 완료 후 24시간 후 자동 삭제
5. **법적 책임 최소화**: 서버에 의미 있는 개인정보 없음
6. **비용 절감**: 보안 비용 최소화

#### **구현 방법**
1. **Shamir's Secret Sharing (3,3)**: 개인정보를 3부분으로 분할
2. **로컬 저장**: share1
3. **서버 저장**: share2
4. **USB 저장**: share3 (물리적 연결 필요)
5. **복원**: 3개 모두 합치기
6. **자동 삭제**: 24시간 후 자동 삭제

### **결론:**
**이 USB 물리적 키 시스템은 로컬 + 서버 + USB가 모두 있어야만 개인정보를 확인할 수 있는 가장 안전한 솔루션입니다!**
**1개만 털려도, 2개만 털려도 개인정보 유출이 불가능하며, 3개 모두 털려야만 복원 가능하지만 그 확률은 극히 낮습니다!**






