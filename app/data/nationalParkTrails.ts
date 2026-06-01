export interface TrailPoint {
  lat: number;
  lng: number;
}

export interface NationalParkTrail {
  id: string;
  parkName: string;
  mountainName: string;
  facilityName: string;
  startPoint: string;
  viaPoint?: string;
  endPoint: string;
  distanceKm: number;
  ascentTimeMin?: number;
  descentTimeMin?: number;
  difficulty: "easy" | "moderate" | "hard";
  routeType: "round-trip" | "one-way" | "loop" | "traverse";
  tags: string[];
  source: string;
  path?: TrailPoint[];
}

export const difficultyLabel: Record<NationalParkTrail["difficulty"], string> = {
  easy: "쉬움",
  moderate: "보통",
  hard: "어려움",
};

export const routeTypeLabel: Record<NationalParkTrail["routeType"], string> = {
  "round-trip": "왕복",
  "one-way": "편도",
  loop: "순환",
  traverse: "종주",
};

export const NATIONAL_PARK_TRAILS: NationalParkTrail[] = [
  {
    id: "jiri-jungsanri-cheonwangbong",
    parkName: "지리산국립공원",
    mountainName: "지리산",
    facilityName: "중산리-천왕봉 코스",
    startPoint: "중산리탐방안내소",
    viaPoint: "칼바위, 로터리대피소",
    endPoint: "천왕봉",
    distanceKm: 5.4,
    ascentTimeMin: 240,
    descentTimeMin: 180,
    difficulty: "hard",
    routeType: "round-trip",
    tags: ["정상", "최단코스", "급경사", "상급"],
    source: "국립공원공단 탐방로 데이터 정리 대상",
  },
  {
    id: "jiri-baekmudong-cheonwangbong",
    parkName: "지리산국립공원",
    mountainName: "지리산",
    facilityName: "백무동-천왕봉 코스",
    startPoint: "백무동탐방지원센터",
    viaPoint: "장터목대피소",
    endPoint: "천왕봉",
    distanceKm: 7.5,
    ascentTimeMin: 330,
    descentTimeMin: 250,
    difficulty: "hard",
    routeType: "round-trip",
    tags: ["정상", "대피소", "장거리"],
    source: "국립공원공단 탐방로 데이터 정리 대상",
  },
  {
    id: "jiri-seongsamjae-nogodan",
    parkName: "지리산국립공원",
    mountainName: "지리산",
    facilityName: "성삼재-노고단 코스",
    startPoint: "성삼재휴게소",
    endPoint: "노고단",
    distanceKm: 4.7,
    ascentTimeMin: 90,
    descentTimeMin: 70,
    difficulty: "easy",
    routeType: "round-trip",
    tags: ["조망", "초급", "가벼운산행"],
    source: "국립공원공단 탐방로 데이터 정리 대상",
  },
  {
    id: "seorak-sogongwon-ulsanbawi",
    parkName: "설악산국립공원",
    mountainName: "설악산",
    facilityName: "소공원-울산바위 코스",
    startPoint: "설악동 소공원",
    viaPoint: "신흥사, 흔들바위",
    endPoint: "울산바위",
    distanceKm: 3.8,
    ascentTimeMin: 120,
    descentTimeMin: 90,
    difficulty: "moderate",
    routeType: "round-trip",
    tags: ["조망", "암릉", "인기코스"],
    source: "국립공원공단 탐방로 데이터 정리 대상",
  },
  {
    id: "seorak-osaek-daecheongbong",
    parkName: "설악산국립공원",
    mountainName: "설악산",
    facilityName: "오색-대청봉 코스",
    startPoint: "오색탐방지원센터",
    endPoint: "대청봉",
    distanceKm: 5.0,
    ascentTimeMin: 240,
    descentTimeMin: 180,
    difficulty: "hard",
    routeType: "round-trip",
    tags: ["정상", "급경사", "상급"],
    source: "국립공원공단 탐방로 데이터 정리 대상",
  },
  {
    id: "bukhansan-baegundae",
    parkName: "북한산국립공원",
    mountainName: "북한산",
    facilityName: "백운대 코스",
    startPoint: "북한산성탐방지원센터",
    viaPoint: "보리사, 백운봉암문",
    endPoint: "백운대",
    distanceKm: 3.4,
    ascentTimeMin: 150,
    descentTimeMin: 110,
    difficulty: "hard",
    routeType: "round-trip",
    tags: ["정상", "암릉", "조망"],
    source: "국립공원공단 탐방로 데이터 정리 대상",
    path: [
      { lat: 37.6589, lng: 126.9488 },
      { lat: 37.6618, lng: 126.9548 },
      { lat: 37.6639, lng: 126.9618 },
      { lat: 37.6584, lng: 126.9782 },
    ],
  },
  {
    id: "dobongsan-sinseondae",
    parkName: "북한산국립공원",
    mountainName: "도봉산",
    facilityName: "도봉산 신선대 코스",
    startPoint: "도봉탐방지원센터",
    viaPoint: "도봉대피소, 마당바위",
    endPoint: "신선대",
    distanceKm: 3.3,
    ascentTimeMin: 140,
    descentTimeMin: 100,
    difficulty: "hard",
    routeType: "round-trip",
    tags: ["암릉", "조망", "상급"],
    source: "국립공원공단 탐방로 데이터 정리 대상",
      path: [
    { lat: 37.6897, lng: 127.0465 },
    { lat: 37.6924, lng: 127.0402 },
    { lat: 37.6948, lng: 127.0334 },
    { lat: 37.6972, lng: 127.0277 },
    { lat: 37.6991, lng: 127.0221 },
    { lat: 37.7004, lng: 127.0157 },
  ],
  },
  {
    id: "naejang-baegyangsa-baegamsan",
    parkName: "내장산국립공원",
    mountainName: "내장산",
    facilityName: "백양사-백암산 코스",
    startPoint: "백양사",
    viaPoint: "약사암",
    endPoint: "백학봉",
    distanceKm: 3.1,
    ascentTimeMin: 120,
    descentTimeMin: 90,
    difficulty: "moderate",
    routeType: "round-trip",
    tags: ["사찰", "단풍", "조망"],
    source: "국립공원공단 탐방로 데이터 정리 대상",
  },
  {
    id: "deogyu-gucheondong-hyangjeokbong",
    parkName: "덕유산국립공원",
    mountainName: "덕유산",
    facilityName: "구천동-향적봉 코스",
    startPoint: "구천동탐방지원센터",
    viaPoint: "백련사",
    endPoint: "향적봉",
    distanceKm: 8.5,
    ascentTimeMin: 240,
    descentTimeMin: 180,
    difficulty: "hard",
    routeType: "round-trip",
    tags: ["정상", "장거리", "계곡"],
    source: "국립공원공단 탐방로 데이터 정리 대상",
  },
  {
    id: "hallasan-seongpanak",
    parkName: "한라산국립공원",
    mountainName: "한라산",
    facilityName: "성판악 코스",
    startPoint: "성판악탐방안내소",
    viaPoint: "진달래밭대피소",
    endPoint: "백록담",
    distanceKm: 9.6,
    ascentTimeMin: 270,
    descentTimeMin: 240,
    difficulty: "hard",
    routeType: "round-trip",
    tags: ["정상", "백록담", "장거리"],
    source: "국립공원공단 탐방로 데이터 정리 대상",
  },
  {
    id: "hallasan-gwaneumsa",
    parkName: "한라산국립공원",
    mountainName: "한라산",
    facilityName: "관음사 코스",
    startPoint: "관음사탐방안내소",
    viaPoint: "삼각봉대피소",
    endPoint: "백록담",
    distanceKm: 8.7,
    ascentTimeMin: 300,
    descentTimeMin: 240,
    difficulty: "hard",
    routeType: "round-trip",
    tags: ["정상", "백록담", "상급"],
    source: "국립공원공단 탐방로 데이터 정리 대상",
  },
];

export const findNationalParkTrails = (mountainName: string) => {
  const query = mountainName.trim().toLowerCase();

  if (!query) return NATIONAL_PARK_TRAILS;

  return NATIONAL_PARK_TRAILS.filter(
    (trail) =>
      trail.mountainName.toLowerCase().includes(query) ||
      trail.parkName.toLowerCase().includes(query) ||
      trail.facilityName.toLowerCase().includes(query)
  );
};
