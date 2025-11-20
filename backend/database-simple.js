// 메모리 기반 간단 DB (Railway용)
class DB {
  constructor() {
    this.menu = [];
    this.users = [];
    this.orders = [];
    this.pointHistory = [];
    this.phoneVerification = [];
    this.businessHours = null; // 요일별 영업시간 { 0: {open, close}, 1: {open, close}, ... } (0=일요일, 6=토요일)
    this.temporaryClosed = false; // 임시휴업 상태
    this.breakTime = null; // 요일별 브레이크타임 { 0: {start, end}, 1: {start, end}, ... }
    this.busyStatus = 'normal'; // 바쁨 상태: 'very-busy', 'busy', 'normal'
    this.menuCosts = {}; // 메뉴별 원가 { menuId: cost }
    this.coupons = []; // 쿠폰 목록 [{ id, code, name, discountType, discountValue, minAmount, maxDiscount, validFrom, validTo, issuedCount, usedCount, isActive }]
    this.couponUsage = []; // 쿠폰 사용 내역 [{ id, couponId, userId, orderId, usedAt }]
    this.hallSales = []; // 홀 매출 [{ id, date, amount, paymentMethod, memo, createdAt }]
    this.platformSales = []; // 타 플랫폼 매출 [{ id, platform, date, amount, commission, paymentMethod, memo, createdAt }]
    this.menuDiscounts = {}; // 메뉴별 할인 { menuId: { type: 'percent'|'fixed', value: number } }
    this.menuOptions = {}; // 메뉴별 옵션 { menuId: [{ name, price }] }
    this.storeInfo = { // 가게 정보
      name: '시티반점',
      owner: '', // 대표자명
      phone: '031-123-4567',
      license: '',
      address: '경기도 안성시 공도읍',
      kakaoChannelUrl: '', // 카카오톡 채널 URL (예: https://pf.kakao.com/_xxxxx)
      chatServiceUrl: '', // 실시간 채팅 서비스 URL (나중에 외부 서비스 연동)
      minOrderAmount: 15000, // 최소 주문 금액
      deliveryFee: 3000, // 기본 배달료
      freeDeliveryThreshold: 20000 // 무료 배달 기준 금액
    };
    this.siteConfig = { // 사이트 설정 (페이지 빌더용)
      pages: {
        'auth-select': {
          blocks: [
            { type: 'logo', content: '🏮', style: { fontSize: '64px', textAlign: 'center' } },
            { type: 'heading', content: '시티반점', style: { fontSize: '48px', fontWeight: '900', color: '#1a1a1a', textAlign: 'center', marginBottom: '12px' } },
            { type: 'text', content: '맛있는 중국요리 배달', style: { fontSize: '18px', color: '#666', textAlign: 'center', marginBottom: '30px' } },
            { type: 'button', content: '회원 로그인', style: { backgroundColor: '#1976d2', color: 'white', padding: '18px', borderRadius: '12px', width: '100%', marginBottom: '15px' } },
            { type: 'button', content: '비회원 주문', style: { backgroundColor: '#757575', color: 'white', padding: '18px', borderRadius: '12px', width: '100%' } }
          ]
        }
      },
      globalStyles: {
        primaryColor: '#1976d2',
        secondaryColor: '#757575',
        backgroundColor: '#ffffff',
        fontFamily: 'Pretendard, sans-serif'
      }
    };
    this.initialized = false;
    this.init();
  }

  async init() {
    console.log('✅ 메모리 DB 초기화');
    await this.initMenu();
    this.initialized = true;
    console.log('✅ DB 초기화 완료');
  }
  
  isInitialized() {
    return this.initialized && this.menu.length > 0;
  }

