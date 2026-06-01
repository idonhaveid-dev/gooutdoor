import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const GPX_FILES: Record<string, string> = {
  "dobongsan-jaunbong": "PMNTN_도봉산_자운봉_113200102.gpx",
};

const parseTrackSegments = (xml: string) => {
  const tracks = xml.match(/<trk>[\s\S]*?<\/trk>/g) || [];

  return tracks
    .map((track) => {
      const points = Array.from(
        track.matchAll(/<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"/g)
      ).map((match) => ({
        lat: Number(match[1]),
        lng: Number(match[2]),
      }));

      const deduped = points.filter((point, index) => {
        if (index === 0) return true;
        const prev = points[index - 1];
        return point.lat !== prev.lat || point.lng !== prev.lng;
      });

const sampleStep = Math.max(1, Math.floor(deduped.length / 80));

const sampled = deduped.filter((_, index) => index % sampleStep === 0);

if (sampled.at(-1) !== deduped.at(-1)) {
  sampled.push(deduped[deduped.length - 1]);
}

return sampled;    })
    .filter((segment) => segment.length > 1);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  const fileName = GPX_FILES[id];

  if (!fileName) {
    return Response.json(
      { ok: false, error: "unknown gpx id", paths: [] },
      { status: 400 }
    );
  }

  const filePath = path.join(
    process.cwd(),
    "raw-data",
    "national-park-trails",
    fileName
  );

  const xml = await readFile(filePath, "utf-8");
const paths = parseTrackSegments(xml);

const course = searchParams.get("course") || "";
const dobongSinseondaeIndexes = new Set([
  304,
  308,
  162,
  302,
  292,
  294,
  148,
  153,
]);

const filteredPaths =
  course === "dobongsan-sinseondae"
    ? paths.filter((_, index) => dobongSinseondaeIndexes.has(index))
    : paths;

return Response.json({
  ok: true,
  id,
  course: course || null,
  totalSegments: paths.length,
  returnedSegments: filteredPaths.length,
  paths: filteredPaths,
});
}