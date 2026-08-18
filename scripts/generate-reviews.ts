import fs from "fs";
import path from "path";

const ACCOUNTS_FILE = path.resolve(process.cwd(), "accounts/completed-accounts.json");

interface Review {
  title: string;
  content: string;
  type: string;
}

interface ReviewPool {
  weight: number;
  reviews: Review[];
}

const randomPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// ============================================================
// 리뷰 풀 정의 (review-types.md 가이드 기반)
// ============================================================

const POOLS: Record<string, ReviewPool> = {
  youtube: {
    weight: 20,
    reviews: [
      // 짧음
      { title: "유튜브 보고 주문합니다", content: "유튜브 구독하고 보다가 흑염소 진액도 판매하시길래 주문해봤어요.", type: "youtube" },
      { title: "쇼츠에서 알게 됐네요", content: "유튜브 쇼츠에서 건강 정보 보다가 흑염소 진액 주문해봤어요. 기대됩니다.", type: "youtube" },
      { title: "건강 영상 보다가 구매!", content: "유튜브에서 건강 영상 찾아보다가 여기 알게 돼서 주문했어요.", type: "youtube" },
      { title: "유튜브에서 보고 왔습니다", content: "유튜브 추천 영상에서 건강 정보 보다가 알게 됐어요. 주문해봤습니다.", type: "youtube" },
      // 중간
      { title: "유튜브 쇼츠 보다가 구독하게 됐어요", content: "유튜브 쇼츠에서 건강 정보 보다가 한려담원 채널 알게 됐는데 올려주시는 정보가 유익해서 구독하고 챙겨보고 있었어요.\n\n흑염소 진액도 직접 판매하시는걸 알고 믿고 주문했습니다.", type: "youtube" },
      { title: "유튜브에서 건강 정보 보다가요", content: "건강 관련 영상 찾아보다 유튜브에서 한려담원 알게 됐어요. 영상이 유익해서 구독하다가 흑염소 진액도 판매하시길래 성분 보고 주문했습니다.", type: "youtube" },
      { title: "구독자인데 주문합니다~", content: "한려담원 유튜브에서 올려주시는 건강 정보가 유익해서 꾸준히 보고 있었는데요.\n\n흑염소 진액도 판매하시는걸 알게 돼서 주문해봤어요.", type: "youtube" },
      { title: "유튜브 추천에 떴길래", content: "유튜브 추천에 건강 영상 떠서 보기 시작했는데 유익하더라구요. 채널 둘러보다가 흑염소 진액도 직접 판매하시길래 주문했어요.", type: "youtube" },
      // 긴
      { title: "유튜브 구독자 주문이요!", content: "한려담원 유튜브에서 올려주시는 건강 정보 영상을 평소에 잘 보고 있었는데 유익한 내용이 많아서 신뢰가 갔습니다.\n\n흑염소 진액도 직접 판매하시는걸 알게 돼서 성분 확인해보고 바로 주문했어요.\n\n앞으로도 좋은 건강정보 많이 올려주세요!", type: "youtube" },
      { title: "건강 영상 보고 신뢰가 생겼습니다", content: "유튜브에서 건강 관련 영상 찾아보다가 한려담원 채널을 발견했어요.\n\n올려주시는 내용이 전문적이고 유익해서 꾸준히 챙겨보게 됐는데 흑염소 진액도 직접 만들어서 판매하신다고 해서 바로 주문했습니다.\n\n국내산 원료에 성분도 깔끔해보여서 기대하고 있어요.", type: "youtube" },
      { title: "유튜브 보고 믿고 주문합니다", content: "평소에 유튜브에서 건강 정보 자주 찾아보는 편인데 한려담원 채널을 알게 되고 구독해서 보고 있었어요. 건강 정보가 진짜 유익하고 신뢰가 가더라구요.\n\n흑염소 진액도 판매하시는걸 알게 돼서 성분 확인하고 주문했습니다.", type: "youtube" },
      // 할머니 선물
      { title: "할머니 선물로 주문!", content: "유튜브에서 건강 정보 영상 보다가 흑염소 진액도 판매하시는걸 알게 됐어요.\n\n할머니가 요즘 기력이 많이 떨어지셨다고 하셔서 선물해드리려고 주문했습니다.\n\n국내산이고 성분도 깔끔해서 어르신 드시기 좋을것 같아요.", type: "youtube" },
      // 임신 준비
      { title: "임신 준비하면서 알게 된 제품", content: "임신 준비하면서 몸 관리에 신경쓰고 있는데 유튜브에서 건강 정보 찾아보다가 한려담원 채널을 알게 됐어요.\n\n수족냉증이 있어서 관련 영상 보다가 흑염소 진액도 판매하시길래 성분 확인하고 주문했습니다.\n\n몸 따뜻하게 관리하면서 기대하고 있어요.", type: "youtube" },
      { title: "유튜브 건강 채널에서 봤습니다", content: "평소에 건강 관리에 관심이 많아서 유튜브 건강 채널 여러 개 구독하고 있는데 한려담원도 그 중 하나예요.\n\n정보가 유익해서 신뢰가 갔고 흑염소 진액도 판매하신다 해서 주문해봤습니다.", type: "youtube" },
      // 긴+ (제품 정보 포함)
      { title: "소음인 영상 보다가 여기까지 왔어요", content: "평소에 소음인 체질이라 몸이 차고 쉽게 피로해지는 편이에요. 유튜브에서 소음인 관련 건강 영상 찾아보다가 한려담원 채널을 알게 됐는데 올려주시는 정보가 진짜 유익하더라구요.\n\n구독하고 꾸준히 보다가 흑염소 진액도 직접 판매하시는걸 알게 됐어요. 상세 페이지 보니까 흑염소에 6년근 홍삼까지 같이 들어가있고 국내산 자연방목 흑염소라고 해서 성분이 마음에 들었어요.\n\n다른 데도 찾아봤는데 여기가 원료 구성이 제일 깔끔해보여서 주문했습니다. 꾸준히 먹어볼 생각이에요.", type: "youtube" },
      { title: "영상 보고 성분 비교까지 해봤어요", content: "유튜브에서 한려담원 건강 영상 보면서 신뢰가 쌓였는데 흑염소 진액도 판매하신다 해서 관심이 생겼어요.\n\n근데 흑염소 진액이 워낙 종류가 많아서 다른 제품들이랑 성분 비교를 해봤거든요. 보니까 한려담원은 실제 원물이 11% 들어가있고 흑염소에 홍삼 영지버섯 동충하초까지 같이 배합되어 있더라구요.\n\n다른 데는 추출물 위주인데 여기는 원물 비율이 확실해서 마음에 들었어요. HACCP 인증까지 있길래 믿고 주문했습니다.", type: "youtube" },
      { title: "유튜브 보다가 부모님 선물로 주문합니다", content: "한려담원 유튜브에서 건강 정보 꾸준히 챙겨보고 있었는데 올려주시는 영상이 유익해서 부모님한테도 추천해드리고 있었거든요.\n\n부모님이 두 분 다 연세가 있으셔서 기력 관리가 걱정인데 흑염소 진액도 판매하신다 해서 바로 알아봤어요. 국내산 자연방목 흑염소에 6년근 홍삼까지 들어있고 HACCP 인증 시설에서 만든다고 해서 안심이 됐어요.\n\n누린내 제거 공정이 있다길래 어르신들도 부담없이 드실 수 있을것 같아서 주문했습니다. 부모님 좋아하셨으면 좋겠네요~", type: "youtube" },
    ],
  },

  instagram: {
    weight: 15,
    reviews: [
      // 짧음
      { title: "인스타 보고 구매합니다", content: "인스타에서 유익한 건강 정보 많더라구요. 흑염소 진액도 판매하신다 해서 주문해봤어요.", type: "instagram" },
      { title: "인스타 릴스에서 봤습니다", content: "인스타 릴스에서 건강 정보 보다가 알게 됐어요. 주문해봤습니다.", type: "instagram" },
      { title: "인스타 피드에서 발견!", content: "인스타 피드에서 건강 관련 게시물 보고 여기 알게 돼서 흑염소 진액 주문했어요.", type: "instagram" },
      // 중간
      { title: "인스타 릴스 보다가 구매하게 됐네요", content: "원래 손발이 차고 기력이 없어서 인스타에서 관련 정보 찾아보다가 한려담원을 알게 됐어요.\n\n수족냉증 관련해서 전문적으로 다루시는 채널인것 같아서 보고 있었는데 이번에 흑염소 진액 판매하신다고 해서 바로 주문했습니다.", type: "instagram" },
      { title: "인스타 팔로워입니다~", content: "한려담원 인스타에 유익한 정보 많더라구요. 팔로우하고 꾸준히 보다가 흑염소 진액도 판매하시는걸 알고 주문했어요. 성분도 깔끔해보여서 기대됩니다.", type: "instagram" },
      { title: "수족냉증 검색하다 발견한 계정", content: "손발이 항상 차서 인스타에서 수족냉증 관련 정보 찾아보다가 한려담원을 알게 됐어요.\n\n전문적으로 다루시는 채널 같아서 팔로우했는데 흑염소 진액도 판매하시길래 주문해봤습니다.", type: "instagram" },
      // 긴
      { title: "수족냉증 때문에 찾다가 알게 된 곳", content: "평소에 손발이 차고 기력이 많이 없어서 인스타에서 관련 건강 정보 계속 찾아보고 있었어요.\n\n한려담원이 수족냉증이나 기력 관련 정보를 전문적으로 다루시길래 팔로우하고 꾸준히 보고 있었는데 흑염소 진액을 직접 판매하시는걸 알게 돼서 바로 주문했어요.\n\n믿고 먹어볼 수 있을것 같아서 기대됩니다~", type: "instagram" },
      { title: "인스타 건강 정보 보고 주문합니다", content: "인스타에서 건강 관련 정보 찾아보다가 한려담원 채널을 알게 됐는데 올려주시는 정보가 진짜 유익해서 계속 챙겨보고 있었거든요.\n\n흑염소 진액도 직접 판매하시는걸 알게 돼서 성분 확인하고 주문했습니다.\n\n꾸준히 먹어볼 생각이에요.", type: "instagram" },
      { title: "건강 계정 팔로우하다 구매까지", content: "평소에 기력이 부족하고 손발이 차서 건강 관련 계정 여러 개 팔로우하고 있는데 한려담원도 그 중 하나예요.\n\n수족냉증 관련 정보가 전문적이어서 신뢰가 갔고 흑염소 진액도 판매하신다 해서 주문해봤어요.", type: "instagram" },
      // 긴+ (제품 정보 포함)
      { title: "수족냉증 때문에 성분까지 비교해봤어요", content: "수족냉증으로 겨울마다 진짜 고생하고 있어서 인스타에서 관련 정보 계속 찾아보고 있었어요. 한려담원이 수족냉증이나 기력 관련 정보를 전문적으로 다루시길래 팔로우하고 꾸준히 보고 있었거든요.\n\n흑염소 진액을 직접 판매하시는걸 알게 돼서 상세 페이지를 꼼꼼히 봤는데 국내산 자연방목 흑염소에 홍삼 영지버섯 동충하초까지 같이 들어있더라구요. 원물 비율도 확실하게 적혀있어서 신뢰가 갔어요.\n\n다른 제품들이랑 비교해봤는데 성분 구성이 여기가 제일 마음에 들어서 주문했습니다. 이번 겨울은 좀 나아졌으면 좋겠어요.", type: "instagram" },
      { title: "소음인 정보 찾다가 꼼꼼히 알아보고 주문", content: "한의원에서 소음인이라고 들었는데 소음인한테 좋은 건강식품 찾아보다가 인스타에서 한려담원을 알게 됐어요. 소음인 체질에 대한 정보가 전문적이어서 신뢰가 갔거든요.\n\n흑염소 진액 상세 페이지를 보니까 소음인 체질에 맞는 원료들이 들어있고 흑염소에 홍삼까지 조합해서 만든다고 하더라구요. 국내산 원료에 HACCP 인증까지 있어서 안심이 됐어요.\n\n몸이 차고 기력이 없는 체질인데 꾸준히 먹어보면서 관리해보려구요.", type: "instagram" },
    ],
  },

  blog: {
    weight: 10,
    reviews: [
      // 짧음
      { title: "수족냉증 검색하다 발견!", content: "수족냉증 때문에 검색하다가 한려담원 블로그 보고 흑염소 진액 주문해봤어요.", type: "blog" },
      { title: "블로그 글 읽고 구매합니다", content: "기력부족 검색하다가 블로그에서 알게 돼서 흑염소 진액 주문했어요.", type: "blog" },
      { title: "네이버 검색하다 알게 된 곳", content: "건강 관련 검색하다가 여기 블로그 글 읽고 주문해봤습니다.", type: "blog" },
      // 중간
      { title: "소음인 건강관리 찾다가 구매", content: "평생을 소음인으로 살아왔는데 소음인한테 좋은 건강식품 찾아보다가 한려담원 블로그를 알게 됐어요.\n\n소음인을 위한 흑염소 진액이라고 해서 성분 확인하고 바로 주문했습니다.", type: "blog" },
      { title: "수족냉증 관련 글 보고 주문합니다", content: "수족냉증 때문에 네이버에서 검색하다가 한려담원 블로그를 알게 됐어요. 관련 정보가 잘 정리되어 있어서 신뢰가 갔고 흑염소 진액 주문해봤습니다.", type: "blog" },
      { title: "허약체질 검색하다 여기까지", content: "어릴때부터 허약한 편이라 관련 정보 찾아보다가 블로그에서 한려담원을 알게 됐어요.\n\n흑염소 진액이 기력 보충에 좋다고 해서 주문했습니다.", type: "blog" },
      // 긴
      { title: "기력부족 관련 글 보고 직접 주문!", content: "원래 체력이 약한 편이라 기력부족 관련 정보를 자주 찾아보는데 네이버에서 한려담원 블로그를 알게 됐어요.\n\n건강 정보가 꼼꼼하게 올라와있고 수족냉증이나 허약체질 관련 글들이 제 상황이랑 딱 맞더라구요.\n\n흑염소 진액도 판매하시길래 믿고 주문해봤습니다.", type: "blog" },
      { title: "임신 준비하면서 검색하다 주문!", content: "임신 준비하면서 몸 관리에 신경쓰고 있는데 체질 개선 관련해서 네이버에서 찾아보다가 한려담원 블로그를 알게 됐어요.\n\n평소에 손발이 차고 기력이 부족한 편인데 관련 정보가 잘 정리되어 있어서 신뢰가 갔습니다.\n\n흑염소 진액이 몸 관리에 좋다고 해서 주문해봤어요.", type: "blog" },
      { title: "소음인 체질 관리 찾다 보니 여기까지", content: "한의원에서 소음인이라고 들었는데 소음인 체질에 좋은 건강식품 검색하다가 한려담원 블로그를 알게 됐어요.\n\n소음인 관련 글이 많고 정보가 유익해서 꾸준히 보고 있었는데 흑염소 진액도 판매하시길래 주문했습니다.\n\n성분도 깔끔하고 기대됩니다.", type: "blog" },
      // 긴+ (제품 정보 포함)
      { title: "블로그 보고 다른 제품이랑 비교까지 해봤어요", content: "기력이 부족해서 네이버에서 관련 정보 찾아보다가 한려담원 블로그를 알게 됐어요. 건강 정보가 꼼꼼하게 올라와있어서 신뢰가 갔는데 흑염소 진액도 판매하시더라구요.\n\n다른 흑염소 진액이랑 비교를 좀 해봤는데 한려담원은 추출물이 아니라 실제 원물이 들어가있고 홍삼 영지버섯 동충하초까지 같이 배합되어 있더라구요. 저온 추출로 만든다고 해서 성분이 제대로 살아있을것 같았어요.\n\n국내산 자연방목 흑염소라는 점도 마음에 들었고 HACCP 인증까지 있길래 믿고 주문했습니다.", type: "blog" },
      { title: "임신 준비하면서 꼼꼼하게 비교하고 주문!", content: "임신 준비하면서 몸 관리에 진심인데 네이버에서 체질 관련 글 찾아보다가 한려담원 블로그를 알게 됐어요. 원래 몸이 차고 소음인 체질이라 걱정이 많았거든요.\n\n흑염소 진액 여러 군데 비교해봤는데 한려담원은 국내산 자연방목 흑염소에 6년근 홍삼까지 같이 들어있어서 구성이 좋더라구요. 원물 비율도 확실하게 표기되어 있고 불필요한 첨가물 없이 깔끔해서 마음에 들었어요.\n\n체질 관리 목적으로 주문해봤습니다. 꾸준히 챙겨먹어볼 생각이에요.", type: "blog" },
    ],
  },

  ingredient: {
    weight: 5,
    reviews: [
      { title: "성분 보고 바로 구매!", content: "흑염소 진액 성분표 깔끔해서 주문해봤어요.", type: "ingredient" },
      { title: "성분표가 깔끔하네요", content: "여러 군데 비교해봤는데 여기 성분이 제일 깔끔하더라구요. 주문했습니다.", type: "ingredient" },
      { title: "성분 비교 후 여기로 결정", content: "흑염소 진액 여러 군데 비교해봤는데 여기가 원료 구성이 깔끔하더라구요.\n\n국내산에 불필요한 첨가물도 없어서 믿고 주문해봤습니다.", type: "ingredient" },
      { title: "원료 구성이 마음에 들어서 구매", content: "건강식품 고를 때 성분표를 꼼꼼히 보는 편인데 한려담원은 원료 구성이 깔끔해서 마음에 들었어요. 불필요한 첨가물 없이 국내산 원료라 믿고 주문했습니다.", type: "ingredient" },
      { title: "첨가물 없는 곳 찾다가 여기로", content: "다른 흑염소 진액이랑 비교해봤는데 여기가 불필요한 첨가물이 없어서 좋더라구요.\n\n국내산 원료에 성분표도 깔끔해서 주문했습니다.", type: "ingredient" },
      // 긴+ (제품 정보 포함)
      { title: "성분 비교하다가 여기가 구성이 제일 좋아서", content: "흑염소 진액 여러 군데 비교해봤는데 한려담원이 성분 구성이 제일 마음에 들었어요.\n\n국내산 자연방목 흑염소에 6년근 홍삼 영지버섯 동충하초까지 같이 배합되어 있더라구요. 다른 데는 추출물 위주인데 여기는 실제 원물이 들어가있어서 차이가 느껴졌어요.\n\n저온 추출로 성분 살려서 만든다고 하고 HACCP 인증까지 있으니까 안심이 됐습니다. 불필요한 첨가물도 없이 깔끔해서 주문했어요.", type: "ingredient" },
    ],
  },

  repurchase: {
    weight: 5,
    reviews: [
      { title: "추가 주문합니다", content: "괜찮아서 부모님 것도 추가로 주문합니다. 먹기도 편하고 비린맛도 없어서 부모님도 잘 드실것 같아요.", type: "repurchase" },
      { title: "괜찮아서 추가 주문이요", content: "먹어봤는데 흑염소 특유의 비린맛이 없어서 좋더라구요. 먹기 편해서 하나 더 주문했어요.", type: "repurchase" },
      { title: "주변에서 추천받아 먹다가 재주문이요", content: "주변에서 흑염소 진액 좋다고 추천해줘서 먹기 시작했는데 비린맛도 안나고 먹기 편하더라구요.\n\n이번에는 시댁에도 보내드리려고 다시 주문했어요.", type: "repurchase" },
      { title: "괜찮아서 다시 주문했습니다", content: "처음에 성분 보고 주문했었는데 포장도 깔끔하고 먹기 편해서 괜찮더라구요.\n\n비린맛 걱정했는데 전혀 안 느껴져서 좋았어요. 이번에는 남편 부모님께도 보내드리려고 추가 주문했습니다.", type: "repurchase" },
      { title: "가족한테도 보내려고 추가 주문", content: "저도 먹어보고 괜찮아서 친정어머니한테도 보내드리려고 추가 주문합니다. 가격대비 성분도 좋고 먹기도 편해서 꾸준히 먹을것 같아요.", type: "repurchase" },
      { title: "비린맛 없어서 먹기 편해요", content: "흑염소라서 비린맛 걱정했는데 전혀 안 느껴져서 좋아요. 먹기도 편하고 가격대비 성분도 괜찮아서 다시 주문합니다.", type: "repurchase" },
      { title: "지인한테도 추천했어요", content: "먹어보니까 비린맛도 없고 먹기 편해서 주변에도 추천하고 있어요.\n\n가격대비 성분이 좋아서 부담없이 챙겨먹기 딱 좋더라구요. 이번에 추가 주문합니다.", type: "repurchase" },
      // 어르신
      { title: "다시 주문했읍니다", content: "딸이 전에 주문해준거 먹어봤는데 비린맛도 없고 먹기 편했읍니다^^\n\n나이 들면 이런거라도 꾸준히 챙겨먹어야 한다고 하더라구요.. 이번에는 같이 산책하는 친구한테도 추천해주려고 하나 더 주문했읍니다~\n\n좋은 제품 만들어주셔서 감사합니다^^", type: "repurchase" },
      { title: "또 주문합니다", content: "전에 먹어봤는데 비린맛 없고 먹기 편해서 또 주문했읍니다.. 흑염소라서 냄새 걱정했는데 괜찮더라구요~ 꾸준히 챙겨먹으려구요^^ 감사합니다~", type: "repurchase" },
      // 긴+ (제품 정보 포함)
      { title: "성분 꼼꼼히 보고 골랐는데 괜찮아서 재주문", content: "처음에 흑염소 진액 여러 군데 비교해보다가 한려담원이 원물 비율 확실하고 홍삼까지 같이 들어있어서 골랐었거든요.\n\n먹어보니까 비린맛도 없고 먹기 편하더라구요. 누린내 제거 공정 있다고 했는데 확실히 깔끔해요. 국내산 자연방목 흑염소에 HACCP 인증까지 있으니까 믿고 먹을 수 있었어요.\n\n이번에는 시댁에도 보내드리려고 추가 주문합니다. 앞으로도 꾸준히 먹을것 같아요.", type: "repurchase" },
    ],
  },

  gift: {
    weight: 12,
    reviews: [
      // 짧음
      { title: "부모님 선물로 구매!", content: "부모님 건강 챙겨드리려고 흑염소 진액 주문했어요. 성분 좋아보여서 기대됩니다.", type: "gift" },
      { title: "시어머니 생신 선물입니다", content: "시어머니 생신 선물로 주문했습니다. 포장도 깔끔하고 좋네요.", type: "gift" },
      { title: "명절 선물 준비합니다", content: "명절 선물 준비하면서 흑염소 진액 주문했어요. 포장 깔끔해서 좋습니다.", type: "gift" },
      { title: "아버지 건강 선물로요", content: "아버지 건강 챙겨드리려고 주문했어요. 국내산이라 안심이에요.", type: "gift" },
      // 중간
      { title: "임신 준비하는 동생 선물!", content: "동생이 임신 준비 중인데 몸이 좀 차고 기력이 없는 편이라 흑염소 진액이 좋다고 해서 선물해주려고 주문했어요.\n\n국내산이라 안심이고 포장도 깔끔하네요.", type: "gift" },
      { title: "어머니 생신이라 구매합니다", content: "어머니 생신이라 건강식품 찾아보다가 흑염소 진액 주문했어요. 국내산이고 성분도 깔끔해서 어르신 드시기 좋을것 같아요.", type: "gift" },
      { title: "임신 준비하는 언니한테 선물이요", content: "언니가 임신 준비하면서 몸 관리에 신경쓰고 있는데 흑염소 진액이 좋다고 해서 선물해주려고 주문했어요.\n\n성분 깔끔하고 국내산이라 안심이에요.", type: "gift" },
      { title: "장인어른 건강 챙겨드리려구요", content: "장인어른이 요즘 기력이 떨어지셨다고 하셔서 건강식품 찾아보다가 흑염소 진액 주문했어요. 국내산에 성분도 괜찮아보여서 기대됩니다.", type: "gift" },
      // 긴
      { title: "할머니 선물로 구매합니다", content: "할머니가 요즘 기력이 많이 떨어지셨다고 하셔서 건강식품 찾아보다가 한려담원 흑염소 진액을 알게 됐어요.\n\n성분도 깔끔하고 국내산 원료라 어르신 드시기 좋을것 같아서 주문했습니다.\n\n좋아하셨으면 좋겠네요~", type: "gift" },
      { title: "부모님 건강 챙기려고 직접 주문!", content: "부모님이 두 분 다 나이가 있으시다보니 건강이 항상 걱정이에요.\n\n흑염소가 기력 보충에 좋다고 해서 한려담원 진액 주문했습니다. 국내산이고 성분 깔끔해서 안심이 되네요.\n\n부모님이 좋아하셨으면 좋겠어요.", type: "gift" },
      { title: "시부모님 선물 준비합니다", content: "시부모님이 연세가 있으시다보니 건강식품 자주 챙겨드리는 편인데 이번에 흑염소 진액 주문해봤어요.\n\n국내산 원료에 성분도 깔끔하고 포장도 선물용으로 좋네요.\n\n어르신들 기력 보충에 도움이 됐으면 좋겠습니다.", type: "gift" },
      { title: "동생 임신 준비 선물로 구매!", content: "동생이 임신 준비하면서 몸이 차고 기력이 없다고 해서 건강식품 찾아보다가 흑염소 진액이 좋다는 걸 알게 됐어요. 한려담원 제품이 국내산이고 성분도 깔끔해서 선물해주려고 주문했습니다.\n\n동생 몸 관리에 도움이 됐으면 좋겠어요.", type: "gift" },
      // 긴+ (제품 정보 포함)
      { title: "부모님 건강 챙기려고 이것저것 비교해보고 골랐어요", content: "부모님이 두 분 다 연세가 있으시다보니 건강이 항상 걱정이에요. 흑염소 진액이 기력 보충에 좋다고 해서 선물해드리려고 여러 제품을 비교해봤거든요.\n\n한려담원은 국내산 자연방목 흑염소에 6년근 홍삼 영지버섯 동충하초까지 같이 들어있어서 구성이 좋더라구요. 추출물이 아니라 실제 원물이 들어가있는 점도 마음에 들었어요.\n\nHACCP 인증 시설에서 만들고 누린내 제거 공정도 있다고 해서 어르신들도 부담없이 드실 수 있을것 같아요. 부모님 기력 관리에 도움이 됐으면 좋겠습니다.", type: "gift" },
      { title: "시부모님 선물로 꼼꼼하게 알아보고 주문!", content: "시부모님이 연세가 있으시다보니 기력이 많이 떨어지셨는데 흑염소 진액 선물해드리려고 여러 군데 비교해봤어요.\n\n한려담원은 성분 구성이 깔끔하더라구요. 국내산 자연방목 흑염소에 홍삼까지 같이 들어있고 원물 비율도 확실하게 표기되어 있어서 신뢰가 갔어요. 저온 추출에 누린내 제거 공정까지 있다고 해서 어르신들도 편하게 드실 수 있을것 같았어요.\n\n만약 안 맞으시면 환불도 가능하다고 해서 부담없이 주문했습니다. 어르신들 건강 챙기는 데 도움이 됐으면 좋겠네요.", type: "gift" },
    ],
  },

  family: {
    weight: 8,
    reviews: [
      // 짧음
      { title: "딸이 주문해줬읍니다", content: "딸이 흑염소 진액 좋다고 주문해줬읍니다^^ 먹어보니 비린맛도 없고 먹기 편하더라구요~ 고마운 딸입니다^^", type: "family" },
      { title: "아들이 사줬읍니다", content: "아들이 건강 챙기라고 사줬읍니다^^ 먹기도 편하고 비린내 안나서 좋읍니다~ 잘 먹어보겠읍니다..", type: "family" },
      { title: "어머니 드시라고 주문합니다", content: "어머니 기력 챙기시라고 흑염소 진액 주문해드렸어요. 먹기 편하다고 하셔서 다행이에요.", type: "family" },
      // 중간
      { title: "아들이 챙겨줬읍니다", content: "아들이 건강 챙기라고 흑염소 진액 주문해줬읍니다.. 먹어보니 비린맛도 없고 먹기 편하더라구요~\n\n요즘 나이 드니까 여기저기 안아프는데가 없는데 아들이 챙겨주니 고맙습니다^^ 열심히 챙겨먹어보겠읍니다.", type: "family" },
      { title: "딸이 알아보고 주문해줬읍니다", content: "딸이 인터넷에서 알아보더니 흑염소 진액이 좋다고 주문해줬읍니다..\n\n먹어보니 비린내도 안나고 먹기 편하더라구요~ 가격대비 성분도 좋다고 하네요^^\n\n자식들이 챙겨주니 감사합니다^^", type: "family" },
      { title: "아버지 드실거 주문해드립니다", content: "아버지가 기력이 많이 떨어지셨다고 하셔서 흑염소 진액 알아보고 주문해드렸어요. 먹기 편하고 비린맛 없다고 하시더라구요. 꾸준히 드시면 좋을것 같아요.", type: "family" },
      // 긴
      { title: "며느리가 사줬읍니다", content: "며느리가 한려담원이라는 데서 건강 정보 영상을 보더니 흑염소 진액도 판매한다고 사줬읍니다..\n\n먹어보니 비린맛도 없고 먹기 편하더라구요^^ 요즘 관절도 안좋고 기력도 떨어져서 걱정이 많았는데 흑염소가 기력에 좋다는건 예전부터 알고 있었읍니다~\n\n자식들이 이렇게 챙겨주니 감사하고 열심히 먹어보겠읍니다~ 감사합니다^^", type: "family" },
      { title: "딸이 보내줬읍니다", content: "딸이 유튜브에서 건강 정보 보다가 흑염소 진액도 판매한다고 주문해줬읍니다..\n\n먹어보니 비린내도 안나고 먹기 편했읍니다^^ 나이 드니까 기력이 예전같지 않고 손발도 차서 고생이 많았는데 이런거 챙겨먹으면 좋겠다 하더라구요~\n\n자식들이 챙겨주니 감사합니다^^", type: "family" },
      { title: "어머니 드시라고 보내드립니다", content: "어머니가 나이 드시면서 기력이 많이 떨어지셨는데 평소에 손발도 차시고 겨울에 많이 힘들어하세요.\n\n흑염소가 기력 보충에 좋다고 해서 한려담원 진액 알아보고 주문해드렸어요.\n\n비린맛 없고 먹기 편하다고 하셔서 다행이에요.", type: "family" },
      { title: "아버지 건강 챙기려고요", content: "아버지가 요즘 기력이 많이 떨어지셨다고 하셔서 건강식품 찾아보다가 흑염소 진액 주문해드렸어요.\n\n비린맛 걱정하셨는데 안 나신다고 하시고 먹기도 편하다 하세요. 꾸준히 챙겨드리려구요.", type: "family" },
      // 긴+ (제품 정보 포함)
      { title: "자식들이 챙겨줘서 감사합니다", content: "아들이 인터넷에서 이것저것 알아보더니 한려담원 흑염소 진액을 주문해줬읍니다.. 국내산 자연방목 흑염소에 홍삼까지 들어있다고 하더라구요~\n\n나이 드니까 기력이 예전같지 않고 손발도 차서 겨울에 특히 고생이 많았는데 아들이 성분 하나하나 비교해보고 여기가 제일 좋다고 골라줬읍니다^^\n\nHACCP 인증도 있고 누린내도 없다고 하니 먹어보기로 했읍니다~ 자식들이 이렇게 건강 챙겨주니 감사하고 열심히 먹어보겠읍니다.. 좋은 제품 만들어주셔서 감사합니다^^", type: "family" },
      { title: "어머니 건강 챙기려고 성분 비교해보고 골랐어요", content: "어머니가 기력이 많이 떨어지셨는데 평소에 손발도 차시고 겨울에 특히 힘들어하세요. 흑염소 진액이 좋다고 해서 여러 제품 비교해봤거든요.\n\n한려담원은 국내산 자연방목 흑염소에 6년근 홍삼 영지버섯 동충하초까지 같이 배합되어 있어서 구성이 마음에 들었어요. 원물 비율도 확실하게 적혀있고 추출물 위주가 아니라 진짜 원물이 들어가있더라구요.\n\n저온 추출에 누린내 제거 공정도 있다고 해서 어르신이 드시기에도 부담없을것 같아요. 어머니 기력 회복에 도움이 됐으면 좋겠습니다.", type: "family" },
    ],
  },

  health: {
    weight: 20,
    reviews: [
      // 짧음
      { title: "수족냉증 때문에 주문!", content: "수족냉증으로 고생하고 있어서 흑염소 진액 주문해봤어요. 기대하고 있습니다.", type: "health" },
      { title: "기력 회복 목적으로 구매합니다", content: "기력이 너무 없어서 흑염소 진액 주문해봤어요. 꾸준히 먹어보려구요.", type: "health" },
      { title: "체력 관리 시작합니다", content: "체력이 많이 떨어져서 건강식품 찾다가 흑염소 진액 주문했어요.", type: "health" },
      { title: "손발이 차서 구매합니다", content: "손발이 항상 차가운데 흑염소 진액이 좋다고 해서 주문해봤어요.", type: "health" },
      // 중간
      { title: "소음인 체질이라 구매합니다", content: "평생을 소음인으로 살아왔는데 소음인한테 흑염소가 좋다는 얘기를 듣고 한려담원 흑염소 진액 주문해봤어요.\n\n손발도 차고 기력도 없는 편인데 꾸준히 먹어보려구요.", type: "health" },
      { title: "수족냉증이 심해서 직접 주문", content: "수족냉증으로 몇년째 고생하고 있는데 흑염소 진액이 좋다는 얘기를 듣고 주문해봤어요. 겨울에 특히 힘든데 꾸준히 먹으면서 관리해보려구요.", type: "health" },
      { title: "만성피로 관리 목적입니다", content: "만성피로로 몇년째 고생 중인데 건강식품 찾아보다가 흑염소 진액이 기력 보충에 좋다고 해서 주문해봤어요.\n\n꾸준히 챙겨먹어볼 생각입니다.", type: "health" },
      { title: "허약체질 관리하려고요", content: "어릴때부터 허약한 체질이라 감기도 잘 걸리고 기력이 항상 부족했어요.\n\n주변에서 흑염소 진액 추천해줘서 성분 확인하고 주문해봤습니다.", type: "health" },
      { title: "기력 보충 시작합니다", content: "나이 들면서 기력이 예전같지 않아서 건강식품 찾아보다가 한려담원 흑염소 진액 주문했어요. 성분 깔끔하고 국내산이라 괜찮아보여서요.", type: "health" },
      // 긴
      { title: "수족냉증 몇년째.. 이번에 주문해봅니다", content: "수족냉증으로 몇년째 고생하고 있어서 여기저기 찾아보다가 흑염소 진액이 좋다는 걸 알게 됐어요.\n\n한려담원 제품이 국내산 원료에 성분도 깔끔해보여서 주문했습니다.\n\n손발이 항상 차갑고 겨울에는 진짜 힘든데 꾸준히 먹으면서 관리해보려구요.", type: "health" },
      { title: "어릴때부터 허약해서 구매합니다", content: "어릴때부터 체질이 허약한 편이라 감기도 잘 걸리고 기력이 항상 부족했어요.\n\n주변에서 흑염소 진액 먹어보라고 추천해줘서 한려담원 제품 성분 확인해보고 주문했습니다.\n\n몸이 차고 약한 체질인데 꾸준히 먹으면서 체질 개선해보고 싶어요.", type: "health" },
      { title: "임신 준비하면서 주문합니다", content: "임신 준비하면서 몸 관리에 신경쓰고 있는데 원래 몸이 차고 기력이 부족한 편이라 걱정이 많았어요.\n\n주변에서 흑염소 진액이 몸 따뜻하게 해주고 기력 보충에 좋다고 해서 주문해봤습니다.\n\n국내산이라 안심이 되고 꾸준히 챙겨먹어볼 생각이에요.", type: "health" },
      { title: "출산 후 기력이 바닥이라..", content: "출산하고 나서 기력이 바닥이라 일상생활이 힘들어요.. 수족냉증도 심해지고 몸이 예전같지 않아서 건강식품 찾아보다가 흑염소 진액이 기력 보충에 좋다고 해서 주문했습니다.\n\n아이 키우면서 체력 관리 해야되니까 꾸준히 먹어보려구요.", type: "health" },
      // 어르신
      { title: "기력이 떨어져서 주문했읍니다", content: "나이 드니까 기력이 예전같지 않고 손발도 차서 고생이 많읍니다..\n\n예전부터 흑염소가 기력에 좋다는건 알고 있었는데 이번에 한려담원에서 진액 판매한다 해서 주문해봤읍니다^^\n\n꾸준히 챙겨먹으면서 건강 관리 해보겠읍니다~ 좋은 제품이길 기대합니다^^", type: "health" },
      { title: "관절도 안좋고 기력도 없어서..", content: "나이 드니까 관절도 안좋고 손발도 차고 여기저기 안아프는데가 없읍니다..\n\n흑염소가 기력 보충에 좋다는건 예전부터 알고 있었는데 주문해봤읍니다^^\n\n국내산이라 안심이 되고 꾸준히 먹어보겠읍니다~ 감사합니다^^", type: "health" },
      { title: "아들이 먹어보라 해서 주문했읍니다", content: "요즘 기력이 많이 떨어져서 아들이 흑염소 진액 먹어보라고 해서 주문했읍니다..\n\n나이 들면 이런거라도 챙겨먹어야 한다고 하더라구요~\n\n성분도 깔끔하고 국내산이라 안심이 됩니다^^ 열심히 먹어보겠읍니다~ 감사합니다^^", type: "health" },
      // 긴+ (제품 정보 포함)
      { title: "수족냉증 몇년째인데 제대로 알아보고 주문했어요", content: "수족냉증으로 몇년째 고생하고 있어서 이것저것 다 찾아봤는데 흑염소가 몸을 따뜻하게 해준다는 걸 알게 됐어요. 근데 흑염소 진액이 종류가 너무 많아서 뭘 골라야 할지 고민이 많았거든요.\n\n여러 제품 성분 비교해보다가 한려담원을 알게 됐는데 여기는 국내산 자연방목 흑염소에 6년근 홍삼까지 같이 들어있더라구요. 추출물이 아니라 실제 원물이 들어가있고 HACCP 인증 시설에서 만든다고 해서 신뢰가 갔어요.\n\n누린내 제거 공정도 있다길래 맛 걱정도 덜하구요. 이번에는 제대로 된 제품으로 꾸준히 먹어보면서 관리해보려구요.", type: "health" },
      { title: "소음인 체질이라 성분 꼼꼼히 보고 주문합니다", content: "한의원에서 소음인 체질이라고 진단받았는데 몸이 차고 기력이 항상 부족하고 감기도 잘 걸려요. 소음인한테 좋은 건강식품 찾아보다가 흑염소 진액이 좋다는 걸 알게 됐어요.\n\n여러 제품 비교해봤는데 한려담원은 소음인 체질에 맞는 원료들이 들어있고 흑염소에 홍삼 영지버섯 동충하초까지 같이 배합되어 있더라구요. 국내산 자연방목 흑염소라는 것도 확인했고 원물 비율도 확실하게 적혀있어서 마음에 들었어요.\n\n한 달 먹어보고 안 맞으면 환불도 된다고 해서 부담없이 주문해봤습니다. 체질 개선에 도움이 됐으면 좋겠어요.", type: "health" },
      { title: "출산 후 기력 바닥이라 꼼꼼히 알아보고 주문!", content: "출산하고 나서 기력이 진짜 바닥이에요. 수족냉증도 심해지고 아이 키우면서 체력이 따라주질 않아서 건강식품을 알아보기 시작했어요.\n\n흑염소 진액이 기력 보충에 좋다길래 여러 제품 비교해봤는데 한려담원이 성분 구성이 제일 좋더라구요. 국내산 자연방목 흑염소에 홍삼까지 같이 들어있고 원물 비율도 확실해서 신뢰가 갔어요.\n\n누린내 제거 공정이 있다고 해서 먹기도 편할것 같고 HACCP 인증도 있으니까 안심이 됩니다. 아이 키우면서 체력 관리 꼭 해야되니까 꾸준히 챙겨먹어보려구요.", type: "health" },
    ],
  },

  domestic: {
    weight: 3,
    reviews: [
      { title: "국내산이라 바로 구매!", content: "흑염소 진액 국내산 원료라 해서 믿고 주문했어요.", type: "domestic" },
      { title: "국내산 원료라 안심입니다", content: "건강식품은 원산지가 중요한데 여기는 국내산이라 안심이 됩니다. 주문했어요.", type: "domestic" },
      { title: "국내산이라 믿고 구매합니다", content: "건강식품은 원산지가 중요하다고 생각하는데 여기는 국내산 흑염소 원료라고 해서 안심이 됩니다.\n\n성분표도 깔끔하고 좋아보여서 주문했어요.", type: "domestic" },
      { title: "국산 원료 확인하고 구매합니다", content: "건강식품 고를 때 원산지를 제일 먼저 확인하는 편인데 한려담원은 국내산 흑염소로 만든다고 해서 안심이 됐습니다.\n\n성분표도 깔끔하고 불필요한 첨가물도 없어보여서 주문했어요.\n\n기대하면서 먹어보겠습니다.", type: "domestic" },
      { title: "원산지 확인하고 여기로 결정", content: "흑염소 진액 여러 군데 비교해봤는데 여기가 국내산이고 성분도 깔끔해서 주문했어요. 건강식품은 원료가 중요하니까요.", type: "domestic" },
      // 긴+ (제품 정보 포함)
      { title: "국내산 자연방목이라 믿고 주문합니다", content: "건강식품 고를 때 원산지를 제일 먼저 확인하는 편인데 한려담원은 국내산 자연방목 흑염소라고 해서 안심이 됐어요.\n\n홍삼박이랑 늙은호박을 먹여서 키운다고 하더라구요. 거기에 6년근 홍삼 영지버섯 동충하초까지 전부 국내산 원료라서 마음이 놓였어요.\n\nHACCP 인증 시설에서 만들고 도축검사증명서도 있다고 해서 믿고 주문했습니다.", type: "domestic" },
    ],
  },

  referral: {
    weight: 2,
    reviews: [
      { title: "동료 추천으로 구매합니다", content: "회사 동료가 흑염소 진액 먹고 있는데 비린맛도 없고 먹기 편하다고 알려줘서 저도 주문해봤어요.", type: "referral" },
      { title: "친구가 괜찮다고 해서", content: "친구가 흑염소 진액 먹고 있는데 비린맛 없고 먹기 편하다고 해서 저도 주문해봤어요. 기대됩니다.", type: "referral" },
      { title: "지인한테 선물 받았는데 괜찮아서", content: "지인이 선물해줬는데 먹기 편하고 비린내도 안 나더라구요. 괜찮아서 저도 직접 주문합니다.", type: "referral" },
      { title: "주변 추천으로 구매합니다", content: "주변에서 먹어본 분이 비린맛 안 나고 먹기 편하다고 해서 저도 한번 주문해봤어요. 가격대비 성분도 괜찮다길래요.", type: "referral" },
      // 어르신
      { title: "이웃분이 추천해주셨읍니다", content: "옆집 아주머니가 흑염소 진액 괜찮다고 알려주셨읍니다.. 비린맛도 없고 먹기 편하다 하시더라구요~\n\n아주머니 말씀 듣고 저도 한번 주문해봤읍니다^^ 국내산이라 안심이 되고 성분도 괜찮아보여서 기대하고 있읍니다..\n\n같이 건강하게 오래오래 살아야죠~^^", type: "referral" },
      { title: "친구가 알려줬읍니다", content: "같이 운동하는 친구가 흑염소 진액 먹어봤는데 비린맛 없고 괜찮다고 알려줬읍니다.. 저도 한번 먹어보려고 주문했읍니다^^ 기대됩니다~", type: "referral" },
      // 긴+ (제품 정보 포함)
      { title: "직장 동료가 알려줘서 성분 확인하고 주문!", content: "회사 동료가 한려담원 흑염소 진액 먹고 있는데 비린맛도 없고 먹기 편하다고 알려줘서 저도 관심이 생겼어요.\n\n상세 페이지 보니까 국내산 자연방목 흑염소에 홍삼 영지버섯 동충하초까지 같이 들어있더라구요. 원물 비율도 확실하게 적혀있고 HACCP 인증까지 있어서 성분이 마음에 들었어요.\n\n요즘 피로가 심해서 뭐라도 챙겨먹으려고 했는데 동료 추천이라 믿고 주문해봤습니다.", type: "referral" },
    ],
  },
};

