import {
  buildForestUrl,
  forestJsonResponse,
  getForestServiceKey,
  getTagValue,
  parseItems,
} from "../_utils";

const TRAIL_INFO_ENDPOINT =
  "http://api.forest.go.kr/openapi/service/trailInfoService/getforestspatialdataservice";
const FOREST_API_TIMEOUT_MS = 8000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mountain = searchParams.get("mountain")?.trim() || "";
  const pageNo = searchParams.get("pageNo") || "1";
  const numOfRows = searchParams.get("numOfRows") || "10";

  if (!getForestServiceKey()) {
    return forestJsonResponse(
      {
        ok: false,
        error: "FOREST_SERVICE_KEY is not configured.",
        trails: [],
      },
      { status: 500 }
    );
  }

  const url = buildForestUrl(TRAIL_INFO_ENDPOINT, {
    mntnNm: mountain,
    pageNo,
    numOfRows,
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FOREST_API_TIMEOUT_MS);
    const response = await fetch(url, {
      next: { revalidate: 86400 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const xml = await response.text();
    const resultCode = getTagValue(xml, "resultCode");

    if (!xml.includes("<response") && !xml.includes("<item>")) {
      return forestJsonResponse(
        {
          ok: false,
          error: "Forest trail API returned a non-XML response. The upstream service may be temporarily unavailable.",
          trails: [],
        },
        { status: 502 }
      );
    }

    if (!response.ok || (resultCode && resultCode !== "00" && resultCode !== "0000")) {
      return forestJsonResponse(
        {
          ok: false,
          error: getTagValue(xml, "resultMsg") || "Forest trail API request failed.",
          resultCode,
          trails: [],
        },
        { status: 502 }
      );
    }

    const trails = parseItems(xml).map((item) => ({
      mountainName: item.mntnnm || item.mntnNm || mountain,
      trailUrl: item.mntninfourl || "",
      fileUrl: item.mntnfile || "",
      raw: item,
    }));

    return forestJsonResponse({
      ok: true,
      source: "forest.go.kr:getforestspatialdataservice",
      mountain,
      totalCount: Number(getTagValue(xml, "totalCount") || trails.length),
      trails,
    });
  } catch (error) {
    return forestJsonResponse(
      {
        ok: false,
        error:
          error instanceof Error && error.name === "AbortError"
            ? "Forest trail API request timed out."
            : error instanceof Error
              ? error.message
              : "Unknown forest trail API error.",
        trails: [],
      },
      { status: 500 }
    );
  }
}
