export interface KmaMountainStation {
  mountainName: string;
  stationName: string;
  mountainNum: string;
  region: string;
  lat: number;
  lng: number;
  aliases?: string[];
}

const normalizeMountainName = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "");

export const KMA_MOUNTAIN_STATIONS: KmaMountainStation[] = [
  { mountainName: "설악산", stationName: "설악산", mountainNum: "1", region: "강원", lat: 38.1194, lng: 128.4656 },
  { mountainName: "오대산", stationName: "오대산", mountainNum: "3", region: "강원", lat: 37.7946, lng: 128.5436 },
  { mountainName: "치악산", stationName: "치악산", mountainNum: "5", region: "강원", lat: 37.3651, lng: 128.0556 },
  { mountainName: "태백산", stationName: "태백산", mountainNum: "7", region: "강원", lat: 37.0969, lng: 128.915 },
  { mountainName: "관악산", stationName: "관악산", mountainNum: "37", region: "수도권/경기", lat: 37.4444, lng: 126.9639 },
  { mountainName: "북한산", stationName: "북한산", mountainNum: "40", region: "수도권/경기", lat: 37.6584, lng: 126.9782 },
  { mountainName: "도봉산", stationName: "도봉산", mountainNum: "47", region: "수도권/경기", lat: 37.6894, lng: 127.0161 },
  { mountainName: "계룡산", stationName: "계룡산", mountainNum: "53", region: "충남", lat: 36.3551, lng: 127.2061 },
  { mountainName: "속리산", stationName: "속리산", mountainNum: "57", region: "충북", lat: 36.5333, lng: 127.85 },
  { mountainName: "월악산", stationName: "월악산", mountainNum: "59", region: "충북", lat: 36.8895, lng: 128.1065 },
  { mountainName: "월출산", stationName: "월출산", mountainNum: "62", region: "전남", lat: 34.7676, lng: 126.7041 },
  { mountainName: "지리산", stationName: "지리산", mountainNum: "64", region: "경남", lat: 35.3369, lng: 127.7306 },
  { mountainName: "무등산", stationName: "무등산", mountainNum: "65", region: "전남", lat: 35.1436, lng: 126.9936 },
  { mountainName: "내장산", stationName: "내장산", mountainNum: "75", region: "전북", lat: 35.4419, lng: 126.8889 },
  { mountainName: "덕유산", stationName: "덕유산", mountainNum: "77", region: "전북", lat: 35.859, lng: 127.7463 },
  { mountainName: "소백산", stationName: "소백산", mountainNum: "82", region: "경북", lat: 36.9583, lng: 128.455 },
  { mountainName: "가야산", stationName: "가야산", mountainNum: "88", region: "경남", lat: 35.8233, lng: 128.1205 },
  { mountainName: "주왕산", stationName: "주왕산", mountainNum: "105", region: "경북", lat: 36.388, lng: 129.162 },
  { mountainName: "팔공산", stationName: "팔공산", mountainNum: "112", region: "경북", lat: 35.9914, lng: 128.6956 },
  { mountainName: "한라산", stationName: "한라산", mountainNum: "123", region: "제주", lat: 33.3617, lng: 126.5292 },
];

export const findKmaMountainStation = (mountainName: string) => {
  const normalized = normalizeMountainName(mountainName);

  return KMA_MOUNTAIN_STATIONS.find((station) => {
    const names = [station.mountainName, station.stationName, ...(station.aliases || [])];
    return names.some((name) => {
      const normalizedName = normalizeMountainName(name);
      return normalizedName === normalized || normalizedName.includes(normalized) || normalized.includes(normalizedName);
    });
  });
};
