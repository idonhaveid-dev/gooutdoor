import {
  buildForestUrl,
  forestJsonResponse,
  getForestServiceKey,
  getTagValue,
  parseItems,
} from "../_utils";

const MOUNTAIN_INFO_ENDPOINT =
  "http://api.forest.go.kr/openapi/service/trailInfoService/getforeststoryservice";
const FOREST_API_TIMEOUT_MS = 8000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() || "";
  const pageNo = searchParams.get("pageNo") || "1";
  const numOfRows = searchParams.get("numOfRows") || "20";

  if (!getForestServiceKey()) {
    return forestJsonResponse(
      {
        ok: false,
        error: "FOREST_SERVICE_KEY is not configured.",
        mountains: [],
      },
      { status: 500 }
    );
  }

  const url = buildForestUrl(MOUNTAIN_INFO_ENDPOINT, {
    mntnNm: query,
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
          error: "Forest API returned a non-XML response. The upstream service may be temporarily unavailable.",
          mountains: [],
        },
        { status: 502 }
      );
    }

    if (!response.ok || (resultCode && resultCode !== "00" && resultCode !== "0000")) {
      return forestJsonResponse(
        {
          ok: false,
          error: getTagValue(xml, "resultMsg") || "Forest API request failed.",
          resultCode,
          mountains: [],
        },
        { status: 502 }
      );
    }

    const mountains = parseItems(xml).map((item) => ({
      name: item.mntnnm || item.mntnNm || item.name || "",
      address: item.mntnadd || item.mntnaddr || "",
      height: item.mntihigh || item.mntninfohght || "",
      overview: item.mntninfodscrt || item.mntninfodtlinfocont || "",
      selectedReason: item.hndfmsmtnslctnrson || "",
      transport: item.ptmntrcmmncoursdscrt || "",
      raw: item,
    }));

    return forestJsonResponse({
      ok: true,
      source: "forest.go.kr:getforeststoryservice",
      query,
      totalCount: Number(getTagValue(xml, "totalCount") || mountains.length),
      mountains,
    });
  } catch (error) {
    return forestJsonResponse(
      {
        ok: false,
        error:
          error instanceof Error && error.name === "AbortError"
            ? "Forest API request timed out."
            : error instanceof Error
              ? error.message
              : "Unknown forest API error.",
        mountains: [],
      },
      { status: 500 }
    );
  }
}
