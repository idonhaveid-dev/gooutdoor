import { findKmaMountainStation } from "@/app/data/kmaMountainStations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const forecastCache = new Map<
  string,
  {
    savedAt: number;
    data: unknown;
  }
>();

const KMA_CACHE_TTL_MS = 1000 * 60 * 60 * 2;
const KMA_MOUNTAIN_WEATHER_ENDPOINT =
  "https://apihub.kma.go.kr/api/typ08/getMountainWeather";
const KMA_TIMEOUT_MS = 15000;

const getKmaApiKey = () =>
  process.env.KMA_MOUNTAIN_API_KEY || process.env.KMA_API_KEY || "";

const toKstDate = (date = new Date()) => {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 60 * 60000);
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

const getLatestBaseTime = (date = new Date()) => {
  const kst = toKstDate(date);
  const baseTimes = [200, 500, 800, 1100, 1400, 1700, 2000, 2300];
  const current = kst.getHours() * 100 + kst.getMinutes();
  const latest = [...baseTimes].reverse().find((time) => current >= time);

  if (latest) {
    return {
      baseDate: formatDate(kst),
      baseTime: String(latest).padStart(4, "0"),
    };
  }

  kst.setDate(kst.getDate() - 1);
  return {
    baseDate: formatDate(kst),
    baseTime: "2300",
  };
};

const parseDelimitedText = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (lines.length === 0) return [];

  const headerIndex = lines.findIndex((line) => /TM|REG|SKY|TMP|POP|WSD/.test(line));
  const headers =
    headerIndex >= 0
      ? lines[headerIndex].split(/\s+/)
      : ["tm", "mountainNum", "sky", "tmp", "pcp", "sno", "pop", "vec", "wsd", "reh"];

  return lines
    .slice(headerIndex >= 0 ? headerIndex + 1 : 0)
    .map((line) => {
      const values = line.split(/\s+/);
      return headers.reduce<Record<string, string>>((record, header, index) => {
        record[header.toLowerCase()] = values[index] || "";
        return record;
      }, {});
    })
    .filter((item) => Object.keys(item).length > 0);
};

const normalizeItem = (item: Record<string, string>) => {
  const get = (...keys: string[]) =>
    keys.map((key) => item[key.toLowerCase()]).find((value) => value !== undefined && value !== "") || "";

  return {
    forecastTime: get("tm", "fcstTime", "forecastTime", "tmEf"),
    sky: Number(get("sky", "SKY") || 3),
    temp: Number(get("tmp", "TMP") || 18),
    precipitation: Number(get("pcp", "PCP") || 0),
    snow: Number(get("sno", "SNO") || 0),
    precipitationProbability: Number(get("pop", "POP") || 0),
    windDirection: Number(get("vec", "VEC") || 0),
    windSpeed: Number(get("wsd", "WSD") || 0),
    humidity: Number(get("reh", "REH") || 0),
    raw: item,
  };
};

const toLowerCaseRecord = (item: Record<string, unknown>) =>
  Object.entries(item).reduce<Record<string, string>>((record, [key, value]) => {
    record[key.toLowerCase()] = String(value ?? "");
    return record;
  }, {});

