import { NextResponse } from "next/server";

import {
  getDiscoveryFeed,
  parseDiscoveryFeedQuery,
} from "@/lib/discovery-feed";

/**
 * Lean, cursor-paginated kitchen feed for customer home/discovery.
 *
 * Query params:
 * - cityName (default: مدينة العبور)
 * - regionId | regionName | regionNames (comma-separated OR district filter)
 * - category (FoodCategory slug)
 * - q (case-insensitive contains on kitchen name/description and dish name/description)
 * - cursor, limit (default 20, max 50)
 *
 * Response: { items, nextCursor, hasMore }
 *
 * Legacy full list remains at GET /api/discovery/kitchens for older APKs.
 * Full menu remains at GET /api/discovery/kitchens/[id].
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = parseDiscoveryFeedQuery(searchParams);
  const page = await getDiscoveryFeed(query);
  return NextResponse.json(page);
}
