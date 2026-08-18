export type ReplyType = 'A' | 'B' | 'C';

const GREETING = '안녕하세요 한려담원입니다.';
const THANKS = '감사합니다.';

const PRODUCT_NAME = '한려담원 흑염소 진액';
const PRODUCT_POUCH_VOLUME_ML = 70;
const PRODUCT_POUCH_HALF_RANGE_ML = '30~35mL';
const PRODUCT_CALORIES_KCAL = 15;
const PRODUCT_GOAT_PERCENT = 11;
const PRODUCT_GOAT_SOURCE_DESC = '지리산 8만평 규모 농장에서 자연방목으로 사육한 국내산 흑염소';
const PRODUCT_EXTRACTION_DESC = '105℃ 48시간 저온 추출';
const PRODUCT_ODOR_DESC = '누린내 저감을 위한 기름 제거 공정';
const PRODUCT_INGREDIENTS_LIST =
  '국내산 흑염소, 6년근 유기농홍삼, 영지버섯, 동충하초, 대추, 당귀, 천궁, 감초, 생강, 황기';
const SHIPPING_COURIER = 'CJ대한통운';
const SHIPPING_FEE = '2,500원';
const FREE_SHIPPING_THRESHOLD = '50,000원';
const EXPIRY_DESC = '제조일로부터 2년';
const BRAND_CLOSING_TEMPLATE_TARGET = 100;

const BRAND_OPENERS = [
  '저희 한려담원은',
  '한려담원은',
  '저희 한려담원은 언제나',
  '한려담원은 늘',
  '저희 한려담원은 항상',
  '한려담원은 한결같이',
  '저희 한려담원은 고객님과 가족의 일상을 위해',
  '한려담원은 고객님의 매일을 위해',
  '저희 한려담원은 매일',
  '한려담원은 고객님의 건강한 습관을 위해',
];

const BRAND_HOPES = [
  '고객님의 일상이 항상 건강하고 행복했으면 하는 마음으로',
  '고객님의 하루가 건강하고 편안하게 이어지길 바라며',
  '고객님의 생활이 균형 있게 지속되길 바라는 진심으로',
  '고객님의 건강한 습관이 자연스럽게 자리 잡길 바라며',
  '고객님의 몸과 마음이 모두 편안하시길 바라는 마음으로',
  '고객님의 평온한 일상이 오래 이어지길 바라는 마음으로',
  '고객님의 소중한 하루가 더 안정적으로 이어지길 바라며',
  '고객님의 건강한 내일을 함께 준비한다는 마음으로',
  '고객님과 가족 모두가 안심할 수 있는 일상을 바라며',
  '고객님의 바쁜 일상에도 무리 없는 건강 관리를 바라며',
];

const BRAND_ACTIONS = [
  '매일 부담 없이 이어가실 수 있는 보양 루틴을 고민하고 있습니다',
  '정직한 원료와 기준으로 제품을 준비하고 있습니다',
  '고객님이 안심하고 선택하실 수 있도록 세심하게 관리하고 있습니다',
  '건강한 습관이 일상에 자연스럽게 스며들 수 있도록 돕고 있습니다',
  '작은 부분까지 놓치지 않도록 안내와 품질을 꾸준히 점검하고 있습니다',
  '무리 없는 섭취 루틴을 이어가실 수 있도록 기준을 다듬고 있습니다',
  '고객님의 선택이 신뢰로 이어질 수 있도록 정성을 다하고 있습니다',
  '하루의 컨디션을 지키는 데 보탬이 되도록 꾸준히 준비하고 있습니다',
  '고객님의 생활 리듬에 맞는 건강 관리를 위해 노력하고 있습니다',
  '매일의 건강 관리가 부담이 되지 않도록 현실적인 방향을 지향하고 있습니다',
];

const GOAT_SOURCE_REASON_VARIANTS = [
  '자연방목 사육은 사육 환경과 원료 이력을 더 분명하게 확인하고 관리하는 데 도움이 됩니다.',
  '넓은 환경에서 사육한 원료를 사용해 사육 이력과 원료 상태를 더 꼼꼼히 점검하고 있습니다.',
  '사육 환경을 확인하기 쉬운 기준을 우선해, 원료 선별과 이력 관리 기준을 더 엄격하게 적용하고 있습니다.',
  '원료 출처와 사육 기준이 분명해야 고객님께 안내드릴 수 있는 확인 기준도 더 명확해진다고 생각합니다.',
  '자연방목 기준을 선택한 이유는 원료 단계부터 확인 포인트를 투명하게 안내드리기 위함입니다.',
];

