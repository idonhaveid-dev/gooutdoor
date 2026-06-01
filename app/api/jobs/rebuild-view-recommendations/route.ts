import { NextResponse } from "next/server";
import {
  MOUNTAINS,
  ViewRecommendation,
  CachedRecommendations,
  RecommendationManifest,
  calculateViewScore,
  calculateViewIndex,
  getViewMessage,
  getForecastDates,
  normalizeSlot,
  recommendationCacheKey,
  recommendationManifestKey,
} from "@/app/lib/viewRecommendations";
import { fetchRegionForecast } from "@/app/lib/regionForecast";
import {
  cacheSetJson,
  getCacheBackend,
  isPersistentCacheConfigured,
} from "@/app/lib/recommendationCache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// 산 수만큼 외부 단기예보를 호출하므로 여유 있게 설정.
export const maxDuration = 60;

// 추천 캐시 TTL: 다음 슬롯 갱신 전까지 충분 (48시간)
const CACHE_TTL_SECONDS = 60 * 60 * 48;

/**
 * 정해진 시각(KST 10:10 / 13:10, Vercel Cron)마다 호출되어
 * 5~7일치 날짜별 조망 추천을 미리 계산해 영속 캐시에 저장한다.
 *
 *   /api/jobs/rebuild-view-recommendations?slot=1000
 *   /api/jobs/rebuild-view-recommendations?slot=1300
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slot = normalizeSlot(searchParams.get("slot"));
  const days = Math.min(7, Math.max(5, Number(searchParams.get("days")) || 7));
  const dates = getForecastDates(days);
  const startedAt = Date.now();

  try {
    // 산별로 단기예보를 1회 호출(날짜 전체 커버) → 호출 폭발 방지.
    const perMountain = await Promise.all(
      MOUNTAINS.map(async (mountain) => {
        const forecast = await fetchRegionForecast(
          {
            lat: mountain.lat,
            lng: mountain.lng,
            temp: mountain.temp,
            humidity: mountain.humidity,
            wind: mountain.wind,
          },
          dates
        );
        return { mountain, forecast };
      })
    );

    // 날짜별로 추천 목록을 구성.
    const recommendationsByDate: Record<string, ViewRecommendation[]> = {};
    const sourceTally = { kma: 0, estimated: 0, mixed: 0 };

    for (const { forecast } of perMountain) {
      sourceTally[forecast.source]++;
    }

    for (const date of dates) {
      const list: ViewRecommendation[] = perMountain.map(({ mountain, forecast }) => {
        const daily =
          forecast.byDate.get(date) ?? {
            date,
            temp: mountain.temp,
            humidity: mountain.humidity,
            precipitationProbability: mountain.pop,
            precipitation: 0,
            sky: 1,
            windSpeed: mountain.wind,
            source: "estimated" as const,
          };

        const scoreInput = {
          precipitationProbability: daily.precipitationProbability,
          precipitation: daily.precipitation,
          sky: daily.sky,
          humidity: daily.humidity,
          windSpeed: daily.windSpeed,
          temp: daily.temp,
        };

        const score = calculateViewScore(scoreInput);
        const viewIndex = calculateViewIndex(scoreInput);

        const rec: ViewRecommendation = {
          ...mountain,
          temp: daily.temp,
          humidity: daily.humidity,
          pop: daily.precipitationProbability,
          wind: daily.windSpeed,
          visibility: viewIndex,
          score,
          viewIndex,
          visibilityKm: viewIndex,
          precipitationProbability: daily.precipitationProbability,
          windSpeed: daily.windSpeed,
          bestDay: date,
          viewMessage: "",
        };
        rec.viewMessage = getViewMessage(rec);
        return rec;
      });

      list.sort((a, b) => b.score - a.score);
      recommendationsByDate[date] = list;
    }

    // 캐시에 저장 (날짜별 1키 + 매니페스트).
    const savedAt = Date.now();
    const writeResults = await Promise.all(
      dates.map((date) => {
        const payload: CachedRecommendations = {
          ok: true,
          date,
          slot,
          savedAt,
          source: "job:rebuild",
          recommendations: recommendationsByDate[date],
        };
        return cacheSetJson(recommendationCacheKey(date), payload, CACHE_TTL_SECONDS);
      })
    );

    const manifest: RecommendationManifest = { slot, savedAt, dates };
    const manifestWritten = await cacheSetJson(
      recommendationManifestKey(),
      manifest,
      CACHE_TTL_SECONDS
    );

    const writtenCount = writeResults.filter(Boolean).length;
    const cacheBackend = getCacheBackend();

    return NextResponse.json({
      ok: true,
      slot,
      days,
      dates,
      cacheBackend,
      persistentCacheConfigured: isPersistentCacheConfigured(),
      forecastSources: sourceTally,
      written: { dates: writtenCount, manifest: manifestWritten },
      durationMs: Date.now() - startedAt,
      // 영속 캐시 미설정 시 경고 (메모리 fallback 은 서버리스에서 유지되지 않음).
      warning: isPersistentCacheConfigured()
        ? undefined
        : "영속 캐시(KV/Upstash)가 설정되지 않아 메모리에만 저장되었습니다. Vercel 환경에서는 유지되지 않으니 KV_REST_API_URL/TOKEN 또는 UPSTASH_REDIS_REST_URL/TOKEN 을 설정하세요.",
    });
  } catch (error) {
    console.error("[rebuild-view-recommendations] failed", error);
    return NextResponse.json(
      {
        ok: false,
        slot,
        error: "추천 사전 계산 작업에 실패했습니다.",
        detail: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }
}
