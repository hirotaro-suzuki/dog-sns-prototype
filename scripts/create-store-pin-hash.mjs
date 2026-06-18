import { randomBytes, scryptSync } from "node:crypto";

const pin = process.argv[2];

if (!pin) {
  console.error("Usage: node scripts/create-store-pin-hash.mjs <PIN>");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(pin, Buffer.from(salt, "hex"), 32).toString("hex");

console.log(`scrypt:${salt}:${hash}`);
