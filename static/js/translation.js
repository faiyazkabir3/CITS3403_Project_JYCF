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
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;

    const text =
      translations[key] ||
      fallbackTranslations[key] ||
      key;

    el.textContent = text;
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