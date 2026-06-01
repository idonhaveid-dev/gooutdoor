import { findNationalParkTrails } from "../../../data/nationalParkTrails";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mountain = searchParams.get("mountain") || "";

  const trails = findNationalParkTrails(mountain);

  return Response.json({
    ok: true,
    source: "local:national-park-trails",
    mountain,
    totalCount: trails.length,
    trails,
  });
}
