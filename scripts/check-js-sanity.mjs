import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const issues = [];

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath, predicate));
      continue;
    }

    if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/");
}

function checkSyntax(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const isModule = /\b(import|export)\b/.test(source);

  try {
    if (!isModule) {
      new vm.Script(source, {
        filename: filePath,
      });
    }
  } catch (error) {
    const output = error instanceof Error ? error.stack || error.message : String(error);
    issues.push(`Syntax check failed: ${relative(filePath)}\n${output}`);
  }
}

function checkJsImportsAndAssets(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const importMatches = [...source.matchAll(/from\s+["'](.+?)["']/g)];

  for (const match of importMatches) {
    const specifier = match[1];

    if (!specifier.startsWith(".")) {
      continue;
    }

    const resolvedPath = path.resolve(path.dirname(filePath), specifier);
    if (!fs.existsSync(resolvedPath)) {
      issues.push(`Missing import target: ${relative(filePath)} -> ${specifier}`);
    }
  }

  const staticMatches = [...source.matchAll(/["']\/static\/([^"']+)["']/g)];
  for (const match of staticMatches) {
    const assetPath = path.join(root, "static", ...match[1].split("/"));
    if (!fs.existsSync(assetPath)) {
      issues.push(`Missing static asset in JS: ${relative(filePath)} -> /static/${match[1]}`);
    }
  }
}

function checkTemplateAssets(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const filenameMatches = [...source.matchAll(/filename\s*=\s*["']([^"']+)["']/g)];

  for (const match of filenameMatches) {
    const assetPath = path.join(root, "static", ...match[1].split("/"));
    if (!fs.existsSync(assetPath)) {
      issues.push(`Missing static asset in template: ${relative(filePath)} -> ${match[1]}`);
    }
  }
}

const jsFiles = walk(path.join(root, "static", "js"), (filePath) => filePath.endsWith(".js"));
const templateFiles = walk(path.join(root, "templates"), (filePath) => filePath.endsWith(".html"));

for (const filePath of jsFiles) {
  checkSyntax(filePath);
  checkJsImportsAndAssets(filePath);
}

for (const filePath of templateFiles) {
  checkTemplateAssets(filePath);
}

if (issues.length > 0) {
  console.error(issues.join("\n\n"));
  process.exit(1);
}

console.log(
  `JS sanity check passed for ${jsFiles.length} JS files and ${templateFiles.length} templates.`,
);
