/**
 * 홈 "조망 추천" 도메인 로직 (job 과 read API 가 공유).
 *
 * - 산 목록 / 타입 정의
 * - 점수 계산 (조망 추천 점수)
 * - 예상 조망지수(조망 가능성) 계산
 * - 추천 문구 생성
 * - 캐시 키 / 슬롯 / KST 헬퍼
 *
 * 데이터 소스: 산악예보 API(/api/kma/mountain-weather)가 아니라
 * 산 좌표 주변의 "지역 단기예보(동네예보)"를 사용한다 (regionForecast.ts).
 */

export interface MountainInfo {
  name: string;
  region: string;
  lat: number;
  lng: number;
  difficulty: string;
  distance: string;
  time: string;
  reason: string;
  temp: number;
  humidity: number;
  pop: number;
  wind: number;
  visibility: number;
}

export interface ViewRecommendation extends MountainInfo {
  score: number;
  /** 예상 조망지수 / 조망 가능성 (0~100). UI 표기는 "예상 조망지수". */
  viewIndex: number;
  /** 하위 호환용. 더 이상 "가시거리(km)"로 노출하지 않는다. */
  visibilityKm: number;
  precipitationProbability: number;
  windSpeed: number;
  bestDay: string;
  viewMessage: string;
}

/** 추천 결과 캐시 페이로드 (날짜 1일치). */
export interface CachedRecommendations {
  ok: true;
  date: string;
  slot: string;
  savedAt: number;
  source: string;
  recommendations: ViewRecommendation[];
}

