import { handlePresignUpload } from "@/lib/presign-upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handlePresignUpload(request);
}