const buildBrandClosingVariants = (): string[] => {
  const variants = new Set<string>();
  variants.add('저희 한려담원은 고객님의 일상이 항상 건강하고 행복했으면 하는 바람입니다.');

  outer: for (const opener of BRAND_OPENERS) {
    for (const hope of BRAND_HOPES) {
      for (const action of BRAND_ACTIONS) {
        variants.add(`${opener} ${hope} ${action}.`);
        if (variants.size >= BRAND_CLOSING_TEMPLATE_TARGET) {
          break outer;
        }
      }
    }
  }

  return Array.from(variants);
};

const BRAND_CLOSING_VARIANTS = buildBrandClosingVariants();

const LAST_PICK_INDEX: Record<string, number> = {};

const pickRandom = (key: string, variants: string[]): string => {
  if (variants.length === 0) return '';
  if (variants.length === 1) return variants[0];

  const prev = LAST_PICK_INDEX[key];
  let idx = Math.floor(Math.random() * variants.length);

  if (prev === idx) {
    idx = (idx + 1 + Math.floor(Math.random() * (variants.length - 1))) % variants.length;
  }

  LAST_PICK_INDEX[key] = idx;
  return variants[idx];
};

const HEALTH_TITLE_REGEX =
  /(임산부|임신|수유|당뇨|혈압|약|위가|위장|아이|어린이|노인|어르신|관절|냉증|수족냉증|만성피로|기력|암|수술|회복|질환|부작용|호르몬|콜레스테롤|고지혈|지방간)/;
const INGREDIENT_TITLE_REGEX = /(맛|비린|원료|성분|함량|구성|알레르기)/;
const INTAKE_TITLE_REGEX =
  /(식전|식후|공복|복용|권장|하루|먹는 시간|먹는시간|언제|꾸준히|병행|몇\s*포|몇포|기간|개월|휴지기|중단|재복용|재섭취|수험생|학생|남편|부부|가족|함께|같이\s*(먹|드|섭취)|장어|장어즙|즙|프로틴|비타민|오메가|유산균|홍삼)/;
const SHIPPING_TITLE_REGEX = /(배송|송장|택배|주말|제주|주소|묶음)/;
const GIFT_TITLE_REGEX = /(선물|포장|카드|쇼핑백|답례품|대량)/;
const STORAGE_TITLE_REGEX = /(보관|유통기한|개봉|상온|냉장)/;
const REFUND_TITLE_REGEX = /(환불|교환|반품|취소)/;
const PRODUCT_INFO_TITLE_REGEX = /(공정|품질|관리|HACCP|열량|칼로리|용량|영양|성분표)/;
const CONSULT_REGEX = /(담당 의사 선생님|주치의|의료진|전문의|소아과|산부인과|상의)/;

export const getReplyTypeForQuestion = (title: string): ReplyType => {
  if (
    SHIPPING_TITLE_REGEX.test(title) ||
    GIFT_TITLE_REGEX.test(title) ||
    STORAGE_TITLE_REGEX.test(title) ||
    REFUND_TITLE_REGEX.test(title)
  ) {
    return 'A';
  }

  if (HEALTH_TITLE_REGEX.test(title) || INTAKE_TITLE_REGEX.test(title)) {
    return 'C';
  }

  if (INGREDIENT_TITLE_REGEX.test(title) || PRODUCT_INFO_TITLE_REGEX.test(title)) {
    return 'B';
  }

  return 'B';
};

const normalizeTitle = (text: string): string => text.replace(/\s+/g, ' ').trim();

const normalizeReplyLines = (bodyLines: string[]): string[] => {
  const lines: string[] = [];

  for (const rawLine of bodyLines) {
    const line = rawLine.trim();
    if (!line) {
      // Preserve intentional paragraph breaks, but avoid leading/multiple blank lines.
      if (lines.length === 0) continue;
      if (lines[lines.length - 1] === '') continue;
      lines.push('');
      continue;
    }

    lines.push(line);
  }

  while (lines[lines.length - 1] === '') lines.pop();
  return lines;
};