// ============================================================
// 제목 중복 방지 로직
// ============================================================

const TITLE_WORD_SWAPS: [RegExp, string][] = [
  [/구매합니다/, "사봤어요"],
  [/구매합니다/, "구매했어요"],
  [/구매합니다/, "주문해봤습니다"],
  [/주문합니다/, "주문해봤어요"],
  [/주문합니다/, "시켜봤어요"],
  [/주문합니다/, "구매했습니다"],
  [/주문!/, "주문했어요"],
  [/구매!/, "구매했어요"],
  [/선물입니다/, "선물이에요"],
  [/선물로 구매/, "선물로 주문"],
  [/선물로 주문/, "선물 보내려고"],
  [/알게 됐네요/, "알게 됐어요"],
  [/알게 된 /, "발견한 "],
  [/보다가 /, "보고서 "],
  [/보고 왔습니다/, "보고 구매해요"],
  [/검색하다 /, "찾다가 "],
  [/찾다가 /, "검색하다 "],
  [/챙기려고/, "챙겨드리려고"],
  [/깔끔하네요/, "깔끔해요"],
  [/시작합니다/, "시작해봐요"],
  [/관리하려고요/, "관리해보려구요"],
  [/먹기 편해요/, "복용하기 좋아요"],
  [/여기까지/, "이곳까지"],
  [/여기로 결정/, "이곳으로"],
  [/기력이 바닥이라/, "기력이 없어서"],
  [/사줬읍니다/, "보내줬읍니다"],
  [/보내줬읍니다/, "사줬읍니다"],
  [/챙겨줬읍니다/, "보내줬읍니다"],
  [/준비합니다/, "준비해요"],
  [/목적입니다/, "목적이에요"],
  [/있나요/, "있을까요"],
];