export const MOUNTAINS: MountainInfo[] = [
  { name: "북한산", region: "수도권/경기", lat: 37.6584, lng: 126.9782, difficulty: "중급", distance: "2.6km", time: "1시간 30분", reason: "서울 도심 접근성이 좋고 조망 확인에 적합합니다.", temp: 18, humidity: 45, pop: 0, wind: 2.1, visibility: 20 },
  { name: "도봉산", region: "수도권/경기", lat: 37.6894, lng: 127.0161, difficulty: "상급", distance: "4.5km", time: "3시간", reason: "능선 조망과 암릉 조건을 확인하기 좋습니다.", temp: 17, humidity: 38, pop: 0, wind: 3.0, visibility: 20 },
  { name: "관악산", region: "수도권/경기", lat: 37.4444, lng: 126.9639, difficulty: "중급", distance: "3.2km", time: "2시간", reason: "짧은 산행과 도심 조망을 함께 보기 좋습니다.", temp: 19, humidity: 40, pop: 0, wind: 1.5, visibility: 18 },
  { name: "설악산", region: "강원", lat: 38.1194, lng: 128.4656, difficulty: "상급", distance: "5.8km", time: "4시간", reason: "고산 조망과 풍속 변화가 중요한 대표 산입니다.", temp: 14, humidity: 50, pop: 10, wind: 4.2, visibility: 25 },
  { name: "오대산", region: "강원", lat: 37.7946, lng: 128.5436, difficulty: "중급", distance: "6.4km", time: "3시간", reason: "완만한 능선과 숲길이 많아 산행 컨디션을 보기 좋습니다.", temp: 14, humidity: 55, pop: 10, wind: 2.4, visibility: 18 },
  { name: "치악산", region: "강원", lat: 37.3651, lng: 128.0556, difficulty: "상급", distance: "7.0km", time: "4시간", reason: "고도차가 커 바람과 조망 조건을 함께 봅니다.", temp: 15, humidity: 52, pop: 10, wind: 2.7, visibility: 18 },
  { name: "태백산", region: "강원", lat: 37.0969, lng: 128.915, difficulty: "중급", distance: "4.4km", time: "2시간 30분", reason: "능선 조망이 좋아 조망지수와 풍속 변화가 중요합니다.", temp: 13, humidity: 55, pop: 10, wind: 3.1, visibility: 22 },
  { name: "속리산", region: "충북", lat: 36.5333, lng: 127.85, difficulty: "중급", distance: "4.1km", time: "2시간 30분", reason: "암릉 구간 산행과 조망 조건을 함께 확인합니다.", temp: 19, humidity: 44, pop: 0, wind: 2.0, visibility: 17 },
  { name: "월악산", region: "충북", lat: 36.8895, lng: 128.1065, difficulty: "상급", distance: "6.0km", time: "4시간", reason: "암릉과 정상 조망이 강한 산입니다.", temp: 16, humidity: 50, pop: 10, wind: 2.8, visibility: 19 },
  { name: "계룡산", region: "충남", lat: 36.3551, lng: 127.2061, difficulty: "중급", distance: "3.4km", time: "2시간 10분", reason: "능선 산행과 조망 조건을 확인합니다.", temp: 20, humidity: 48, pop: 0, wind: 1.9, visibility: 16 },
  { name: "내장산", region: "전북", lat: 35.4419, lng: 126.8889, difficulty: "초급", distance: "2.8km", time: "1시간 40분", reason: "가벼운 산행과 경관 감상에 좋습니다.", temp: 21, humidity: 52, pop: 0, wind: 1.2, visibility: 19 },
  { name: "덕유산", region: "전북", lat: 35.859, lng: 127.7463, difficulty: "중급", distance: "5.0km", time: "3시간", reason: "고지대 능선 조망이 좋아 구름량과 풍속을 확인합니다.", temp: 13, humidity: 58, pop: 10, wind: 3.2, visibility: 21 },
  { name: "무등산", region: "전남", lat: 35.1436, lng: 126.9936, difficulty: "중급", distance: "5.1km", time: "3시간", reason: "입석대 조망 조건을 확인합니다.", temp: 22, humidity: 45, pop: 0, wind: 2.1, visibility: 21 },
  { name: "월출산", region: "전남", lat: 34.7676, lng: 126.7041, difficulty: "상급", distance: "6.1km", time: "4시간", reason: "바위 능선 조망이 강한 산입니다.", temp: 20, humidity: 55, pop: 10, wind: 2.9, visibility: 20 },
  { name: "소백산", region: "경북", lat: 36.9583, lng: 128.455, difficulty: "상급", distance: "6.0km", time: "4시간", reason: "고지대 바람과 조망 조건을 확인합니다.", temp: 15, humidity: 50, pop: 0, wind: 2.8, visibility: 23 },
  { name: "가야산", region: "경남", lat: 35.8233, lng: 128.1205, difficulty: "상급", distance: "4.8km", time: "3시간 30분", reason: "정상부 바위 능선 조망이 좋은 산입니다.", temp: 17, humidity: 52, pop: 10, wind: 2.6, visibility: 20 },
  { name: "지리산", region: "경남", lat: 35.3369, lng: 127.7306, difficulty: "상급", distance: "6.5km", time: "5시간", reason: "장거리 산행과 조망 조건을 확인합니다.", temp: 13, humidity: 58, pop: 5, wind: 3.1, visibility: 22 },
  { name: "한라산", region: "제주", lat: 33.3617, lng: 126.5292, difficulty: "상급", distance: "9.6km", time: "8시간", reason: "정상 조망과 날씨 변화가 중요합니다.", temp: 12, humidity: 60, pop: 0, wind: 3.5, visibility: 30 },
];

// ---------------------------------------------------------------------------
// 시간 / 슬롯 / 캐시 키
// ---------------------------------------------------------------------------

export const getKstNow = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 60 * 60000);
};

export const formatKstDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** rebuild job 이 생성할 날짜 목록 (오늘부터 days 일치). */
export const getForecastDates = (days = 7) => {
  const start = getKstNow();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatKstDate(date);
  });
};

/** 유효 슬롯 정규화. 기본 "1000" (KST 10:10 갱신분). */
export const normalizeSlot = (raw: string | null | undefined): string => {
  const value = (raw || "").trim();
  if (value === "1300" || value === "1000") return value;
  return "1000";
};

const CACHE_VERSION = "v1";

export const recommendationCacheKey = (date: string) =>
  `view-rec:${CACHE_VERSION}:date:${date}`;

/** 가장 최근에 빌드된 날짜 목록을 가리키는 매니페스트 키. */
export const recommendationManifestKey = () => `view-rec:${CACHE_VERSION}:manifest`;

export interface RecommendationManifest {
  slot: string;
  savedAt: number;
  dates: string[];
}

