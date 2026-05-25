import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const langRoot = path.join(root, "app", "static", "lang");
const sourcePath = path.join(langRoot, "en.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const sourceKeys = Object.keys(source).sort();
const placeholderPattern = /\{[A-Za-z0-9_]+\}/g;
const issues = [];

function placeholders(value) {
  if (typeof value !== "string") {
    return [];
  }

  return [...value.matchAll(placeholderPattern)].map((match) => match[0]).sort();
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

for (const entry of fs.readdirSync(langRoot, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name === "en.json") {
    continue;
  }

  const languagePath = path.join(langRoot, entry.name);
  const language = JSON.parse(fs.readFileSync(languagePath, "utf8"));
  const languageKeys = Object.keys(language).sort();
  const missingKeys = sourceKeys.filter((key) => !(key in language));
  const extraKeys = languageKeys.filter((key) => !(key in source));

  if (missingKeys.length > 0) {
    issues.push(`${entry.name} is missing keys: ${missingKeys.join(", ")}`);
  }

  if (extraKeys.length > 0) {
    issues.push(`${entry.name} has extra keys: ${extraKeys.join(", ")}`);
  }

  for (const key of sourceKeys) {
    if (!(key in language)) {
      continue;
    }

    const expectedPlaceholders = placeholders(source[key]);
    const actualPlaceholders = placeholders(language[key]);

    if (!sameArray(expectedPlaceholders, actualPlaceholders)) {
      issues.push(
        `${entry.name} placeholder mismatch for ${key}: expected ${expectedPlaceholders.join(", ") || "none"}, got ${actualPlaceholders.join(", ") || "none"}`
      );
    }
  }
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log(`i18n parity check passed for ${sourceKeys.length} keys.`);