  async initMenu() {
    // 기본 이미지 URL (나중에 실제 이미지로 교체 가능)
    const defaultImage = 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=400&fit=crop';
    
    this.menu = [
      // ===== 대표메뉴 =====
      { id: 1, name: '[바삭부들] 안심탕수육(소)', category: '추천메뉴', price: 20000, image: defaultImage, bestseller: 1, description: '[바삭하고부드러운] 고급스럽고 부드러운 안심 고기로 만든 탕수육' },
      { id: 2, name: '[바삭부들] 안심탕수육(중)', category: '추천메뉴', price: 25000, image: defaultImage, bestseller: 1, description: '[바삭하고부드러운] 고급스럽고 부드러운 안심 고기로 만든 탕수육' },
      { id: 3, name: '[바삭부들] 안심탕수육(대)', category: '추천메뉴', price: 30000, image: defaultImage, bestseller: 1, description: '[바삭하고부드러운] 고급스럽고 부드러운 안심 고기로 만든 탕수육' },
      { id: 4, name: '(특별메뉴)고추간짜장[실장추천](1인분)', category: '추천메뉴', price: 11000, image: defaultImage, bestseller: 1, description: '고추간짜장 드실려고 직접 가게까지 오실 정도로 특별한 메뉴 고추간짜장 더 밋있게 먹는 꿀팁 : .면을 다 드시고 남은 장에 밥을 비벼 드시면 더 즐거워집니다.' },
      { id: 5, name: '[명품]중화비빔밥 [실장추천](1인분)', category: '추천메뉴', price: 11000, image: defaultImage, bestseller: 1, description: '경상도식 중화비빔밥 (공도에서 거의 처음으로 진짜 중화비빔밥이 어떤 음식인지 소개한 곳) 중화 비빔밥 : 해물, 야채와 함께 매콤하게 직화로 볶고 위에 계란까지 올라갔어요.' },
      
      // ===== 신메뉴 =====
      { id: 6, name: '고기듬뿍 (짜장)(1인분)', category: '추천메뉴', price: 10000, image: defaultImage, bestseller: 0, description: '고급 안심고기가 왕창 들어 있습니다. (안심고기 170g 추가) [고기 양에 놀라고, 안심고기와 짜장과의 어울림에 놀라고] 고기집 1인분 정도의 양이 추가로 들어 있습니다. 곱배기 안드셔도 배불러요. 그리고 남은 소스 절대 못버립니다. 꼭 밥이랑 같이 드세요 고기를 좋아하시는 분들에게 추천드립니다.' },
      { id: 7, name: '바지락폭탄 (짬뽕)(1인분)', category: '추천메뉴', price: 11000, image: defaultImage, bestseller: 0, description: '쫄깃쫄깃한 바지락이 너무 많이 들어 있습니다. (다른 해물은 들어가지 않습니다.) 들어가있는 알(껍질이 없는) 바지략양에 놀라지 마세요 어줍잖게 바지락 개수 10개 들어가지 않습니다. 최소 80~100마리 이상 들어가 있습니다. (바지락 개수 한번 세서 알려주시면 감사합니다 ㅠ.ㅠ)' },
      { id: 8, name: '고기듬뿍 (간짜장)(1인분)', category: '추천메뉴', price: 12000, image: defaultImage, bestseller: 0, description: '고급 안심고기가 왕창 들어 있습니다. (안심고기 170g 추가) [고기 양에 놀라고, 안심고기와 간짜장과의 어울림에 놀라고] 고기집 1인분 정도의 양이 추가로 들어 있습니다. 곱배기 안드셔도 배불러요. 그리고 남은 소스 절대 못버립니다. 꼭 밥이랑 같이 드세요 고기를 좋아하시는 분들에게 추천드립니다.' },
      { id: 9, name: '고기듬뿍 (고추간짜장)(1인분)', category: '추천메뉴', price: 14000, image: defaultImage, bestseller: 0, description: '고급 안심고기가 왕창 들어 있습니다. (안심고기 170g 추가) [고기양에 놀라고, 안심고기와 고추간짜장과의 어울림에 놀라고] 고기집 1인분 정도의 양이 추가로 들어 있습니다. 곱배기 안드셔도 배불러요. 그리고 남은 소스 절대 못버립니다. 꼭 밥이랑 같이 드세요 고기를 좋아하시는 분들에게 추천드립니다.' },
      { id: 10, name: '시티짜장 + 군만두(5P) 세트', category: '세트메뉴', price: 9900, image: defaultImage, bestseller: 0 },
      
      // ===== 면류 =====
      { id: 11, name: '[안심] 시티짜장(1인분)', category: '면류', price: 6900, image: defaultImage, bestseller: 0, description: '[안심]하고 드셔도 됩니다. 부드럽고 고급진 안심 고기로 볶은 짜장' },
      { id: 12, name: '[안심] 간짜장(1인분)', category: '면류', price: 9000, image: defaultImage, bestseller: 0, description: '[안심]하고 드셔도 됩니다. 부드럽고 고급진 안심고기와 아삭한 양파와 같이 볶은 간짜장' },
      { id: 13, name: '(통오징어1마리)직화짬뽕(1인분)', category: '면류', price: 9500, image: defaultImage, bestseller: 0, description: '오징어다리까지 들어있는 짬뽕 정말 흔하지 않죠 매일 들어오는 신선한 야채, 통오징어 한마리가 들어가 있는 직화짬뽕 [가위가 꼭 필요하세요]' },
      { id: 14, name: '열직화짬뽕(매운)(1인분)', category: '면류', price: 10500, image: defaultImage, bestseller: 0, description: '요즘 핫하게 나가고 있는 열직화짬뽕 ( 일반짬뽕보다 2~3배 정도 매워요) 청양고추와 매운고추가루로 조리해요 (캡사이신 사용X)' },
      { id: 15, name: '(특별메뉴)고추간짜장[실장추천](1인분)', category: '면류', price: 11000, image: defaultImage, bestseller: 1, description: '고추간짜장 드실려고 직접 가게까지 오실 정도로 특별한 메뉴 고추간짜장 더 밋있게 먹는 꿀팁 : .면을 다 드시고 남은 장에 밥을 비벼 드시면 더 즐거워집니다.' },
      { id: 16, name: '야끼우동[실장추천](1인분)', category: '면류', price: 11000, image: defaultImage, bestseller: 1, description: '경상도식 볶음 짬뽕 한번 먹으면 또 생각나는 그 맛 (철판야끼우동은 홀에서만 판매해요)' },
      { id: 17, name: '삼선간짜장(1인분)', category: '면류', price: 11000, image: defaultImage, bestseller: 0, description: '부드럽고 고급진 안심고기, 여러가지 삼선해물 그리고 아삭한 양파와 같이 볶은 삼선간짜장' },
      { id: 18, name: '백짬뽕(삼선)(1인분)', category: '면류', price: 11000, image: defaultImage, bestseller: 0, description: '여러가지 삼선 해물과 고추가루를 뺀 하얀 국물에 약간 매운 맛을 가미한 직화백짬뽕' },
      { id: 19, name: '삼선우동(1인분)', category: '면류', price: 11000, image: defaultImage, bestseller: 0, description: '여러가지 삼선해물과 함께 조리한 맑은 색에 담백한 맛을 지닌 삼선우동' },
      { id: 20, name: '삼선울면(1인분)', category: '면류', price: 11000, image: defaultImage, bestseller: 0, description: '여러가지 삼선해물을 넣어 우동과는 다르게 걸쭉하게 만든 삼선울면' },
      { id: 21, name: '황제고추간짜장(해물듬뿍)(1인분)', category: '면류', price: 13000, image: defaultImage, bestseller: 0, description: '여러가지 해물이 듬뿍 들어가 있는 고추간짜장 업그레이드 버전' },
      { id: 22, name: '(특)삼선짬뽕(1인분)', category: '면류', price: 13000, image: defaultImage, bestseller: 0, description: '(푸짐하게) 통오징어, 여러가지 해물이 추가로 들어가 있어요. (삼선짬뽕에 들어가는 해물은 계절에 따라 바뀔 수 있어요) 통오징어라 가위가 필요해요~' },
      { id: 23, name: '소고기짬뽕(1인분)', category: '면류', price: 13000, image: defaultImage, bestseller: 0, description: '불향가득 소고기를 직화에 볶아서 풍미를 더한 소고기짬뽕 [사진상으로는 들어가는 고기양을 나타내기 위해 다른 색으로 표현하였지만 실제로는 짬뽕과 어울어져 조리됩니다.]' },
      { id: 24, name: '해물쟁반짜장(2인)(2인분)', category: '면류', price: 18000, image: defaultImage, bestseller: 0, description: '면 2인분, 몇가지 해물과 짜장을 직화로 볶은 해물쟁반짜장2인 (해물쟁반짜장은 면이 따로 나가지 않습니다)' },
      { id: 25, name: '짬짜면(1인분)', category: '면류', price: 10000, image: defaultImage, bestseller: 0 },
      { id: 26, name: '볶짜면(1인분)', category: '면류', price: 10000, image: defaultImage, bestseller: 0 },
      { id: 27, name: '볶짬면(1인분)', category: '면류', price: 10000, image: defaultImage, bestseller: 0 },
      { id: 28, name: '탕짜면(1인분)', category: '면류', price: 12000, image: defaultImage, bestseller: 0 },
      { id: 29, name: '탕짬면(1인분)', category: '면류', price: 12000, image: defaultImage, bestseller: 0 },
      { id: 30, name: '미니짬뽕국물(작은사이즈아님)(1인분)', category: '면류', price: 3000, image: defaultImage, bestseller: 0 },
      
      // ===== 밥류 =====
      { id: 31, name: '[구름계란] 볶음밥(1인분)', category: '밥류', price: 9000, image: defaultImage, bestseller: 0, description: '구름모양 계란 짜장소스, 짬뽕국물 그리고 야들야들 볶음밥 [세가지 맛을 한번에 다 드실 수 있습니다.]' },
      { id: 32, name: '짬뽕밥(1인분)', category: '밥류', price: 10000, image: defaultImage, bestseller: 0, description: '1, 직화짬뽕과 같은 내용이지만 면 대신 공기밥으로 나갑니다. 2. 배달시 당면이 국물을 다 흡수하기 때문에 당면은 들어가지 않습니다.' },
      { id: 33, name: '잡채밥(1인분)', category: '밥류', price: 10000, image: defaultImage, bestseller: 0, description: '탱글탱글한 당면, 여러가지 야채와 유슬고기를 불향으로 조리한 잡채밥' },
      { id: 34, name: '마파두부덮밥(1인분)', category: '밥류', price: 10000, image: defaultImage, bestseller: 0 },
      { id: 35, name: '[총총] 새우볶음밥(1인분)', category: '밥류', price: 11000, image: defaultImage, bestseller: 0, description: '총총총 박혀있는 새우, 짜장소스, 짬뽕국물 그리고 야들야들 볶음밥 [세가지 맛을 한번에 다 드실 수 있습니다.]' },
      { id: 36, name: '삼선볶음밥(1인분)', category: '밥류', price: 11000, image: defaultImage, bestseller: 0, description: '여러가지 삼선 해물, 짜장소스, 짬뽕국물 그리고 야들야들 볶음밥 [세가지 맛을 한번에 다 드실 수 있습니다.]' },
      { id: 37, name: '[명품]중화비빔밥 [실장추천](1인분)', category: '밥류', price: 11000, image: defaultImage, bestseller: 1, description: '경상도식 중화비빔밥 (공도에서 거의 처음으로 진짜 중화비빔밥이 어떤 음식인지 소개한 곳) 중화 비빔밥 : 해물, 야채와 함께 매콤하게 직화로 볶고 위에 계란까지 올라갔어요.' },
      { id: 38, name: '속풀이순두부짬뽕밥(1인분)', category: '밥류', price: 11000, image: defaultImage, bestseller: 0, description: '순두부 한통이 통째로 들어가 있어요 짬뽕과 순두부의 조화가 제법이에요' },
      { id: 39, name: '한돈제육덮밥[불향가득](1인분)', category: '밥류', price: 11000, image: defaultImage, bestseller: 0, description: '냄새부터 불향 가득한 직화제육덮밥 (제육을 좋아하시는 분들에게는 강력추천)' },
      { id: 40, name: '고추잡채밥(1인분)', category: '밥류', price: 12000, image: defaultImage, bestseller: 0, description: '여러 신선한 야채 그리고 아삭한 피망 맛과 불향이 잘 어울러진 고추잡채밥 고추잡채밥에는 잡채(당면)가 들어가지 않습니다.' },
      { id: 41, name: '유산슬밥(1인분)', category: '밥류', price: 13000, image: defaultImage, bestseller: 0, description: '해삼, 죽순, 버섯류로 조리하고 자극적이지 않은 담백하고 고급스러운 맛' },
      { id: 42, name: '잡탕밥(해물듬뿍)(1인분)', category: '밥류', price: 14000, image: defaultImage, bestseller: 0, description: '여러가지 삼선해물과 신선한 야채를 직화로 조리하여 만든 고급스럽고 매콤한 맛이 가미된 잡탕밥' },
      { id: 43, name: '탕볶밥(1인분)', category: '밥류', price: 12000, image: defaultImage, bestseller: 0 },
      
      // ===== 특별요리 =====
      { id: 44, name: '[바삭부들] 안심탕수육(소)', category: '추천메뉴', price: 20000, image: defaultImage, bestseller: 1, description: '[바삭하고부드러운] 고급스럽고 부드러운 안심 고기로 만든 탕수육' },
      { id: 45, name: '[바삭부들] 안심탕수육(중)', category: '추천메뉴', price: 25000, image: defaultImage, bestseller: 1, description: '[바삭하고부드러운] 고급스럽고 부드러운 안심 고기로 만든 탕수육' },
      { id: 46, name: '[바삭부들] 안심탕수육(대)', category: '추천메뉴', price: 30000, image: defaultImage, bestseller: 1, description: '[바삭하고부드러운] 고급스럽고 부드러운 안심 고기로 만든 탕수육' },
      { id: 47, name: '삼선술국(요리류)', category: '추천메뉴', price: 15000, image: defaultImage, bestseller: 0, description: '여러가지 삼선해물과 함께 조리한 삼선 술국 (삼선 짬뽕과 차이: 면이 들어가지 않고 야채와 해물이 더 많이 들어가있습니다) (가위가 필요해요)' },
      { id: 48, name: '양장피(요리류)', category: '추천메뉴', price: 32000, image: defaultImage, bestseller: 0, description: '[화려한 비쥬얼] 여러가지 신선한 야채, 해물, 그리고 전분을 이용해서 만든 피를 톡쏘는 겨자와 곁들어 먹는 고급 요리' },
      { id: 49, name: '황비홍깐풍기(바삭, 매콤 치킨 스타일)(요리류)', category: '추천메뉴', price: 32000, image: defaultImage, bestseller: 0, description: '닭고기를 전분을 사용하여 튀기고 고추기름과 마늘, 생강, 고추를 기본으로 한 매콤한 깐풍 소스 양념에 채소들을 곁들여 직화로 만든 고급요리' },
      { id: 50, name: '칠리새우(요리류)', category: '추천메뉴', price: 32000, image: defaultImage, bestseller: 0, description: '(새우크기에 따라)17~19마리를 신선한 기름에 튀기고 직접 만든 매콤한 칠리 소스와 새우를 직화로 버무린 고급 요리' },
      { id: 51, name: '크림새우(크림소스의 달콤한 맛~)(요리류)', category: '추천메뉴', price: 32000, image: defaultImage, bestseller: 0, description: '(새우크기에 따라)17~19마리를 신선한 기름에 튀기고 직접 만든 달콤한 크림 소스와 새우를 직화로 버무린 고급 요리' },
      { id: 52, name: '고추잡채(요리류)', category: '추천메뉴', price: 32000, image: defaultImage, bestseller: 0, description: '여러 신선한 야채 그리고 아삭한 피망 맛과 불향이 잘 어울러진 고급요리 추가로 푹신하게 찐 꽃빵 4개 포함' },
      { id: 53, name: '유산슬(요리류)', category: '추천메뉴', price: 32000, image: defaultImage, bestseller: 0, description: '해삼, 죽순, 버섯류로 조리하고 자극적이지 않은 담백한 고급요리' },
      { id: 54, name: '팔보채(요리류)', category: '추천메뉴', price: 32000, image: defaultImage, bestseller: 0, description: '여러가지 삼선해물과 신선한 야채를 직화로 조리하여 만든 고급스럽고 매콤한 맛이 가미된 고급요리' },
      
      // ===== 1인세트 =====
      { id: 55, name: '탕수육+짜장+군만두(2)(1인세트)', category: '세트메뉴', price: 18000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 짜장 세트 (1인세트 주문시 1,000원 할인 효과)' },
      { id: 56, name: '탕수육+간짜장+군만두(2)(1인세트)', category: '세트메뉴', price: 20000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 간짜장 세트 (1인세트 주문시 1,000원 할인 효과)' },
      { id: 57, name: '탕수육+볶음밥+군만두(2)(1인세트)', category: '세트메뉴', price: 20000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육+ 볶음밥 세트 (1인세트 주문시 1,000원 할인 효과)' },
      { id: 58, name: '탕수육+직화짬뽕+군만두(2)(1인세트)', category: '세트메뉴', price: 20500, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 짬뽕 세트 (짬뽕에 직접 손질한 100% 통오징어가 들어가 가위가 필요해요) (1인세트 주문시 1,000원 할인 효과)' },
      { id: 59, name: '탕수육+열직화짬뽕(매운)+군만두(2)(1인세트)', category: '세트메뉴', price: 21500, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 미니탕수육 + 열짬뽕(매운) 세트 (직접 손질한 100% 통오징어가 들어가 가위가 필요해요) (1인세트 주문시 1,000원 할인 효과)' },
      { id: 60, name: '탕수육+고추간짜장+군만두(2)(1인세트)', category: '세트메뉴', price: 22000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 미니탕수육 + 고추간짜장 세트 (1인세트 주문시 1,000원 할인 효과) 고추간짜장 드실려고 직접 가게까지 오실 정도로 특별한 메뉴 고추간짜장 더 밋있게 먹는 꿀팁 : .면을 다 드시고 남은 장에 밥을 비벼 드시면 더 즐거워집니다.' },
      { id: 61, name: '탕수육+중화비빔밥+군만두(2)(1인세트)', category: '세트메뉴', price: 22000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 중화비빔밥 세트 (1인세트 주문시 1,000원 할인 효과)' },
      { id: 62, name: '탕수육+야끼우동+군만두(2)(1인세트)', category: '세트메뉴', price: 22000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 야끼우동 세트 (1인세트 주문시 1,000원 할인 효과)' },
      { id: 63, name: '탕수육+황제고추간짜장+군만두(2)(1인세트)', category: '세트메뉴', price: 24000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 여러가지 삼선 해물을 넣어 조리한 황제고추간짜장 세트 (1인세트 주문시 1,000원 할인 효과)' },
      { id: 64, name: '탕수육+(특)삼선짬뽕+군만두(2)(1인세트)', category: '세트메뉴', price: 24000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 통오징어, 여러가지 해물이 들어간 (특)삼선짬뽕 세트 (삼선짬뽕에 들어가는 해물은 계절에 따라 바뀔 수 있어요) (가위가 필요하세요~~) (1인세트 주문시 1,000원 할인 효과)' },
      
      // ===== 2인세트 =====
      { id: 65, name: '탕수육+짜장2+군만두(2)(2인세트)', category: '세트메뉴', price: 24000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 짜장면 2인 세트 (2인세트 주문시 2,000원 할인 효과)' },
      { id: 66, name: '탕수육+짜장+짬뽕+군만두(2)(2인세트)', category: '세트메뉴', price: 26500, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 짜장, 짬뽕 2인 세트 (짬뽕에 직접 손질한 100% 통오징어가 들어가 가위가 필요해요) (2인세트 주문시 2,000원 할인 효과)' },
      { id: 67, name: '탕수육+간짜장2+군만두(2)(2인세트)', category: '세트메뉴', price: 28000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 간짜장 2인 세트 (2인세트 주문시 2,000원 할인 효과)' },
      { id: 68, name: '탕수육+볶음밥2+군만두(2)(2인세트)', category: '세트메뉴', price: 28000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육+ 볶음밥 2인 세트 (2인세트 주문시 2,000원 할인 효과)' },
      { id: 69, name: '탕수육+해물쟁반짜장2인+군만두(2)(2인세트)', category: '세트메뉴', price: 28000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육+ 해물쟁반 2인 세트 (2인세트 주문시 3,000원 할인 효과)' },
      { id: 70, name: '탕수육+짬뽕+간짜장+군만두(2)(2인세트)', category: '세트메뉴', price: 28500, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 짬뽕, 간짜장 세트 (짬뽕에 직접 손질한 100% 통오징어가 들어가 가위가 필요해요) (2인세트 주문시 2,000원 할인 효과)' },
      { id: 71, name: '탕수육+짬뽕2+군만두(2)(2인세트)', category: '세트메뉴', price: 29000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 짬뽕 2인 세트 (짬뽕에 직접 손질한 100% 통오징어가 들어가 가위가 필요해요) (2인세트 주문시 2,000원 할인 효과)' },
      { id: 72, name: '탕수육+고추간짜장2+군만두(2)(2인세트)', category: '세트메뉴', price: 32000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 고추간짜장 2인 세트 (2인세트 주문시 1,500원 할인 효과)' },
      { id: 73, name: '탕수육+황제고추간짜장2+군만두(2)(2인세트)', category: '세트메뉴', price: 36000, image: defaultImage, bestseller: 0, description: '고급스럽고 부드러운 안심 고기로 만든 [바삭바삭부들부들] 미니탕수육 + 여러가지 삼선 해물을 넣어 조리한 황제고추간짜장 세트 (2인세트 주문시 2,000원 할인 효과)' },
      { id: 74, name: '시티짜장 + 통오징어짬뽕 1+1 세트', category: '세트메뉴', price: 15000, image: defaultImage, bestseller: 0 },
      
      // ===== 사이드메뉴 =====
      { id: 75, name: '공기밥', category: '사이드', price: 1000, image: defaultImage, bestseller: 0 },
      { id: 76, name: '연유꽃빵튀김(4P)', category: '사이드', price: 3000, image: defaultImage, bestseller: 0, description: '꽃빵 튀김과 연유크림 소스' },
      { id: 77, name: '군만두(8p)', category: '사이드', price: 5000, image: defaultImage, bestseller: 0, description: '군만두 (8p) + 미니간장' },
      { id: 78, name: '사이다(500ml)', category: '음료', price: 2000, image: defaultImage, bestseller: 0 },
      { id: 79, name: '콜라(500ml)', category: '음료', price: 2000, image: defaultImage, bestseller: 0 },
      { id: 80, name: '멘보샤(6P)', category: '사이드', price: 6000, image: defaultImage, bestseller: 0, description: '일명 새우토스트 식빵 사이에 으깬 새우를 튀긴 멘보샤' },
      { id: 81, name: '칠리만두(8P)', category: '사이드', price: 7000, image: defaultImage, bestseller: 0, description: '매콤한 칠리소스로 조리한 칠리만두랍니다.' },
      
      // ===== 리뷰 이벤트 =====
      { id: 82, name: '미니짜장밥(리뷰중복불가)(.)', category: '사이드', price: 500, image: defaultImage, bestseller: 0 },
      { id: 83, name: '꽃빵튀김4P(연유X)리뷰중복불가(.)', category: '사이드', price: 1000, image: defaultImage, bestseller: 0, description: '후기 꽃빵튀김에는 연유가 따로 들어가지 않아요' },
      { id: 84, name: '군만두(8P)리뷰중복불가(.)', category: '사이드', price: 2400, image: defaultImage, bestseller: 0 }
    ];
    
    // 메뉴별 기본 원가 설정 (판매가의 40% 가정)
    this.menu.forEach(menu => {
      if (!this.menuCosts[menu.id]) {
        this.menuCosts[menu.id] = Math.round(menu.price * 0.4); // 기본 원가: 판매가의 40%
      }
    });
    
    console.log('✅ 메뉴 초기화 완료:', this.menu.length, '개');
  }

  getAllMenu() {
    return this.menu;
  }

  // 메뉴 관리
  createMenu(menuData) {
    const newId = this.menu.length > 0 ? Math.max(...this.menu.map(m => m.id)) + 1 : 1;
    const newMenu = {
      id: newId,
      name: menuData.name,
      category: menuData.category || '기타',
      price: menuData.price || 0,
      image: menuData.image || '',
      bestseller: menuData.bestseller || 0
    };
    this.menu.push(newMenu);
    // 기본 원가 설정
    if (!this.menuCosts[newId]) {
      this.menuCosts[newId] = Math.round(newMenu.price * 0.4);
    }
    console.log('✅ 메뉴 생성:', newMenu);
    return newMenu;
  }

  updateMenu(menuId, menuData) {
    const index = this.menu.findIndex(m => m.id === menuId);
    if (index === -1) {
      throw new Error('메뉴를 찾을 수 없습니다.');
    }
    this.menu[index] = { ...this.menu[index], ...menuData };
    console.log('✅ 메뉴 수정:', this.menu[index]);
    return this.menu[index];
  }

  deleteMenu(menuId) {
    const index = this.menu.findIndex(m => m.id === menuId);
    if (index === -1) {
      throw new Error('메뉴를 찾을 수 없습니다.');
    }
    const deleted = this.menu.splice(index, 1)[0];
    // 관련 데이터 삭제
    delete this.menuCosts[menuId];
    delete this.menuDiscounts[menuId];
    delete this.menuOptions[menuId];
    console.log('✅ 메뉴 삭제:', deleted);
    return deleted;
  }

  getMenuById(menuId) {
    return this.menu.find(m => m.id === menuId);
  }

  // 할인 관리
  setMenuDiscount(menuId, discount) {
    if (!discount || (discount.type !== 'percent' && discount.type !== 'fixed')) {
      delete this.menuDiscounts[menuId];
      console.log('✅ 메뉴 할인 해제:', menuId);
      return null;
    }
    this.menuDiscounts[menuId] = {
      type: discount.type,
      value: discount.value || 0
    };
    console.log('✅ 메뉴 할인 설정:', menuId, this.menuDiscounts[menuId]);
    return this.menuDiscounts[menuId];
  }

  getMenuDiscount(menuId) {
    return this.menuDiscounts[menuId] || null;
  }

  getAllMenuDiscounts() {
    return { ...this.menuDiscounts };
  }

  // 옵션 관리
  setMenuOptions(menuId, options) {
    if (!options || !Array.isArray(options)) {
      delete this.menuOptions[menuId];
      console.log('✅ 메뉴 옵션 해제:', menuId);
      return [];
    }
    this.menuOptions[menuId] = options;
    console.log('✅ 메뉴 옵션 설정:', menuId, options);
    return this.menuOptions[menuId];
  }

  getMenuOptions(menuId) {
    return this.menuOptions[menuId] || [];
  }

  getAllMenuOptions() {
    return { ...this.menuOptions };
  }

  // 가게 정보 관리
  setStoreInfo(info) {
    this.storeInfo = { ...this.storeInfo, ...info };
    console.log('✅ 가게 정보 업데이트:', this.storeInfo);
    return this.storeInfo;
  }

  getStoreInfo() {
    return { ...this.storeInfo };
  }
  
  setSiteConfig(config) {
    this.siteConfig = { ...this.siteConfig, ...config };
    console.log('✅ 사이트 설정 업데이트:', this.siteConfig);
    return this.siteConfig;
  }

  getSiteConfig() {
    return { ...this.siteConfig };
  }

  async createUser(phone, name, email, address, password) {
    const user = {
      userid: this.users.length + 1,
      phone,
      name,
      email: email || null,
      address: address || null,
      password,
      points: 0, // 포인트는 주문 시 적립
      createdat: new Date()
    };
    this.users.push(user);
    
    // 🎁 신규 회원 가입 쿠폰 자동 발급 (10000원 쿠폰)
    const welcomeCoupon = this.createCoupon({
      code: `WELCOME${user.userid}`,
      name: '신규 회원 가입 쿠폰',
      discountType: 'fixed',
      discountValue: 10000,
      minAmount: 23000, // 최소 주문 금액 23000원
      maxDiscount: null,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90일 유효
      isActive: true
    });
    
    // 쿠폰 발급 기록
    this.issueCouponToUser(welcomeCoupon.id, user.userid);
    
    console.log(`✅ 신규 회원 가입: ${name} (${phone}) - 쿠폰 발급: ${welcomeCoupon.code} (10,000원)`);
    
    return user;
  }

  async getUserByPhone(phone) {
    return this.users.find(u => u.phone === phone);
  }

  async getUserById(userId) {
    // 숫자와 문자열 모두 비교 가능하도록 == 사용
    const user = this.users.find(u => u.userid == userId || String(u.userid) === String(userId));
    if (!user) {
      console.log('🔍 getUserById 실패:', {
        요청한userId: userId,
        요청한userId타입: typeof userId,
        전체사용자수: this.users.length,
        사용자userid목록: this.users.map(u => ({ userid: u.userid, 타입: typeof u.userid }))
      });
    }
    return user;
  }

  async getUserByName(name) {
    return this.users.filter(u => u.name === name);
  }

  updatePassword(phone, newPassword) {
    const user = this.users.find(u => u.phone === phone);
    if (user) {
      user.password = newPassword;
      return true;
    }
    return false;
  }

  async addPoints(userId, points, type, description) {
    const user = this.users.find(u => u.userid == userId);
    if (user) {
      user.points += points;
      this.pointHistory.push({
        id: this.pointHistory.length + 1,
        userid: userId,
        points,
        type,
        description,
        createdat: new Date()
      });
    }
  }

  async getPointHistory(userId) {
    return this.pointHistory.filter(p => p.userid == userId);
  }

  createOrder(orderData) {
    const order = {
      id: this.orders.length + 1,
      userid: orderData.userId || null,
      orderid: orderData.orderid || orderData.orderId,
      customername: orderData.customerName,
      customerphone: orderData.phone,
      address: orderData.address,
      items: JSON.stringify(orderData.items),
      totalprice: orderData.totalprice || orderData.totalAmount,
      deliveryFee: orderData.deliveryFee || 0,
      usedpoints: orderData.usedPoints || 0,
      earnedpoints: orderData.earnedPoints || 0,
      specialRequest: orderData.specialRequest || '',
      paymentmethod: orderData.paymentMethod || 'cash',
      status: orderData.status || 'pending',
      isguest: orderData.userId ? 0 : 1,
      phoneverified: 1,
      createdat: orderData.createdAt || new Date().getTime()
    };
    this.orders.push(order);
    return order;
  }

  async getAllOrders() {
    return this.orders;
  }

  async getOrderById(orderId) {
    return this.orders.find(o => o.orderid === orderId);
  }

  async updateOrderStatus(orderId, status) {
    const order = this.orders.find(o => o.orderid === orderId);
    if (order) {
      order.status = status;
    }
  }

  async createVerification(phone, code) {
    const verification = {
      id: this.phoneVerification.length + 1,
      phone,
      code,
      verified: false,
      createdat: new Date()
    };
    this.phoneVerification.push(verification);
    return verification;
  }

  async verifyPhone(phone, code) {
    const verification = this.phoneVerification
      .filter(v => v.phone === phone && v.code === code && !v.verified)
      .sort((a, b) => b.createdat - a.createdat)[0];
    
    if (!verification) return false;
    
    const now = new Date();
    const diff = (now - verification.createdat) / 1000 / 60;
    
    if (diff > 5) return false;
    
    verification.verified = true;
    return true;
  }

  // ========== 통계 및 분석 ==========
  
  // 지역별 주문 분석
  getOrdersByRegion() {
    const regionMap = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        const address = order.address || '';
        let region = '기타';
        
        if (address.includes('공도') || address.includes('공도읍')) {
          region = '공도읍';
        } else if (address.includes('미양') || address.includes('미양면')) {
          region = '미양면';
        } else if (address.includes('대덕') || address.includes('대덕면')) {
          region = '대덕면';
        } else if (address.includes('양성') || address.includes('양성면')) {
          region = '양성면';
        }
        
        if (!regionMap[region]) {
          regionMap[region] = {
            region,
            orderCount: 0,
            totalSales: 0,
            avgOrderAmount: 0
          };
        }
        
        regionMap[region].orderCount++;
        regionMap[region].totalSales += order.totalprice || order.totalAmount || 0;
      });
    
    const result = Object.values(regionMap).map(r => ({
      ...r,
      avgOrderAmount: r.orderCount > 0 ? r.totalSales / r.orderCount : 0
    }));
    
    return result.sort((a, b) => b.orderCount - a.orderCount);
  }

  // 일별 매출
  getDailySales(days = 30) {
    const now = new Date();
    const result = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        const orderDate = new Date(order.createdat || order.createdAt);
        const daysAgo = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
        
        if (daysAgo < days) {
          const dateKey = orderDate.toISOString().split('T')[0];
          
          if (!result[dateKey]) {
            result[dateKey] = {
              date: dateKey,
              orderCount: 0,
              totalSales: 0,
              totalPointsUsed: 0,
              totalPointsEarned: 0,
              cardSales: 0,
              cashSales: 0
            };
          }
          
          result[dateKey].orderCount++;
          result[dateKey].totalSales += order.totalprice || order.totalAmount || 0;
          result[dateKey].totalPointsUsed += order.usedpoints || order.usedPoints || 0;
          result[dateKey].totalPointsEarned += order.earnedpoints || order.earnedPoints || 0;
          
          if ((order.paymentmethod || order.paymentMethod) === 'card') {
            result[dateKey].cardSales += order.totalprice || order.totalAmount || 0;
          } else {
            result[dateKey].cashSales += order.totalprice || order.totalAmount || 0;
          }
        }
      });
    
    return Object.values(result).sort((a, b) => b.date.localeCompare(a.date));
  }

  // 월별 매출
  getMonthlySales(months = 12) {
    const result = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        const orderDate = new Date(order.createdat || order.createdAt);
        const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!result[monthKey]) {
          result[monthKey] = {
            month: monthKey,
            orderCount: 0,
            totalSales: 0,
            avgOrderAmount: 0
          };
        }
        
        result[monthKey].orderCount++;
        result[monthKey].totalSales += order.totalprice || order.totalAmount || 0;
      });
    
    return Object.values(result)
      .map(r => ({
        ...r,
        avgOrderAmount: r.orderCount > 0 ? r.totalSales / r.orderCount : 0
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, months);
  }

  // 오늘 통계
  getTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = this.orders.filter(o => {
      const orderDate = new Date(o.createdat || o.createdAt).toISOString().split('T')[0];
      return orderDate === today && o.status === 'completed';
    });
    
    const totalSales = todayOrders.reduce((sum, o) => sum + (o.totalprice || o.totalAmount || 0), 0);
    const amounts = todayOrders.map(o => o.totalprice || o.totalAmount || 0).filter(a => a > 0);
    
    return {
      orderCount: todayOrders.length,
      totalSales,
      avgOrderAmount: amounts.length > 0 ? totalSales / amounts.length : 0,
      maxOrderAmount: amounts.length > 0 ? Math.max(...amounts) : 0,
      minOrderAmount: amounts.length > 0 ? Math.min(...amounts) : 0
    };
  }

  // 정산 정보
  getSettlement(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const orders = this.orders.filter(o => {
      const orderDate = new Date(o.createdat || o.createdAt);
      return orderDate >= start && orderDate <= end && o.status === 'completed';
    });
    
    const grossSales = orders.reduce((sum, o) => sum + (o.totalprice || o.totalAmount || 0), 0);
    const pointsRedeemed = orders.reduce((sum, o) => sum + (o.usedpoints || o.usedPoints || 0), 0);
    const pointsIssued = orders.reduce((sum, o) => sum + (o.earnedpoints || o.earnedPoints || 0), 0);
    
    const cardPayments = orders
      .filter(o => (o.paymentmethod || o.paymentMethod) === 'card')
      .reduce((sum, o) => sum + (o.totalprice || o.totalAmount || 0), 0);
    
    const cashPayments = orders
      .filter(o => (o.paymentmethod || o.paymentMethod) !== 'card')
      .reduce((sum, o) => sum + (o.totalprice || o.totalAmount || 0), 0);
    
    return {
      totalOrders: orders.length,
      grossSales,
      pointsRedeemed,
      pointsIssued,
      cardPayments,
      cashPayments
    };
  }

  // 상위 고객
  getTopCustomers(limit = 10) {
    const customerMap = {};
    
    this.orders
      .filter(o => o.status === 'completed' && o.userid)
      .forEach(order => {
        const userId = order.userid;
        
        if (!customerMap[userId]) {
          customerMap[userId] = {
            userId,
            customerName: order.customername || order.customerName,
            phone: order.customerphone || order.phone,
            orderCount: 0,
            totalSpent: 0,
            avgOrderAmount: 0,
            lastOrderDate: order.createdat || order.createdAt
          };
        }
        
        customerMap[userId].orderCount++;
        customerMap[userId].totalSpent += order.totalprice || order.totalAmount || 0;
        
        const orderDate = new Date(order.createdat || order.createdAt);
        const lastDate = new Date(customerMap[userId].lastOrderDate);
        if (orderDate > lastDate) {
          customerMap[userId].lastOrderDate = order.createdat || order.createdAt;
        }
      });
    
    return Object.values(customerMap)
      .map(c => ({
        ...c,
        avgOrderAmount: c.orderCount > 0 ? c.totalSpent / c.orderCount : 0
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }

  // 인기 메뉴
  getPopularMenus(limit = 10) {
    const menuMap = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          
          if (Array.isArray(items)) {
            items.forEach(item => {
              const menuName = item.name;
              
              if (!menuMap[menuName]) {
                menuMap[menuName] = {
                  menuName,
                  totalQuantity: 0,
                  totalRevenue: 0,
                  orderCount: 0
                };
              }
              
              menuMap[menuName].totalQuantity += item.quantity || 1;
              menuMap[menuName].totalRevenue += (item.price || 0) * (item.quantity || 1);
              menuMap[menuName].orderCount++;
            });
          }
        } catch (e) {
          // JSON 파싱 오류 무시
        }
      });
    
    return Object.values(menuMap)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit);
  }

  // 시간대별 주문
  getTimeDistribution() {
    const hourMap = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        const orderDate = new Date(o.createdat || o.createdAt);
        const hour = orderDate.getHours();
        
        if (!hourMap[hour]) {
          hourMap[hour] = {
            hour,
            orderCount: 0,
            totalSales: 0
          };
        }
        
        hourMap[hour].orderCount++;
        hourMap[hour].totalSales += order.totalprice || order.totalAmount || 0;
      });
    
    return Object.values(hourMap).sort((a, b) => a.hour - b.hour);
  }

  // 실시간 통계
  getRealTimeStats() {
    const today = this.getTodayStats();
    
    const pending = this.orders.filter(o => o.status === 'pending' || o.status === 'accepted').length;
    const preparing = this.orders.filter(o => o.status === 'preparing').length;
    const delivering = this.orders.filter(o => o.status === 'delivering').length;
    
    const recentOrders = this.orders
      .slice()
      .sort((a, b) => {
        const timeA = a.createdat || a.createdAt || 0;
        const timeB = b.createdat || b.createdAt || 0;
        return timeB - timeA;
      })
      .slice(0, 5)
      .map(o => ({
        orderId: o.orderid || o.orderId,
        customerName: o.customername || o.customerName,
        totalAmount: o.totalprice || o.totalAmount,
        status: o.status,
        createdAt: o.createdat || o.createdAt
      }));
    
    return {
      today,
      pending,
      preparing,
      delivering,
      recentOrders
    };
  }

  // 주소에서 리(里) 추출
  extractRi(address) {
    if (!address) return '기타';
    
    // 리 패턴 찾기: "만정리", "진사리", "개소리" 등
    const riMatch = address.match(/([가-힣]+리)(\s|$)/);
    if (riMatch) {
      return riMatch[1]; // "만정리"
    }
    
    return '기타';
  }

  // 주소에서 아파트 단지명 추출
  extractApartment(address) {
    if (!address) return '기타';
    
    // 아파트 패턴 찾기
    const patterns = [
      /([가-힣]+아파트)/,           // "공도아파트"
      /([가-힣]+마을)/,              // "만정마을"
      /([가-힣]+힐스)/,              // "공도힐스"
      /([가-힣]+타운)/,              // "공도타운"
      /([가-힣]+빌라)/,              // "공도빌라"
      /([가-힣]+주택)/,              // "공도주택"
      /([가-힣]+주공)/,              // "공도주공"
      /([가-힣]+단지)/,              // "공도단지"
      /([가-힣]+APT)/i,              // "공도APT"
      /([가-힣]+apartment)/i         // "공도apartment"
    ];
    
    for (const pattern of patterns) {
      const match = address.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    // 아파트 단지명이 없으면 리 단위로 분류
    return this.extractRi(address);
  }

  // 리 단위 통계
  getOrdersByRi() {
    const riMap = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        const address = order.address || '';
        const ri = this.extractRi(address);
        
        if (!riMap[ri]) {
          riMap[ri] = {
            ri,
            orderCount: 0,
            totalSales: 0,
            avgOrderAmount: 0
          };
        }
        
        riMap[ri].orderCount++;
        riMap[ri].totalSales += order.totalprice || order.totalAmount || 0;
      });
    
    return Object.values(riMap)
      .map(r => ({
        ...r,
        avgOrderAmount: r.orderCount > 0 ? r.totalSales / r.orderCount : 0
      }))
      .sort((a, b) => b.orderCount - a.orderCount);
  }

  // 아파트 단지 단위 통계
  getOrdersByApartment() {
    const aptMap = {};
    
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        const address = order.address || '';
        const apt = this.extractApartment(address);
        
        if (!aptMap[apt]) {
          aptMap[apt] = {
            apartment: apt,
            orderCount: 0,
            totalSales: 0,
            avgOrderAmount: 0,
            customerCount: new Set()
          };
        }
        
        aptMap[apt].orderCount++;
        aptMap[apt].totalSales += order.totalprice || order.totalAmount || 0;
        
        // 고객 수 계산 (전화번호 기준)
        const phone = order.customerphone || order.phone || '';
        if (phone) {
          aptMap[apt].customerCount.add(phone);
        }
      });
    
    return Object.values(aptMap)
      .map(a => ({
        apartment: a.apartment,
        orderCount: a.orderCount,
        totalSales: a.totalSales,
        avgOrderAmount: a.orderCount > 0 ? a.totalSales / a.orderCount : 0,
        customerCount: a.customerCount.size
      }))
      .sort((a, b) => b.orderCount - a.orderCount);
  }

  // 영업시간 저장/조회 (요일별)
  saveBusinessHours(hours) {
    // hours는 { 0: {open, close}, 1: {open, close}, ... } 형식
    this.businessHours = hours ? { ...hours } : null;
    console.log('✅ 영업시간 저장:', this.businessHours);
  }

  getBusinessHours() {
    return this.businessHours || null;
  }

  // 임시휴업 설정
  setTemporaryClosed(closed) {
    this.temporaryClosed = closed;
    console.log('✅ 임시휴업 설정:', closed ? 'ON' : 'OFF');
  }

  getTemporaryClosed() {
    return this.temporaryClosed || false;
  }
  
  setBusyStatus(status) {
    if (['very-busy', 'busy', 'normal'].includes(status)) {
      this.busyStatus = status;
      console.log('✅ 바쁨 상태 설정:', status);
      return this.busyStatus;
    }
    return null;
  }
  
  getBusyStatus() {
    return this.busyStatus || 'normal';
  }
  
  // 포인트 통계
  getPointStats() {
    const issued = this.pointHistory
      .filter(p => p.type === 'earn' || p.type === 'admin')
      .reduce((sum, p) => sum + (p.points > 0 ? p.points : 0), 0);
    const used = this.pointHistory
      .filter(p => p.type === 'use')
      .reduce((sum, p) => sum + Math.abs(p.points), 0);
    const currentTotal = this.users.reduce((sum, u) => sum + (u.points || 0), 0);
    
    return {
      issued,
      used,
      currentTotal,
      totalUsers: this.users.length
    };
  }
  
  // 쿠폰 생성
  createCoupon(couponData) {
    const coupon = {
      id: this.coupons.length + 1,
      code: couponData.code,
      name: couponData.name,
      discountType: couponData.discountType, // 'percent' or 'fixed'
      discountValue: couponData.discountValue,
      minAmount: couponData.minAmount || 0,
      maxDiscount: couponData.maxDiscount || null,
      validFrom: couponData.validFrom,
      validTo: couponData.validTo,
      issuedCount: 0,
      usedCount: 0,
      isActive: couponData.isActive !== false,
      createdAt: new Date()
    };
    this.coupons.push(coupon);
    console.log('✅ 쿠폰 생성:', coupon);
    return coupon;
  }
  
  // 쿠폰 조회
  getCouponById(id) {
    return this.coupons.find(c => c.id === id);
  }
  
  getCouponByCode(code) {
    return this.coupons.find(c => c.code === code && c.isActive);
  }
  
  getAllCoupons() {
    return [...this.coupons];
  }
  
  // 쿠폰 발급 (사용자에게 쿠폰 지급)
  issueCouponToUser(couponId, userId) {
    const coupon = this.getCouponById(couponId);
    if (!coupon || !coupon.isActive) {
      return null;
    }
    
    coupon.issuedCount = (coupon.issuedCount || 0) + 1;
    
    // 쿠폰 사용 내역에 발급 기록 (발급도 기록으로 남김)
    this.couponUsage.push({
      id: this.couponUsage.length + 1,
      couponId,
      userId,
      orderId: null,
      usedAt: new Date(),
      type: 'issued'
    });
    
    return coupon;
  }
  
  // 쿠폰 사용
  useCoupon(couponId, userId, orderId) {
    const coupon = this.getCouponById(couponId);
    if (!coupon) {
      return false;
    }
    
    coupon.usedCount = (coupon.usedCount || 0) + 1;
    
    this.couponUsage.push({
      id: this.couponUsage.length + 1,
      couponId,
      userId,
      orderId,
      usedAt: new Date(),
      type: 'used'
    });
    
    return true;
  }
  
  // 쿠폰 통계
  getCouponStats() {
    const totalIssued = this.coupons.reduce((sum, c) => sum + (c.issuedCount || 0), 0);
    const totalUsed = this.coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);
    const activeCoupons = this.coupons.filter(c => c.isActive).length;
    
    return {
      totalCoupons: this.coupons.length,
      activeCoupons,
      totalIssued,
      totalUsed,
      usageRate: totalIssued > 0 ? ((totalUsed / totalIssued) * 100).toFixed(2) : 0
    };
  }
  
  // 홀 매출 추가
  addHallSale(saleData) {
    const sale = {
      id: this.hallSales.length + 1,
      date: saleData.date,
      amount: saleData.amount,
      paymentMethod: saleData.paymentMethod || 'cash',
      memo: saleData.memo || '',
      createdAt: new Date()
    };
    this.hallSales.push(sale);
    console.log('✅ 홀 매출 추가:', sale);
    return sale;
  }
  
  // 홀 매출 조회
  getHallSales(startDate, endDate) {
    if (!startDate || !endDate) {
      return [...this.hallSales];
    }
    return this.hallSales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
    });
  }
  
  // 타 플랫폼 매출 추가
  addPlatformSale(saleData) {
    const sale = {
      id: this.platformSales.length + 1,
      platform: saleData.platform, // 'baemin', 'yogiyo', 'coupang', 'etc'
      date: saleData.date,
      amount: saleData.amount,
      commission: saleData.commission || 0, // 수수료
      paymentMethod: saleData.paymentMethod || 'card',
      memo: saleData.memo || '',
      createdAt: new Date()
    };
    this.platformSales.push(sale);
    console.log('✅ 타 플랫폼 매출 추가:', sale);
    return sale;
  }
  
  // 타 플랫폼 매출 조회
  getPlatformSales(startDate, endDate) {
    if (!startDate || !endDate) {
      return [...this.platformSales];
    }
    return this.platformSales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
    });
  }
  
  // 통합 매출 통계
  getTotalSalesStats(startDate, endDate) {
    // 배달앱 매출 (orders에서 계산)
    const appOrders = this.orders.filter(o => {
      if (!startDate || !endDate) return true;
      const orderDate = new Date(o.createdat);
      return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
    });
    const appSales = appOrders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.totalprice || o.totalAmount || 0), 0);
    