const TITLE_SUFFIXES = ["~", "!", "..", " ^^", "요", "요~"];

const makeUniqueTitle = (baseTitle: string, usedTitles: Set<string>): string => {
  // 원본
  if (!usedTitles.has(baseTitle)) {
    usedTitles.add(baseTitle);
    return baseTitle;
  }

  // 단어 치환 (가장 자연스러운 변형)
  const applicableSwaps = TITLE_WORD_SWAPS.filter(([regex]) => regex.test(baseTitle));
  for (const [regex, replacement] of applicableSwaps) {
    const variant = baseTitle.replace(regex, replacement);
    if (variant !== baseTitle && !usedTitles.has(variant)) {
      usedTitles.add(variant);
      return variant;
    }
  }

  // 어미 변환
  const endings: ((t: string) => string)[] = [
    (t) => t.replace(/합니다$/, "해요"),
    (t) => t.replace(/합니다$/, "해봤어요"),
    (t) => t.replace(/입니다$/, "이에요"),
    (t) => t.replace(/했읍니다$/, "했어요"),
    (t) => t.replace(/읍니다$/, "어요"),
  ];
  for (const transform of endings) {
    const variant = transform(baseTitle);
    if (variant !== baseTitle && !usedTitles.has(variant)) {
      usedTitles.add(variant);
      return variant;
    }
  }

  // 접두사 추가
  const prefixes = ["이번에 ", "처음으로 ", "드디어 ", "저도 ", "고민하다 "];
  for (const prefix of prefixes) {
    const variant = prefix + baseTitle;
    if (!usedTitles.has(variant)) {
      usedTitles.add(variant);
      return variant;
    }
  }

  // 단어 치환 + 접두사 조합
  for (const [regex, replacement] of applicableSwaps) {
    const swapped = baseTitle.replace(regex, replacement);
    if (swapped === baseTitle) continue;
    for (const prefix of prefixes) {
      const variant = prefix + swapped;
      if (!usedTitles.has(variant)) {
        usedTitles.add(variant);
        return variant;
      }
    }
  }

  // 2개 단어 치환 조합
  for (let i = 0; i < applicableSwaps.length; i++) {
    for (let j = i + 1; j < applicableSwaps.length; j++) {
      let variant = baseTitle;
      variant = variant.replace(applicableSwaps[i][0], applicableSwaps[i][1]);
      variant = variant.replace(applicableSwaps[j][0], applicableSwaps[j][1]);
      if (variant !== baseTitle && !usedTitles.has(variant)) {
        usedTitles.add(variant);
        return variant;
      }
    }
  }

  // 최종 fallback: 부호 접미
  for (const suffix of TITLE_SUFFIXES) {
    const variant = baseTitle.replace(/[~!.^]+$/, "").trimEnd() + suffix;
    if (!usedTitles.has(variant)) {
      usedTitles.add(variant);
      return variant;
    }
  }

  let idx = 2;
  let fallback = `${baseTitle} (${idx})`;
  while (usedTitles.has(fallback)) {
    idx++;
    fallback = `${baseTitle} (${idx})`;
  }
  usedTitles.add(fallback);
  return fallback;
};

