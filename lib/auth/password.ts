import "server-only";

import argon2 from "argon2";

const memoryCost = 64 * 1024;
const timeCost = 3;
const parallelism = 1;

export async function hashPassword(password: string) {
  const normalizedPassword = password.trim();

  if (normalizedPassword.length < 12) {
    throw new Error("Password must contain at least 12 characters.");
  }

  return argon2.hash(normalizedPassword, {
    type: argon2.argon2id,
    memoryCost,
    timeCost,
    parallelism,
  });
}

export async function verifyPassword(password: string, storedHash: string) {
  if (!storedHash) {
    return false;
  }

  try {
    return await argon2.verify(storedHash, password.trim());
  } catch {
    return false;
  }
}
