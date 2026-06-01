import { searchMountainProfiles } from "../../data/mountains";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const mountains = searchMountainProfiles(query);

  return Response.json({
    ok: true,
    source: "local:mountain-profiles",
    query,
    totalCount: mountains.length,
    mountains,
  });
}
