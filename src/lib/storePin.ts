import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";

const SCRYPT_KEY_LENGTH = 32;

export function createStorePinHash(pin: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(pin, Buffer.from(salt, "hex"), SCRYPT_KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyStorePin(pin: string, storedHash: string) {
  if (storedHash.startsWith("scrypt:")) {
    const [, salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;

    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(pin, Buffer.from(salt, "hex"), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  if (storedHash.startsWith("sha256:")) {
    const expected = Buffer.from(storedHash.slice("sha256:".length), "hex");
    const actual = Buffer.from(createHash("sha256").update(pin).digest("hex"), "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  return false;
}
