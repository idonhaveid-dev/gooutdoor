/**
 * 영속 캐시 추상화 레이어.
 *
 * 홈 추천(view-recommendations)은 외부 KMA API를 실시간 호출하지 않고,
 * 이 캐시에 미리 저장된 결과만 읽는다. Vercel 서버리스 환경에서는
 * 인스턴스가 매 요청마다 새로 뜰 수 있어 메모리 Map 캐시를 신뢰할 수 없으므로
 * 영속 스토리지(Vercel KV / Upstash Redis)를 우선 사용한다.
 *
 * 지원 백엔드 (우선순위 순):
 *  1. Vercel KV       - env: KV_REST_API_URL, KV_REST_API_TOKEN
 *  2. Upstash Redis   - env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 *  3. 메모리 Map      - 위 둘이 없을 때 fallback (개발/단일 인스턴스용, Vercel에서는 비신뢰)
 *
 * TODO(MVP): 실제 배포 전 Vercel KV 또는 Upstash Redis를 연결하고
 * 위 환경변수를 Vercel 프로젝트 설정에 등록할 것. 환경변수가 없으면
 * 메모리 fallback으로 동작하되, 서버리스 콜드스타트마다 캐시가 비므로
 * 홈 추천이 빈 배열로 떨어질 수 있다(앱은 죽지 않음).
 */

type KvConfig = {
  url: string;
  token: string;
  provider: "vercel-kv" | "upstash";
};

const getKvConfig = (): KvConfig | null => {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken) {
    return { url: kvUrl, token: kvToken, provider: "vercel-kv" };
  }

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl && upstashToken) {
    return { url: upstashUrl, token: upstashToken, provider: "upstash" };
  }

  return null;
};

/** 영속 캐시가 실제로 설정되어 있는지 여부. */
export const isPersistentCacheConfigured = () => getKvConfig() !== null;

export const getCacheBackend = (): "kv" | "memory" =>
  isPersistentCacheConfigured() ? "kv" : "memory";

// ---------------------------------------------------------------------------
// 메모리 fallback (Vercel에서는 신뢰 불가 — TODO 참고)
// ---------------------------------------------------------------------------
type MemoryEntry = { value: string; expiresAt: number | null };
const memoryStore = new Map<string, MemoryEntry>();

const memoryGet = (key: string): string | null => {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
};

const memorySet = (key: string, value: string, ttlSeconds?: number) => {
  memoryStore.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
};

// ---------------------------------------------------------------------------
// KV REST (Vercel KV 와 Upstash 는 동일한 Redis REST 프로토콜을 공유)
// ---------------------------------------------------------------------------
const KV_TIMEOUT_MS = 4000;

const kvCommand = async (config: KvConfig, command: unknown[]): Promise<unknown> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), KV_TIMEOUT_MS);

  try {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`KV command failed: ${res.status}`);
    }

    const json = (await res.json()) as { result?: unknown; error?: string };
    if (json.error) {
      throw new Error(`KV error: ${json.error}`);
    }
    return json.result ?? null;
  } finally {
    clearTimeout(timeoutId);
  }
};

// ---------------------------------------------------------------------------
// 공개 API — 항상 안전(throw 하지 않음). 실패 시 get 은 null, set 은 false 반환.
// ---------------------------------------------------------------------------

/** JSON 값을 캐시에서 읽는다. 없거나 실패하면 null. */
export const cacheGetJson = async <T>(key: string): Promise<T | null> => {
  const config = getKvConfig();

  try {
    const raw = config ? ((await kvCommand(config, ["GET", key])) as string | null) : memoryGet(key);
    if (raw == null) return null;
    return JSON.parse(typeof raw === "string" ? raw : String(raw)) as T;
  } catch (error) {
    console.warn(`[recommendationCache] get failed for "${key}"`, error);
    return null;
  }
};

/** JSON 값을 캐시에 저장한다. 성공하면 true. */
export const cacheSetJson = async (
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<boolean> => {
  const config = getKvConfig();
  const serialized = JSON.stringify(value);

  try {
    if (config) {
      const command = ttlSeconds
        ? ["SET", key, serialized, "EX", String(ttlSeconds)]
        : ["SET", key, serialized];
      await kvCommand(config, command);
    } else {
      memorySet(key, serialized, ttlSeconds);
    }
    return true;
  } catch (error) {
    console.warn(`[recommendationCache] set failed for "${key}"`, error);
    return false;
  }
};