const formatReply = (bodyLines: string[]): string => {
  const lines = normalizeReplyLines(bodyLines);
  return `${GREETING}\n\n${lines.join('\n')}\n\n${THANKS}`;
};

const buildOpsLines = (title: string): string[] => {
  const t = normalizeTitle(title);

  if (/(환불|교환|반품|취소)/.test(t)) {
    return [
      '한려담원은 한 달 섭취 후 불만족 시 100% 환불 정책을 운영하고 있습니다.',
      '적용 기준과 접수 절차는 주문 채널 및 고객센터를 통해 현재 정책 기준으로 안내드리고 있습니다.',
    ];
  }

  if (/(배송비|무료배송)/.test(t)) {
    return [`배송비는 ${SHIPPING_FEE}이며, ${FREE_SHIPPING_THRESHOLD} 이상 구매 시 무료배송으로 진행됩니다.`];
  }

  if (/(택배사|대한통운|CJ)/.test(t)) {
    return [`현재 ${SHIPPING_COURIER}으로 배송하고 있습니다.`];
  }

  if (/(송장|운송장|송장번호|조회)/.test(t)) {
    return [
      '출고 후 송장번호를 문자로 안내드리고 있습니다.',
      '송장 등록 이후 택배사 조회가 가능합니다.',
    ];
  }

  if (/(배송|출고|수령|도착)/.test(t) && /(얼마나|기간|며칠|언제)/.test(t)) {
    return [
      '평일 15시 이전 결제 완료 건은 당일 출고를 원칙으로 하고 있습니다.',
      '15시 이후 주문 건은 다음 영업일에 순차 출고됩니다.',
      '출고 후에는 보통 2~3일 내 수령 가능한 편이며, 제주/도서산간 지역은 1~2일 정도 추가될 수 있습니다.',
      '물류 상황에 따라 일정은 달라질 수 있어 송장 등록 후 택배사 조회로 확인해 주세요.',
    ];
  }

  if (/(주말|공휴일|토요일|일요일)/.test(t)) {
    return [
      '출고는 평일 기준으로 순차 진행됩니다.',
      '주말/공휴일에는 출고가 어려울 수 있습니다.',
      '금요일 이후 주문건은 다음 영업일에 순차 출고되는 점 참고 부탁드립니다.',
    ];
  }

  if (/(제주|도서|산간|도서산간)/.test(t)) {
    return [
      '제주 및 도서산간 지역도 배송 가능합니다.',
      '다만 지역 특성상 배송 기간이 1~2일 정도 추가될 수 있습니다.',
    ];
  }

  if (/(주소|배송지|다른\\s*주소)/.test(t)) {
    return [
      '주문 시 입력해 주신 배송지로 발송됩니다.',
      '주문 후 변경이 필요하신 경우에는 출고 전 확인이 필요할 수 있어 고객센터로 빠르게 문의해 주세요.',
    ];
  }

  if (/(묶음|합배송)/.test(t)) {
    return [
      '여러 개 주문하시면 한 번에 묶음 배송으로 보내드리고 있습니다.',
      '출고 상황에 따라 일부 변동이 있을 수 있어, 특정 일정이 있으시면 문의 주시면 확인해 드리겠습니다.',
    ];
  }

  if (/(쇼핑백)/.test(t)) {
    return ['쇼핑백 요청은 주문 시 요청사항에 남겨주시면 출고 전 확인 후 가능한 범위에서 함께 준비해 드리겠습니다.'];
  }

  if (/(카드|메시지|감사\\s*문구)/.test(t)) {
    return ['감사 메시지 카드는 주문 시 요청사항에 원하시는 문구를 남겨주시면 함께 동봉해 드리겠습니다.'];
  }

  if (/(답례품|대량)/.test(t)) {
    return [
      '대량 주문도 가능합니다.',
      '필요하신 수량과 원하시는 일정이 있으시면 말씀해 주시면 맞춰 안내드리겠습니다.',
    ];
  }

  if (/(선물|포장)/.test(t)) {
    return ['선물용 포장 관련 요청은 주문 시 요청사항에 남겨주시면 출고 전 확인해 가능한 범위에서 반영해 드리고 있습니다.'];
  }

  if (/(유통기한|소비기한|기한)/.test(t)) {
    return [`유통기한은 ${EXPIRY_DESC}이며, 수령하신 제품 라벨에 표기된 날짜로 확인하실 수 있습니다.`];
  }

  if (/(개봉|뜯|남은\\s*양)/.test(t)) {
    return [
      '개봉 후에는 가급적 바로 섭취해 주세요.',
      '남은 제품은 냉장 보관 후 빠르게 드셔 주세요.',
    ];
  }

  if (/(보관|상온|냉장)/.test(t)) {
    return [
      '직사광선을 피한 서늘한 곳에 보관해 주시면 상온 보관이 가능합니다.',
      '여름철 등 더운 환경에서는 냉장 보관을 권장드립니다.',
    ];
  }

  return [
    '문의하신 내용은 주문/출고 상태에 따라 안내가 달라질 수 있습니다.',
    '주문 채널(또는 주문번호)을 함께 알려주시면 빠르게 확인해 도와드리겠습니다.',
  ];
};

