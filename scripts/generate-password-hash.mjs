import argon2 from "argon2";

const password = process.argv[2];

if (!password) {
  console.error('Use: npm run auth:hash -- "SUA-SENHA-FORTE"');
  process.exit(1);
}

if (password.trim().length < 12) {
  console.error("Use uma senha com pelo menos 12 caracteres.");
  process.exit(1);
}

const hash = await argon2.hash(password.trim(), {
  type: argon2.argon2id,
  memoryCost: 64 * 1024,
  timeCost: 3,
  parallelism: 1,
});

console.log(hash);