// ============================================================
// 본문 중복 방지 로직
// ============================================================

const CONTENT_WORD_SWAPS: [RegExp, string][] = [
  [/주문했어요/, "주문해봤어요"],
  [/주문했습니다/, "주문해봤습니다"],
  [/알게 됐어요/, "알게 되었어요"],
  [/알게 됐는데/, "알게 되었는데"],
  [/알게 돼서/, "알게 되어서"],
  [/찾아보다가/, "검색하다가"],
  [/좋다고 해서/, "좋다길래"],
  [/먹어보려구요/, "먹어볼 생각이에요"],
  [/기대됩니다/, "기대하고 있어요"],
  [/괜찮아보여서/, "좋아보여서"],
  [/유익해서/, "도움이 돼서"],
  [/국내산이라/, "국내산 원료라"],
  [/진짜/, "정말"],
  [/바로 주문/, "바로 구매"],
  [/꾸준히 /, "매일 "],
  [/좋더라구요/, "좋았어요"],
  [/챙겨먹/, "꾸준히 먹"],
  [/먹기 편하/, "복용하기 편하"],
  [/안심이 되/, "마음이 놓이"],
  [/비린맛도 없고/, "비린내도 안 나고"],
  [/성분도 깔끔/, "성분표도 깔끔"],
  [/건강식품/, "건강 보조식품"],
  [/기력이 많이 떨어/, "기력이 부쩍 떨어"],
  [/포장도 깔끔/, "포장 상태도 좋"],
];

