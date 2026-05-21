"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    naver: any;
  }
}

interface HikingRecord {
  id: string;
  date: string;
  mountainName: string; 
  duration: string;     
  pointCount: number;
  weather: string;
  comment: string;
  rating: number;
  thumbnail: string;    
}

interface KeywordCount { text: string; count: number; }
interface WeekendRecommendation { bestDay: string; saturdayTemp: number; saturdayCond: string; sundayTemp: number; sundayCond: string; recommendationMessage: string; }
interface MountainInfo { name: string; lat: number; lng: number; difficulty: string; distance: string; time: string; reason: string; temp: number; humidity: number; pop: number; wind: number; visibility: number; }

const MOUNTAIN_DB: { [key: string]: MountainInfo[] } = {
  "수도권/경기": [
    { name: "북한산", lat: 37.6584, lng: 126.9782, difficulty: "초급 🟢", distance: "2.6km", time: "1시간 30분", reason: "강수 확률이 전혀 없고 가시거리가 탁 트여 풍광이 완벽합니다.", temp: 18, humidity: 45, pop: 0, wind: 2.1, visibility: 20 },
    { name: "관악산", lat: 37.4444, lng: 126.9639, difficulty: "중급 🟡", distance: "3.2km", time: "2시간", reason: "습도가 낮아 산행 시 땀 배출이 원활하고 쾌적합니다.", temp: 19, humidity: 40, pop: 0, wind: 1.5, visibility: 18 },
    { name: "도봉산", lat: 37.6894, lng: 127.0161, difficulty: "상급 🔴", distance: "4.5km", time: "3시간", reason: "바람이 잔잔하여 능선부 암벽 산행 시 실족 위험이 적습니다.", temp: 17, humidity: 38, pop: 0, wind: 3.0, visibility: 20 }
  ],
  "강원": [{ name: "설악산", lat: 38.1194, lng: 128.4656, difficulty: "상급 🔴", distance: "5.8km", time: "4시간", reason: "조망이 가장 아름다운 기상입니다.", temp: 14, humidity: 50, pop: 10, wind: 4.2, visibility: 25 }],
  "충북": [{ name: "속리산", lat: 36.5333, lng: 127.8500, difficulty: "중급 🟡", distance: "4.1km", time: "2.5시간", reason: "암릉 구간 산행에 적합합니다.", temp: 19, humidity: 44, pop: 0, wind: 2.0, visibility: 17 }],
  "충남": [{ name: "계룡산", lat: 36.3551, lng: 127.2061, difficulty: "중급 🟡", distance: "3.4km", time: "2시간 10분", reason: "선선한 산들바람이 붑니다.", temp: 20, humidity: 48, pop: 0, wind: 1.9, visibility: 16 }],
  "전북": [{ name: "내장산", lat: 35.4419, lng: 126.8889, difficulty: "초급 🟢", distance: "2.8km", time: "1시간 40분", reason: "가시거리가 우수합니다.", temp: 21, humidity: 52, pop: 0, wind: 1.2, visibility: 19 }],
  "전남": [{ name: "무등산", lat: 35.1436, lng: 126.9936, difficulty: "중급 🟡", distance: "5.1km", time: "3시간", reason: "입석대 조망이 완벽합니다.", temp: 22, humidity: 45, pop: 0, wind: 2.1, visibility: 21 }],
  "경북": [{ name: "소백산", lat: 36.9583, lng: 128.4550, difficulty: "상급 🔴", distance: "6.0km", time: "4시간", reason: "칼바람이 잦아들었습니다.", temp: 15, humidity: 50, pop: 0, wind: 2.8, visibility: 23 }],
  "경남": [{ name: "지리산", lat: 35.3369, lng: 127.7306, difficulty: "상급 🔴", distance: "6.5km", time: "5시간", reason: "돌풍 없는 따뜻한 기온입니다.", temp: 13, humidity: 58, pop: 5, wind: 3.1, visibility: 22 }],
  "제주": [{ name: "한라산", lat: 33.3617, lng: 126.5292, difficulty: "상급 🔴", distance: "9.6km", time: "8시간", reason: "백록담 조망이 최고조입니다.", temp: 12, humidity: 60, pop: 0, wind: 3.5, visibility: 30 }]
};