const buildProductInfoLines = (title: string): string[] => {
  const t = normalizeTitle(title);

  if (/(알레르기|알러지)/.test(t)) {
    return [
      `${PRODUCT_NAME}은 ${PRODUCT_GOAT_SOURCE_DESC}를 주원료로 사용하고 있습니다.`,
      `함께 배합되는 원재료는 ${PRODUCT_INGREDIENTS_LIST} 등으로 구성되어 있습니다.`,
      '알레르기 이력이 있으신 경우에는 섭취 전 원재료표를 먼저 확인해 주세요.',
      '처음 드실 때는 한두 모금 정도로 반응을 살펴보시는 방법도 가능합니다.',
      '특정 성분에 민감하신 편이라면 제품 라벨 정보를 확인하신 뒤 담당 의사 선생님과 상의 후 결정해 주세요.',
    ];
  }

  if (/(맛|비린|누린내)/.test(t)) {
    return [
      `비린 향이 부담스럽지 않도록 ${PRODUCT_EXTRACTION_DESC}과 ${PRODUCT_ODOR_DESC}을 포함해 제조 기준을 관리하고 있습니다.`,
      '실제 맛은 구수하고 진한 편이라는 의견이 많지만, 체감은 개인차가 있을 수 있습니다.',
      '처음 드시는 경우에는 따뜻하게 데워서 소량으로 시작하시면 부담을 줄이는 데 도움이 될 수 있습니다.',
    ];
  }

  if (/(국내산|지리산|자연방목)/.test(t) || /원료/.test(t)) {
    return [
      `${PRODUCT_NAME}은 ${PRODUCT_GOAT_SOURCE_DESC}를 주원료로 사용하고 있습니다.`,
      pickRandom('goatSourceReason', GOAT_SOURCE_REASON_VARIANTS),
      '원재료 정보는 상세페이지와 제품 라벨 기준으로 동일하게 안내드리고 있습니다.',
    ];
  }

  if (/(함량|몇\\s*%|퍼센트|비율|원물)/.test(t)) {
    return [
      `${PRODUCT_NAME}은 국내산 흑염소 원물 ${PRODUCT_GOAT_PERCENT}% 배합 기준으로 준비하고 있습니다.`,
      '함께 배합되는 원재료 정보는 상세페이지와 제품 라벨 기준으로 동일하게 안내드리고 있습니다.',
    ];
  }

  if (/(공정|품질|관리|제조|추출|HACCP)/.test(t)) {
    return [
      `${PRODUCT_NAME}은 ${PRODUCT_EXTRACTION_DESC} 기준으로 오랜 시간 달여 진하게 우려내고 있습니다.`,
      `누린내가 부담스럽지 않도록 ${PRODUCT_ODOR_DESC}을 포함해 관리하고 있습니다.`,
      '',
      'HACCP 인증 시설에서 제조하고 있습니다.',
      '품질 관련 기준에 맞춰 원재료 이력과 제조 흐름을 함께 점검하고 있습니다.',
      `${PRODUCT_GOAT_SOURCE_DESC}를 주원료로 사용하고 있습니다.`,
    ];
  }

  if (/(열량|칼로리|kcal|용량|mL|ml|영양|성분표)/.test(t)) {
    return [
      `${PRODUCT_NAME}은 1포 ${PRODUCT_POUCH_VOLUME_ML}mL 기준이며, 열량은 ${PRODUCT_CALORIES_KCAL}kcal입니다.`,
      '낱개 포장 형태로 일상 루틴에 맞춰 이어가실 수 있도록 준비하고 있습니다.',
    ];
  }

  return [
    '제품 원료/성분/공정 관련 정보는 최신 상세페이지와 제품 라벨 기준으로 확인하시면 가장 정확합니다.',
    '문의하신 포인트를 알려주시면 확인 가능한 기준으로 정리해 안내드리겠습니다.',
  ];
};

