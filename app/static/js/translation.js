const DEFAULT_LANGUAGE = "en";
const LANGUAGE_STORAGE_KEY = "lang";
const SUPPORTED_LANGUAGES = new Set(["en", "nl", "bn", "zh-cn", "ja"]);

let currentLang = DEFAULT_LANGUAGE;
let translations = {};
let fallbackTranslations = {};
let languageLoadPromise = null;
const languageCache = new Map();

function normalizeLanguage(language) {
  const value = String(language || "").trim().toLowerCase();
  return SUPPORTED_LANGUAGES.has(value) ? value : DEFAULT_LANGUAGE;
}

function getServerLanguage() {
  return (
    document.documentElement.dataset.preferredLanguage ||
    document.body?.dataset.preferredLanguage ||
    ""
  );
}

function getInitialLanguage() {
  const serverLanguage = getServerLanguage();
  if (serverLanguage) {
    return normalizeLanguage(serverLanguage);
  }

  return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.content || "";
}

async function fetchLanguage(language) {
  const normalizedLanguage = normalizeLanguage(language);
  if (!languageCache.has(normalizedLanguage)) {
    languageCache.set(
      normalizedLanguage,
      fetch(`/static/lang/${normalizedLanguage}.json`).then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load language ${normalizedLanguage}`);
        }
        return response.json();
      })
    );
  }

  return languageCache.get(normalizedLanguage);
}

function syncLanguageState(language) {
  currentLang = normalizeLanguage(language);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLang);
  document.documentElement.lang = currentLang;
  document.documentElement.dataset.preferredLanguage = currentLang;

  document.dispatchEvent(new CustomEvent("languagechange", {
    detail: { language: currentLang }
  }));
}

export function getCurrentLanguage() {
  return currentLang;
}

export function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}

export async function loadLanguage(language = getInitialLanguage()) {
  const normalizedLanguage = normalizeLanguage(language);

  try {
    const [langData, fallbackData] = await Promise.all([
      fetchLanguage(normalizedLanguage),
      fetchLanguage(DEFAULT_LANGUAGE)
    ]);

    translations = langData;
    fallbackTranslations = fallbackData;
    syncLanguageState(normalizedLanguage);
    applyTranslations();
  } catch (error) {
    console.error("Error loading language:", error);

    if (normalizedLanguage !== DEFAULT_LANGUAGE) {
      return loadLanguage(DEFAULT_LANGUAGE);
    }
  }

  return currentLang;
}

export async function saveLanguagePreference(language) {
  const normalizedLanguage = normalizeLanguage(language);
  const csrfToken = getCsrfToken();

  const response = await fetch("/settings/language", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {})
    },
    body: JSON.stringify({ language: normalizedLanguage })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || "Language preference could not be saved.");
  }

  return normalizeLanguage(payload.language);
}

export async function setLanguage(language, { saveRemote = true } = {}) {
  const normalizedLanguage = normalizeLanguage(language);
  await loadLanguage(normalizedLanguage);

  if (saveRemote) {
    const savedLanguage = await saveLanguagePreference(normalizedLanguage);
    if (savedLanguage !== normalizedLanguage) {
      await loadLanguage(savedLanguage);
    }
  }

  return currentLang;
}

export function initLanguage() {
  if (!languageLoadPromise) {
    languageLoadPromise = loadLanguage(getInitialLanguage());
  }

  return languageLoadPromise;
}

export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    const text = t(key, {}, element.textContent || key);

    if (element.tagName === "TITLE") {
      document.title = text;
    } else {
      element.textContent = text;
    }
  });

  root.querySelectorAll("[data-i18n-template]").forEach((element) => {
    const key = element.dataset.i18nTemplate;
    const name = element.dataset.i18nVarName || "";
    element.textContent = t(key, { name }, element.textContent || key);
  });

  root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    element.placeholder = t(key, {}, element.getAttribute("placeholder") || key);
  });

  root.querySelectorAll("[data-i18n-title]").forEach((element) => {
    const key = element.dataset.i18nTitle;
    element.setAttribute("title", t(key, {}, element.getAttribute("title") || key));
  });

  root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    element.setAttribute("aria-label", t(key, {}, element.getAttribute("aria-label") || key));
  });
}

export function t(key, vars = {}, fallback = key) {
  let text = translations[key] || fallbackTranslations[key] || fallback || key;

  Object.keys(vars).forEach((name) => {
    text = text.replaceAll(`{${name}}`, String(vars[name]));
  });

  return text;
}

document.addEventListener("DOMContentLoaded", () => {
  initLanguage();
});