export default function Home() {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userId, setUserId] = useState("");
  const [userPw, setUserPw] = useState("");
  const [autoLogin, setAutoLogin] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"HOME" | "MAP" | "ARCHIVE">("HOME");

  const [isTracking, setIsTracking] = useState(false);
  const [path, setPath] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [weather, setWeather] = useState("☀️ 맑음");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);

  const [topKeywords, setTopKeywords] = useState<KeywordCount[]>([]);
  const [lastUpdatedTime, setLastUpdatedTime] = useState("");
  const [weekendData, setWeekendData] = useState<WeekendRecommendation | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [showCourseDetail, setShowCourseDetail] = useState(false);
  const [activeDetailCourse, setActiveDetailCourse] = useState<MountainInfo | null>(null);
  const [selectedWeatherRegion, setSelectedWeatherRegion] = useState("수도권/경기");
  const [selectedWeatherMountain, setSelectedWeatherMountain] = useState("북한산");
  const [myRecords, setMyRecords] = useState<HikingRecord[]>([]);

  const [shareRecord, setShareRecord] = useState<HikingRecord | null>(null);

  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("auto_login_session");
    if (saved === "true") setIsLoggedIn(true);
    setCheckingSession(false);
  }, []);

  useEffect(() => {
    if (activeTab === "ARCHIVE") {
      setMyRecords(JSON.parse(localStorage.getItem("hiking_records") || "[]"));
    }
  }, [activeTab]);

  const initMap = () => {
    if (window.naver && !mapRef.current) {
      const opts = { center: new window.naver.maps.LatLng(37.6584, 126.9782), zoom: 15, logoControl: false, mapDataControl: false };
      mapRef.current = new window.naver.maps.Map("map", opts);
      markerRef.current = new window.naver.maps.Marker({ position: opts.center, map: mapRef.current, icon: { content: `<div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg"></div>`, anchor: new window.naver.maps.Point(8, 8) } });
      polylineRef.current = new window.naver.maps.Polyline({ map: mapRef.current, path: [], strokeColor: "#22c55e", strokeWeight: 6, strokeOpacity: 0.8 });
      fetchWeekendForecast(37.6584, 126.9782);
      analyzeKeywords();
    }
  };

  useEffect(() => { if (isLoggedIn && window.naver) initMap(); }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      const m = (MOUNTAIN_DB[selectedWeatherRegion] || []).find(x => x.name === selectedWeatherMountain);
      if (m) fetchWeekendForecast(m.lat, m.lng);
    }
  }, [selectedWeatherMountain, selectedWeatherRegion, isLoggedIn]);

  // ✨ 누락되었던 로그아웃 로직 완벽 복구
  const handleLogout = () => {
    localStorage.removeItem("auto_login_session");
    setIsLoggedIn(false);
    setUserId("");
    setUserPw("");
    setActiveTab("HOME");
    mapRef.current = null;
  };

  const fetchWeekendForecast = async (lat: number, lng: number) => {
    setLoadingForecast(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max&timezone=Asia%2FSeoul`);
      const data = await res.json();
      const getCond = (c: number) => c === 0 ? "☀️ 맑음" : c <= 3 ? "☁️ 흐림" : "🌧️ 비 예보";
      setWeekendData({ bestDay: "토요일 추천", saturdayTemp: Math.round(data.daily.temperature_2m_max[4]), saturdayCond: getCond(data.daily.weather_code[4]), sundayTemp: Math.round(data.daily.temperature_2m_max[5]), sundayCond: getCond(data.daily.weather_code[5]), recommendationMessage: "데이터 분석 결과, 이번 주말은 산행하기에 매우 쾌적한 지표를 보입니다." });
    } catch (e) { console.error(e); } finally { setLoadingForecast(false); }
  };

  const analyzeKeywords = () => {
    const recs: HikingRecord[] = JSON.parse(localStorage.getItem("hiking_records") || "[]");
    const map: any = {};
    recs.forEach(r => r.comment.split(/\s+/).forEach(w => { if (w.length >= 2) map[w] = (map[w] || 0) + 1; }));
    setTopKeywords(Object.keys(map).map(k => ({ text: k, count: map[k] })).sort((a, b) => b.count - a.count).slice(0, 3));
    setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const handleStartTracking = () => {
    setActiveTab("MAP");
    setStartTime(Date.now()); 
    if (!isTracking) {
      setPath([]); setIsTracking(true);
      watchIdRef.current = navigator.geolocation.watchPosition(p => {
        const pos = new window.naver.maps.LatLng(p.coords.latitude, p.coords.longitude);
        if (mapRef.current) mapRef.current.setCenter(pos);
        setPath(prev => [...prev, pos]);
      }, null, { enableHighAccuracy: true });
    }
  };

  const handleStopTracking = () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    setIsTracking(false); setShowModal(true);
  };

  const saveHikingRecord = () => {
    if (!comment.trim()) return alert("한줄평을 남겨주세요.");
    const diff = Date.now() - (startTime || Date.now());
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const durationStr = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;

    const newRec: HikingRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('ko-KR'),
      mountainName: selectedWeatherMountain,
      duration: durationStr,
      pointCount: path.length,
      weather,
      comment,
      rating,
      thumbnail: `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=300&q=80` 
    };
    const existing = JSON.parse(localStorage.getItem("hiking_records") || "[]");
    localStorage.setItem("hiking_records", JSON.stringify([newRec, ...existing]));
    setShowModal(false); analyzeKeywords(); setActiveTab("ARCHIVE");
  };
// 👇👇👇 기존 handleShare 함수를 지우고 아래 코드로 덮어쓰세요 👇👇👇
  const handleKakaoShare = () => {
    // 실제 상용화 시 카카오 SDK 연동 필요
    alert(`[카카오톡 앱 실행 시뮬레이션]\n\n🏔️ ${shareRecord?.mountainName} 코스 완주!\n실제 런칭 시 카카오톡 앱으로 연결됩니다.`);
    setShareRecord(null);
  };

const handleCopyUrl = async () => {
    const mockUrl = `https://go-outdoor.com/archive/${shareRecord?.id}`;
    
    try {
      // 1순위: 최신 클립보드 API 시도
      await navigator.clipboard.writeText(mockUrl);
      alert(`URL이 클립보드에 복사되었습니다!\n${mockUrl}`);
    } catch (err) {
      // 2순위: 권한 거부 시 구형 방식(우회)으로 재시도
      try {
        const textArea = document.createElement("textarea");
        textArea.value = mockUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert(`URL이 클립보드에 복사되었습니다!\n${mockUrl}`);
      } catch (fallbackErr) {
        // 3순위: 모든 복사 기능이 막혀있을 경우 직접 복사 안내
        alert("브라우저 복사 권한이 차단되어 있습니다. 아래 주소를 직접 복사해 주세요.\n\n" + mockUrl);
      }
    }
    setShareRecord(null);
  };
  // 👆👆👆 덮어쓰기 완료 👆👆👆
  if (checkingSession) return <div className="w-screen h-screen bg-[#1a1a1a] flex items-center justify-center text-white font-light tracking-widest text-[10px]">LOADING...</div>;

  if (!isLoggedIn) {
    return (
      <div className="w-screen h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
        <form onSubmit={(e) => { e.preventDefault(); if(userId&&userPw) { setIsLoggedIn(true); if(autoLogin) localStorage.setItem("auto_login_session", "true"); }}} className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-[320px] rounded-2xl p-8 flex flex-col gap-6 text-[#1d1d1f]">
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">GO OUTDOOR</h1>
            <p className="text-[11px] text-[#86868b] mt-1">로그인하여 산행을 시작하세요</p>
          </div>
          <div className="flex flex-col gap-2">
            <input type="text" placeholder="ID" value={userId} onChange={e=>setUserId(e.target.value)} className="bg-[#f5f5f7] border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <input type="password" placeholder="Password" value={userPw} onChange={e=>setUserPw(e.target.value)} className="bg-[#f5f5f7] border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button type="submit" className="bg-[#0071e3] text-white font-semibold py-3 rounded-lg text-sm hover:bg-[#0077ed] transition-colors">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f5f5f7] flex flex-col font-sans text-[#1d1d1f]">
      <Script strategy="afterInteractive" src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`} onReady={initMap} />
      
      <div id="map" className={`absolute inset-0 z-0 transition-opacity duration-500 ${activeTab === "MAP" ? "opacity-100" : "opacity-0"}`} />

      {activeTab === "HOME" && (
        <div className="absolute inset-0 z-20 bg-[#f5f5f7] flex flex-col p-6 pb-[120px] animate-in fade-in duration-500 overflow-y-auto">
          <div className="flex justify-between items-end mb-8 mt-4">
            <div>
              <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest">Dashboard</p>
              <h2 className="text-3xl font-bold tracking-tight mt-1">Overview</h2>
            </div>
            {/* ✨ 이제 여기서 호출해도 에러가 나지 않습니다! */}
            <button onClick={handleLogout} className="text-[11px] font-bold text-blue-600">Sign Out</button>
          </div>

          <div className="flex flex-col gap-6">
            <section>
              <h3 className="text-[13px] font-bold text-[#86868b] ml-1 mb-3">1. 권역별 최적의 코스 추천</h3>
              <div className="grid grid-cols-3 gap-3">
                {Object.keys(MOUNTAIN_DB).map(k => (
                  <div key={k} onClick={() => { setActiveDetailCourse(MOUNTAIN_DB[k][0]); setShowCourseDetail(true); }} className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-[#d2d2d7]/30">
                    <p className="text-[10px] text-[#86868b] font-bold">{k}</p>
                    <p className="text-sm font-bold mt-1">{MOUNTAIN_DB[k][0].name}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#d2d2d7]/30">
              <h3 className="text-[13px] font-bold text-[#1d1d1f] mb-4 flex items-center gap-2">🔍 목적지 날씨 현황</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <select value={selectedWeatherRegion} onChange={e=>{setSelectedWeatherRegion(e.target.value); setSelectedWeatherMountain(MOUNTAIN_DB[e.target.value][0].name)}} className="bg-[#f5f5f7] rounded-xl p-3 text-xs font-semibold outline-none border-none">
                  {Object.keys(MOUNTAIN_DB).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={selectedWeatherMountain} onChange={e=>setSelectedWeatherMountain(e.target.value)} className="bg-[#f5f5f7] rounded-xl p-3 text-xs font-semibold outline-none border-none">
                  {[...MOUNTAIN_DB[selectedWeatherRegion]].sort((a,b)=>a.name.localeCompare(b.name)).map(m=><option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              {weekendData && (
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
                  <p className="text-[11px] font-bold text-blue-700">{selectedWeatherMountain} {weekendData.bestDay}</p>
                  <p className="text-[11px] text-blue-900/70 mt-1 leading-relaxed">{weekendData.recommendationMessage}</p>
                </div>
              )}
            </section>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#d2d2d7]/30">
                <h3 className="text-[11px] font-bold text-[#86868b] uppercase mb-3">3. 이번주 실시간 인기</h3>
                {topKeywords.map((k,i)=>(
                  <div key={k.text} className="flex items-center justify-between text-xs py-1.5 border-b border-[#f5f5f7] last:border-0">
                    <span className="font-bold text-[#1d1d1f]">#{k.text}</span>
                    <span className="text-[#86868b]">{k.count}</span>
                  </div>
                ))}
              </div>
              <div onClick={handleStartTracking} className="bg-[#1d1d1f] rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer active:scale-95 transition-all shadow-xl">
                <span className="text-xl">🏔️</span>
                <p className="text-sm font-bold tracking-widest mt-2">START</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ARCHIVE" && (
        <div className="absolute inset-0 z-20 bg-[#f5f5f7] flex flex-col p-6 pb-[120px] animate-in slide-in-from-right duration-500 overflow-y-auto">
          <div className="mt-4 mb-8">
            <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest">History</p>
            <h2 className="text-3xl font-bold tracking-tight mt-1">Archive</h2>
          </div>

          <div className="flex flex-col gap-4">
            {myRecords.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-[#d2d2d7]/30">
                <p className="text-sm font-medium text-[#86868b]">기록된 산행이 없습니다.</p>
              </div>
            ) : (
              myRecords.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl p-3 shadow-sm border border-[#d2d2d7]/30 flex gap-4 hover:shadow-md transition-shadow">
                  <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-[#f5f5f7]">
                    <img src={r.thumbnail} alt="mountain" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col justify-between py-1 flex-1">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-bold text-[#1d1d1f]">{r.mountainName}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-600">{r.date}</span>
{/* 👇👇👇 onClick 부분을 변경하세요 👇👇👇 */}
                          <button 
                            onClick={() => setShareRecord(r)}
                            className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-100 transition-colors"
                          >
                            공유 📤
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-[#86868b] flex items-center gap-1">⏱️ {r.duration}</span>
                        <span className="text-[11px] text-[#86868b] flex items-center gap-1">⭐ {r.rating}.0</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#1d1d1f]/70 line-clamp-1 italic">"{r.comment}"</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "MAP" && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-full px-8 pointer-events-auto">
            <button onClick={handleStopTracking} className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl shadow-[0_10px_30px_rgba(239,68,68,0.3)] active:scale-95 transition-all uppercase tracking-widest text-xs">
              Finish Hiking
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-[400px] bg-white/80 backdrop-blur-2xl border border-white/20 rounded-[28px] shadow-[0_15px_40px_rgba(0,0,0,0.15)] flex justify-around items-center h-[72px] z-40 px-4">
        {[
          { id: "HOME", icon: "🏠" },
          { id: "MAP", icon: "🗺️" },
          { id: "ARCHIVE", icon: "📂" }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="flex flex-col items-center justify-center w-20 transition-all active:scale-90">
            <span className={`text-xl mb-1 ${activeTab === tab.id ? "opacity-100" : "opacity-30"}`}>{tab.icon}</span>
            <span className={`text-[9px] font-black tracking-tighter ${activeTab === tab.id ? "text-blue-600" : "text-[#86868b]"}`}>{tab.id}</span>
          </button>
        ))}
      </div>

      {showModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-[320px] rounded-[24px] p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-center mb-6">산행 기록 완료</h3>
            <div className="bg-[#f5f5f7] rounded-2xl p-4 mb-4 text-center">
              <p className="text-[10px] font-bold text-[#86868b]">RATING</p>
              <div className="flex justify-center gap-1 text-2xl mt-1 cursor-pointer">
                {[1,2,3,4,5].map(s=><span key={s} onClick={()=>setRating(s)} className={s<=rating?"text-yellow-400":"text-gray-200"}>★</span>)}
              </div>
            </div>
            <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="오늘 산행은 어떠셨나요?" className="w-full bg-[#f5f5f7] border-none rounded-xl p-4 text-xs font-medium h-24 outline-none resize-none mb-4" />
            <button onClick={saveHikingRecord} className="w-full bg-[#0071e3] text-white font-bold py-3.5 rounded-xl text-xs">ARCHIVE 저장</button>
          </div>
        </div>
      )}

      {showCourseDetail && activeDetailCourse && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-[340px] rounded-[24px] p-6 shadow-2xl text-left">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold">{activeDetailCourse.name}</h3>
              <button onClick={()=>setShowCourseDetail(false)} className="text-gray-400">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[10px] text-[#86868b] font-bold">거리</p><p className="text-sm font-bold">{activeDetailCourse.distance}</p></div>
              <div className="bg-[#f5f5f7] p-3 rounded-xl"><p className="text-[10px] text-[#86868b] font-bold">소요시간</p><p className="text-sm font-bold">{activeDetailCourse.time}</p></div>
            </div>
            <p className="text-xs text-[#1d1d1f]/70 leading-relaxed mb-6">💡 {activeDetailCourse.reason}</p>
            <button onClick={()=>setShowCourseDetail(false)} className="w-full bg-[#1d1d1f] text-white font-bold py-3.5 rounded-xl text-xs">확인</button>
          </div>
        </div>
      )}
      {/* 👇👇👇 마지막 </div> 바로 위에 여기부터 추가하세요 👇👇👇 */}
      {/* 📤 카카오톡 / URL 공유 바텀 시트 모달 */}
      {shareRecord && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShareRecord(null)}>
          <div className="bg-white w-full max-w-[400px] rounded-t-[32px] p-8 animate-in slide-in-from-bottom-full duration-300" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <h3 className="text-lg font-bold text-[#1d1d1f] mb-1">기록 공유하기</h3>
            <p className="text-[11px] text-[#86868b] mb-6">나의 멋진 산행을 친구들에게 자랑해보세요.</p>
            
            <div className="grid grid-cols-2 gap-3">
              {/* 카카오톡 버튼 */}
              <button onClick={handleKakaoShare} className="flex flex-col items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FADA0A] p-4 rounded-2xl transition-colors active:scale-95">
                <span className="text-2xl">💬</span>
                <span className="text-[11px] font-bold text-[#391B1B]">카카오톡 공유</span>
              </button>
              
              {/* URL 복사 버튼 */}
              <button onClick={handleCopyUrl} className="flex flex-col items-center justify-center gap-2 bg-[#f5f5f7] hover:bg-[#ebebeb] p-4 rounded-2xl transition-colors active:scale-95">
                <span className="text-2xl">🔗</span>
                <span className="text-[11px] font-bold text-[#1d1d1f]">URL 복사</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 👆👆👆 여기까지 추가 완료 👆👆👆 */}
    </div>
  );
}