import { NextResponse } from "next/server";
import {
  CachedRecommendations,
  RecommendationManifest,
  recommendationCacheKey,
  recommendationManifestKey,
} from "@/app/lib/viewRecommendations";
import {
  cacheGetJson,
  getCacheBackend,
  isPersistentCacheConfigured,
} from "@/app/lib/recommendationCache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 홈 조망 추천 (읽기 전용).
 *
 * - 외부 KMA API 를 호출하지 않는다.
 * - /api/jobs/rebuild-view-recommendations 가 미리 저장한 캐시만 읽는다.
 * - 캐시가 없어도 절대 500 을 내지 않는다. ok:true + recommendations:[] 로 응답하거나
 *   (요청 날짜가 없으면) 마지막으로 빌드된 날짜의 캐시를 fallback 으로 반환한다.
 *
 *   /api/kma/view-recommendations?date=YYYY-MM-DD
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || "";

  if (!date) {
    return NextResponse.json(
      { ok: false, error: "date query is required.", recommendations: [] },
      { status: 400 }
    );
  }

  const cacheBackend = getCacheBackend();

  try {
    const cached = await cacheGetJson<CachedRecommendations>(
      recommendationCacheKey(date)
    );

    if (cached && Array.isArray(cached.recommendations)) {
      return NextResponse.json({
        ok: true,
        source: "cache",
        cacheBackend,
        date,
        slot: cached.slot,
        savedAt: cached.savedAt,
        recommendations: cached.recommendations,
      });
    }

    // 요청한 날짜 캐시가 없으면, 마지막으로 빌드된 날짜 중 하나를 fallback 으로 시도.
    const manifest = await cacheGetJson<RecommendationManifest>(
      recommendationManifestKey()
    );

    if (manifest?.dates?.length) {
      const fallbackDate = manifest.dates.includes(date)
        ? date
        : manifest.dates[0];
      const fallback = await cacheGetJson<CachedRecommendations>(
        recommendationCacheKey(fallbackDate)
      );

      if (fallback && Array.isArray(fallback.recommendations)) {
        return NextResponse.json({
          ok: true,
          source: "cache-fallback",
          cacheBackend,
          date,
          fallbackDate,
          slot: fallback.slot,
          savedAt: fallback.savedAt,
          recommendations: fallback.recommendations,
        });
      }
    }

    // 캐시가 아예 없는 경우 — 앱이 죽지 않도록 빈 배열로 응답.
    return NextResponse.json({
      ok: true,
      source: "empty",
      cacheBackend,
      date,
      recommendations: [],
      notice: isPersistentCacheConfigured()
        ? "아직 추천 캐시가 생성되지 않았습니다. rebuild job 이 실행되면 채워집니다."
        : "영속 캐시(KV/Upstash)가 설정되지 않았습니다. 환경변수 설정 후 rebuild job 을 실행하세요.",
    });
  } catch (error) {
    // 어떤 경우에도 500 을 내지 않는다.
    console.warn("[view-recommendations] read failed", error);
    return NextResponse.json({
      ok: true,
      source: "error-fallback",
      cacheBackend,
      date,
      recommendations: [],
    });
  }
}
