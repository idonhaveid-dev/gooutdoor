export interface MountainProfile {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  elevationM?: number;
  isNationalPark?: boolean;
  tags: string[];
  aliases?: string[];
  summary: string;
}

export const MOUNTAIN_PROFILES: MountainProfile[] = [
  {
    id: "jiri",
    name: "지리산",
    region: "경남/전북/전남",
    lat: 35.3369,
    lng: 127.7306,
    elevationM: 1915,
    isNationalPark: true,
    tags: ["국립공원", "종주", "천왕봉", "조망"],
    aliases: ["천왕봉", "지리산국립공원"],
    summary: "우리나라 대표 장거리 산행지로 능선 종주와 천왕봉 일출 조망이 유명합니다.",
  },
  {
    id: "seorak",
    name: "설악산",
    region: "강원",
    lat: 38.1194,
    lng: 128.4656,
    elevationM: 1708,
    isNationalPark: true,
    tags: ["국립공원", "암릉", "대청봉", "조망"],
    aliases: ["대청봉", "설악산국립공원"],
    summary: "암릉과 계곡, 능선 조망이 모두 강한 강원권 대표 산입니다.",
  },
  {
    id: "bukhansan",
    name: "북한산",
    region: "서울/경기",
    lat: 37.6584,
    lng: 126.9782,
    elevationM: 836,
    isNationalPark: true,
    tags: ["국립공원", "백운대", "암릉", "도심조망"],
    aliases: ["백운대", "북한산국립공원"],
    summary: "서울 도심에서 접근성이 높고 백운대 암릉 조망이 뛰어난 산입니다.",
  },
  {
    id: "dobong",
    name: "도봉산",
    region: "서울/경기",
    lat: 37.6894,
    lng: 127.0161,
    elevationM: 740,
    isNationalPark: true,
    tags: ["국립공원", "암릉", "신선대", "조망"],
    aliases: ["신선대"],
    summary: "암릉미와 능선 조망이 강한 북한산국립공원 북부권 산입니다.",
  },
  {
    id: "naejang",
    name: "내장산",
    region: "전북",
    lat: 35.4419,
    lng: 126.8889,
    elevationM: 763,
    isNationalPark: true,
    tags: ["국립공원", "단풍", "사찰", "조망"],
    aliases: ["내장산국립공원"],
    summary: "단풍과 사찰, 낮은 능선 산행이 어우러진 전북 대표 산입니다.",
  },
  {
    id: "deogyu",
    name: "덕유산",
    region: "전북/경남",
    lat: 35.8599,
    lng: 127.7463,
    elevationM: 1614,
    isNationalPark: true,
    tags: ["국립공원", "향적봉", "겨울산행", "조망"],
    aliases: ["향적봉", "덕유산국립공원"],
    summary: "향적봉과 능선 조망, 겨울 설경으로 유명한 국립공원 산입니다.",
  },
  {
    id: "halla",
    name: "한라산",
    region: "제주",
    lat: 33.3617,
    lng: 126.5292,
    elevationM: 1947,
    isNationalPark: true,
    tags: ["국립공원", "백록담", "섬산행", "정상"],
    aliases: ["백록담", "한라산국립공원"],
    summary: "제주 중심의 최고봉으로 백록담 정상 산행이 핵심입니다.",
  },
  {
    id: "mudeung",
    name: "무등산",
    region: "광주/전남",
    lat: 35.1436,
    lng: 126.9936,
    elevationM: 1187,
    isNationalPark: true,
    tags: ["국립공원", "입석대", "서석대", "조망"],
    aliases: ["입석대", "서석대", "무등산국립공원"],
    summary: "주상절리대와 광주 도심 조망이 인상적인 국립공원 산입니다.",
  },
  {
    id: "sobaek",
    name: "소백산",
    region: "충북/경북",
    lat: 36.9583,
    lng: 128.455,
    elevationM: 1439,
    isNationalPark: true,
    tags: ["국립공원", "능선", "철쭉", "조망"],
    aliases: ["비로봉", "소백산국립공원"],
    summary: "부드러운 고산 능선과 탁 트인 조망이 강점인 산입니다.",
  },
  {
    id: "gyeryong",
    name: "계룡산",
    region: "충남",
    lat: 36.3551,
    lng: 127.2061,
    elevationM: 845,
    isNationalPark: true,
    tags: ["국립공원", "능선", "사찰", "조망"],
    aliases: ["계룡산국립공원"],
    summary: "충청권 대표 국립공원으로 능선과 사찰 코스가 함께 발달했습니다.",
  },
  {
    id: "gwanak",
    name: "관악산",
    region: "서울/경기",
    lat: 37.4444,
    lng: 126.9639,
    elevationM: 632,
    tags: ["도심산행", "암릉", "조망"],
    aliases: ["연주대"],
    summary: "서울 남부권에서 접근성이 좋고 암릉 조망이 뚜렷한 산입니다.",
  },
  {
    id: "sokri",
    name: "속리산",
    region: "충북/경북",
    lat: 36.5333,
    lng: 127.85,
    elevationM: 1058,
    isNationalPark: true,
    tags: ["국립공원", "문장대", "암릉", "조망"],
    aliases: ["문장대", "속리산국립공원"],
    summary: "문장대와 법주사 코스로 잘 알려진 충청권 대표 산입니다.",
  },
];

export const searchMountainProfiles = (query: string) => {
  const normalized = query.trim().toLowerCase();

  if (!normalized) return MOUNTAIN_PROFILES;

  return MOUNTAIN_PROFILES.filter((mountain) => {
    const searchable = [
      mountain.name,
      mountain.region,
      mountain.summary,
      ...mountain.tags,
      ...(mountain.aliases || []),
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalized);
  });
};
