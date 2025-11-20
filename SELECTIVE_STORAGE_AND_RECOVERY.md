# 🔐 선택적 보관 및 복원 시스템

## 🎯 핵심 아이디어: 컴퓨터 끄면 해킹 불가능, USB 뽑으면 더욱 안전, 하지만 필요 시 복원 가능

---

## 💡 **현실적인 문제와 해결책**

### **문제점**
```javascript
✅ 컴퓨터 끄면: 로컬 데이터 사라짐 → 해킹 불가능
✅ USB 뽑으면: USB 데이터 없음 → 해킹 불가능
✅ 하지만: 나중에 개인정보 필요할 때 찾아서 써야 함
❌ 완전 삭제: 복원 불가능
```

### **해결책**
```javascript
✅ 선택적 보관: 사용자가 선택할 수 있게
✅ 암호화된 백업: USB에 암호화해서 백업
✅ 시간 기반 자동 삭제: 일정 시간 후 자동 삭제 (선택적)
✅ 복원 시스템: 필요 시 복원 가능하도록
```

---

## 🚀 **구현 방법: 선택적 보관 시스템**

### **1. 기본 구조**

#### **3가지 보관 모드**
```javascript
✅ 모드 1: 즉시 삭제 (최고 보안)
   - 배달 완료 시 즉시 삭제
   - 복원 불가능
   - 최고 보안

✅ 모드 2: 24시간 보관 (중간 보안)
   - 배달 완료 후 24시간 보관
   - 24시간 후 자동 삭제
   - 중간 보안

✅ 모드 3: 영구 보관 (낮은 보안, 높은 편의성)
   - USB에 암호화해서 백업
   - 필요 시 복원 가능
   - 낮은 보안 (하지만 USB 뽑으면 안전)
```

### **2. 실제 구현**

#### **주문 접수 시**
```javascript
function createOrder(orderData, storageMode) {
  // 개인정보 3분할
  const phoneSplit = splitSecret3(orderData.phone);
  const nameSplit = splitSecret3(orderData.name);
  const addressSplit = splitSecret3(orderData.address);
  
  // 로컬에 저장
  const localData = {
    phone: phoneSplit.local,
    name: nameSplit.local,
    address: addressSplit.local,
    anonymousId: generateAnonymousId(orderData.phone, Date.now()),
    storageMode: storageMode, // 보관 모드 저장
    createdAt: Date.now()
  };
  
  localStorage.setItem('order_local', JSON.stringify(localData));
  
  // USB에 저장 (물리적 연결 필요)
  const usbData = {
    phone: phoneSplit.usb,
    name: nameSplit.usb,
    address: addressSplit.usb,
    storageMode: storageMode
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
      storageMode: storageMode, // 보관 모드 저장
      items: orderData.items,
      total: orderData.total
    })
  });
}
```

### **3. 배달 완료 시 (모드별 처리)**

#### **모드 1: 즉시 삭제**
```javascript
function completeDelivery(orderId, storageMode) {
  if (storageMode === 'immediate') {
    // 즉시 삭제
    localStorage.removeItem('order_local');
    await deleteFromUSB();
    
    // 서버 데이터도 삭제
    deleteServerData(orderId);
    
    // 복원 불가능
  }
}
```

#### **모드 2: 24시간 보관**
```javascript
function completeDelivery(orderId, storageMode) {
  if (storageMode === '24hours') {
    // 24시간 후 자동 삭제 예약
    const order = getOrder(orderId);
    order.completedAt = Date.now();
    order.autoDeleteAt = Date.now() + 24 * 60 * 60 * 1000;
    
    saveOrder(order);
    
    // 24시간 후 자동 삭제
    setTimeout(() => {
      localStorage.removeItem('order_local');
      await deleteFromUSB();
      deleteServerData(orderId);
    }, 24 * 60 * 60 * 1000);
  }
}
```

