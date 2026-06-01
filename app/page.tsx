"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    naver: any;
  }
}

type TabId = "HOME" | "EXPLORE" | "MAP" | "ARCHIVE";
type TrailDifficulty = "easy" | "moderate" | "hard";

interface MountainInfo {
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

interface ViewRecommendation extends MountainInfo {
  score: number;
  /** 예상 조망지수 / 조망 가능성 (0~100) */
  viewIndex: number;
  visibilityKm: number;
  precipitationProbability: number;
  windSpeed: number;
  bestDay: string;
  viewMessage: string;
}

interface WeekendRecommendation {
  bestDay: string;
  saturdayTemp: number;
  saturdayCond: string;
  sundayTemp: number;
  sundayCond: string;
  recommendationMessage: string;
}

interface LocalMountainProfile {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  elevationM?: number;
  isNationalPark?: boolean;
  tags?: string[];
  summary?: string;
}

interface TrailPoint {
  lat: number;
  lng: number;
}

interface LocalTrail {
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
  difficulty: TrailDifficulty;
  routeType: string;
  tags: string[];
  source: string;
  path?: TrailPoint[];
}

interface HikingRecord {
  id: string;
  date: string;
  title?: string;
  mountainName: string;
  duration: string;
  movingDuration?: string;
  distanceKm?: number;
  averageSpeedKmh?: number;
    path?: TrackingSample[];

  pointCount: number;
  weather: string;
  comment: string;
  rating: number;
  thumbnail: string;
}

interface TrackingSample {
  lat: number;
  lng: number;
  ts: number;
  altitude?: number | null;
}

interface KeywordCount {
  text: string;
  count: number;
}

const MOUNTAINS: MountainInfo[] = [
  { name: "북한산", region: "수도권/경기", lat: 37.6584, lng: 126.9782, difficulty: "중급", distance: "2.6km", time: "1시간 30분", reason: "서울 도심 접근성이 좋고 조망 확인에 적합합니다.", temp: 18, humidity: 45, pop: 0, wind: 2.1, visibility: 20 },
  { name: "관악산", region: "수도권/경기", lat: 37.4444, lng: 126.9639, difficulty: "중급", distance: "3.2km", time: "2시간", reason: "짧은 산행과 도심 조망을 함께 보기 좋습니다.", temp: 19, humidity: 40, pop: 0, wind: 1.5, visibility: 18 },
  { name: "도봉산", region: "수도권/경기", lat: 37.6894, lng: 127.0161, difficulty: "상급", distance: "4.5km", time: "3시간", reason: "능선 조망과 암릉 조건을 확인하기 좋습니다.", temp: 17, humidity: 38, pop: 0, wind: 3.0, visibility: 20 },
  { name: "설악산", region: "강원", lat: 38.1194, lng: 128.4656, difficulty: "상급", distance: "5.8km", time: "4시간", reason: "고산 조망과 풍속 변화가 중요한 대표 산입니다.", temp: 14, humidity: 50, pop: 10, wind: 4.2, visibility: 25 },
  { name: "오대산", region: "강원", lat: 37.7946, lng: 128.5436, difficulty: "중급", distance: "6.4km", time: "3시간", reason: "완만한 능선과 숲길이 많아 산행 컨디션을 보기 좋습니다.", temp: 14, humidity: 55, pop: 10, wind: 2.4, visibility: 18 },
  { name: "치악산", region: "강원", lat: 37.3651, lng: 128.0556, difficulty: "상급", distance: "7.0km", time: "4시간", reason: "고도차가 커 바람과 가시거리 조건을 함께 봅니다.", temp: 15, humidity: 52, pop: 10, wind: 2.7, visibility: 18 },
  { name: "태백산", region: "강원", lat: 37.0969, lng: 128.915, difficulty: "중급", distance: "4.4km", time: "2시간 30분", reason: "능선 조망이 좋아 가시거리와 풍속 변화가 중요합니다.", temp: 13, humidity: 55, pop: 10, wind: 3.1, visibility: 22 },
  { name: "속리산", region: "충북", lat: 36.5333, lng: 127.85, difficulty: "중급", distance: "4.1km", time: "2시간 30분", reason: "암릉 구간 산행과 조망 조건을 함께 확인합니다.", temp: 19, humidity: 44, pop: 0, wind: 2.0, visibility: 17 },
  { name: "월악산", region: "충북", lat: 36.8895, lng: 128.1065, difficulty: "상급", distance: "6.0km", time: "4시간", reason: "암릉과 정상 조망이 강한 산입니다.", temp: 16, humidity: 50, pop: 10, wind: 2.8, visibility: 19 },
  { name: "계룡산", region: "충남", lat: 36.3551, lng: 127.2061, difficulty: "중급", distance: "3.4km", time: "2시간 10분", reason: "능선 산행과 조망 조건을 확인합니다.", temp: 20, humidity: 48, pop: 0, wind: 1.9, visibility: 16 },
  { name: "내장산", region: "전북", lat: 35.4419, lng: 126.8889, difficulty: "초급", distance: "2.8km", time: "1시간 40분", reason: "가벼운 산행과 경관 감상에 좋습니다.", temp: 21, humidity: 52, pop: 0, wind: 1.2, visibility: 19 },
  { name: "덕유산", region: "전북", lat: 35.859, lng: 127.7463, difficulty: "중급", distance: "5.0km", time: "3시간", reason: "고지대 능선 조망이 좋아 구름량과 풍속을 확인합니다.", temp: 13, humidity: 58, pop: 10, wind: 3.2, visibility: 21 },
  { name: "무등산", region: "전남", lat: 35.1436, lng: 126.9936, difficulty: "중급", distance: "5.1km", time: "3시간", reason: "입석대 조망 조건을 확인합니다.", temp: 22, humidity: 45, pop: 0, wind: 2.1, visibility: 21 },
  { name: "월출산", region: "전남", lat: 34.7676, lng: 126.7041, difficulty: "상급", distance: "6.1km", time: "4시간", reason: "바위 능선 조망이 강한 산입니다.", temp: 20, humidity: 55, pop: 10, wind: 2.9, visibility: 20 },
  { name: "소백산", region: "경북", lat: 36.9583, lng: 128.455, difficulty: "상급", distance: "6.0km", time: "4시간", reason: "고지대 바람과 가시거리를 확인합니다.", temp: 15, humidity: 50, pop: 0, wind: 2.8, visibility: 23 },
  { name: "가야산", region: "경남", lat: 35.8233, lng: 128.1205, difficulty: "상급", distance: "4.8km", time: "3시간 30분", reason: "정상부 바위 능선 조망이 좋은 산입니다.", temp: 17, humidity: 52, pop: 10, wind: 2.6, visibility: 20 },
  { name: "지리산", region: "경남", lat: 35.3369, lng: 127.7306, difficulty: "상급", distance: "6.5km", time: "5시간", reason: "장거리 산행과 조망 조건을 확인합니다.", temp: 13, humidity: 58, pop: 5, wind: 3.1, visibility: 22 },
  { name: "한라산", region: "제주", lat: 33.3617, lng: 126.5292, difficulty: "상급", distance: "9.6km", time: "8시간", reason: "정상 조망과 날씨 변화가 중요합니다.", temp: 12, humidity: 60, pop: 0, wind: 3.5, visibility: 30 },
];

const MOUNTAIN_DB = MOUNTAINS.reduce<Record<string, MountainInfo[]>>((acc, mountain) => {
  acc[mountain.region] = [...(acc[mountain.region] || []), mountain];
  return acc;
}, {});

const toDateValue = (date: Date) => {
  const kst = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return kst.toISOString().slice(0, 10);
};

const getForecastDates = () => {
  const now = new Date();
  const start = new Date(now);

  // 오후 3시 이후에는 오늘 입산 추천은 제외하고 내일부터 보여줌
  if (now.getHours() >= 15) {
    start.setDate(start.getDate() + 1);
  }

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toDateValue(date);
  });
};

