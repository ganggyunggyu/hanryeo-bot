import { randomPick, randomInt, randomString } from "@/shared/lib/random";

const SURNAMES = [
  "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
  "오", "한", "신", "서", "권", "황", "안", "송", "류", "홍",
  "전", "문", "배", "양", "남", "구", "민", "유", "손", "노",
  "하", "곽", "성", "차", "주", "우", "라", "진", "방", "공",
];

const FEMALE_GIVEN_NAMES = [
  // 40~60대
  "영숙", "미경", "정희", "순옥", "은주", "경미", "현정", "선미",
  "지영", "미숙", "정숙", "은경", "숙경", "영미", "춘희", "명숙",
  "보경", "경희", "옥순", "정순", "영자", "순자", "명자", "춘자",
  "복순", "말순", "길순", "순영", "옥희", "정자", "미자", "영희",
  "경숙", "혜숙", "인숙", "귀순", "말자", "분자", "난희", "선옥",
  // 30~40대
  "소영", "유진", "하영", "서연", "지혜", "은정", "수진", "혜진",
  "미선", "영은", "지은", "수경", "현숙", "은미", "지현", "다영",
  "선영", "정은", "혜원", "나영",
];

const MALE_GIVEN_NAMES = [
  // 40~60대
  "경규", "상현", "동훈", "진우", "성호", "재영", "영철", "태호",
  "정수", "기호", "상철", "영호", "종수", "광수", "병철", "태영",
  "성구", "현우", "종호", "만수", "용호", "재호", "석호", "동수",
  "상호", "영수", "기철", "성진", "동식", "만호", "재원", "용수",
  // 30~40대
  "준혁", "민재", "지훈", "성민", "현수", "동현", "승현", "재민",
  "태민", "유찬", "민호", "정민", "시우", "준서", "도현", "건우",
  "우진", "세훈", "하준", "예준",
];

// 40~60대 한국 사용자가 실제로 쓸 법한 ID 패턴
const ID_PREFIXES = [
  // 이름 로마자 스타일
  "mikyung", "eunju", "hyejin", "sunmi", "jiyoung",
  "youngsuk", "junghee", "kyungmi", "suyeon", "bokyung",
  // 한국어 로마자
  "sarang", "haengbok", "haneul", "baram", "namu",
  "ddalgi", "ggotip", "haru", "bom", "gaeul",
  // 취미/일상
  "hiking", "garden", "cook", "yoga", "travel",
  "morning", "nature", "health", "smile", "dream",
  // 생활 밀착형
  "happymom", "lovelife", "goodday", "myhouse", "ourfam",
  "prettymom", "warmheart", "sweetmom", "homecook", "walkday",
];

const EMAIL_DOMAINS = ["gmail.com", "naver.com", "daum.net", "hanmail.net", "kakao.com"];

const EMAIL_PREFIXES = [
  "love", "my", "the", "hi", "go", "so", "do", "la", "su", "ha",
  "ye", "bo", "na", "da", "yo", "ji", "mi", "se", "in", "ah",
];

const PASSWORDS = [
  "12Qwaszx!@",
];

export const generateId = (): string => {
  const prefix = randomPick(ID_PREFIXES);
  const num = randomInt(10, 9999);
  return `${prefix}${num}`;
};

export const generatePassword = (): string => randomPick(PASSWORDS);

export const generateName = (gender: "male" | "female"): string => {
  const surname = randomPick(SURNAMES);
  const givenPool = gender === "female" ? FEMALE_GIVEN_NAMES : MALE_GIVEN_NAMES;
  const given = randomPick(givenPool);
  return `${surname}${given}`;
};

export const generateGender = (): "male" | "female" => {
  return Math.random() < 0.7 ? "female" : "male";
};

export const generateEmail = (id: string): string => {
  const style = randomInt(1, 3);
  const domain = randomPick(EMAIL_DOMAINS);

  if (style === 1) {
    return `${id}@${domain}`;
  }
  if (style === 2) {
    const prefix = randomPick(EMAIL_PREFIXES);
    const num = randomInt(10, 999);
    return `${prefix}${id.slice(0, 4)}${num}@${domain}`;
  }
  const num = randomInt(60, 85);
  return `${id}${num}@${domain}`;
};

export const generatePhone = (): { mobile1: string; mobile2: string; mobile3: string } => {
  const mobile2 = randomString(4, "0123456789");
  const mobile3 = randomString(4, "0123456789");
  return { mobile1: "010", mobile2, mobile3 };
};

export const generateAccount = () => {
  const gender = generateGender();
  const id = generateId();
  const password = generatePassword();
  const name = generateName(gender);
  const email = generateEmail(id);
  const phone = generatePhone();

  return { id, password, name, email, gender, phone };
};
