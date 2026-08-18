import fs from "fs";
import path from "path";

const ACCOUNTS_FILE = path.resolve(process.cwd(), "accounts/completed-accounts.json");
const TARGET_COUNT = 300;

interface QnaItem {
  title: string;
  content: string;
  type: string;
}

interface QnaPool {
  weight: number;
  questions: QnaItem[];
}

const QNA_POOLS: Record<string, QnaPool> = {
  dosage: {
    weight: 25,
    questions: [
      { title: "하루에 몇 포 먹으면 되나요?", content: "흑염소 진액 주문했는데 하루에 몇 포씩 드시면 되는건가요? 아침저녁으로 드시면 되나요?", type: "dosage" },
      { title: "아침에 먹나요 저녁에 먹나요?", content: "흑염소 진액 언제 먹으면 가장 좋은가요? 공복에 먹어도 되는지 궁금합니다.", type: "dosage" },
      { title: "식전 식후 언제 먹으면 좋은가요", content: "흑염소 진액을 식전에 먹는게 좋은지 식후에 먹는게 좋은지 알려주세요~", type: "dosage" },
      { title: "물에 타서 먹어도 되나요?", content: "진액이 좀 진할것 같은데 물이나 따뜻한 물에 타서 먹어도 괜찮은가요?", type: "dosage" },
      { title: "하루 권장 섭취량이 궁금합니다", content: "하루에 몇 포 드시는게 적당한가요? 많이 먹으면 안 좋을까요?\n\n어머니가 기력이 많이 떨어지셨는데 하루에 2포 이상 드셔도 되는지 궁금합니다.", type: "dosage" },
      { title: "남편이랑 같이 먹으려는데요", content: "남편이랑 같이 먹으려고 하는데 하루에 몇 포씩 먹으면 되나요?\n\n남편은 체격이 큰 편이라 일반 권장량보다 더 먹어도 되는지 궁금합니다.", type: "dosage" },
      { title: "어르신 복용량이 따로 있나요?", content: "70대 어머니 드시게 하려는데 젊은 사람이랑 복용량이 같은건가요?\n\n어르신은 소화가 좀 약하셔서 한번에 한 포 다 드시기 부담스러울수 있을것 같아서요.", type: "dosage" },
      { title: "먹는 시간이 정해져 있나요?", content: "아침에 먹어야 좋다는 분도 있고 자기 전에 먹으면 좋다는 분도 있던데 정해진 시간이 있는건가요?", type: "dosage" },
      { title: "꾸준히 먹어야 효과가 있나요?", content: "흑염소 진액이 바로 효과가 있는 건지 아니면 꾸준히 먹어야 하는 건지 궁금해요.\n\n보통 어느 정도 기간 드시면 좋은가요?", type: "dosage" },
      { title: "복용법 좀 알려주세요", content: "처음 먹어보는데 복용법이 궁금합니다. 그냥 뜯어서 바로 드시면 되는건가요?\n\n따뜻하게 데워서 먹어도 되나요?", type: "dosage" },
    ],
  },

  eligibility: {
    weight: 20,
    questions: [
      { title: "임산부도 먹어도 되나요?", content: "임신 초기인데 흑염소 진액 먹어도 괜찮을까요? 성분 중에 임산부한테 안 좋은게 있는지 궁금합니다.", type: "eligibility" },
      { title: "수유 중인데 먹어도 되나요?", content: "출산하고 수유 중인데 기력이 너무 없어서요.. 수유 중에 흑염소 진액 먹어도 아기한테 괜찮은가요?", type: "eligibility" },
      { title: "아이도 먹을 수 있나요?", content: "초등학생 아이인데 체력이 좀 약한 편이에요. 아이도 먹여도 되는 건가요? 몇 살부터 먹일 수 있는지 궁금합니다.", type: "eligibility" },
      { title: "혈압약 먹고 있는데 괜찮나요?", content: "고혈압 약을 복용 중인데 흑염소 진액이랑 같이 먹어도 되는건지 궁금합니다.", type: "eligibility" },
      { title: "당뇨 환자도 드실 수 있나요?", content: "어머니가 당뇨가 있으신데 흑염소 진액에 당 성분이 들어있는지 궁금합니다.\n\n당뇨 환자분들도 드셔도 되나요?", type: "eligibility" },
      { title: "갑상선 약 복용 중입니다", content: "갑상선 약을 먹고 있는데 흑염소 진액이랑 같이 먹어도 괜찮을까요?\n\n건강식품이라 약이랑 상호작용이 있을까봐 걱정이에요.", type: "eligibility" },
      { title: "알레르기 성분이 있나요?", content: "식품 알레르기가 좀 있는 편인데 흑염소 진액에 알레르기 유발 성분이 포함되어 있는지 궁금합니다.", type: "eligibility" },
      { title: "임신 준비 중인데 먹어도 될까요?", content: "임신 준비하면서 몸 관리 중인데 흑염소 진액 먹어도 괜찮은가요?\n\n몸이 차서 따뜻하게 해주는 건강식품 찾고 있어요.", type: "eligibility" },
      { title: "위가 안 좋은데 먹어도 되나요?", content: "위가 좀 약한 편인데 흑염소 진액이 위에 부담이 되지는 않을까요?\n\n공복에 먹으면 속이 쓰릴까봐 걱정이에요.", type: "eligibility" },
      { title: "80대 노인도 드셔도 되나요", content: "시아버지가 80대이신데 기력이 많이 떨어지셨거든요..\n\n연세가 많으셔도 흑염소 진액 드셔도 괜찮은건지 궁금합니다.", type: "eligibility" },
    ],
  },

  storage: {
    weight: 12,
    questions: [
      { title: "냉장보관 해야하나요?", content: "흑염소 진액 받으면 냉장보관 해야하는건가요 상온보관 해도 되는건가요?", type: "storage" },
      { title: "유통기한이 어떻게 되나요?", content: "유통기한이 얼마나 되는지 궁금합니다. 부모님 드릴건데 여유있게 드실 수 있을지요.", type: "storage" },
      { title: "개봉 후 보관은 어떻게 하나요", content: "뜯고 남은건 어떻게 보관하면 되나요? 한 포를 한번에 다 못 드시면 냉장보관 해야하나요?", type: "storage" },
      { title: "여름에도 상온보관 되나요?", content: "여름에 상온보관하면 변질되거나 하지 않나요? 냉장고에 넣어야 하는지 궁금합니다.", type: "storage" },
      { title: "보관법이 궁금합니다", content: "직사광선 피해서 보관하면 되는건가요?\n\n냉장보관이 좋은지 상온보관이 좋은지 알려주세요.", type: "storage" },
      { title: "유통기한 넉넉한가요?", content: "선물용으로 몇 박스 주문하려는데 유통기한이 넉넉한가요?\n\n한두달 뒤에 드릴건데 괜찮을지 궁금합니다.", type: "storage" },
    ],
  },

  effect: {
    weight: 15,
    questions: [
      { title: "수족냉증에 효과가 있나요?", content: "손발이 항상 차가운데 흑염소 진액이 수족냉증에 도움이 되나요?", type: "effect" },
      { title: "비린맛이 심한가요?", content: "흑염소라서 비린맛이 날까봐 걱정인데 실제로 먹을만 한가요?\n\n냄새가 심하면 먹기 힘들것 같아서요.", type: "effect" },
      { title: "소음인한테 좋은가요?", content: "한의원에서 소음인이라고 했는데 소음인 체질한테 흑염소 진액이 맞는건가요?", type: "effect" },
      { title: "다른 흑염소 진액이랑 뭐가 다른가요?", content: "시중에 흑염소 진액이 많은데 한려담원 제품만의 특별한 점이 있나요?\n\n성분이나 제조 방법에 차이가 있는지 궁금합니다.", type: "effect" },
      { title: "만성피로에 도움이 되나요?", content: "만성피로로 고생하고 있는데 흑염소 진액이 기력 회복에 도움이 되는지 궁금합니다.\n\n주변에서 흑염소가 좋다고는 하는데 실제로 효과가 있는건지요.", type: "effect" },
      { title: "흑염소 진액 맛이 어떤가요?", content: "흑염소라서 맛이 좀 그럴것 같은데 실제로 어떤 맛인가요?\n\n어르신들도 거부감 없이 드실 수 있을까요?", type: "effect" },
      { title: "국내산 원료 맞나요?", content: "흑염소 원료가 국내산인지 궁금합니다. 어디서 키운 흑염소인가요?", type: "effect" },
      { title: "관절에도 좋은가요?", content: "어머니가 관절이 안 좋으신데 흑염소 진액이 관절에도 도움이 되나요?\n\n기력 보충도 되면서 관절에도 좋으면 좋겠는데요.", type: "effect" },
      { title: "냉증이 심한 편인데요", content: "몸이 전체적으로 차가운 편이라 겨울에 특히 힘들어요.\n\n흑염소 진액이 몸을 따뜻하게 해준다고 하던데 실제로 그런 효과가 있나요?", type: "effect" },
    ],
  },

  delivery: {
    weight: 15,
    questions: [
      { title: "주문하면 배송 얼마나 걸리나요?", content: "주문하면 배송까지 보통 며칠 걸리나요?", type: "delivery" },
      { title: "택배사가 어디인가요?", content: "배송 택배사가 어디인지 궁금합니다. CJ대한통운인가요?", type: "delivery" },
      { title: "제주도 배송 가능한가요?", content: "제주도인데 배송 가능한가요? 추가 배송비가 있는지도 궁금합니다.", type: "delivery" },
      { title: "배송비가 어떻게 되나요?", content: "배송비가 무료인가요? 몇 박스 이상 주문해야 무료배송인지 궁금합니다.", type: "delivery" },
      { title: "주말에도 배송 되나요?", content: "금요일에 주문하면 주말에도 발송이 되는건가요?\n\n아니면 월요일에 발송되는건지 궁금합니다.", type: "delivery" },
      { title: "묶음 배송 가능한가요?", content: "여러 개 주문하려는데 묶음 배송 되나요? 따로따로 오는건 아닌지 궁금합니다.", type: "delivery" },
      { title: "다른 주소로 보내기 가능한가요?", content: "부모님께 직접 보내드리고 싶은데 주문자 주소랑 다른 주소로 배송 가능한가요?", type: "delivery" },
      { title: "송장번호 언제 나오나요?", content: "주문했는데 송장번호가 아직 안 나왔어요. 보통 주문 후 며칠 뒤에 송장번호 나오나요?", type: "delivery" },
    ],
  },

  gift: {
    weight: 13,
    questions: [
      { title: "선물 포장 되나요?", content: "부모님 선물로 보내드리려는데 선물 포장이 가능한가요?", type: "gift" },
      { title: "쇼핑백 같이 보내주시나요?", content: "선물용으로 주문하려는데 쇼핑백이 같이 오는지 궁금합니다.", type: "gift" },
      { title: "설명절 선물로 보내려는데요", content: "곧 설이라 부모님께 선물로 보내드리려는데 선물 패키지도 가능한가요?", type: "gift" },
      { title: "포장이 어떻게 오나요?", content: "선물용으로 주문하려는데 포장 상태가 어떤지 궁금합니다.\n\n박스가 깔끔하게 오는지 아니면 따로 포장을 해야하는지요.", type: "gift" },
      { title: "감사카드 넣어주실 수 있나요?", content: "시부모님께 보내드리려는데 감사 메시지 카드 같은거 넣어주실 수 있나요?", type: "gift" },
      { title: "대량 주문 가능한가요?", content: "직원들 건강 선물로 10박스 정도 주문하려는데 대량 주문 시 할인이 있나요?", type: "gift" },
      { title: "답례품으로 주문하려고요", content: "결혼식 답례품으로 흑염소 진액 주문하려고 하는데 대량 주문이 가능한가요?\n\n포장도 깔끔하게 해주시는지 궁금합니다.", type: "gift" },
    ],
  },
} as any;