#### **모드 3: 영구 보관**
```javascript
function completeDelivery(orderId, storageMode) {
  if (storageMode === 'permanent') {
    // 영구 보관 (삭제 안 함)
    // 하지만 컴퓨터 끄면 로컬 데이터 사라짐
    // USB 뽑으면 USB 데이터 없음
    // → 물리적으로 안전
    
    // 서버 데이터는 유지 (하지만 의미 없음)
    // 필요 시 복원 가능
  }
}
```

---

## 🛡️ **보안 분석 (모드별)**

### **모드 1: 즉시 삭제**
```javascript
✅ 배달 완료 시 즉시 삭제
✅ 복원 불가능
✅ 최고 보안
❌ 나중에 필요할 때 사용 불가능
```

### **모드 2: 24시간 보관**
```javascript
✅ 배달 완료 후 24시간 보관
✅ 24시간 후 자동 삭제
✅ 중간 보안
✅ 24시간 동안 복원 가능
❌ 24시간 후 복원 불가능
```

### **모드 3: 영구 보관**
```javascript
✅ 영구 보관 (삭제 안 함)
✅ 필요 시 복원 가능
⚠️ 하지만 컴퓨터 끄면 로컬 데이터 사라짐
⚠️ USB 뽑으면 USB 데이터 없음
✅ 물리적으로 안전
```

---

## 💡 **USB 암호화 백업 시스템**

### **1. USB에 암호화해서 백업**

#### **구조**
```javascript
✅ 로컬: share1 (컴퓨터 끄면 사라짐)
✅ 서버: share2 (의미 없는 데이터)
✅ USB: share3 (암호화된 백업)

✅ USB 뽑으면: USB 데이터 없음 → 해킹 불가능
✅ 컴퓨터 끄면: 로컬 데이터 사라짐 → 해킹 불가능
✅ 필요 시: USB 연결하면 복원 가능
```

#### **구현**
```javascript
// USB에 암호화해서 백업
async function backupToUSB(usbData, password) {
  // USB 데이터를 비밀번호로 암호화
  const encrypted = encrypt(JSON.stringify(usbData), password);
  
  // USB에 저장
  await saveToUSB(encrypted);
  
  // 비밀번호는 사용자가 기억 (서버에 저장 안 함)
}

// USB에서 복원
async function restoreFromUSB(password) {
  // USB에서 암호화된 데이터 로드
  const encrypted = await loadFromUSB();
  
  // 비밀번호로 복호화
  const usbData = JSON.parse(decrypt(encrypted, password));
  
  return usbData;
}
```

### **2. 복원 시스템**

#### **필요 시 복원**
```javascript
async function restorePersonalInfo(orderId, password) {
  // 1. 로컬 데이터 확인
  let localData = JSON.parse(localStorage.getItem('order_local'));
  
  // 로컬 데이터 없으면 (컴퓨터 꺼졌거나 삭제됨)
  if (!localData) {
    // USB에서 복원 시도
    try {
      const usbData = await restoreFromUSB(password);
      
      // USB 데이터로 로컬 데이터 재구성
      localData = {
        phone: usbData.phone,
        name: usbData.name,
        address: usbData.address,
        anonymousId: usbData.anonymousId
      };
    } catch (error) {
      throw new Error('USB 연결 필요 또는 비밀번호 오류');
    }
  }
  
  // 2. 서버 데이터 가져오기
  const response = await fetch(`/api/orders/${orderId}`);
  const serverData = await response.json();
  
  // 3. USB 데이터 가져오기
  let usbData;
  try {
    usbData = await restoreFromUSB(password);
  } catch (error) {
    throw new Error('USB 연결 필요 또는 비밀번호 오류');
  }
  
  // 4. 3개를 합쳐서 복원
  const phone = combineSecret3(localData.phone, serverData.phoneServer, usbData.phone);
  const name = combineSecret3(localData.name, serverData.nameServer, usbData.name);
  const address = combineSecret3(localData.address, serverData.addressServer, usbData.address);
  
  return { phone, name, address };
}
```