const CONTENT_CLOSERS = [
  "\n\n감사합니다~",
  "\n\n잘 먹어보겠습니다.",
  "\n\n기대하면서 먹어볼게요.",
  "\n\n좋은 결과 있길 바랍니다.",
  "\n\n빨리 먹어보고 싶네요.",
  "\n\n도착하면 바로 시작하려구요.",
  "\n\n열심히 챙겨먹어볼게요!",
  "\n\n건강해지고 싶어요~",
  "\n\n앞으로도 좋은 제품 부탁드려요.",
  "\n\n기대가 큽니다~",
];

const makeUniqueContent = (baseContent: string, usedContents: Set<string>): string => {
  if (!usedContents.has(baseContent)) {
    usedContents.add(baseContent);
    return baseContent;
  }

  const applicableSwaps = CONTENT_WORD_SWAPS.filter(([regex]) => regex.test(baseContent));

  // 단일 swap
  for (const [regex, replacement] of applicableSwaps) {
    const variant = baseContent.replace(regex, replacement);
    if (!usedContents.has(variant)) {
      usedContents.add(variant);
      return variant;
    }
  }

  // 2개 swap 조합
  for (let i = 0; i < applicableSwaps.length; i++) {
    for (let j = i + 1; j < applicableSwaps.length; j++) {
      let variant = baseContent;
      variant = variant.replace(applicableSwaps[i][0], applicableSwaps[i][1]);
      variant = variant.replace(applicableSwaps[j][0], applicableSwaps[j][1]);
      if (!usedContents.has(variant)) {
        usedContents.add(variant);
        return variant;
      }
    }
  }

  // 3개 swap 조합
  for (let i = 0; i < applicableSwaps.length; i++) {
    for (let j = i + 1; j < applicableSwaps.length; j++) {
      for (let k = j + 1; k < applicableSwaps.length; k++) {
        let variant = baseContent;
        variant = variant.replace(applicableSwaps[i][0], applicableSwaps[i][1]);
        variant = variant.replace(applicableSwaps[j][0], applicableSwaps[j][1]);
        variant = variant.replace(applicableSwaps[k][0], applicableSwaps[k][1]);
        if (!usedContents.has(variant)) {
          usedContents.add(variant);
          return variant;
        }
      }
    }
  }

  // closer 추가
  for (const closer of CONTENT_CLOSERS) {
    const variant = baseContent + closer;
    if (!usedContents.has(variant)) {
      usedContents.add(variant);
      return variant;
    }
    for (const [regex, replacement] of applicableSwaps) {
      const swapped = baseContent.replace(regex, replacement) + closer;
      if (!usedContents.has(swapped)) {
        usedContents.add(swapped);
        return swapped;
      }
    }
  }

  // 최종 fallback: closer + 2개 swap
  for (const closer of CONTENT_CLOSERS) {
    for (let i = 0; i < applicableSwaps.length; i++) {
      for (let j = i + 1; j < applicableSwaps.length; j++) {
        let variant = baseContent;
        variant = variant.replace(applicableSwaps[i][0], applicableSwaps[i][1]);
        variant = variant.replace(applicableSwaps[j][0], applicableSwaps[j][1]);
        variant += closer;
        if (!usedContents.has(variant)) {
          usedContents.add(variant);
          return variant;
        }
      }
    }
  }

  usedContents.add(baseContent + " ");
  return baseContent + " ";
};

