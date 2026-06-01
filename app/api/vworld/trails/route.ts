export const dynamic = "force-dynamic";

const VWORLD_ENDPOINT = "https://api.vworld.kr/req/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mountain = searchParams.get("mountain")?.trim() || "";
  const apiKey = process.env.VWORLD_API_KEY || "";

  if (!apiKey) {
    return Response.json(
      { ok: false, error: "VWORLD_API_KEY is not configured.", features: [] },
      { status: 500 }
    );
  }

  if (!mountain) {
    return Response.json(
      { ok: false, error: "mountain query is required.", features: [] },
      { status: 400 }
    );
  }

  const url = new URL(VWORLD_ENDPOINT);
  url.searchParams.set("service", "data");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("data", "LT_L_FRSTCLIMB");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("size", "100");
  url.searchParams.set("attrFilter", `mntn_nm:like:${mountain}`);

  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();

  const features =
    data?.response?.result?.featureCollection?.features || [];

  return Response.json({
    ok: true,
    source: "vworld:LT_L_FRSTCLIMB",
    mountain,
    totalCount: features.length,
    features,
    rawStatus: data?.response?.status,
    rawMessage: data?.response?.error?.text,
  });
}