const getDateLabel = (dateValue: string) => {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return { weekday, shortDate: `${month}. ${day}.` };
};

const normalizeForecastTime = (value = "") => {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)} ${digits.slice(8, 10)}:00`;
  }
  return value;
};

const formatForecastDate = (dateText: string) => {
  if (!dateText || dateText === "예보 대기") return "예보 대기";
  const normalized = normalizeForecastTime(dateText);
  const date = new Date(normalized.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return dateText;
  const label = getDateLabel(toDateValue(date));
  return `${label.shortDate} ${label.weekday}요일 ${date.getHours()}시 기준`;
};

const formatTrailMinutes = (minutes?: number) => {
  if (!minutes) return "-";
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  if (hours <= 0) return `${remain}분`;
  return remain ? `${hours}시간 ${remain}분` : `${hours}시간`;
};

const formatDuration = (ms: number) => {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}분`;
  return minutes ? `${hours}시간 ${minutes}분` : `${hours}시간`;
};

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const radius = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const calculateHeading = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const calculateDistanceKm = (samples: TrackingSample[]) =>
  samples.reduce((sum, sample, index) => {
    if (index === 0) return 0;
    const prev = samples[index - 1];
    return sum + haversineKm(prev, sample);
  }, 0);
const calculateMovingMs = (samples: TrackingSample[]) => {
  if (samples.length < 2) return 0;

  return samples.reduce((sum, sample, index) => {
    if (index === 0) return 0;

    const prev = samples[index - 1];
    const distanceKm = haversineKm(prev, sample);
    const elapsedMs = sample.ts - prev.ts;

    if (elapsedMs <= 0) return sum;

    const speedKmh = distanceKm / (elapsedMs / 3600000);

    // 0.1km/h 이상 움직인 구간만 이동시간으로 계산
    if (speedKmh >= 0.1) {
      return sum + elapsedMs;
    }

    return sum;
  }, 0);
};
const calculateViewScore = (data: {
  visibilityKm: number;
  precipitationProbability: number;
  windSpeed: number;
  temp?: number;
}) => {
  let score = 100;
  if (data.visibilityKm < 25) score -= (25 - data.visibilityKm) * 2;
  if (data.precipitationProbability > 0) score -= data.precipitationProbability * 0.45;
  if (data.windSpeed > 5) score -= (data.windSpeed - 5) * 4;
  if (typeof data.temp === "number") {
    if (data.temp < -5) score -= Math.abs(data.temp + 5) * 2;
    if (data.temp > 20) score -= (data.temp - 20) * 2.5;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
};

const getViewMessage = (rec: ViewRecommendation) => {
  if (rec.precipitationProbability >= 60) return "비 예보가 있어 조망 산행은 아쉬울 수 있어요.";
  if (rec.visibilityKm >= 20 && rec.windSpeed <= 4) return "멀리까지 선명하게 보일 가능성이 높은 날이에요.";
  if (rec.visibilityKm >= 10) return "가시거리와 강수 조건이 좋아 정상 조망을 기대하기 좋은 날이에요.";
  if (rec.windSpeed >= 8) return "바람이 강해 능선 산행은 주의가 필요해요.";
  return "조망은 다소 흐릴 수 있지만 가벼운 산행은 가능해요.";
};

const getTrailDifficultyLabel = (difficulty: TrailDifficulty) => {
  if (difficulty === "easy") return "쉬움";
  if (difficulty === "moderate") return "보통";
  return "어려움";
};

const getTrailRouteTypeLabel = (routeType: string) => {
  if (routeType === "round-trip") return "왕복";
  if (routeType === "one-way") return "편도";
  if (routeType === "loop") return "순환";
  if (routeType === "traverse") return "종주";
  return routeType;
};

export default function Home() {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const trailMapRef = useRef<any>(null);
  const trailPolylineRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const samplesRef = useRef<TrackingSample[]>([]);
  const hasCenteredOnStartRef = useRef(false);
  const recordMapRef = useRef<any>(null);
const recordPolylineRef = useRef<any>(null);

  const forecastDates = useMemo(() => getForecastDates(), []);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState("");
  const [userPw, setUserPw] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("HOME");
  const [selectedForecastDate, setSelectedForecastDate] = useState(forecastDates[0]);
  const [selectedWeatherRegion, setSelectedWeatherRegion] = useState("수도권/경기");
  const [selectedWeatherMountain, setSelectedWeatherMountain] = useState("북한산");
  const [viewRecommendations, setViewRecommendations] = useState<ViewRecommendation[]>([]);
  const [loadingViewRecommendations, setLoadingViewRecommendations] = useState(false);
  const [recommendationByDate, setRecommendationByDate] = useState<
  Record<string, ViewRecommendation[]>
>({});
  const recommendationCacheRef = useRef<Record<string, ViewRecommendation[]>>({});
  const [weekendData, setWeekendData] = useState<WeekendRecommendation | null>(null);
  const [selectedMountainProfile, setSelectedMountainProfile] = useState<LocalMountainProfile | null>(null);
  const [selectedMountainTrails, setSelectedMountainTrails] = useState<LocalTrail[]>([]);
  const [selectedMountainForecasts, setSelectedMountainForecasts] = useState<any[]>([]);
  const [loadingMountainDetails, setLoadingMountainDetails] = useState(false);
  const [loadingSelectedMountainForecast, setLoadingSelectedMountainForecast] = useState(false);
  const [popularMountains, setPopularMountains] = useState<KeywordCount[]>([]);
  const [myRecords, setMyRecords] = useState<HikingRecord[]>([]);
  const [showCourseDetail, setShowCourseDetail] = useState(false);
  const [activeDetailCourse, setActiveDetailCourse] = useState<MountainInfo | null>(null);
const [selectedTrail, setSelectedTrail] = useState<LocalTrail | null>(null);
const [selectedTrailPaths, setSelectedTrailPaths] = useState<TrailPoint[][]>([]);
  const [shareRecord, setShareRecord] = useState<HikingRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<HikingRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [recordTitle, setRecordTitle] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
   const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [mapStatus, setMapStatus] = useState("지도 준비 중...");
  const [isNaverMapReady, setIsNaverMapReady] = useState(false);

  const activeViewRecommendation =
    activeDetailCourse && "score" in activeDetailCourse
      ? (activeDetailCourse as ViewRecommendation)
      : null;

  const getSelectedMountain = () =>
    MOUNTAINS.find((mountain) => mountain.name === selectedWeatherMountain) || MOUNTAINS[0];

  const getPopularMountainStorageKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const firstDay = new Date(year, 0, 1);
    const week = Math.ceil((((now.getTime() - firstDay.getTime()) / 86400000) + firstDay.getDay() + 1) / 7);
    return `gooutdoor_popular_mountains_${year}-W${week}`;
  };

  const loadPopularMountains = () => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(getPopularMountainStorageKey()) || "[]") as KeywordCount[];
  };

  const trackMountainView = (mountainName: string) => {
    if (!mountainName || typeof window === "undefined") return;
    const key = getPopularMountainStorageKey();
    const current = JSON.parse(localStorage.getItem(key) || "[]") as KeywordCount[];
    const next = current.some((item) => item.text === mountainName)
      ? current.map((item) => item.text === mountainName ? { ...item, count: item.count + 1 } : item)
      : [...current, { text: mountainName, count: 1 }];
    const sorted = next.sort((a, b) => b.count - a.count).slice(0, 5);
    localStorage.setItem(key, JSON.stringify(sorted));
    setPopularMountains(sorted);
  };

  const initMap = (lat?: number, lng?: number) => {
    if (!process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID) {
      setMapStatus("네이버 지도 Client ID가 없습니다. 환경변수를 확인하세요.");
      return false;
    }
    if (!document.getElementById("map")) {
      setMapStatus("지도 컨테이너를 찾지 못했습니다.");
      return false;
    }
    if (!window.naver?.maps) {
      setMapStatus("네이버 지도 SDK 대기 중...");
      return false;
    }

    const fallback = getSelectedMountain();
    const center = new window.naver.maps.LatLng(lat ?? fallback.lat, lng ?? fallback.lng);

    if (!mapRef.current) {
      mapRef.current = new window.naver.maps.Map("map", {
        center,
        zoom: 15,
        logoControl: false,
        mapDataControl: false,
      });
      markerRef.current = new window.naver.maps.Marker({
        position: center,
        map: mapRef.current,
        icon: {
          content: `<div style="width:18px;height:18px;background:#0071e3;border:3px solid white;border-radius:999px;box-shadow:0 8px 18px rgba(0,0,0,.25)"></div>`,
          anchor: new window.naver.maps.Point(9, 9),
        },
      });
      polylineRef.current = new window.naver.maps.Polyline({
        map: mapRef.current,
        path: [],
        strokeColor: "#22c55e",
        strokeWeight: 6,
        strokeOpacity: 0.85,
      });
    }

    mapRef.current.setCenter(center);
    markerRef.current?.setPosition(center);

    requestAnimationFrame(() => {
      if (!mapRef.current || !window.naver?.maps) return;
      window.naver.maps.Event.trigger(mapRef.current, "resize");
      mapRef.current.setCenter(center);
    });

    setTimeout(() => {
      if (!mapRef.current || !window.naver?.maps) return;
      window.naver.maps.Event.trigger(mapRef.current, "resize");
      mapRef.current.setCenter(center);
    }, 300);
    setMapStatus("지도 생성 완료");
    return true;
  };

  useEffect(() => {
    const saved = localStorage.getItem("auto_login_session");
    if (saved === "true") setIsLoggedIn(true);
    setPopularMountains(loadPopularMountains());
    setCheckingSession(false);
  }, []);

  useEffect(() => {
    if (activeTab === "ARCHIVE") {
      setMyRecords(JSON.parse(localStorage.getItem("hiking_records") || "[]"));
    }
  }, [activeTab]);

  useEffect(() => {
  if (!isLoggedIn) return;
  preloadViewRecommendations();
}, [isLoggedIn]);

