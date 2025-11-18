// 로그인 체크
if (sessionStorage.getItem('pos-authenticated') !== 'true') {
  window.location.href = '/pos/login.html';
}

// 차트 인스턴스 저장
let charts = {};

// 햄버거 메뉴 토글
function toggleMenu() {
  const sideMenu = document.getElementById('side-menu');
  const overlay = document.getElementById('menu-overlay');
  
  if (sideMenu.classList.contains('active')) {
    sideMenu.classList.remove('active');
    overlay.classList.remove('active');
  } else {
    sideMenu.classList.add('active');
    overlay.classList.add('active');
  }
}

// 탭 전환
function switchTab(tabName) {
  // 모든 탭 버튼과 컨텐츠 비활성화
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  // 선택된 탭 활성화
  event.target.classList.add('active');
  document.getElementById(tabName + '-tab').classList.add('active');
  
  // 해당 탭 데이터 로드
  if (tabName === 'stats') {
    loadStatsTab();
  } else if (tabName === 'settlement') {
    setThisMonth();
  } else if (tabName === 'customers') {
    loadCustomersTab();
  } else if (tabName === 'regions') {
    loadRegionsTab();
  } else if (tabName === 'ri') {
    loadRiTab();
  } else if (tabName === 'apartments') {
    loadApartmentsTab();
  }
}

// 숫자 포맷팅
function formatNumber(num) {
  return num.toLocaleString('ko-KR');
}

function formatCurrency(num) {
  return formatNumber(num) + '원';
}

// ========== 매출 통계 탭 ==========
async function loadStatsTab() {
  try {
    // 실시간 통계
    const realtimeRes = await fetch('/api/stats/realtime');
    const realtimeData = await realtimeRes.json();
    
    if (realtimeData.success) {
      const stats = realtimeData.data;
      document.getElementById('today-sales').textContent = formatCurrency(stats.today.totalSales || 0);
      document.getElementById('today-orders').textContent = `주문 ${stats.today.orderCount || 0}건`;
      document.getElementById('avg-order').textContent = formatCurrency(Math.round(stats.today.avgOrderAmount || 0));
      document.getElementById('pending-count').textContent = `${stats.pending || 0}건`;
      document.getElementById('preparing-count').textContent = `조리중 ${stats.preparing || 0}건`;
      document.getElementById('delivering-count').textContent = `${stats.delivering || 0}건`;
    }
    
    // 일별 매출 차트
    const dailyRes = await fetch('/api/stats/daily?days=30');
    const dailyData = await dailyRes.json();
    
    if (dailyData.success && dailyData.data.length > 0) {
      renderDailySalesChart(dailyData.data);
    }
    
    // 시간대별 주문 차트
    const timeRes = await fetch('/api/stats/time-distribution');
    const timeData = await timeRes.json();
    
    if (timeData.success && timeData.data.length > 0) {
      renderTimeDistChart(timeData.data);
    }
    
    // 인기 메뉴 차트
    const menuRes = await fetch('/api/stats/popular-menus?limit=10');
    const menuData = await menuRes.json();
    
    if (menuData.success && menuData.data.length > 0) {
      renderPopularMenuChart(menuData.data);
    }
    
  } catch (error) {
    console.error('통계 로드 오류:', error);
  }
}

function renderDailySalesChart(data) {
  const ctx = document.getElementById('dailySalesChart');
  
  // 기존 차트 삭제
  if (charts.dailySales) {
    charts.dailySales.destroy();
  }
  
  // 데이터 역순 정렬 (오래된 날짜부터)
  data.reverse();
  
  charts.dailySales = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: '매출',
        data: data.map(d => d.totalSales),
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return '매출: ' + formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatNumber(value) + '원';
            }
          }
        }
      }
    }
  });
}

