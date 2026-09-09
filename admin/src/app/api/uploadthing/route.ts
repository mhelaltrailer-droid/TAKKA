import { createRouteHandler } from "uploadthing/next";

import { uploadRouter } from "./core";

// Node runtime avoids edge self-fetch callback issues during UploadThing completion.
export const runtime = "nodejs";

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
});