// ============================================================
// QNA 생성 로직
// ============================================================

const shuffle = <T>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const generate = () => {
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));

  const eligible = accounts.filter((a: any) => a.purchaseCount > 0 && !a.qnaCount);
  if (eligible.length === 0) {
    console.log("구매 완료된 계정이 없습니다.");
    return;
  }

  const targets = eligible.slice(0, TARGET_COUNT);
  const totalWeight = Object.values(QNA_POOLS).reduce((sum, p) => sum + p.weight, 0);

  const typeSlots: string[] = [];
  for (const [type, pool] of Object.entries(QNA_POOLS)) {
    const count = Math.round((pool.weight / totalWeight) * targets.length);
    for (let i = 0; i < count; i++) {
      typeSlots.push(type);
    }
  }

  while (typeSlots.length < targets.length) typeSlots.push("dosage");
  while (typeSlots.length > targets.length) typeSlots.pop();

  // 타입별 QNA 목록 생성 (셔플된 질문 순환)
  const typeQueues: Record<string, QnaItem[]> = {};
  for (const [type, pool] of Object.entries(QNA_POOLS)) {
    const count = Math.round((pool.weight / totalWeight) * targets.length);
    const items: QnaItem[] = [];
    const shuffledQuestions = shuffle(pool.questions);
    for (let i = 0; i < count; i++) {
      items.push(shuffledQuestions[i % shuffledQuestions.length]);
    }
    typeQueues[type] = shuffle(items);
  }

  // 인터리빙: 직전 타입과 다른 타입 중 랜덤 선택
  const typeNames = Object.keys(typeQueues);
  const interleaved: QnaItem[] = [];
  let lastType = "";

  while (interleaved.length < targets.length) {
    const candidates = typeNames.filter((t) => t !== lastType && typeQueues[t].length > 0);

    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      interleaved.push(typeQueues[pick].shift()!);
      lastType = pick;
    } else {
      const remaining = typeNames.filter((t) => typeQueues[t].length > 0);
      if (remaining.length === 0) break;
      interleaved.push(typeQueues[remaining[0]].shift()!);
      lastType = remaining[0];
    }
  }

  // 할당
  for (let i = 0; i < targets.length; i++) {
    const qna = interleaved[i];
    targets[i].qna = {
      title: qna.title,
      content: qna.content,
      type: qna.type,
    };
  }

  // accounts 배열에 반영
  for (const target of targets) {
    const idx = accounts.findIndex((a: any) => a.id === target.id);
    if (idx !== -1) {
      accounts[idx].qna = target.qna;
    }
  }

  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf-8");

  // 리포트
  const typeCounts: Record<string, number> = {};
  for (const t of targets) {
    typeCounts[t.qna.type] = (typeCounts[t.qna.type] || 0) + 1;
  }

  console.log("=== QNA 생성 완료 ===");
  console.log(`총 ${targets.length}개 계정에 QNA 할당\n`);
  console.log("타입별 분포:");
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}개 (${Math.round((count / targets.length) * 100)}%)`);
  }

  console.log("\n--- 샘플 (처음 5개) ---");
  for (let i = 0; i < 5; i++) {
    const acc = targets[i];
    console.log(`  [${i + 1}] ${acc.name} (${acc.id}) - [${acc.qna.type}]`);
    console.log(`       제목: ${acc.qna.title}`);
    console.log(`       본문: ${acc.qna.content.substring(0, 60)}...`);
  }
};

generate();
