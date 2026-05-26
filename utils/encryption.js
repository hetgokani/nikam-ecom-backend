const crypto = require("crypto");

const algorithm = "aes-256-cbc";
// Use a fallback key if ENCRYPTION_KEY isn't in .env
const getSecretKey = () => {
  const key = process.env.ENCRYPTION_KEY || "SuperSecretKeyForSneakersWala123";
  return crypto.scryptSync(key, "salt", 32);
};

exports.encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, getSecretKey(), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv: iv.toString("hex"), encryptedData: encrypted.toString("hex") };
};

exports.decrypt = (hash) => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    getSecretKey(),
    Buffer.from(hash.iv, "hex")
  );
  let decrypted = decipher.update(Buffer.from(hash.encryptedData, "hex"));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};