const buildIntakeHealthLines = (title: string): string[] => {
  const t = normalizeTitle(title);
  type IntakeSection = 'answer' | 'guide' | 'caution' | 'consult';
  const sections: Record<IntakeSection, string[]> = { answer: [], guide: [], caution: [], consult: [] };
  const seen = new Set<string>();

  const getAllLines = (): string[] => [
    ...sections.answer,
    ...sections.guide,
    ...sections.caution,
    ...sections.consult,
  ];

  const add = (section: IntakeSection, line: string, existsRegex?: RegExp) => {
    if (!line) return;
    if (existsRegex && getAllLines().some((l) => existsRegex.test(l))) return;
    if (seen.has(line)) return;
    sections[section].push(line);
    seen.add(line);
  };

  const isKids = /(어린이|아이|초등|유아|아기)/.test(t);
  const isElderly = /(고령|어르신|노인|80대|70대)/.test(t);
  const isPregnancy = /(임신\\s*준비|임신준비|임신|임산부|수유)/.test(t);
  const isDiabetes = /(당뇨|혈당)/.test(t);
  const isBloodPressure = /(혈압|고혈압|혈압약)/.test(t);
  const isSurgery = /(암|수술|회복)/.test(t);
  const hasGiContext = /(위가|위장|속이|쓰리|소화|장이|장\s*이|장트러블|장\s*트러블)/.test(t);
  const isMedsContext =
    /(감기약|처방약|복용\s*중|약\s*(복용|먹|드)|약을\s*(복용|먹|드))/i.test(t) || isDiabetes || isBloodPressure;

  // 0) 관절/냉증/만성피로/기력 — 간결 공감형
  const isJoint = /(관절)/.test(t);
  const isColdness = /(냉증|수족냉증)/.test(t);
  const isFatigue = /(만성피로|기력)/.test(t);

  if (isJoint || isColdness || isFatigue) {
    const concern = isJoint ? '관절이 불편하시다니' : isColdness ? '냉증으로 불편하시다니' : '기력이 떨어지셨다니';
    add('answer', `${concern} 걱정이 되시겠습니다.`);
    add('answer', '');
    add('answer', '흑염소는 예로부터 기력 보충과 원기 회복을 위한 보양식으로 많이 드셔 온 식재료이며, 체력이 뒷받침되면 전반적인 컨디션 관리에도 도움이 될 수 있습니다.');

    const lines: string[] = [...sections.answer];
    return lines;
  }

  // 1) 민감군 (수유/임신 문맥에서 "아기"가 등장해도 어린이 섹션 제외)
  if (isKids && !isPregnancy) {
    add('answer', '초등학생 자녀의 경우에도 섭취를 고려하실 수 있습니다.');
    add(
      'caution',
      '다만 성장기에는 체중과 소화 상태에 따라 체감 차이가 있을 수 있어, 처음에는 소량으로 시작해 반응을 살펴보시는 방법을 권해드립니다.',
    );
    add(
      'guide',
      `예를 들어 1포(${PRODUCT_POUCH_VOLUME_ML}mL) 기준이라면 반 포(약 ${PRODUCT_POUCH_HALF_RANGE_ML})로 2~3일 정도 시작해 보신 뒤, 무리 없을 때 1포로 조절해 주세요.`,
    );
    add('guide', '위가 예민한 경우에는 공복보다는 식후 섭취가 더 편안할 수 있습니다.');
    add(
      'consult',
      '알레르기 체질이거나 약을 복용 중인 경우에는 제품 라벨을 확인하신 뒤 소아과 담당 의사 선생님과 상의 후 결정해 주세요.',
      CONSULT_REGEX,
    );
  }

  if (isElderly) {
    add('answer', '고령 고객님들께서도 보양 루틴으로 섭취를 고려하실 수 있습니다.');
    add('guide', `기본은 하루 1포(1포 ${PRODUCT_POUCH_VOLUME_ML}mL) 기준으로 드시면서 컨디션을 확인해 주세요.`);
    add(
      'consult',
      '다만 약을 복용 중이시거나 관리 중인 질환이 있으시면 담당 의사 선생님과 상의 후 결정해 주시면 더 안심이 됩니다.',
      CONSULT_REGEX,
    );
  }

  // 2) 임신/수유
  if (isPregnancy) {
    add('answer', `${PRODUCT_NAME}은 일반식품으로 준비되어 있어 일상 루틴에서 섭취를 고려하실 수 있습니다.`);
    add('caution', '다만 임신/수유 중에는 체질·주수·컨디션에 따라 반응 차이가 커질 수 있습니다.');
    add(
      'consult',
      '원재료표를 확인하신 뒤 담당 산부인과 의사 선생님과 상의 후 결정해 주세요.',
      CONSULT_REGEX,
    );
    add('guide', '시작하실 때는 식후로 선택하시거나 소량부터 조절해 보셔도 괜찮습니다.');
  }

  // 3) 당뇨
  if (isDiabetes) {
    add('answer', `${PRODUCT_NAME}은 당류를 별도로 첨가하지 않은 일반식품입니다.`);
    add('caution', '다만 대추 등 자연 원료가 포함되어 있어 개인의 혈당 상태에 따라 반응 차이가 있을 수 있습니다.');
    add('guide', '당뇨 관리 중이시라면 처음에는 소량으로 시작하시고 섭취 전후 변화를 함께 확인해 주세요.');
    add('consult', '당뇨약을 복용 중이신 경우에는 담당 의사 선생님과 상의 후 섭취 여부를 결정해 주세요.', CONSULT_REGEX);
  }

  // 4) 혈압약
  if (isBloodPressure) {
    add('answer', '혈압약을 복용 중이신 경우에도 상황에 맞춰 섭취를 고려하실 수 있습니다.');
    add('answer', '제품에는 감초 등 원재료가 포함되어 있습니다.');
    add('guide', `기본은 하루 1포(1포 ${PRODUCT_POUCH_VOLUME_ML}mL)입니다.`, /(하루 1포|기본은 하루 1포)/);
    add('guide', '처음에는 하루 1포로 시작해 3~7일 정도 컨디션을 확인해 주세요.');
    add('caution', '혈압약을 복용 중이신 경우에는 약 성분과 개인 상태에 따라 체감이 달라질 수 있습니다.');
    add('consult', '장기 병행을 계획하신다면 담당 의사 선생님과 상의 후 결정해 주세요.', CONSULT_REGEX);
  }

  // 5) 약 병행(감기약/처방약 등)
  if (/(감기약|처방약|복용\s*중|약\s*(복용|먹|드)|약을\s*(복용|먹|드))/i.test(t) && !isBloodPressure && !isDiabetes) {
    if (/(감기약)/.test(t)) {
      add('answer', '감기약을 복용 중이신 경우에도 함께 섭취를 고려하실 수 있습니다.');
    } else {
      add('answer', '처방약을 복용 중이시라면 상황에 맞춰 함께 섭취를 고려하실 수 있습니다.');
    }
    add('guide', `기본은 하루 1포(1포 ${PRODUCT_POUCH_VOLUME_ML}mL)입니다.`, /(하루 1포|기본은 하루 1포)/);
    add('guide', '처음에는 하루 1포로 시작해 2~3일 정도 컨디션을 확인해 주세요.');
    add('caution', '복용 중인 약 성분과 현재 컨디션에 따라 체감 차이가 있을 수 있습니다.');
    add('consult', '복용 약이 여러 종류이거나 복용 계획이 복잡하신 경우에는 담당 의사 선생님과 상의 후 결정해 주세요.', CONSULT_REGEX);
  }

  // 6) 병행(영양제/다른 건강식품)
  if (/(병행|영양제|건강식품|장어|장어즙|즙|프로틴|비타민|오메가|유산균|홍삼)/.test(t)) {
    if (!isMedsContext) {
      add('answer', '다른 건강식품과 함께 드시는 것도 가능합니다.');
      add('guide', '다만 위가 예민하신 경우에는 시간대를 나눠 드시면 더 편안할 수 있습니다.');
    }
  }

  // 7) 성별/호르몬
  if (/(남성|남자|여성|여자|호르몬)/.test(t)) {
    add('answer', `${PRODUCT_NAME}은 특정 성별만을 위한 제품이 아니라, 남녀 구분 없이 일상 보양 루틴으로 드시는 분들이 계십니다.`, /(남녀|성별)/);
    add('caution', '다만 현재 건강 상태나 복용 중인 약에 따라 체감이 달라질 수 있습니다.');
    add('consult', '걱정되시는 부분이 있으시면 담당 의사 선생님과 상의 후 결정해 주세요.', CONSULT_REGEX);
  }

  // 8) 체중/콜레스테롤
  if (/(살\\s*찐다|살\\s*빠|체중|비만|부작용|콜레스테롤|고지혈|지방간)/.test(t)) {
    add('answer', `${PRODUCT_NAME}은 1포 ${PRODUCT_POUCH_VOLUME_ML}mL 기준 열량이 ${PRODUCT_CALORIES_KCAL}kcal입니다.`, /kcal/);
    add('caution', '체중이나 컨디션 변화는 식사량/활동량 등과 함께 개인차가 있을 수 있습니다.');
    add('consult', '콜레스테롤 관련 약을 복용 중이시라면 담당 의사 선생님과 상의 후 섭취 여부를 결정해 주세요.', CONSULT_REGEX);
  }

  // 9) 회복기(수술/암 등)
  if (isSurgery) {
    add('answer', '수술 후 회복기에는 치료 계획과 식이 제한이 함께 중요해 개별 확인이 필요합니다.');
    add('consult', '원재료표와 현재 복용 중인 약 정보를 함께 확인하신 뒤 주치의 선생님과 상의 후 결정해 주세요.', CONSULT_REGEX);
    add('guide', `가능하다는 안내를 받으신 경우에는 식후 반 포(약 ${PRODUCT_POUCH_HALF_RANGE_ML})로 2~3일 반응을 확인한 뒤 1포로 조절해 보셔도 괜찮습니다.`);
  }

  // 10) 위/장 예민
  if (/(위가|위장|속이|쓰리|소화|장이|장\s*이|장트러블|장\s*트러블)/.test(t)) {
    add('guide', '위가 예민하거나 소화가 약하신 경우에는 공복보다는 식후 섭취가 더 편안할 수 있습니다.');
    add('guide', `처음에는 반 포(약 ${PRODUCT_POUCH_HALF_RANGE_ML})처럼 소량으로 시작해 2~3일 반응을 확인한 뒤 조절해 주세요.`);
  }

  // 11) 기본 권장량
  if (/(하루|권장|몇\\s*포|몇포|섭취량|1포|2포)/.test(t)) {
    if (isKids) {
      // 어린이 섭취는 상단 민감군(어린이) 블록에서 구체적으로 안내합니다.
    } else if (!isElderly && !isPregnancy && !isMedsContext && !hasGiContext) {
      add(
        'answer',
        `${PRODUCT_NAME}은 1포 ${PRODUCT_POUCH_VOLUME_ML}mL 기준이며, 대상에 따라 아래처럼 안내드립니다.`,
        /(대상에 따라|아래처럼 안내)/,
      );
      add('guide', `- 성인: 기본은 하루 1포이며, 컨디션에 따라 오전 1포 + 오후 1포로 하루 2포까지 조절하실 수 있습니다.`);
      add('guide', `- 위가 예민하거나 장이 약한 경우: 식후로 시작하시거나, 처음 2~3일은 반 포(약 ${PRODUCT_POUCH_HALF_RANGE_ML})로 반응을 확인해 주세요.`);
      add(
        'guide',
        '- 어린이: 처음에는 소량부터 시작해 주세요. 알레르기 체질이거나 약을 복용 중인 경우에는 소아과 담당 의사 선생님과 상의 후 결정해 주세요.',
        CONSULT_REGEX,
      );
    } else {
      add('answer', `${PRODUCT_NAME}은 1포 ${PRODUCT_POUCH_VOLUME_ML}mL 기준이며, 기본은 하루 1포입니다.`, /(하루 1포|기본은 하루 1포)/);
      if (!hasGiContext && !isPregnancy && !isMedsContext && !isElderly) {
        add('guide', '컨디션에 따라 오전/오후로 나누어 하루 2포까지 조절하실 수 있습니다.');
      }
    }
  }

  // 12) 섭취 시간
  if (/(식전|식후|공복|아침|저녁|언제|먹는\\s*시간|먹는시간|시간)/.test(t)) {
    add('answer', '섭취 시간은 식전/식후 모두 가능하며, 고객님 컨디션에 맞춰 선택하실 수 있습니다.');
    add('guide', '아침 공복에 드시면 루틴을 잡기 편하다는 분들이 많습니다.');
    add('guide', '다만 위가 예민하신 경우에는 식후로 선택해 주셔도 괜찮습니다.');
  }

  // 13) 기간/휴지기
  if (/(기간|개월|휴지기|쉬|중단|재복용|재섭취|꾸준히)/.test(t)) {
    add('answer', '일반적으로는 하루 1포 기준으로 꾸준히 드시면서 컨디션을 확인해 보시는 분들이 많습니다.');
    add('guide', '2~3개월 단위로 컨디션을 점검해 보시고, 필요하실 때는 1~2주 정도 쉬었다가 다시 시작하는 방식으로도 조절하실 수 있습니다.');
  }

  // 14) 가족 함께
  if (/(남편|부부|가족|부모님|아내|부인)/.test(t) && !isKids && !isMedsContext) {
    add('answer', '가족이 함께 드시는 것도 가능합니다.');
    add('guide', `성인 기준으로는 하루 1포(1포 ${PRODUCT_POUCH_VOLUME_ML}mL)부터 시작해 보시고, 컨디션에 따라 조절해 주세요.`);
    add('caution', '체격보다는 컨디션과 소화 상태에 따라 체감이 달라질 수 있습니다.');
  }

  // 15) 데워 먹는 법
  if (/(데워|중탕|전자레인지|복용법|먹는\\s*방법|방법|뜯)/.test(t)) {
    add('guide', '뜯어서 바로 드셔도 되고, 따뜻하게 드시려면 파우치를 중탕하시거나 컵에 옮겨 데워 드셔도 됩니다.');
    add('guide', '전자레인지를 사용하실 경우에는 파우치를 그대로 넣기보다는 컵에 옮겨 데워 주세요.');
  }

  if (getAllLines().length === 0) {
    add('answer', `${PRODUCT_NAME}은 1포 ${PRODUCT_POUCH_VOLUME_ML}mL 기준이며, 기본은 하루 1포입니다.`);
    add('guide', '컨디션에 따라 섭취 시간과 양은 유연하게 조절하실 수 있습니다.');
    add('caution', '개인의 상태에 따라 체감 차이가 있을 수 있습니다.');
    add('consult', '약 복용이나 질환 관리, 임신/수유, 어린이/고령자에 해당하시는 경우에는 담당 의사 선생님과 상의 후 결정해 주세요.', CONSULT_REGEX);
  }

  const lines: string[] = [];
  lines.push(...sections.answer);
  if (sections.guide.length > 0) {
    lines.push('');
    lines.push(...sections.guide);
  }
  if (sections.caution.length > 0 || sections.consult.length > 0) {
    lines.push('');
    lines.push(...sections.caution);
    lines.push(...sections.consult);
  }

  return lines;
};

const OPS_CLOSING_VARIANTS = [
  '추가로 궁금하신 점이 있으시면 언제든 편하게 문의해 주세요.',
  '필요하시면 고객센터로 연락 주시면 빠르게 확인해 도와드리겠습니다.',
  '추가 확인이 필요하시면 고객센터로 문의해 주시면 빠르게 도와드리겠습니다.',
];

export const getReplyForQuestion = (title: string): string => {
  const replyType = getReplyTypeForQuestion(title);

  if (replyType === 'A') {
    const opsLines = buildOpsLines(title);
    if (Math.random() <= 0.7) {
      opsLines.push(pickRandom('opsClosing', OPS_CLOSING_VARIANTS));
    }
    return formatReply(opsLines);
  }

  const lines = replyType === 'C' ? buildIntakeHealthLines(title) : buildProductInfoLines(title);
  lines.push('');
  lines.push(pickRandom('brandClosing', BRAND_CLOSING_VARIANTS));
  return formatReply(lines);
};