const parseForecastNumber = (value: string) => {
  if (!value || value.includes("없음")) return 0;
  if (value.includes("미만")) return 0.5;
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

const normalizeCategoryRows = (rows: Record<string, string>[], selectedDate = "") => {

  const buckets = new Map<string, Record<string, string>>();

  rows.forEach((row) => {
    const item = toLowerCaseRecord(row);
const fcstDate = item.fcstdate || item.fcstbase || item.fcst_date || item.date || "";
const fcstTime = item.fcsttime || item.fcst_time || item.time || "";
const category = (item.category || item.cat || "").toUpperCase();
const value = item.fcstvalue || item.fcst_value || item.value || "";

if (!fcstDate || !fcstTime || !category) return;

if (selectedDate && fcstDate !== selectedDate) return;

const hour = Number(fcstTime.slice(0, 2));
if (hour < 4 || hour > 15) return;

    const key = `${fcstDate}${fcstTime}`;
    const bucket = buckets.get(key) || {
      forecastTime: `${fcstDate}${fcstTime}`,
      mountainNum: item.mountainnum || "",
      baseDate: item.basedate || "",
      baseTime: item.basetime || item.basttime || "",
      lat: item.lat || "",
      lon: item.lon || "",
      alt: item.alt || "",
      stationName: item.stn_nm || "",
    };

    bucket[category.toLowerCase()] = value;
    buckets.set(key, bucket);
  });

  return Array.from(buckets.values()).map((item) => ({
    forecastTime: item.forecastTime,
    sky: parseForecastNumber(item.sky || "3"),
    temp: parseForecastNumber(item.tmp || "18"),
    precipitation: parseForecastNumber(item.pcp || "0"),
    snow: parseForecastNumber(item.sno || "0"),
    precipitationProbability: parseForecastNumber(item.pop || "0"),
    windDirection: parseForecastNumber(item.vec || "0"),
    windSpeed: parseForecastNumber(item.wsd || "0"),
    humidity: parseForecastNumber(item.reh || "60"),
    stationName: item.stationName,
    lat: parseForecastNumber(item.lat || "0"),
    lon: parseForecastNumber(item.lon || "0"),
    alt: parseForecastNumber(item.alt || "0"),
    raw: item,
  }));
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mountainName = searchParams.get("mountain")?.trim() || "";
  const mountainNumParam = searchParams.get("mountainNum")?.trim() || "";
  const station = mountainName ? findKmaMountainStation(mountainName) : null;
  const mountainNum = mountainNumParam || station?.mountainNum || "";
  const baseDateParam = searchParams.get("base_date") || searchParams.get("baseDate");
  const baseTimeParam = searchParams.get("base_time") || searchParams.get("baseTime");
  const selectedDate = searchParams.get("date")?.replace(/-/g, "") || "";
  const latest = getLatestBaseTime();

  const baseDate = baseDateParam || latest.baseDate;
  const baseTime = baseTimeParam || latest.baseTime;
  const apiKey = getKmaApiKey();

  if (!apiKey) {
    return Response.json(
      { ok: false, error: "KMA_MOUNTAIN_API_KEY is not configured.", forecasts: [] },
      { status: 500 }
    );
  }

  if (!mountainNum) {
    return Response.json(
      {
        ok: false,
        error: "Unknown KMA mountain station. Add mountainNum mapping first.",
        mountain: mountainName,
        forecasts: [],
      },
      { status: 400 }
    );
  }
  const cacheKey = [
    mountainNum,
    baseDate,
    baseTime,
    selectedDate || "all",
  ].join(":");

  const cached = forecastCache.get(cacheKey);

  if (cached && Date.now() - cached.savedAt < KMA_CACHE_TTL_MS) {
    return Response.json(cached.data);
  }
  const url = new URL(KMA_MOUNTAIN_WEATHER_ENDPOINT);
  url.searchParams.set("mountainNum", mountainNum);
  url.searchParams.set("base_date", baseDate);
  url.searchParams.set("base_time", baseTime);
  url.searchParams.set("authKey", apiKey);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), KMA_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";
    let rows: Record<string, string>[] = [];

    if (contentType.includes("json") || text.trim().startsWith("{") || text.trim().startsWith("[")) {
      const json = JSON.parse(text);
      const items =
        Array.isArray(json)
          ? json
          : json?.response?.body?.items?.item ||
        json?.items ||
        json?.data ||
        json?.result ||
        [];
      rows = Array.isArray(items) ? items : [items];
    } else {
      rows = parseDelimitedText(text);
    }

    const hasCategoryRows = rows.some((row) => {
      const item = toLowerCaseRecord(row);
      return Boolean(item.category && (item.fcstvalue || item.fcst_value));
    });
    const forecasts = hasCategoryRows
  ? normalizeCategoryRows(rows, selectedDate)
  : rows.map((row) => normalizeItem(toLowerCaseRecord(row)));

    if (!response.ok) {
  return Response.json(
    {
      ok: false,
      source: "kma:getMountainWeather",
      error: "KMA mountain weather request failed.",
      status: response.status,
      mountain: mountainName,
      mountainNum,
      station,
      baseDate,
      baseTime,
      rawPreview: text.slice(0, 500),
      forecasts,
    },
    { status: response.status }
  );
}

if (forecasts.length === 0) {
  const payload = {
    ok: true,
    source: "kma:getMountainWeather",
    mountain: mountainName || station?.mountainName || "",
    mountainNum,
    station,
    baseDate,
    baseTime,
    totalCount: 0,
    forecasts: [],
    warning: "KMA mountain weather returned no forecast rows.",
    rawPreview: text.slice(0, 500),
  };

  forecastCache.set(cacheKey, {
    savedAt: Date.now(),
    data: payload,
  });

  return Response.json(payload);
}

        const payload = {
      ok: true,
      source: "kma:getMountainWeather",
      mountain: mountainName || station?.mountainName || "",
      mountainNum,
      station,
      baseDate,
      baseTime,
      totalCount: forecasts.length,
      forecasts,
    };

    forecastCache.set(cacheKey, {
      savedAt: Date.now(),
      data: payload,
    });

    return Response.json(payload);
  } catch (error) {
  const payload = {
    ok: true,
    source: "kma:getMountainWeather",
    mountain: mountainName || station?.mountainName || "",
    mountainNum,
    station,
    baseDate,
    baseTime,
    totalCount: 0,
    forecasts: [],
    warning:
      error instanceof Error && error.name === "AbortError"
        ? "KMA mountain weather request timed out."
        : error instanceof Error
          ? error.message
          : "Unknown KMA mountain weather error.",
  };

  forecastCache.set(cacheKey, {
    savedAt: Date.now(),
    data: payload,
  });

  return Response.json(payload);
}
}