// ============================================================
// 리뷰 생성 로직
// ============================================================

const generate = () => {
  const raw = fs.readFileSync(ACCOUNTS_FILE, "utf-8");
  const accounts = JSON.parse(raw);

  // 이미 등록된 리뷰는 보호 (reviewCount > 0)
  const usedTitles = new Set<string>();
  const usedContents = new Set<string>();
  const alreadyPosted = accounts.filter((a: any) => a.reviewCount > 0);
  alreadyPosted.forEach((a: any) => {
    if (a.review?.title) usedTitles.add(a.review.title);
    if (a.review?.content) usedContents.add(a.review.content);
  });

  const pending = accounts.filter((a: any) => !(a.reviewCount > 0));
  console.log(`총 계정: ${accounts.length}`);
  console.log(`이미 등록: ${alreadyPosted.length}개 (건드리지 않음)`);
  console.log(`재할당 대상: ${pending.length}개`);

  // 타입별 할당 수 계산
  const typeEntries = Object.entries(POOLS);
  const totalWeight = typeEntries.reduce((sum, [, pool]) => sum + pool.weight, 0);

  const assignments: { type: string; review: Review }[] = [];

  for (const [typeName, pool] of typeEntries) {
    const count = Math.round((pool.weight / totalWeight) * pending.length);
    const shuffledReviews = shuffle(pool.reviews);

    for (let i = 0; i < count; i++) {
      const review = shuffledReviews[i % shuffledReviews.length];
      assignments.push({ type: typeName, review });
    }
  }

  while (assignments.length < pending.length) {
    const pool = POOLS.health;
    assignments.push({
      type: "health",
      review: randomPick(pool.reviews),
    });
  }

  const shuffledAssignments = shuffle(assignments).slice(0, pending.length);

  // 대기 계정에만 할당 (제목 + 본문 중복 방지)
  for (let i = 0; i < pending.length; i++) {
    const { type, review } = shuffledAssignments[i];
    const uniqueTitle = makeUniqueTitle(review.title, usedTitles);
    const uniqueContent = makeUniqueContent(review.content, usedContents);

    const idx = accounts.findIndex((a: any) => a.id === pending[i].id);
    if (idx !== -1) {
      accounts[idx].review = {
        title: uniqueTitle,
        content: uniqueContent,
        type,
      };
    }
  }

  // 통계 출력
  const stats: Record<string, number> = {};
  for (const { type } of shuffledAssignments) {
    stats[type] = (stats[type] || 0) + 1;
  }

  console.log("\n=== 타입별 배분 ===");
  for (const [type, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / pending.length) * 100).toFixed(1);
    console.log(`  ${type}: ${count}개 (${pct}%)`);
  }

  // 중복 체크
  const allTitles = accounts.map((a: any) => a.review?.title).filter(Boolean);
  const titleSet = new Set(allTitles);
  const titleDupCount = allTitles.length - titleSet.size;

  const allContents = accounts.map((a: any) => a.review?.content).filter(Boolean);
  const contentSet = new Set(allContents);
  const contentDupCount = allContents.length - contentSet.size;

  // 저장
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf-8");
  console.log(`\n${pending.length}개 계정 리뷰 재할당 완료`);
  console.log(`제목 중복: ${titleDupCount}개 ${titleDupCount === 0 ? "✓ 없음!" : "⚠ 남아있음"}`);
  console.log(`본문 중복: ${contentDupCount}개 ${contentDupCount === 0 ? "✓ 없음!" : "⚠ 남아있음"}`);

  // 샘플 출력
  console.log("\n=== 샘플 (대기 중 처음 5개) ===");
  const pendingSample = accounts.filter((a: any) => !(a.reviewCount > 0)).slice(0, 5);
  pendingSample.forEach((acc: any, i: number) => {
    console.log(`  [${i + 1}] ${acc.name} (${acc.id}) - [${acc.review.type}]`);
    console.log(`       제목: ${acc.review.title}`);
  });
};

generate();
