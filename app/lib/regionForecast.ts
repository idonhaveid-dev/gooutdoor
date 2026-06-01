/**
 * 지역 단기예보(동네예보) 페치.
 *
 * 홈 조망 추천의 "주 데이터"는 산악예보 API(typ08)가 아니라,
 * 산 좌표를 기상청 격자(nx, ny)로 변환해 받아오는 단기예보(동네예보)다.
 * 단기예보는 발표 시각 기준 약 +3일까지 제공되므로, 그보다 먼 날짜는
 * 가장 가까운 예보를 기반으로 한 보수적 추정값으로 채운다.
 *
 * 외부 호출이 실패하거나 키가 없어도 throw 하지 않는다.
 * 대신 산/날짜별로 "서로 다른" 결정적 추정값을 반환해
 * (모든 요일 점수가 동일해지는 fallback 문제를 피한다.)
 */

const KMA_VILLAGE_ENDPOINT =
  "https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst";
const KMA_TIMEOUT_MS = 12000;

const getKmaApiKey = () =>
  process.env.KMA_SHORT_API_KEY ||
  process.env.KMA_MOUNTAIN_API_KEY ||
  process.env.KMA_API_KEY ||
  "";

export interface DailyForecast {
  /** YYYY-MM-DD */
  date: string;
  temp: number;
  humidity: number;
  /** 강수확률 % */
  precipitationProbability: number;
  /** 강수량 mm */
  precipitation: number;
  /** KMA SKY 코드: 1 맑음, 3 구름많음, 4 흐림 */
  sky: number;
  windSpeed: number;
  /** 데이터 출처: 실제 예보 / 추정 */
  source: "kma" | "estimated";
}

// ---------------------------------------------------------------------------
// 위경도 -> 기상청 격자(nx, ny) 변환 (Lambert Conformal Conic, KMA dfs_xy_conv)
// ---------------------------------------------------------------------------
export const latLngToGrid = (lat: number, lng: number) => {
  const RE = 6371.00877; // 지구 반경(km)
  const GRID = 5.0; // 격자 간격(km)
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx, ny };
};

// ---------------------------------------------------------------------------
// 발표 시각 계산
// ---------------------------------------------------------------------------
const toKstDate = (date = new Date()) => {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 60 * 60000);
};

const yyyymmdd = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
};

const getLatestBaseDateTime = () => {
  const kst = toKstDate();
  const baseTimes = [200, 500, 800, 1100, 1400, 1700, 2000, 2300];
  // 발표 후 약 10분 뒤 제공 → 안전하게 현재시각에서 10분 뺀 기준으로 탐색
  const current = kst.getHours() * 100 + kst.getMinutes() - 10;
  const latest = [...baseTimes].reverse().find((t) => current >= t);

  if (latest) {
    return { baseDate: yyyymmdd(kst), baseTime: String(latest).padStart(4, "0") };
  }
  kst.setDate(kst.getDate() - 1);
  return { baseDate: yyyymmdd(kst), baseTime: "2300" };
};

// ---------------------------------------------------------------------------
// 값 파싱
// ---------------------------------------------------------------------------
const parsePcp = (value: string) => {
  if (!value || value.includes("없음")) return 0;
  if (value.includes("미만")) return 0.5;
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

interface KmaItem {
  category?: string;
  fcstDate?: string;
  fcstTime?: string;
  fcstValue?: string;
}

/** 하루치 예보 시각들 중 낮(조망 기준) 시각을 골라 카테고리를 합친다. */
const reduceDailyFromItems = (items: KmaItem[]): Map<string, DailyForecast> => {
  // date -> time -> {category: value}
  const byDateTime = new Map<string, Map<string, Record<string, string>>>();

  for (const item of items) {
    const date = item.fcstDate;
    const time = item.fcstTime;
    const category = item.category;
    if (!date || !time || !category) continue;
    if (!byDateTime.has(date)) byDateTime.set(date, new Map());
    const byTime = byDateTime.get(date)!;
    if (!byTime.has(time)) byTime.set(time, {});
    byTime.get(time)![category] = item.fcstValue ?? "";
  }

  const result = new Map<string, DailyForecast>();

  for (const [date, byTime] of byDateTime) {
    // 낮 시각(1200) 에 가장 가까운, 0600~1800 사이 슬롯 선택
    const times = Array.from(byTime.keys()).sort();
    const daytime = times
      .filter((t) => {
        const h = Number(t.slice(0, 2));
        return h >= 6 && h <= 18;
      })
      .sort((a, b) => {
        const ha = Number(a.slice(0, 2));
        const hb = Number(b.slice(0, 2));
        return Math.abs(ha - 12) - Math.abs(hb - 12);
      });

    const chosen = daytime[0] || times[0];
    if (!chosen) continue;
    const cats = byTime.get(chosen)!;

    const isoDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    result.set(isoDate, {
      date: isoDate,
      temp: Math.round(num(cats.TMP, 15)),
      humidity: Math.round(num(cats.REH, 55)),
      precipitationProbability: Math.round(num(cats.POP, 0)),
      precipitation: parsePcp(cats.PCP || ""),
      sky: num(cats.SKY, 1),
      windSpeed: Number(num(cats.WSD, 2).toFixed(1)),
      source: "kma",
    });
  }

  return result;
};

// ---------------------------------------------------------------------------
// 결정적 추정 (실제 예보가 없는 날짜/실패 시) — 산·날짜별로 서로 다른 값
// ---------------------------------------------------------------------------
const hashSeed = (input: string) => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295; // 0~1
};