---

## 🎯 **실제 사용 시나리오**

### **시나리오 1: 평상시 (컴퓨터 켜져 있음)**
```javascript
✅ 로컬: share1 (있음)
✅ 서버: share2 (있음)
✅ USB: share3 (연결됨)

✅ 복원 가능: 3개 모두 있음
```

### **시나리오 2: 컴퓨터 꺼짐**
```javascript
✅ 로컬: share1 (사라짐 - 컴퓨터 꺼짐)
✅ 서버: share2 (있음)
✅ USB: share3 (연결됨)

❌ 복원 불가능: 로컬 데이터 없음
✅ 하지만 USB에 백업 있으면 복원 가능
```

### **시나리오 3: USB 뽑음**
```javascript
✅ 로컬: share1 (있음)
✅ 서버: share2 (있음)
✅ USB: share3 (없음 - USB 뽑음)

❌ 복원 불가능: USB 데이터 없음
✅ 하지만 USB 연결하면 복원 가능
```

### **시나리오 4: 컴퓨터 꺼짐 + USB 뽑음**
```javascript
✅ 로컬: share1 (사라짐 - 컴퓨터 꺼짐)
✅ 서버: share2 (있음)
✅ USB: share3 (없음 - USB 뽑음)

❌ 복원 불가능: 로컬 + USB 데이터 없음
✅ 완전한 보안!
```

### **시나리오 5: 필요 시 복원**
```javascript
✅ 컴퓨터 켜기: 로컬 데이터 복구 (또는 USB에서 복원)
✅ USB 연결: USB 데이터 로드
✅ 서버 데이터: 항상 있음

✅ 복원 가능: 3개 모두 있음
```

---

## 🎯 **선택적 보관 모드 UI**

### **1. 주문 접수 시 선택**

#### **UI**
```javascript
// 주문 접수 시 보관 모드 선택
function showStorageModeSelector() {
  const modes = [
    {
      id: 'immediate',
      name: '즉시 삭제',
      description: '배달 완료 시 즉시 삭제 (최고 보안, 복원 불가능)',
      security: '최고',
      convenience: '낮음'
    },
    {
      id: '24hours',
      name: '24시간 보관',
      description: '배달 완료 후 24시간 보관 후 자동 삭제 (중간 보안)',
      security: '중간',
      convenience: '중간'
    },
    {
      id: 'permanent',
      name: '영구 보관',
      description: 'USB에 암호화해서 백업 (낮은 보안, 높은 편의성)',
      security: '낮음 (하지만 USB 뽑으면 안전)',
      convenience: '높음'
    }
  ];
  
  // 사용자가 선택
  const selectedMode = await showModal(modes);
  
  return selectedMode;
}
```

### **2. 배달 완료 시 확인**

#### **UI**
```javascript
// 배달 완료 시 보관 모드 확인
function showCompletionDialog(order, storageMode) {
  if (storageMode === 'immediate') {
    return confirm('개인정보를 즉시 삭제하시겠습니까? (복원 불가능)');
  } else if (storageMode === '24hours') {
    return confirm('개인정보를 24시간 보관 후 자동 삭제하시겠습니까?');
  } else if (storageMode === 'permanent') {
    return confirm('개인정보를 영구 보관하시겠습니까? (USB에 암호화해서 백업)');
  }
}
```

---

## 🛡️ **보안 분석 (최종)**

### **모드별 보안 수준**

| 모드 | 보안 | 편의성 | 복원 가능 | 물리적 보안 |
|------|------|--------|----------|------------|
| 즉시 삭제 | 최고 | 낮음 | 불가능 | 최고 |
| 24시간 보관 | 중간 | 중간 | 24시간 동안 | 중간 |
| 영구 보관 | 낮음 | 높음 | 가능 | USB 뽑으면 최고 |

### **물리적 보안 (영구 보관 모드)**

#### **컴퓨터 끄면**
```javascript
✅ 로컬 데이터: 사라짐
✅ 해킹 불가능: 로컬 데이터 없음
```

