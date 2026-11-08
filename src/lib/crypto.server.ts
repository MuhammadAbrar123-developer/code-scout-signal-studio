// AES-256-GCM encryption for user API keys. The key comes from a server-only secret;
// the user id + provider are bound as associated data so ciphertext can't be moved between rows.

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(s: string) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey() {
  const secret = process.env["CREDENTIALS_ENCRYPTION_KEY"];
  if (!secret || secret.length < 32) throw new Error("Credential encryption is not configured.");
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plain: string, context: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(context) },
    await getKey(),
    enc.encode(plain),
  );
  return { ciphertext: b64(new Uint8Array(ct)), iv: b64(iv) };
}

export async function decryptSecret(ciphertext: string, iv: string, context: string) {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(iv), additionalData: enc.encode(context) },
    await getKey(),
    unb64(ciphertext),
  );
  return dec.decode(pt);
}