useEffect(() => {
  const cached = recommendationByDate[selectedForecastDate];

  if (cached) {
    setViewRecommendations(cached);
  }
}, [selectedForecastDate, recommendationByDate]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchMountainDetails(selectedWeatherMountain);
    fetchSelectedMountainForecast(selectedWeatherMountain, selectedForecastDate);
  }, [isLoggedIn, selectedWeatherMountain, selectedForecastDate]);

  useEffect(() => {
    if (activeTab !== "MAP") return;
    if (!isNaverMapReady || !window.naver?.maps) return;

    const fallback = currentLocation || getSelectedMountain();

    setTimeout(() => {
      initMap(fallback.lat, fallback.lng);
    }, 120);
  }, [
    activeTab,
    isNaverMapReady,
    selectedWeatherMountain,
    selectedWeatherRegion,
  ]);
  useEffect(() => {
  if (!selectedTrail) {
    setSelectedTrailPaths([]);
    return;
  }

  if (selectedTrail.id !== "dobongsan-sinseondae") {
    setSelectedTrailPaths([]);
    return;
  }

fetch("/api/trails/gpx?id=dobongsan-jaunbong&course=dobongsan-sinseondae")
    .then((res) => res.json())
    .then((data) => {
      setSelectedTrailPaths(Array.isArray(data.paths) ? data.paths : []);
    })
    .catch(() => {
      setSelectedTrailPaths([]);
    });
}, [selectedTrail]);
useEffect(() => {
  if (!selectedTrail || !window.naver?.maps) return;

  const mountain =
    MOUNTAINS.find((item) => item.name === selectedTrail.mountainName) ||
    getSelectedMountain();

  setTimeout(() => {
    const element = document.getElementById("trail-map");
    if (!element || !window.naver?.maps) return;

    const gpxPaths = selectedTrailPaths.map((segment) =>
      segment.map((point) => new window.naver.maps.LatLng(point.lat, point.lng))
    );

    const localPath = selectedTrail.path
      ? [
          selectedTrail.path.map(
            (point) => new window.naver.maps.LatLng(point.lat, point.lng)
          ),
        ]
      : [];

    const drawablePaths = gpxPaths.length > 0 ? gpxPaths : localPath;

    const center =
      drawablePaths[0]?.[0] ||
      new window.naver.maps.LatLng(mountain.lat, mountain.lng);

    trailMapRef.current = new window.naver.maps.Map(element, {
      center,
      zoom: drawablePaths.length > 0 ? 13 : 13,
      logoControl: false,
      mapDataControl: false,
    });

    if (drawablePaths.length > 0) {
      const bounds = new window.naver.maps.LatLngBounds();

      drawablePaths.forEach((segment) => {
        segment.forEach((point) => bounds.extend(point));

        new window.naver.maps.Polyline({
          map: trailMapRef.current,
          path: segment,
          strokeColor: "#2563eb",
          strokeWeight: 3,
          strokeOpacity: 0.65,
        });
      });

      trailMapRef.current.fitBounds(bounds);
    } else {
      new window.naver.maps.Marker({
        position: center,
        map: trailMapRef.current,
      });
    }

    setTimeout(() => {
      if (!trailMapRef.current || !window.naver?.maps) return;

      window.naver.maps.Event.trigger(trailMapRef.current, "resize");

      if (drawablePaths.length > 0) {
        const bounds = new window.naver.maps.LatLngBounds();
        drawablePaths.forEach((segment) => {
          segment.forEach((point) => bounds.extend(point));
        });
        trailMapRef.current.fitBounds(bounds);
      } else {
        trailMapRef.current.setCenter(center);
      }
    }, 200);
  }, 100);
}, [selectedTrail, selectedTrailPaths]);
useEffect(() => {
  if (!detailRecord || !window.naver?.maps) return;
  if (!detailRecord.path || detailRecord.path.length === 0) return;

  setTimeout(() => {
    const element = document.getElementById("record-map");
    if (!element || !window.naver?.maps) return;

    const first = detailRecord.path![0];
    const center = new window.naver.maps.LatLng(first.lat, first.lng);

    recordMapRef.current = new window.naver.maps.Map(element, {
      center,
      zoom: 15,
      logoControl: false,
      mapDataControl: false,
    });

    const naverPath = detailRecord.path!.map(
      (point) => new window.naver.maps.LatLng(point.lat, point.lng)
    );

    recordPolylineRef.current = new window.naver.maps.Polyline({
      map: recordMapRef.current,
      path: naverPath,
      strokeColor: "#22c55e",
      strokeWeight: 5,
      strokeOpacity: 0.9,
    });

    new window.naver.maps.Marker({
      position: naverPath[0],
      map: recordMapRef.current,
    });

    new window.naver.maps.Marker({
      position: naverPath[naverPath.length - 1],
      map: recordMapRef.current,
    });

    const bounds = new window.naver.maps.LatLngBounds();
    naverPath.forEach((point) => bounds.extend(point));
    recordMapRef.current.fitBounds(bounds);
  }, 120);
}, [detailRecord]);
const preloadViewRecommendations = async () => {
  setLoadingViewRecommendations(true);

  try {
    const entries = await Promise.all(
      forecastDates.map(async (dateValue) => {
        const res = await fetch(
          `/api/kma/view-recommendations?date=${dateValue}`
        );

        const data = await res.json();

        if (!data.ok) {
          return [dateValue, []] as const;
        }

        return [dateValue, data.recommendations || []] as const;
      })
    );

    const nextCache = Object.fromEntries(entries) as Record<
      string,
      ViewRecommendation[]
    >;

    setRecommendationByDate(nextCache);
    setViewRecommendations(nextCache[selectedForecastDate] || []);
  } catch (error) {
    console.warn("preload view recommendations failed", error);
    setRecommendationByDate({});
    setViewRecommendations([]);
  } finally {
    setLoadingViewRecommendations(false);
  }
};
  const fetchViewRecommendations = async () => {
  setLoadingViewRecommendations(true);

  try {
    const res = await fetch(
      `/api/kma/view-recommendations?date=${selectedForecastDate}&refresh=1`
    );

    const data = await res.json();

    if (!data.ok) {
      throw new Error(data.error || "추천 데이터를 불러오지 못했습니다.");
    }

    const recommendations = data.recommendations || [];

    setRecommendationByDate((prev) => ({
      ...prev,
      [selectedForecastDate]: recommendations,
    }));

    setViewRecommendations(recommendations);
  } catch (error) {
    console.warn("view recommendation fetch failed", error);
    setViewRecommendations([]);
  } finally {
    setLoadingViewRecommendations(false);
  }
};

  const fetchSelectedMountainForecast = async (mountainName: string, dateValue: string) => {
    setLoadingSelectedMountainForecast(true);
    try {
      const res = await fetch(`/api/kma/mountain-weather?mountain=${encodeURIComponent(mountainName)}&date=${dateValue}`);
      const data = await res.json();
      setSelectedMountainForecasts(Array.isArray(data.forecasts) ? data.forecasts : []);
    } catch (error) {
      console.warn("selected mountain forecast failed", error);
      setSelectedMountainForecasts([]);
    } finally {
      setLoadingSelectedMountainForecast(false);
    }
  };

  const fetchMountainDetails = async (mountainName: string) => {
    setLoadingMountainDetails(true);
    try {
      const [mountainRes, trailsRes] = await Promise.all([
        fetch(`/api/mountains?query=${encodeURIComponent(mountainName)}`),
        fetch(`/api/national-parks/trails?mountain=${encodeURIComponent(mountainName)}`),
      ]);
      const mountainData = await mountainRes.json();
      const trailsData = await trailsRes.json();
      setSelectedMountainProfile(mountainData.mountain || mountainData.mountains?.[0] || null);
      setSelectedMountainTrails(Array.isArray(trailsData.trails) ? trailsData.trails : []);
    } catch (error) {
      console.warn("mountain details failed", error);
      setSelectedMountainProfile(null);
      setSelectedMountainTrails([]);
    } finally {
      setLoadingMountainDetails(false);
    }
  };

  const fetchWeekendForecast = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max&timezone=Asia%2FSeoul`);
      const data = await res.json();
      const getCond = (code: number) => code === 0 ? "맑음" : code <= 3 ? "흐림" : "비 예보";
      setWeekendData({
        bestDay: "토요일 추천",
        saturdayTemp: Math.round(data.daily.temperature_2m_max[4]),
        saturdayCond: getCond(data.daily.weather_code[4]),
        sundayTemp: Math.round(data.daily.temperature_2m_max[5]),
        sundayCond: getCond(data.daily.weather_code[5]),
        recommendationMessage: "데이터 분석 결과, 이번 주말은 산행하기에 쾌적한 지표를 보입니다.",
      });
    } catch (error) {
      console.warn(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auto_login_session");
    setIsLoggedIn(false);
    setActiveTab("HOME");
    setUserId("");
    setUserPw("");
  };

  const handleStartTracking = () => {
    setActiveTab("MAP");
    setStartTime(Date.now());
    setRecordTitle("");
    setComment("");
    setRating(5);
    samplesRef.current = [];
    hasCenteredOnStartRef.current = false;
    setIsTracking(true);
    setMapStatus("실시간 위치 추적 중");

    if (!navigator.geolocation) {
      alert("이 브라우저에서는 위치 기능을 사용할 수 없습니다.");
      setIsTracking(false);
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const sample: TrackingSample = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          ts: Date.now(),
          altitude: position.coords.altitude,
        };
        const previous = samplesRef.current.at(-1);
        samplesRef.current = [...samplesRef.current, sample];
        setCurrentLocation({ lat: sample.lat, lng: sample.lng });
        if (previous) setCurrentHeading(calculateHeading(previous, sample));

        if (!window.naver?.maps) {
          setMapStatus("GPS 위치 확인 완료, 지도 SDK 대기 중...");
          return;
        }

        const pos = new window.naver.maps.LatLng(sample.lat, sample.lng);

        if (!mapRef.current) {
          initMap(sample.lat, sample.lng);
        }

        markerRef.current?.setPosition(pos);

        const nextPath = samplesRef.current.map(
          (item) => new window.naver.maps.LatLng(item.lat, item.lng)
        );

        polylineRef.current?.setPath(nextPath);

        if (!hasCenteredOnStartRef.current && mapRef.current) {
          mapRef.current.setCenter(pos);
          hasCenteredOnStartRef.current = true;
        }
      },
      (error) => {
        console.error("watchPosition error", { code: error.code, message: error.message });
        alert("위치 추적 중 오류가 발생했습니다. 위치 권한을 확인해주세요.");
        setIsTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
  };

  const handleStopTracking = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setIsTracking(false);
    setShowModal(true);
  };

  const centerOnMe = () => {
    if (!currentLocation) {
      setMapStatus("현재 위치를 아직 확인하지 못했습니다.");
      return;
    }
    initMap(currentLocation.lat, currentLocation.lng);
    setMapStatus(
      currentHeading === null
        ? "현재 위치로 이동했습니다. 바라보는 방향은 GPS 이동 중에 표시됩니다."
        : `현재 위치로 이동했습니다. ${Math.round(currentHeading)}도 방향을 보고 있어요.`
    );
  };

  const saveHikingRecord = () => {
    if (!recordTitle.trim()) return alert("기록 제목을 입력해주세요.");
    if (!comment.trim()) return alert("한줄평을 남겨주세요.");
    const now = Date.now();
    const startedAt = startTime || now;
    const durationMs = now - startedAt;
    const distanceKm = Number(calculateDistanceKm(samplesRef.current).toFixed(2));
const movingMs = calculateMovingMs(samplesRef.current);
const movingHours = Math.max(movingMs / 3600000, 0.01);
const averageSpeedKmh = Number((distanceKm / movingHours).toFixed(1));
    const record: HikingRecord = {
      id: String(now),
      date: new Date().toLocaleDateString("ko-KR"),
      title: recordTitle.trim(),
      mountainName: recordTitle.trim(),
      duration: formatDuration(durationMs),
      movingDuration: formatDuration(movingMs),

      distanceKm,
      averageSpeedKmh,
      path: samplesRef.current,

      pointCount: samplesRef.current.length,
      weather: "기록",
      comment,
      rating,
      thumbnail: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=300&q=80",
    };

    const existing = JSON.parse(localStorage.getItem("hiking_records") || "[]") as HikingRecord[];
    const nextRecords = [record, ...existing];

    localStorage.setItem("hiking_records", JSON.stringify(nextRecords));
    setMyRecords(nextRecords);

    setRecordTitle("");
    setComment("");
    setShowModal(false);
    setActiveTab("ARCHIVE");
  };

  const handleKakaoShare = () => {
    alert(`[카카오톡 앱 실행 시뮬레이션]\n\n${shareRecord?.title || shareRecord?.mountainName} 기록 공유!\n실제 런칭 시 카카오톡 앱으로 연결됩니다.`);
    setShareRecord(null);
  };

  const handleCopyUrl = async () => {
    const mockUrl = `https://go-outdoor.com/archive/${shareRecord?.id}`;
    try {
      await navigator.clipboard.writeText(mockUrl);
      alert(`URL이 클립보드에 복사되었습니다.\n${mockUrl}`);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = mockUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert(`URL이 클립보드에 복사되었습니다.\n${mockUrl}`);
    }
    setShareRecord(null);
  };

  const selectMountainForExplore = (mountainName: string) => {
    const mountain = MOUNTAINS.find((item) => item.name === mountainName);
    if (mountain) {
      setSelectedWeatherRegion(mountain.region);
      setSelectedWeatherMountain(mountain.name);
      trackMountainView(mountain.name);
    }
    setActiveTab("EXPLORE");
  };

  if (checkingSession) {
    return <div className="w-screen h-screen bg-[#1a1a1a] flex items-center justify-center text-white text-[10px] tracking-widest">LOADING...</div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="w-screen h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!userId || !userPw) return;
            setIsLoggedIn(true);
            localStorage.setItem("auto_login_session", "true");
          }}
          className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-[320px] rounded-2xl p-8 flex flex-col gap-6 text-[#1d1d1f]"
        >
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">GO OUTDOOR</h1>
            <p className="text-[11px] text-[#86868b] mt-1">로그인하여 활동을 시작하세요</p>
          </div>
          <div className="flex flex-col gap-2">
            <input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="ID" className="bg-[#f5f5f7] rounded-lg p-3 text-sm outline-none" />
            <input value={userPw} onChange={(event) => setUserPw(event.target.value)} placeholder="Password" type="password" className="bg-[#f5f5f7] rounded-lg p-3 text-sm outline-none" />
          </div>
          <button type="submit" className="bg-[#0071e3] text-white font-semibold py-3 rounded-lg text-sm">Sign In</button>
        </form>
      </div>
    );
  }

  const selectedMountain = getSelectedMountain();
  const topRecommendation = viewRecommendations[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f5f5f7] flex flex-col font-sans text-[#1d1d1f]">
      <Script
        strategy="afterInteractive"
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
        onReady={() => {
          setIsNaverMapReady(true);
          setMapStatus("네이버 지도 SDK 로드 완료");
          fetchWeekendForecast(selectedMountain.lat, selectedMountain.lng);

          if (activeTab === "MAP") {
            const fallback = currentLocation || selectedMountain;
            setTimeout(() => {
              initMap(fallback.lat, fallback.lng);
            }, 120);
          }
        }}
        onError={() => setMapStatus("네이버 지도 SDK 로드 실패: Client ID 또는 네이버 콘솔 Web 서비스 URL을 확인하세요.")}
      />

            <div className="absolute inset-0 z-0 bg-[#e5e7eb]">
        <div
          id="map"
          className={`w-full h-full min-h-screen transition-opacity duration-300 ${
            activeTab === "MAP" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />
      </div>
      {activeTab === "HOME" && (
        <main className="absolute inset-0 z-20 bg-[#f5f5f7] p-6 pb-[170px] overflow-y-auto">
          <div className="flex justify-between items-end mb-8 mt-4">
            <div>
              <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest">Dashboard</p>
              <h2 className="text-3xl font-bold tracking-tight mt-1">Overview</h2>
            </div>
            <button onClick={handleLogout} className="text-[11px] font-bold text-blue-600">Sign Out</button>
          </div>

          <section>
            <div className="flex items-end justify-between ml-1 mb-3">
              <div>
                <h3 className="text-[13px] font-bold text-[#1d1d1f]">1. 언제 갈까요?</h3>
                <p className="text-[10px] text-[#86868b] mt-1">선택한 날짜의 조망 좋은 산을 추천해드려요</p>
              </div>
              <button onClick={fetchViewRecommendations} className="text-[10px] font-bold text-blue-600">새로고침</button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {forecastDates.map((dateValue) => {
                const label = getDateLabel(dateValue);
                const active = selectedForecastDate === dateValue;
                return (
                  <button
                    key={dateValue}
                    onClick={() => setSelectedForecastDate(dateValue)}
                    className={`min-w-16 rounded-2xl px-4 py-3 text-center shadow-sm border ${active ? "bg-[#1d1d1f] text-white border-[#1d1d1f]" : "bg-white border-[#d2d2d7]/40 text-[#1d1d1f]"}`}
                  >
                    <p className="text-xs font-black">{label.weekday}</p>
                    <p className={`text-[10px] mt-1 ${active ? "text-white/70" : "text-[#86868b]"}`}>{label.shortDate}</p>
                  </button>
                );
              })}
            </div>

            {loadingViewRecommendations ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-[#d2d2d7]/30">
                <p className="text-[10px] font-black text-blue-600 tracking-widest">LOADING</p>
                <h3 className="mt-2 text-base font-black">추천 데이터를 불러오는 중</h3>
                <p className="mt-2 text-[11px] text-[#86868b]">기상청 산악예보를 확인하고 있어요.</p>
              </div>
            ) : topRecommendation ? (
              <button
                onClick={() => {
                  setActiveDetailCourse(topRecommendation);
                  setShowCourseDetail(true);
                  trackMountainView(topRecommendation.name);
                }}
                className="w-full text-left bg-white rounded-2xl p-5 shadow-sm border border-[#d2d2d7]/30"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 tracking-widest">BEST VIEW</p>
                    <h3 className="text-2xl font-black mt-1">{topRecommendation.name}</h3>
                    <p className="text-[11px] text-[#86868b] mt-1">{topRecommendation.region}</p>
                    <p className="text-[10px] font-bold text-blue-700 mt-2">예보 {formatForecastDate(topRecommendation.bestDay)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-[#86868b]">조망지수</p>
                    <p className="text-4xl font-black">{topRecommendation.score}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-6">
                  <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[9px] font-bold text-[#86868b]">예상 조망지수</p><p className="text-sm font-black">{topRecommendation.viewIndex ?? topRecommendation.visibilityKm}</p></div>
                  <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[9px] font-bold text-[#86868b]">강수확률</p><p className="text-sm font-black">{topRecommendation.precipitationProbability}%</p></div>
                  <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[9px] font-bold text-[#86868b]">풍속</p><p className="text-sm font-black">{topRecommendation.windSpeed}m/s</p></div>
                </div>
                <p className="text-xs text-[#1d1d1f]/70 leading-relaxed mt-4">{topRecommendation.viewMessage}</p>
              </button>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-[#d2d2d7]/30">
                <p className="text-sm font-bold text-[#86868b]">추천 데이터를 불러오지 못했습니다.</p>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#d2d2d7]/30 mt-4">
            <h3 className="text-[11px] font-bold text-[#86868b] uppercase mb-3">Top Recommendations</h3>
            {viewRecommendations.slice(1, 5).map((rec, index) => (
              <button
                key={rec.name}
                onClick={() => {
                  setActiveDetailCourse(rec);
                  setShowCourseDetail(true);
                  trackMountainView(rec.name);
                }}
                className="w-full flex items-center justify-between py-3 border-b border-[#f5f5f7] last:border-0 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[11px] font-black">{index + 2}</span>
                  <div>
                    <p className="text-sm font-black">{rec.name}</p>
                    <p className="text-[10px] text-[#86868b]">{rec.region} · 조망지수 {rec.viewIndex ?? rec.visibilityKm}</p>
                  </div>
                </div>
                <span className="text-lg font-black text-blue-600">{rec.score}</span>
              </button>
            ))}
          </section>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#d2d2d7]/30">
              <h3 className="text-[11px] font-bold text-[#86868b] mb-4">이번주 인기 산</h3>
              {(popularMountains.length ? popularMountains : [{ text: "북한산", count: 9 }, { text: "도봉산", count: 1 }, { text: "관악산", count: 1 }]).slice(0, 3).map((item, index) => (
                <button key={item.text} onClick={() => selectMountainForExplore(item.text)} className="w-full flex justify-between py-1.5 text-xs">
                  <span className="font-black">{index + 1}. {item.text}</span>
                  <span className="text-[#86868b]">{item.count}회</span>
                </button>
              ))}
            </section>
            <button onClick={handleStartTracking} className="bg-[#1d1d1f] rounded-2xl flex flex-col items-center justify-center text-white shadow-xl active:scale-95 transition-all min-h-44">
              <span className="text-2xl">△</span>
              <p className="text-sm font-bold tracking-widest mt-3">START</p>
            </button>
          </div>
        </main>
      )}

      {activeTab === "EXPLORE" && (
        <main className="absolute inset-0 z-20 bg-[#f5f5f7] p-6 pb-[170px] overflow-y-auto">
          <div className="mt-4 mb-6">
            <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest">Explore</p>
            <h2 className="text-3xl font-bold tracking-tight mt-1">탐방</h2>
          </div>

          <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#d2d2d7]/30">
            <h3 className="text-[13px] font-bold mb-4">가고 싶은 산 확인</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <select
                value={selectedWeatherRegion}
                onChange={(event) => {
                  const region = event.target.value;
                  setSelectedWeatherRegion(region);
                  setSelectedWeatherMountain(MOUNTAIN_DB[region][0].name);
                }}
                className="bg-[#f5f5f7] rounded-xl p-3 text-xs font-semibold outline-none"
              >
                {Object.keys(MOUNTAIN_DB).map((region) => <option key={region}>{region}</option>)}
              </select>
              <select value={selectedWeatherMountain} onChange={(event) => setSelectedWeatherMountain(event.target.value)} className="bg-[#f5f5f7] rounded-xl p-3 text-xs font-semibold outline-none">
                {MOUNTAIN_DB[selectedWeatherRegion].map((mountain) => <option key={mountain.name}>{mountain.name}</option>)}
              </select>
            </div>

            {loadingSelectedMountainForecast ? (
              <div className="bg-[#1d1d1f] rounded-2xl p-5 text-white">
                <p className="text-[10px] font-black text-white/45">FORECAST</p>
                <p className="text-sm font-black mt-1">선택한 산의 산악예보를 불러오는 중입니다.</p>
              </div>
            ) : selectedMountainForecasts.length > 0 ? (
              <div className="bg-[#1d1d1f] rounded-2xl p-5 text-white">
                <div className="flex justify-between">
                  <div>
                    <p className="text-[10px] font-black text-white/45">MOUNTAIN WEATHER</p>
                    <h3 className="text-xl font-black mt-1">{selectedWeatherMountain}</h3>
                    <p className="text-[10px] text-white/55 mt-1">{formatForecastDate(normalizeForecastTime(String(selectedMountainForecasts[0].forecastTime || "")))}</p>
                  </div>
                  <p className="text-2xl font-black">{Math.round(selectedMountainForecasts[0].temp ?? selectedMountain.temp)}도</p>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-5">
                  <div className="bg-white/10 rounded-xl p-3"><p className="text-[9px] font-bold text-white/45">강수</p><p className="text-sm font-black">{selectedMountainForecasts[0].precipitationProbability ?? 0}%</p></div>
                  <div className="bg-white/10 rounded-xl p-3"><p className="text-[9px] font-bold text-white/45">풍속</p><p className="text-sm font-black">{selectedMountainForecasts[0].windSpeed ?? selectedMountain.wind}m/s</p></div>
                  <div className="bg-white/10 rounded-xl p-3"><p className="text-[9px] font-bold text-white/45">습도</p><p className="text-sm font-black">{selectedMountainForecasts[0].humidity ?? selectedMountain.humidity}%</p></div>
                </div>
              </div>
            ) : (
              <div className="bg-[#1d1d1f] rounded-2xl p-5 text-white">
                <p className="text-sm font-black">산악예보 데이터가 없습니다.</p>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#d2d2d7]/30 mt-4">
            {loadingMountainDetails ? (
              <p className="text-[11px] font-bold text-[#86868b]">산 정보와 대표 코스를 불러오는 중입니다...</p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black">{selectedMountainProfile?.name || selectedWeatherMountain}</h3>
                    <p className="text-[11px] text-[#86868b] mt-1">
                      {selectedMountainProfile?.region || selectedMountain.region}
                      {selectedMountainProfile?.elevationM ? ` · ${selectedMountainProfile.elevationM}m` : ""}
                    </p>
                  </div>
                  {selectedMountainProfile?.isNationalPark && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 rounded-full px-2 py-1">국립공원</span>}
                </div>
                {selectedMountainProfile?.summary && <p className="text-xs text-[#1d1d1f]/70 leading-relaxed mt-4">{selectedMountainProfile.summary}</p>}
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-black text-[#86868b] uppercase">대표 코스</h4>
                    <span className="text-[10px] font-bold text-blue-600">{selectedMountainTrails.length}개</span>
                  </div>
                  {selectedMountainTrails.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {selectedMountainTrails.map((trail) => (
                        <button key={trail.id} onClick={() => setSelectedTrail(trail)} className="bg-[#f5f5f7] rounded-xl p-4 text-left">
                          <div className="flex justify-between gap-3">
                            <div>
                              <p className="text-sm font-black">{trail.facilityName}</p>
                              <p className="text-[10px] text-[#86868b] mt-1">{trail.startPoint} - {trail.endPoint}</p>
                            </div>
                            <span className="text-[10px] font-black bg-white px-2 py-1 rounded-full h-fit">{getTrailDifficultyLabel(trail.difficulty)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-[#86868b]">
                            <span>{trail.distanceKm}km</span>
                            {trail.ascentTimeMin && <span>상행 {formatTrailMinutes(trail.ascentTimeMin)}</span>}
                            {trail.viaPoint && <span className="truncate">경유 {trail.viaPoint}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#86868b] leading-relaxed">아직 등록된 대표 코스가 없습니다. 국립공원/100대 명산 코스 DB를 순차적으로 확장 중입니다.</p>
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      )}

      {activeTab === "MAP" && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl rounded-2xl px-6 py-3 shadow-lg text-center text-xs font-bold pointer-events-auto">
            {isTracking && currentLocation ? `트래킹 중 (${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)})` : mapStatus}
          </div>
          <button onClick={centerOnMe} aria-label="내 위치로 이동" title="내 위치로 이동" className="absolute right-5 bottom-56 w-12 h-12 rounded-full bg-white shadow-xl text-lg font-black pointer-events-auto">
            {currentHeading === null ? "⌖" : <span style={{ display: "inline-block", transform: `rotate(${currentHeading}deg)` }}>▲</span>}
          </button>
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-full px-8 pointer-events-auto">
            <button onClick={isTracking ? handleStopTracking : handleStartTracking} className={`w-full text-white font-bold py-4 rounded-2xl shadow-xl uppercase tracking-widest text-xs ${isTracking ? "bg-red-500" : "bg-[#1d1d1f]"}`}>
              {isTracking ? "Finish Hiking" : "Start Tracking"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "ARCHIVE" && (
        <main className="absolute inset-0 z-20 bg-[#f5f5f7] p-6 pb-[170px] overflow-y-auto">
          <div className="mt-4 mb-8">
            <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest">History</p>
            <h2 className="text-3xl font-bold tracking-tight mt-1">기록</h2>
          </div>
          <div className="flex flex-col gap-4">
            {myRecords.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-[#d2d2d7]/30">
                <p className="text-sm font-medium text-[#86868b]">기록된 활동이 없습니다.</p>
              </div>
            ) : (
              myRecords.map((record) => (
                <button key={record.id} onClick={() => setDetailRecord(record)} className="bg-white rounded-2xl p-3 shadow-sm border border-[#d2d2d7]/30 flex gap-4 text-left">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#f5f5f7] shrink-0">
                    <img src={record.thumbnail} alt="activity" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-sm font-bold truncate">
                         {record.title || record.mountainName}
                         </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-600 whitespace-nowrap">{record.date}</span>
                          <button type="button" onClick={(event) => { event.stopPropagation(); setShareRecord(record); }} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">공유</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-[#86868b]">시간 {record.duration}</span>
                        <span className="text-[11px] text-[#86868b]">거리 {record.distanceKm ?? 0}km</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#1d1d1f]/70 line-clamp-1 italic">"{record.comment}"</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </main>
      )}

      <nav className="absolute bottom-[calc(2.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-white/85 backdrop-blur-2xl border border-white/30 rounded-[28px] shadow-[0_15px_40px_rgba(0,0,0,0.15)] flex justify-around items-center h-[72px] z-40 px-4">
        {[
          { id: "HOME", icon: "⌂", label: "추천" },
          { id: "EXPLORE", icon: "⌕", label: "탐방" },
          { id: "MAP", icon: "⌖", label: "지도" },
          { id: "ARCHIVE", icon: "□", label: "기록" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as TabId)} className="flex flex-col items-center justify-center w-20 active:scale-95">
            <span className={`text-xl mb-1 ${activeTab === tab.id ? "opacity-100" : "opacity-30"}`}>{tab.icon}</span>
            <span className={`text-[9px] font-black ${activeTab === tab.id ? "text-blue-600" : "text-[#86868b]"}`}>{tab.label}</span>
          </button>
        ))}
      </nav>

      {showModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-[320px] rounded-[24px] p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-center mb-6">활동 기록 완료</h3>
            <input value={recordTitle} onChange={(event) => setRecordTitle(event.target.value)} placeholder="기록 제목" className="w-full bg-[#f5f5f7] rounded-xl p-4 text-xs font-bold outline-none mb-3" />
            <div className="bg-[#f5f5f7] rounded-2xl p-4 mb-4 text-center">
              <p className="text-[10px] font-bold text-[#86868b]">RATING</p>
              <div className="flex justify-center gap-1 text-2xl mt-1 cursor-pointer">
                {[1, 2, 3, 4, 5].map((star) => <span key={star} onClick={() => setRating(star)} className={star <= rating ? "text-yellow-400" : "text-gray-200"}>*</span>)}
              </div>
            </div>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="오늘 활동은 어땠나요?" className="w-full bg-[#f5f5f7] rounded-xl p-4 text-xs font-medium h-24 outline-none resize-none mb-4" />
            <button onClick={saveHikingRecord} className="w-full bg-[#0071e3] text-white font-bold py-3.5 rounded-xl text-xs">ARCHIVE 저장</button>
          </div>
        </div>
      )}

      {showCourseDetail && activeDetailCourse && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-[340px] rounded-[24px] p-6 shadow-2xl text-left">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold">{activeDetailCourse.name}</h3>
                <p className="text-[11px] text-[#86868b] mt-1">{activeDetailCourse.region}</p>
              </div>
              <button onClick={() => setShowCourseDetail(false)} className="text-gray-400">x</button>
            </div>
            {activeViewRecommendation ? (
              <>
                <div className="bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 tracking-widest">VIEW SCORE</p>
                  <div className="flex items-end justify-between mt-1">
                    <div>
                      <p className="text-4xl font-black">{activeViewRecommendation.score}</p>
                      <p className="text-[10px] font-bold text-blue-700/70">{formatForecastDate(activeViewRecommendation.bestDay)}</p>
                    </div>
                    <p className="text-[11px] font-bold text-blue-700">조망지수</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[9px] text-[#86868b] font-bold">예상 조망지수</p><p className="text-sm font-black">{activeViewRecommendation.viewIndex ?? activeViewRecommendation.visibilityKm}</p></div>
                  <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[9px] text-[#86868b] font-bold">강수</p><p className="text-sm font-black">{activeViewRecommendation.precipitationProbability}%</p></div>
                  <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[9px] text-[#86868b] font-bold">풍속</p><p className="text-sm font-black">{activeViewRecommendation.windSpeed}m/s</p></div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[10px] text-[#86868b] font-bold">거리</p><p className="text-sm font-bold">{activeDetailCourse.distance}</p></div>
                <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[10px] text-[#86868b] font-bold">소요시간</p><p className="text-sm font-bold">{activeDetailCourse.time}</p></div>
              </div>
            )}
            <p className="text-xs text-[#1d1d1f]/70 leading-relaxed mb-6">{activeViewRecommendation?.viewMessage || activeDetailCourse.reason}</p>
            <button onClick={() => setShowCourseDetail(false)} className="w-full bg-[#1d1d1f] text-white font-bold py-3.5 rounded-xl text-xs">확인</button>
          </div>
        </div>
      )}

      {detailRecord && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setDetailRecord(null)}>
          <div className="bg-white w-full max-w-[420px] rounded-t-[32px] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-[10px] font-black text-blue-600 tracking-widest">ACTIVITY DETAIL</p>
                <h3 className="text-xl font-black mt-1">{detailRecord.title || detailRecord.mountainName}</h3>
                <p className="text-[11px] text-[#86868b] mt-1">{detailRecord.date}</p>
              </div>
              <button onClick={() => setDetailRecord(null)} className="text-gray-400 text-xl leading-none">x</button>
            </div>
            {detailRecord.path && detailRecord.path.length > 0 && (
  <div
    id="record-map"
    className="w-full h-44 rounded-2xl overflow-hidden bg-[#f5f5f7] border border-[#d2d2d7]/30 mb-4"
  />
)}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-[#f5f5f7] p-4 rounded-xl"><p className="text-[9px] text-[#86868b] font-bold">이동거리</p><p className="text-lg font-black">{detailRecord.distanceKm ?? 0}km</p></div>
              <div className="bg-[#f5f5f7] p-4 rounded-xl"><p className="text-[9px] text-[#86868b] font-bold">총 소요시간</p><p className="text-lg font-black">{detailRecord.duration}</p></div>
              <div className="bg-[#f5f5f7] p-4 rounded-xl"><p className="text-[9px] text-[#86868b] font-bold">이동시간</p><p className="text-lg font-black">{detailRecord.movingDuration || detailRecord.duration}</p></div>
              <div className="bg-[#f5f5f7] p-4 rounded-xl"><p className="text-[9px] text-[#86868b] font-bold">평균속도</p><p className="text-lg font-black">{detailRecord.averageSpeedKmh ?? 0}km/h</p></div>
              <p className="text-sm font-black">
  {detailRecord.path?.length || detailRecord.pointCount || 0}
</p>
            </div>
            <div className="bg-[#f5f5f7] rounded-2xl p-4 mb-5">
              <p className="text-[9px] text-[#86868b] font-bold mb-2">메모</p>
              <p className="text-xs text-[#1d1d1f]/80 leading-relaxed">{detailRecord.comment}</p>
            </div>
            <button onClick={() => setDetailRecord(null)} className="w-full bg-[#1d1d1f] text-white font-bold py-3.5 rounded-xl text-xs">확인</button>
          </div>
        </div>
      )}

      {selectedTrail && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setSelectedTrail(null)}>
          <div className="bg-white w-full max-w-[420px] rounded-t-[32px] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-black text-blue-600 tracking-widest">COURSE DETAIL</p>
                <h3 className="text-xl font-black mt-1">{selectedTrail.facilityName}</h3>
                <p className="text-[11px] text-[#86868b] mt-1">{selectedTrail.parkName}</p>
              </div>
              <button onClick={() => setSelectedTrail(null)} className="text-gray-400 text-xl leading-none">x</button>
            </div>
            <div id="trail-map" className="w-full h-44 rounded-2xl overflow-hidden bg-[#f5f5f7] border border-[#d2d2d7]/30 mb-4" />
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[9px] text-[#86868b] font-bold">거리</p><p className="text-sm font-black">{selectedTrail.distanceKm}km</p></div>
              <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[9px] text-[#86868b] font-bold">난이도</p><p className="text-sm font-black">{getTrailDifficultyLabel(selectedTrail.difficulty)}</p></div>
              <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[9px] text-[#86868b] font-bold">유형</p><p className="text-sm font-black">{getTrailRouteTypeLabel(selectedTrail.routeType)}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[9px] text-[#86868b] font-bold">상행</p><p className="text-xs font-black">{formatTrailMinutes(selectedTrail.ascentTimeMin)}</p></div>
              <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[9px] text-[#86868b] font-bold">하행</p><p className="text-xs font-black">{formatTrailMinutes(selectedTrail.descentTimeMin)}</p></div>
              <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[9px] text-[#86868b] font-bold">총 소요</p><p className="text-xs font-black">{formatTrailMinutes((selectedTrail.ascentTimeMin || 0) + (selectedTrail.descentTimeMin || 0))}</p></div>
            </div>
            <div className="bg-[#f5f5f7] rounded-2xl p-4 mb-4">
              <div className="flex items-start gap-3 text-xs"><span className="font-black text-[#86868b] w-10 shrink-0">출발</span><span className="font-bold">{selectedTrail.startPoint}</span></div>
              {selectedTrail.viaPoint && <div className="flex items-start gap-3 text-xs mt-2"><span className="font-black text-[#86868b] w-10 shrink-0">경유</span><span className="font-bold">{selectedTrail.viaPoint}</span></div>}
              <div className="flex items-start gap-3 text-xs mt-2"><span className="font-black text-[#86868b] w-10 shrink-0">도착</span><span className="font-bold">{selectedTrail.endPoint}</span></div>
            </div>
            <p className="text-[11px] text-[#86868b] leading-relaxed mb-5">현재 지도는 코스가 속한 산의 중심 위치를 표시합니다. 실제 등산로 선형 데이터가 정리되면 코스 라인까지 지도에 표시할 수 있어요.</p>
            <button onClick={() => setSelectedTrail(null)} className="w-full bg-[#1d1d1f] text-white font-bold py-3.5 rounded-xl text-xs">확인</button>
          </div>
        </div>
      )}

      {shareRecord && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShareRecord(null)}>
          <div className="bg-white w-full max-w-[400px] rounded-t-[32px] p-8" onClick={(event) => event.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            <h3 className="text-lg font-bold mb-1">기록 공유하기</h3>
            <p className="text-[11px] text-[#86868b] mb-6">나의 활동 기록을 친구들에게 공유해보세요.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleKakaoShare} className="flex flex-col items-center justify-center gap-2 bg-[#FEE500] p-4 rounded-2xl active:scale-95">
                <span className="text-2xl">●</span>
                <span className="text-[11px] font-bold text-[#391B1B]">카카오톡 공유</span>
              </button>
              <button onClick={handleCopyUrl} className="flex flex-col items-center justify-center gap-2 bg-[#f5f5f7] p-4 rounded-2xl active:scale-95">
                <span className="text-2xl">↗</span>
                <span className="text-[11px] font-bold">URL 복사</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
