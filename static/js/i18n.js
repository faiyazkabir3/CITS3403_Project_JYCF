const LANGUAGE_STORAGE_KEY = "route_zero_language";
const DEFAULT_LANGUAGE = "en";
const TRANSLATABLE_ATTRIBUTES = ["aria-label", "placeholder", "title"];
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"]);

const state = {
  language: DEFAULT_LANGUAGE,
  catalog: { strings: {}, patterns: [] },
  patternRules: [],
  observer: null,
  isApplying: false
};

function getCookie(name) {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
}

function setCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

function getStoredLanguage() {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) || getCookie(LANGUAGE_STORAGE_KEY);
  return stored || document.documentElement.lang || DEFAULT_LANGUAGE;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function preserveWhitespace(original, translated) {
  const leading = original.match(/^\s*/)?.[0] || "";
  const trailing = original.match(/\s*$/)?.[0] || "";
  return `${leading}${translated}${trailing}`;
}

function applyFragments(value) {
  const fragments = state.catalog.fragments || {};
  return Object.entries(fragments)
    .sort(([left], [right]) => right.length - left.length)
    .reduce((text, [source, replacement]) => text.replaceAll(source, replacement), value);
}

function shouldSkipNode(node) {
  const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  if (!parent) return true;
  if (parent.closest("[data-no-i18n]")) return true;
  return SKIP_TAGS.has(parent.tagName);
}

function translateText(value) {
  const normalized = normalizeText(value);
  if (!normalized) return value;

  const direct = state.catalog.strings?.[normalized];
  if (direct) return preserveWhitespace(value, applyFragments(direct));

  for (const rule of state.patternRules) {
    if (rule.regex.test(normalized)) {
      rule.regex.lastIndex = 0;
      return preserveWhitespace(value, applyFragments(normalized.replace(rule.regex, rule.replacement)));
    }
  }

  const translatedFragments = applyFragments(normalized);
  if (translatedFragments !== normalized) {
    return preserveWhitespace(value, translatedFragments);
  }

  return value;
}

function translateAttributes(element) {
  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    const value = element.getAttribute(attribute);
    if (!value) continue;

    const translated = translateText(value);
    if (translated !== value) {
      element.setAttribute(attribute, translated);
    }
  }
}

function translateTextNode(node) {
  if (shouldSkipNode(node)) return;

  const translated = translateText(node.nodeValue);
  if (translated !== node.nodeValue) {
    node.nodeValue = translated;
  }
}

function translateElement(root = document.body) {
  if (!root || state.isApplying) return;

  state.isApplying = true;
  try {
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }

    if (shouldSkipNode(root)) return;

    translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();

    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        translateTextNode(node);
      } else if (node.nodeType === Node.ELEMENT_NODE && !shouldSkipNode(node)) {
        translateAttributes(node);
      }

      node = walker.nextNode();
    }
  } finally {
    state.isApplying = false;
  }
}

function buildPatternRules(patterns = []) {
  return patterns
    .map((rule) => {
      try {
        return {
          regex: new RegExp(rule.pattern, rule.flags || ""),
          replacement: rule.replacement || ""
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function loadCatalog(language) {
  const response = await fetch(`/api/translations/${encodeURIComponent(language)}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("Translation catalog could not be loaded.");
  }

  return response.json();
}

function syncLanguageControls() {
  document.querySelectorAll("[data-language-select]").forEach((select) => {
    select.value = state.language;
  });
}

async function setLanguage(language, { reload = false } = {}) {
  const nextLanguage = language || DEFAULT_LANGUAGE;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  setCookie(LANGUAGE_STORAGE_KEY, nextLanguage);

  if (reload) {
    window.location.reload();
    return;
  }

  state.language = nextLanguage;
  state.catalog = await loadCatalog(nextLanguage);
  state.patternRules = buildPatternRules(state.catalog.patterns);
  document.documentElement.lang = state.language;
  syncLanguageControls();
  translateElement(document.body);
}

function bindLanguageControls() {
  document.querySelectorAll("[data-language-select]").forEach((select) => {
    select.value = state.language;
    select.addEventListener("change", () => {
      setLanguage(select.value, { reload: true }).catch(() => {});
    });
  });
}

function observeTranslations() {
  if (state.observer || !document.body) return;

  state.observer = new MutationObserver((mutations) => {
    if (state.isApplying || state.language === DEFAULT_LANGUAGE) return;

    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => translateElement(node));

      if (mutation.type === "characterData") {
        translateElement(mutation.target);
      }
    }
  });

  state.observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

async function initTranslations() {
  state.language = getStoredLanguage();
  setCookie(LANGUAGE_STORAGE_KEY, state.language);

  try {
    state.catalog = await loadCatalog(state.language);
    state.patternRules = buildPatternRules(state.catalog.patterns);
  } catch {
    state.language = DEFAULT_LANGUAGE;
    state.catalog = { strings: {}, patterns: [] };
    state.patternRules = [];
  }

  document.documentElement.lang = state.language;
  bindLanguageControls();
  translateElement(document.body);
  observeTranslations();
}

window.RouteZeroI18n = {
  setLanguage,
  translate: translateText,
  apply: translateElement,
  get language() {
    return state.language;
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTranslations);
} else {
  initTranslations();
}