function renderTimeDistChart(data) {
  const ctx = document.getElementById('timeDistChart');
  
  if (charts.timeDist) {
    charts.timeDist.destroy();
  }
  
  charts.timeDist = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.hour + '시'),
      datasets: [{
        label: '주문 건수',
        data: data.map(d => d.orderCount),
        backgroundColor: '#4caf50'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

function renderPopularMenuChart(data) {
  const ctx = document.getElementById('popularMenuChart');
  
  if (charts.popularMenu) {
    charts.popularMenu.destroy();
  }
  
  charts.popularMenu = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.menuName),
      datasets: [{
        label: '판매량',
        data: data.map(d => d.totalQuantity),
        backgroundColor: '#ff9800'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

// ========== 정산 정보 탭 ==========
function setToday() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('start-date').value = today;
  document.getElementById('end-date').value = today;
  loadSettlement();
}

function setThisMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date().toISOString().split('T')[0];
  document.getElementById('start-date').value = start;
  document.getElementById('end-date').value = end;
  loadSettlement();
}

async function loadSettlement() {
  try {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
      alert('날짜를 선택해주세요.');
      return;
    }
    
    const res = await fetch(`/api/stats/settlement?startDate=${startDate}&endDate=${endDate}`);
    const data = await res.json();
    
    if (data.success && data.data) {
      const s = data.data;
      const netSales = (s.grossSales || 0) - (s.pointsRedeemed || 0);
      
      document.getElementById('sett-orders').textContent = formatNumber(s.totalOrders || 0) + '건';
      document.getElementById('sett-gross').textContent = formatCurrency(s.grossSales || 0);
      document.getElementById('sett-points-used').textContent = formatCurrency(s.pointsRedeemed || 0);
      document.getElementById('sett-points-issued').textContent = formatCurrency(s.pointsIssued || 0);
      document.getElementById('sett-card').textContent = formatCurrency(s.cardPayments || 0);
      document.getElementById('sett-cash').textContent = formatCurrency(s.cashPayments || 0);
      document.getElementById('sett-net').textContent = formatCurrency(netSales);
    }
  } catch (error) {
    console.error('정산 로드 오류:', error);
  }
}

// ========== 고객 분석 탭 ==========
async function loadCustomersTab() {
  try {
    // 우수 고객
    const customersRes = await fetch('/api/stats/top-customers?limit=10');
    const customersData = await customersRes.json();
    
    if (customersData.success && customersData.data.length > 0) {
      renderTopCustomersTable(customersData.data);
    } else {
      document.getElementById('top-customers-table').innerHTML = '<tr><td colspan="7">데이터가 없습니다.</td></tr>';
    }
    
    // 인기 메뉴
    const menuRes = await fetch('/api/stats/popular-menus?limit=10');
    const menuData = await menuRes.json();
    
    if (menuData.success && menuData.data.length > 0) {
      renderMenuSalesChart(menuData.data);
    }
    
  } catch (error) {
    console.error('고객 분석 로드 오류:', error);
  }
}

function renderTopCustomersTable(customers) {
  const tbody = document.getElementById('top-customers-table');
  
  tbody.innerHTML = customers.map((c, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${c.customerName || '-'}</td>
      <td>${c.phone || '-'}</td>
      <td>${c.orderCount}회</td>
      <td>${formatCurrency(c.totalSpent)}</td>
      <td>${formatCurrency(Math.round(c.avgOrderAmount))}</td>
      <td>${new Date(c.lastOrderDate).toLocaleDateString('ko-KR')}</td>
    </tr>
  `).join('');
}

function renderMenuSalesChart(data) {
  const ctx = document.getElementById('menuSalesChart');
  
  if (charts.menuSales) {
    charts.menuSales.destroy();
  }
  
  charts.menuSales = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.menuName),
      datasets: [{
        data: data.map(d => d.totalQuantity),
        backgroundColor: [
          '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff',
          '#ff9f40', '#ff6384', '#c9cbcf', '#4bc0c0', '#ff6384'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        }
      }
    }
  });
}

// ========== 지역 분석 탭 ==========
async function loadRegionsTab() {
  try {
    const res = await fetch('/api/stats/regions');
    const data = await res.json();
    
    if (data.success && data.data.length > 0) {
      const regions = data.data;
      
      // 통계 업데이트
      document.getElementById('total-regions').textContent = regions.length + '개';
      if (regions.length > 0) {
        document.getElementById('top-region').textContent = regions[0].region;
        document.getElementById('top-region-orders').textContent = formatNumber(regions[0].orderCount) + '건';
      }
      
      // 지도 업데이트
      updateAnseongMap(regions);
      
      // 차트
      renderRegionChart(regions);
      
      // 테이블
      renderRegionsTable(regions);
    } else {
      document.getElementById('regions-table').innerHTML = '<tr><td colspan="5">데이터가 없습니다.</td></tr>';
    }
    
  } catch (error) {
    console.error('지역 분석 로드 오류:', error);
  }
}

// 안성 지도 업데이트 (주문량에 따라 색상 진하기 조절)
function updateAnseongMap(regions) {
  if (!regions || regions.length === 0) {
    // 데이터가 없으면 기본 색상 유지
    return;
  }
  
  // 최대 주문량 찾기
  const maxOrders = Math.max(...regions.map(r => r.orderCount || 0));
  
  // 지역별 색상 매핑
  const regionMap = {
    '공도읍': { id: 'region-gongdo', countId: 'gongdo-count' },
    '미양면': { id: 'region-miyang', countId: 'miyang-count' },
    '대덕면': { id: 'region-daedeok', countId: 'daedeok-count' },
    '양성면': { id: 'region-yangseong', countId: 'yangseong-count' }
  };
  
  // 각 지역별로 색상 적용
  regions.forEach(region => {
    const regionInfo = regionMap[region.region];
    if (!regionInfo) return;
    
    const element = document.getElementById(regionInfo.id);
    if (!element) return;
    
    const ellipse = element.querySelector('ellipse');
    if (!ellipse) return;
    
    // 주문량 비율 계산 (0~1)
    const ratio = maxOrders > 0 ? (region.orderCount || 0) / maxOrders : 0;
    
    // 색상 진하기 결정
    let fillColor, strokeColor, strokeWidth;
    if (ratio === 0) {
      fillColor = '#f5f5f5'; // 매우 연한 회색
      strokeColor = '#ccc';
      strokeWidth = '1';
    } else if (ratio < 0.25) {
      fillColor = '#e3f2fd'; // 연한 파랑
      strokeColor = '#64b5f6';
      strokeWidth = '2';
    } else if (ratio < 0.5) {
      fillColor = '#90caf9'; // 중간 파랑
      strokeColor = '#42a5f5';
      strokeWidth = '2.5';
    } else if (ratio < 0.75) {
      fillColor = '#64b5f6'; // 진한 파랑
      strokeColor = '#1976d2';
      strokeWidth = '3';
    } else {
      fillColor = '#1976d2'; // 매우 진한 파랑
      strokeColor = '#0d47a1';
      strokeWidth = '4';
    }
    
    ellipse.setAttribute('fill', fillColor);
    ellipse.setAttribute('stroke', strokeColor);
    ellipse.setAttribute('stroke-width', strokeWidth);
    
    // 주문 건수 표시 업데이트
    const countText = document.getElementById(regionInfo.countId);
    if (countText) {
      countText.textContent = `${formatNumber(region.orderCount || 0)}건`;
    }
    
    // 기존 이벤트 리스너 제거 (중복 방지)
    const newElement = element.cloneNode(true);
    element.parentNode.replaceChild(newElement, element);
    
    // 호버 효과
    newElement.addEventListener('mouseenter', () => {
      const currentTransform = newElement.getAttribute('transform') || 'translate(0,0)';
      const scale = currentTransform.includes('scale') ? currentTransform : currentTransform + ' scale(1.1)';
      newElement.setAttribute('transform', scale);
      const ellipse = newElement.querySelector('ellipse');
      if (ellipse) ellipse.style.filter = 'brightness(1.15) drop-shadow(0 0 10px rgba(25, 118, 210, 0.5))';
    });
    
    newElement.addEventListener('mouseleave', () => {
      const baseTransform = newElement.getAttribute('transform').replace(/scale\([^)]*\)/g, '').trim();
      newElement.setAttribute('transform', baseTransform);
      const ellipse = newElement.querySelector('ellipse');
      if (ellipse) ellipse.style.filter = 'brightness(1)';
    });
    
    // 클릭 시 상세 정보 표시
    newElement.addEventListener('click', () => {
      alert(`${region.region}\n주문: ${formatNumber(region.orderCount || 0)}건\n매출: ${formatCurrency(region.totalSales || 0)}\n평균: ${formatCurrency(Math.round(region.avgOrderAmount || 0))}`);
    });
    
    newElement.style.cursor = 'pointer';
  });
}

function renderRegionChart(regions) {
  const ctx = document.getElementById('regionChart');
  
  if (charts.region) {
    charts.region.destroy();
  }
  
  charts.region = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: regions.map(r => r.region),
      datasets: [{
        data: regions.map(r => r.orderCount),
        backgroundColor: [
          '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff',
          '#ff9f40', '#ff6384', '#c9cbcf', '#4bc0c0', '#ff6384',
          '#36a2eb', '#ff9f40'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        }
      }
    }
  });
}

function renderRegionsTable(regions) {
  const tbody = document.getElementById('regions-table');
  const total = regions.reduce((sum, r) => sum + r.orderCount, 0);
  
  tbody.innerHTML = regions.map(r => `
    <tr>
      <td>${r.region}</td>
      <td>${formatNumber(r.orderCount)}건</td>
      <td>${formatCurrency(r.totalSales)}</td>
      <td>${formatCurrency(Math.round(r.avgOrderAmount))}</td>
      <td>${((r.orderCount / total) * 100).toFixed(1)}%</td>
    </tr>
  `).join('');
}

// ========== 초기화 ==========
window.addEventListener('load', function() {
  // URL 파라미터 확인
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab');
  
  if (tab) {
    // 해당 탭 활성화
    document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
      btn.classList.remove('active');
      if (btn.textContent.includes(getTabName(tab))) {
        btn.classList.add('active');
      }
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    document.getElementById(tab + '-tab').classList.add('active');
    
    // 데이터 로드
    if (tab === 'settlement') {
      setThisMonth();
    } else if (tab === 'customers') {
      loadCustomersTab();
    } else if (tab === 'regions') {
      loadRegionsTab();
    }
  } else {
    // 기본: 매출 통계
    loadStatsTab();
  }
  
  // 날짜 필터 초기화
  setThisMonth();
});

function getTabName(tabId) {
  const names = {
    'stats': '매출 통계',
    'settlement': '정산 정보',
    'customers': '고객 분석',
    'regions': '지역 분석'
  };
  return names[tabId] || '';
}

// 5초마다 실시간 통계 업데이트
setInterval(async () => {
  if (document.getElementById('stats-tab').classList.contains('active')) {
    try {
      const res = await fetch('/api/stats/realtime');
      const data = await res.json();
      
      if (data.success) {
        const stats = data.data;
        document.getElementById('today-sales').textContent = formatCurrency(stats.today.totalSales || 0);
        document.getElementById('today-orders').textContent = `주문 ${stats.today.orderCount || 0}건`;
        document.getElementById('pending-count').textContent = `${stats.pending || 0}건`;
        document.getElementById('preparing-count').textContent = `조리중 ${stats.preparing || 0}건`;
        document.getElementById('delivering-count').textContent = `${stats.delivering || 0}건`;
      }
    } catch (error) {
      console.error('실시간 업데이트 오류:', error);
    }
  }
}, 5000);

// ========== 리 단위 통계 탭 ==========
async function loadRiTab() {
  try {
    const res = await fetch('/api/stats/ri');
    const data = await res.json();
    
    if (data.success && data.data.length > 0) {
      const riStats = data.data;
      
      // 통계 카드 업데이트
      document.getElementById('total-ri-count').textContent = `${riStats.length}개`;
      
      if (riStats.length > 0) {
        const topRi = riStats[0];
        document.getElementById('top-ri-name').textContent = topRi.ri;
        document.getElementById('top-ri-orders').textContent = `${formatNumber(topRi.orderCount)}건`;
      }
      
      // 차트 렌더링
      renderRiChart(riStats);
      
      // 테이블 렌더링
      renderRiTable(riStats);
    } else {
      document.getElementById('ri-table').innerHTML = '<tr><td colspan="5" class="loading">데이터가 없습니다.</td></tr>';
    }
  } catch (error) {
    console.error('리 단위 통계 로드 오류:', error);
  }
}

function renderRiChart(data) {
  const ctx = document.getElementById('riChart');
  if (!ctx) return;
  
  if (charts.ri) {
    charts.ri.destroy();
  }
  
  const top10 = data.slice(0, 10);
  
  charts.ri = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map(r => r.ri),
      datasets: [{
        label: '주문 건수',
        data: top10.map(r => r.orderCount),
        backgroundColor: 'rgba(25, 118, 210, 0.7)',
        borderColor: 'rgba(25, 118, 210, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatNumber(value);
            }
          }
        }
      }
    }
  });
}

function renderRiTable(data) {
  const tbody = document.getElementById('ri-table');
  if (!tbody) return;
  
  const totalOrders = data.reduce((sum, r) => sum + r.orderCount, 0);
  
  tbody.innerHTML = data.map(r => {
    const ratio = totalOrders > 0 ? ((r.orderCount / totalOrders) * 100).toFixed(1) : 0;
    return `
      <tr>
        <td><strong>${r.ri}</strong></td>
        <td>${formatNumber(r.orderCount)}건</td>
        <td>${formatCurrency(r.totalSales)}</td>
        <td>${formatCurrency(Math.round(r.avgOrderAmount))}</td>
        <td>${ratio}%</td>
      </tr>
    `;
  }).join('');
}

// ========== 아파트 단지 통계 탭 ==========
async function loadApartmentsTab() {
  try {
    const res = await fetch('/api/stats/apartments');
    const data = await res.json();
    
    if (data.success && data.data.length > 0) {
      const aptStats = data.data;
      
      // 통계 카드 업데이트
      document.getElementById('total-apt-count').textContent = `${aptStats.length}개`;
      
      if (aptStats.length > 0) {
        const topApt = aptStats[0];
        document.getElementById('top-apt-name').textContent = topApt.apartment;
        document.getElementById('top-apt-orders').textContent = `${formatNumber(topApt.orderCount)}건`;
      }
      
      const totalCustomers = aptStats.reduce((sum, a) => sum + a.customerCount, 0);
      document.getElementById('total-apt-customers').textContent = `${formatNumber(totalCustomers)}명`;
      
      // 차트 렌더링
      renderApartmentChart(aptStats);
      
      // 테이블 렌더링
      renderApartmentTable(aptStats);
    } else {
      document.getElementById('apartments-table').innerHTML = '<tr><td colspan="6" class="loading">데이터가 없습니다.</td></tr>';
    }
  } catch (error) {
    console.error('아파트 단지 통계 로드 오류:', error);
  }
}

function renderApartmentChart(data) {
  const ctx = document.getElementById('apartmentChart');
  if (!ctx) return;
  
  if (charts.apartment) {
    charts.apartment.destroy();
  }
  
  const top15 = data.slice(0, 15);
  
  charts.apartment = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top15.map(a => a.apartment),
      datasets: [{
        label: '주문 건수',
        data: top15.map(a => a.orderCount),
        backgroundColor: 'rgba(76, 175, 80, 0.7)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatNumber(value);
            }
          }
        }
      }
    }
  });
}

function renderApartmentTable(data) {
  const tbody = document.getElementById('apartments-table');
  if (!tbody) return;
  
  const totalOrders = data.reduce((sum, a) => sum + a.orderCount, 0);
  
  tbody.innerHTML = data.map(a => {
    const ratio = totalOrders > 0 ? ((a.orderCount / totalOrders) * 100).toFixed(1) : 0;
    return `
      <tr>
        <td><strong>${a.apartment}</strong></td>
        <td>${formatNumber(a.orderCount)}건</td>
        <td>${formatCurrency(a.totalSales)}</td>
        <td>${formatCurrency(Math.round(a.avgOrderAmount))}</td>
        <td>${formatNumber(a.customerCount)}명</td>
        <td>${ratio}%</td>
      </tr>
    `;
  }).join('');
}

console.log('📊 대시보드 준비 완료!');