    // 홀 매출
    const hallSales = this.getHallSales(startDate, endDate);
    const hallTotal = hallSales.reduce((sum, s) => sum + s.amount, 0);
    
    // 타 플랫폼 매출
    const platformSales = this.getPlatformSales(startDate, endDate);
    const platformTotal = platformSales.reduce((sum, s) => sum + s.amount, 0);
    const platformCommission = platformSales.reduce((sum, s) => sum + (s.commission || 0), 0);
    
    // 플랫폼별 매출
    const platformBreakdown = {};
    platformSales.forEach(s => {
      if (!platformBreakdown[s.platform]) {
        platformBreakdown[s.platform] = { amount: 0, commission: 0, count: 0 };
      }
      platformBreakdown[s.platform].amount += s.amount;
      platformBreakdown[s.platform].commission += (s.commission || 0);
      platformBreakdown[s.platform].count += 1;
    });
    
    // 통합 매출
    const totalSales = appSales + hallTotal + platformTotal;
    const netSales = totalSales - platformCommission; // 수수료 제외 순매출
    
    return {
      appSales,
      hallSales: hallTotal,
      platformSales: platformTotal,
      platformCommission,
      totalSales,
      netSales,
      platformBreakdown,
      appOrderCount: appOrders.filter(o => o.status === 'completed').length,
      hallSaleCount: hallSales.length,
      platformSaleCount: platformSales.length
    };
  }

  // 브레이크타임 설정 (요일별)
  setBreakTime(breakTime) {
    // breakTime은 { 0: {start, end}, 1: {start, end}, ... } 형식 또는 null
    this.breakTime = breakTime ? { ...breakTime } : null;
    console.log('✅ 브레이크타임 설정:', this.breakTime);
  }

  getBreakTime() {
    return this.breakTime || null;
  }

  // 메뉴 원가 설정
  setMenuCost(menuId, cost) {
    this.menuCosts[menuId] = cost;
    console.log(`✅ 메뉴 원가 설정: ID ${menuId} = ${cost}원`);
  }

  getMenuCost(menuId) {
    return this.menuCosts[menuId] || 0;
  }

  getAllMenuCosts() {
    return { ...this.menuCosts };
  }

  // 메뉴별 판매 분석 (판매량, 원가, 수익)
  getMenuSalesAnalysis() {
    const menuMap = {};
    
    // 메뉴 정보 매핑
    const menuInfoMap = {};
    this.menu.forEach(menu => {
      menuInfoMap[menu.name] = {
        id: menu.id,
        name: menu.name,
        price: menu.price,
        category: menu.category,
        cost: this.menuCosts[menu.id] || Math.round(menu.price * 0.4)
      };
    });
    
    // 주문 데이터 분석
    this.orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          
          if (Array.isArray(items)) {
            items.forEach(item => {
              const menuName = item.name;
              const menuInfo = menuInfoMap[menuName];
              
              if (!menuInfo) return;
              
              if (!menuMap[menuName]) {
                menuMap[menuName] = {
                  menuId: menuInfo.id,
                  menuName: menuInfo.name,
                  category: menuInfo.category,
                  price: menuInfo.price,
                  cost: menuInfo.cost,
                  totalQuantity: 0,
                  totalRevenue: 0,
                  totalCost: 0,
                  totalProfit: 0,
                  orderCount: 0
                };
              }
              
              const quantity = item.quantity || 1;
              const itemPrice = item.price || menuInfo.price;
              const itemCost = menuInfo.cost;
              
              menuMap[menuName].totalQuantity += quantity;
              menuMap[menuName].totalRevenue += itemPrice * quantity;
              menuMap[menuName].totalCost += itemCost * quantity;
              menuMap[menuName].totalProfit += (itemPrice - itemCost) * quantity;
              menuMap[menuName].orderCount++;
            });
          }
        } catch (e) {
          // JSON 파싱 오류 무시
        }
      });
    
    // 수익률 계산
    const result = Object.values(menuMap).map(menu => ({
      ...menu,
      profitMargin: menu.totalRevenue > 0 
        ? Math.round((menu.totalProfit / menu.totalRevenue) * 100 * 100) / 100 
        : 0,
      avgProfitPerUnit: menu.totalQuantity > 0 
        ? Math.round(menu.totalProfit / menu.totalQuantity) 
        : 0
    }));
    
    return result.sort((a, b) => b.totalProfit - a.totalProfit);
  }
}

module.exports = DB;

