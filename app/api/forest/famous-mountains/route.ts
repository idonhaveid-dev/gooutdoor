import {
  forestJsonResponse,
  getForestServiceKey,
  getTagValue,
  parseItems,
} from "../_utils";

const FAMOUS_TRAIL_ENDPOINT =
  "https://api.forest.go.kr/openapi/service/cultureInfoService/gdTrailInfoOpenAPI";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
const mountain =
  searchParams.get("mountain")?.trim() ||
  searchParams.get("searchWrd")?.trim() ||
  searchParams.get("code")?.trim() ||
  "";
  if (!getForestServiceKey()) {
    return forestJsonResponse(
      { ok: false, error: "FOREST_SERVICE_KEY is not configured.", trails: [] },
      { status: 500 }
    );
  }

  if (!mountain) {
    return forestJsonResponse(
      { ok: false, error: "mountain query is required.", trails: [] },
      { status: 400 }
    );
  }

  const url = new URL(FAMOUS_TRAIL_ENDPOINT);
  url.searchParams.set("ServiceKey", getForestServiceKey());
  url.searchParams.set("mntNm", mountain);

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    const xml = await response.text();

    if (!xml.includes("<response") && !xml.includes("<item>")) {
      return forestJsonResponse(
        {
          ok: false,
          error: "Forest famous trail API returned a non-XML response.",
          rawPreview: xml.slice(0, 800),
          trails: [],
        },
        { status: 502 }
      );
    }

    const resultCode = getTagValue(xml, "resultCode");

    if (!response.ok || (resultCode && resultCode !== "00" && resultCode !== "0000")) {
      return forestJsonResponse(
        {
          ok: false,
          error: getTagValue(xml, "resultMsg") || "Forest famous trail API request failed.",
          resultCode,
          rawPreview: xml.slice(0, 800),
          trails: [],
        },
        { status: 502 }
      );
    }

    const items = parseItems(xml);

    return forestJsonResponse({
      ok: true,
      source: "forest.go.kr:gdTrailInfoOpenAPI",
      mountain,
      totalCount: Number(getTagValue(xml, "totalCount") || items.length),
      trails: items.map((item) => ({
        mountainName: item.mntNm || item.mntnnm || mountain,
        routeName: item.crsNm || item.courseNm || item.routNm || "",
        startPoint: item.startNm || item.startPoint || "",
        endPoint: item.endNm || item.endPoint || "",
        distance: item.crsDstnc || item.distance || "",
        time: item.crsTime || item.time || "",
        fileUrl: item.fileUrl || item.mntnfile || item.gpxFile || item.kmlFile || "",
        raw: item,
      })),
    });
  } catch (error) {
    return forestJsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown forest famous trail API error.",
        trails: [],
      },
      { status: 500 }
    );
  }
}