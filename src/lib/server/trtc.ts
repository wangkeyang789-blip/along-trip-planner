import { createHmac } from "node:crypto";
import { deflateRawSync } from "node:zlib";
import type { TrtcReadiness } from "@/lib/room-contracts";

const DEFAULT_EXPIRE_SECONDS = 7 * 24 * 60 * 60;

function base64Url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "*")
    .replace(/\//g, "-")
    .replace(/=/g, "_");
}

export function getTrtcReadiness(): TrtcReadiness {
  const sdkAppId =
    process.env.TRTC_SDK_APP_ID ||
    process.env.NEXT_PUBLIC_TRTC_SDK_APP_ID ||
    null;
  const missing: string[] = [];

  if (!sdkAppId) missing.push("TRTC_SDK_APP_ID");
  if (!process.env.TRTC_SECRET_KEY) missing.push("TRTC_SECRET_KEY");

  return {
    ready: missing.length === 0,
    sdkAppId,
    missing,
  };
}

export function createTrtcUserSig(input: {
  userId: string;
  expireSeconds?: number;
}) {
  const readiness = getTrtcReadiness();
  const sdkAppId = readiness.sdkAppId;
  const secretKey = process.env.TRTC_SECRET_KEY;

  if (!readiness.ready || !sdkAppId || !secretKey) {
    throw new Error(`TRTC_NOT_CONFIGURED:${readiness.missing.join(",")}`);
  }

  const expireSeconds = input.expireSeconds || DEFAULT_EXPIRE_SECONDS;
  const currentTime = Math.floor(Date.now() / 1000);
  const signContent = [
    `TLS.identifier:${input.userId}`,
    `TLS.sdkappid:${sdkAppId}`,
    `TLS.time:${currentTime}`,
    `TLS.expire:${expireSeconds}`,
    "",
  ].join("\n");
  const signature = createHmac("sha256", secretKey)
    .update(signContent)
    .digest("base64");
  const payload = {
    "TLS.ver": "2.0",
    "TLS.identifier": input.userId,
    "TLS.sdkappid": Number(sdkAppId),
    "TLS.expire": expireSeconds,
    "TLS.time": currentTime,
    "TLS.sig": signature,
  };

  return {
    sdkAppId,
    expireAt: (currentTime + expireSeconds) * 1000,
    userSig: base64Url(deflateRawSync(Buffer.from(JSON.stringify(payload)))),
  };
}
