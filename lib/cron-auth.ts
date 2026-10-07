import "server-only";
import { timingSafeEqual } from "node:crypto";

export function isCronAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(received)) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
