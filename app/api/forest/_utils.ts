type XmlRecord = Record<string, string>;

export const getForestServiceKey = () =>
  process.env.FOREST_SERVICE_KEY || process.env.DATA_GO_KR_SERVICE_KEY || "";

export const buildForestUrl = (
  endpoint: string,
  params: Record<string, string | number | undefined>
) => {
  const url = new URL(endpoint);
  const serviceKey = getForestServiceKey();

  if (serviceKey) {
    url.searchParams.set("serviceKey", serviceKey);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
};

export const stripCdata = (value: string) =>
  value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();

export const decodeXml = (value: string) =>
  stripCdata(value)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

export const getTagValue = (xml: string, tag: string) => {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
};

export const parseItems = (xml: string): XmlRecord[] => {
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

  return itemMatches.map((itemXml) => {
    const record: XmlRecord = {};
    const tagMatches = itemXml.matchAll(/<([^/][^>\s]*?)>([\s\S]*?)<\/\1>/gi);

    for (const match of tagMatches) {
      record[match[1]] = decodeXml(match[2]);
    }

    return record;
  });
};

export const forestJsonResponse = (body: unknown, init?: ResponseInit) =>
  Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "s-maxage=86400, stale-while-revalidate=604800",
      ...(init?.headers || {}),
    },
  });
