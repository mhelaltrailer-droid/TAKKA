import { handlePresignUpload } from "@/lib/presign-upload";

export const runtime = "nodejs";

/** Bearer-token alias of POST /api/uploads/presign. Mobile skips Clerk middleware. */
export async function POST(request: Request) {
  return handlePresignUpload(request);
}
