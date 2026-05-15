(() => {
  const page = document.body;
  const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
  const currentUserId = Number(page?.dataset.userId || page?.dataset.currentUserId || 0);
  const encoder = new TextEncoder();

  if (!currentUserId || !window.crypto?.subtle) {
    return;
  }

  function bytesToBase64Url(bytes) {
    const binary = Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join("");
    return window.btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }

  function base64UrlToBytes(value) {
    const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
    const binary = window.atob(padded.replaceAll("-", "+").replaceAll("_", "/"));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  async function hashKeyId(publicKey) {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(publicKey));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);
  }

  function getStorageKey() {
    return `cits3403:e2ee:${currentUserId}`;
  }

  async function importPrivateKey(privateKey) {
    return crypto.subtle.importKey(
      "pkcs8",
      base64UrlToBytes(privateKey),
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );
  }

  async function exportOwnKeys(keyPair) {
    const publicKey = bytesToBase64Url(await crypto.subtle.exportKey("spki", keyPair.publicKey));
    const privateKey = bytesToBase64Url(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));

    return {
      publicKey,
      privateKey,
      keyId: await hashKeyId(publicKey),
    };
  }

  async function loadOrCreateOwnKeyRecord() {
    const saved = window.localStorage.getItem(getStorageKey());

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.publicKey && parsed.privateKey && parsed.keyId) {
          await importPrivateKey(parsed.privateKey);
          return parsed;
        }
      } catch {
        window.localStorage.removeItem(getStorageKey());
      }
    }

    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );
    const exported = await exportOwnKeys(keyPair);
    window.localStorage.setItem(getStorageKey(), JSON.stringify(exported));
    return exported;
  }

  async function registerChatKey() {
    const ownKeyRecord = await loadOrCreateOwnKeyRecord();
    const csrfToken = csrfTokenMeta?.content || "";

    await fetch("/chat/keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
      body: JSON.stringify({ public_key: ownKeyRecord.publicKey }),
    });
  }

  registerChatKey().catch(() => {});
})();