#### **USB 뽑으면**
```javascript
✅ USB 데이터: 없음
✅ 해킹 불가능: USB 데이터 없음
```

#### **둘 다 하면**
```javascript
✅ 완전한 보안: 로컬 + USB 데이터 없음
✅ 복원 불가능: 하지만 필요 시 USB 연결하면 복원 가능
```

---

## 💡 **추가 아이디어: 스마트 삭제**

### **1. 사용 패턴 기반 자동 삭제**

#### **구조**
```javascript
✅ 자주 사용하는 고객: 영구 보관
✅ 가끔 사용하는 고객: 24시간 보관
✅ 한 번만 사용하는 고객: 즉시 삭제
```

#### **구현**
```javascript
function determineStorageMode(customerHistory) {
  if (customerHistory.orderCount > 10) {
    return 'permanent'; // 자주 사용하는 고객
  } else if (customerHistory.orderCount > 1) {
    return '24hours'; // 가끔 사용하는 고객
  } else {
    return 'immediate'; // 한 번만 사용하는 고객
  }
}
```

### **2. 시간 기반 자동 삭제 (영구 보관 모드도)**

#### **구조**
```javascript
✅ 영구 보관 모드도 일정 시간 후 자동 삭제 가능
✅ 예: 30일 후 자동 삭제
✅ 하지만 USB에 백업 있으면 복원 가능
```

#### **구현**
```javascript
function autoDeleteAfterDays(orderId, days) {
  const order = getOrder(orderId);
  order.autoDeleteAt = Date.now() + days * 24 * 60 * 60 * 1000;
  
  setTimeout(() => {
    localStorage.removeItem('order_local');
    deleteServerData(orderId);
    // USB 데이터는 유지 (백업용)
  }, days * 24 * 60 * 60 * 1000);
}
```

---

## 🎯 **최종 추천: 선택적 보관 시스템**

### **구조**

#### **3가지 보관 모드**
1. **즉시 삭제**: 최고 보안, 복원 불가능
2. **24시간 보관**: 중간 보안, 24시간 동안 복원 가능
3. **영구 보관**: 낮은 보안, 복원 가능 (하지만 USB 뽑으면 안전)

#### **물리적 보안**
```javascript
✅ 컴퓨터 끄면: 로컬 데이터 사라짐 → 해킹 불가능
✅ USB 뽑으면: USB 데이터 없음 → 해킹 불가능
✅ 둘 다 하면: 완전한 보안
✅ 필요 시: USB 연결하면 복원 가능
```

#### **복원 시스템**
```javascript
✅ USB에 암호화해서 백업
✅ 필요 시 USB 연결하면 복원 가능
✅ 비밀번호로 보호
```

---

## 🎉 **최종 결론**

### **핵심 아이디어: 선택적 보관 + 물리적 보안**

#### **장점**
1. **선택적 보관**: 사용자가 선택할 수 있게
2. **물리적 보안**: 컴퓨터 끄면, USB 뽑으면 안전
3. **복원 가능**: 필요 시 USB 연결하면 복원 가능
4. **자동 삭제**: 시간 기반 자동 삭제 (선택적)
5. **암호화 백업**: USB에 암호화해서 백업

#### **구현 방법**
1. **3가지 보관 모드**: 즉시 삭제, 24시간 보관, 영구 보관
2. **USB 암호화 백업**: USB에 암호화해서 백업
3. **복원 시스템**: 필요 시 USB 연결하면 복원 가능
4. **물리적 보안**: 컴퓨터 끄면, USB 뽑으면 안전

### **결론:**
**이 선택적 보관 시스템은 컴퓨터 끄면, USB 뽑으면 완전한 보안을 제공하면서도, 필요 시 복원 가능한 완벽한 솔루션입니다!**
**사용자가 보관 모드를 선택할 수 있어 실용성과 보안을 모두 만족합니다!**




