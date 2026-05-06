// translation.js

let currentLang = "en";
let translations = {};
let fallbackTranslations = {};

// Load language files
export async function loadLanguage(lang) {
  try {
    const [langData, fallbackData] = await Promise.all([
      fetch(`/static/lang/${lang}.json`).then(res => res.json()),
      fetch(`/static/lang/en.json`).then(res => res.json())
    ]);

    translations = langData;
    fallbackTranslations = fallbackData;
    currentLang = lang;

    applyTranslations();
    localStorage.setItem("lang", lang);

  } catch (err) {
    console.error("Error loading language:", err);
  }
}

// applying translations to HTML
export function applyTranslations() {
  // Visible text
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;

    const text =
      translations[key] ||
      fallbackTranslations[key] ||
      el.textContent ||
      key;

    if (el.tagName === "TITLE") {
      document.title = text;
    } else {
      el.textContent = text;
    }
  });

  // Placeholder text
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.dataset.i18nPlaceholder;

    const text =
      translations[key] ||
      fallbackTranslations[key] ||
      el.getAttribute("placeholder") ||
      key;

    el.placeholder = text;
  });

  // Title attribute text
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.dataset.i18nTitle;

    const text =
      translations[key] ||
      fallbackTranslations[key] ||
      el.getAttribute("title") ||
      key;

    el.setAttribute("title", text);
  });

  // Aria labels text
  document.querySelectorAll("[data-i18n-aria-label]").forEach(el => {
    const key = el.dataset.i18nAriaLabel;

    const text =
      translations[key] ||
      fallbackTranslations[key] ||
      el.getAttribute("aria-label") ||
      key;

    el.setAttribute("aria-label", text);
  });
}

// translation function for game engine
export function t(key, vars = {}) {
  let text =
    translations[key] ||
    fallbackTranslations[key] ||
    key;

  // Replace variables like {amount}
  Object.keys(vars).forEach(k => {
    text = text.replace(`{${k}}`, vars[k]);
  });

  return text;
}

// Auto-run on every page
document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("lang") || "en";
  loadLanguage(savedLang);
});