// ---------------------------------------------------------------------------
// 점수 계산
// ---------------------------------------------------------------------------

export interface ScoreInput {
  /** 강수확률 % (0~100) */
  precipitationProbability: number;
  /** 강수량 mm */
  precipitation: number;
  /** 하늘상태: 1 맑음, 3 구름많음, 4 흐림 (KMA SKY 코드). 없으면 skyText 사용. */
  sky?: number;
  skyText?: string;
  /** 습도 % */
  humidity: number;
  /** 풍속 m/s */
  windSpeed: number;
  /** 기온 ℃ */
  temp: number;
}

const isCloudy = (input: ScoreInput) => {
  if (typeof input.sky === "number") return input.sky >= 3;
  const t = input.skyText || "";
  return t.includes("흐림") || t.includes("구름많음") || t.includes("구름");
};

const isOvercast = (input: ScoreInput) => {
  if (typeof input.sky === "number") return input.sky >= 4;
  return (input.skyText || "").includes("흐림");
};

/**
 * 조망 추천 점수 (0~100 정수).
 * 기본 100점에서 악조건마다 감점.
 */
export const calculateViewScore = (input: ScoreInput): number => {
  let score = 100;

  // 강수확률 높으면 감점
  score -= input.precipitationProbability * 0.5;

  // 강수량 있으면 큰 감점
  if (input.precipitation > 0) {
    score -= 20 + Math.min(30, input.precipitation * 4);
  }

  // 하늘상태 흐림/구름많음 감점
  if (isOvercast(input)) {
    score -= 18;
  } else if (isCloudy(input)) {
    score -= 9;
  }

  // 습도 높으면 감점 (60% 초과분)
  score -= Math.max(0, input.humidity - 60) * 0.4;

  // 풍속 너무 강하면 감점 (4 m/s 초과분)
  score -= Math.max(0, input.windSpeed - 4) * 4;

  // 기온 -5도 이하부터 감점
  if (input.temp < -5) {
    score -= Math.abs(input.temp + 5) * 2;
  }

  // 기온 20도 초과부터 더위/열사병 위험으로 감점
  if (input.temp > 20) {
    score -= (input.temp - 20) * 2.5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * 예상 조망지수 / 조망 가능성 (0~100 정수).
 * "멀리까지 선명하게 보일 가능성"을 하늘상태·강수·습도 중심으로 추정.
 */
export const calculateViewIndex = (input: ScoreInput): number => {
  let index = 100;

  if (isOvercast(input)) index -= 35;
  else if (isCloudy(input)) index -= 18;

  if (input.precipitation > 0) index -= 30;
  index -= input.precipitationProbability * 0.3;

  // 습도 50% 초과분이 조망(시정)에 영향
  index -= Math.max(0, input.humidity - 50) * 0.5;

  // 강풍은 미세먼지/구름을 날려 조망에 긍정적일 수 있으나 과도하면 체감 저하
  index -= Math.max(0, input.windSpeed - 10) * 2;

  return Math.max(0, Math.min(100, Math.round(index)));
};

// ---------------------------------------------------------------------------
// 추천 문구
// ---------------------------------------------------------------------------

export const getViewMessage = (rec: {
  score: number;
  viewIndex: number;
  precipitationProbability: number;
  windSpeed: number;
}): string => {
  if (rec.precipitationProbability >= 50) {
    return "비 예보가 있어 조망 산행은 추천하기 어려워요.";
  }
  if (rec.windSpeed >= 9) {
    return "바람이 강해 능선 산행과 정상 체류는 주의가 필요해요.";
  }
  if (rec.viewIndex >= 85 && rec.score >= 85) {
    return "조망 가능성이 매우 높아 멀리까지 선명하게 보일 것으로 예상돼요.";
  }
  if (rec.viewIndex >= 70) {
    return "조망 가능성이 좋아 정상 경관을 기대하기 좋은 날이에요.";
  }
  if (rec.viewIndex >= 50) {
    return "조망은 다소 흐릴 수 있지만 산행 컨디션은 무난해요.";
  }
  return "조망 가능성이 낮은 편이라 산행 전 최신 예보를 한 번 더 확인해보세요.";
};