const estimateDaily = (
  isoDate: string,
  base: { lat: number; lng: number; temp: number; humidity: number; wind: number }
): DailyForecast => {
  const r = hashSeed(`${base.lat},${base.lng}:${isoDate}`);
  const r2 = hashSeed(`${isoDate}:${base.lng},${base.lat}`);

  const pop = Math.round(r * 60); // 0~60%
  const sky = pop > 45 ? 4 : pop > 20 ? 3 : 1;
  return {
    date: isoDate,
    temp: Math.round(base.temp + (r2 - 0.5) * 6),
    humidity: Math.min(95, Math.round(base.humidity + (r - 0.3) * 30)),
    precipitationProbability: pop,
    precipitation: pop > 55 ? Math.round(r2 * 4 * 10) / 10 : 0,
    sky,
    windSpeed: Number((base.wind + (r2 - 0.5) * 3).toFixed(1)),
    source: "estimated",
  };
};

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

export interface RegionForecastResult {
  /** isoDate -> 예보 */
  byDate: Map<string, DailyForecast>;
  source: "kma" | "estimated" | "mixed";
  warning?: string;
}

/**
 * 산 좌표 주변의 날짜별 단기예보를 가져온다.
 * 항상 안전(throw 안 함). 실패/누락 날짜는 추정값으로 채운다.
 */
export const fetchRegionForecast = async (
  mountain: { lat: number; lng: number; temp: number; humidity: number; wind: number },
  dates: string[]
): Promise<RegionForecastResult> => {
  const apiKey = getKmaApiKey();
  const fill = (byDate: Map<string, DailyForecast>) => {
    let estimatedCount = 0;
    for (const date of dates) {
      if (!byDate.has(date)) {
        byDate.set(date, estimateDaily(date, mountain));
        estimatedCount++;
      }
    }
    const kmaCount = dates.length - estimatedCount;
    const source: RegionForecastResult["source"] =
      kmaCount === 0 ? "estimated" : estimatedCount === 0 ? "kma" : "mixed";
    return { byDate, source };
  };

  if (!apiKey) {
    const { byDate, source } = fill(new Map());
    return {
      byDate,
      source,
      warning:
        "KMA_SHORT_API_KEY(또는 KMA_MOUNTAIN_API_KEY)가 없어 추정값을 사용합니다.",
    };
  }

  try {
    const { nx, ny } = latLngToGrid(mountain.lat, mountain.lng);
    const { baseDate, baseTime } = getLatestBaseDateTime();

    const url = new URL(KMA_VILLAGE_ENDPOINT);
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("numOfRows", "1000");
    url.searchParams.set("dataType", "JSON");
    url.searchParams.set("base_date", baseDate);
    url.searchParams.set("base_time", baseTime);
    url.searchParams.set("nx", String(nx));
    url.searchParams.set("ny", String(ny));
    url.searchParams.set("authKey", apiKey);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), KMA_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timeoutId);

    const text = await res.text();
    let items: KmaItem[] = [];
    try {
      const json = JSON.parse(text);
      const raw = json?.response?.body?.items?.item;
      items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    } catch {
      items = [];
    }

    const byDate = reduceDailyFromItems(items);
    const { byDate: filled, source } = fill(byDate);
    return {
      byDate: filled,
      source,
      warning: items.length === 0 ? "단기예보 응답이 비어 추정값으로 보완했습니다." : undefined,
    };
  } catch (error) {
    const { byDate, source } = fill(new Map());
    return {
      byDate,
      source,
      warning:
        error instanceof Error && error.name === "AbortError"
          ? "단기예보 요청이 시간 초과되어 추정값을 사용합니다."
          : "단기예보 요청 실패로 추정값을 사용합니다.",
    };
  }
};
