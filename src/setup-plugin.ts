import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeOrphPluginMeta } from "./wp-context.js";

/** Unpacked boilerplate under `templates/` (no zip). */
const TEMPLATE_FOLDER = "wp-plugin-boilerplate";

const OLD_KEBAB = "orphic-plugin-boilerplate";
const OLD_CLASS = "Orphic_Plugin_Boilerplate";
const OLD_SNAKE = "orphic_plugin_boilerplate";
const OLD_UPPER = "ORPHIC_PLUGIN_BOILERPLATE";

const TEXT_EXTENSIONS = new Set([
  ".php",
  ".js",
  ".css",
  ".json",
  ".md",
  ".txt",
  ".html",
  ".xml",
  ".yml",
  ".yaml",
]);

function isProbablyTextFile(filePath: string): boolean {
  const base = path.basename(filePath);
  if (base === ".gitignore" || base === "LICENSE") return true;
  const ext = path.extname(base).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

export type SlugDerivation = {
  kebab: string;
  snake: string;
  upper: string;
  classPrefix: string;
};

export function deriveIdentifiers(slug: string): SlugDerivation {
  const kebab = slug.trim().toLowerCase();
  const parts = kebab.split("-").filter(Boolean);
  const snake = parts.join("_");
  const upper = snake.toUpperCase();
  const classPrefix = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("_");
  return { kebab, snake, upper, classPrefix };
}

export function resolvePackageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

export function resolveBoilerplateTemplateDir(): string {
  return path.join(resolvePackageRoot(), "templates", TEMPLATE_FOLDER);
}

function pluginsDirectory(wpRoot: string): string {
  return path.join(wpRoot, "wp-content", "plugins");
}

function walkFiles(root: string, out: string[]): void {
  for (const name of readdirSync(root)) {
    if (name === ".git") continue;
    const full = path.join(root, name);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
}

function walkFilesOnly(root: string, out: string[]): void {
  for (const name of readdirSync(root)) {
    const full = path.join(root, name);
    const st = statSync(full);
    if (st.isDirectory()) walkFilesOnly(full, out);
    else out.push(full);
  }
}

function applyReplacements(content: string, repl: SlugDerivation, displayName: string): string {
  let out = content;
  out = out.split(OLD_UPPER).join(repl.upper);
  out = out.split(OLD_CLASS).join(repl.classPrefix);
  out = out.split(OLD_SNAKE).join(repl.snake);
  out = out.split(OLD_KEBAB).join(repl.kebab);

  out = out.split("Plugin Name:       Orphic plugin boilerplate").join(`Plugin Name:       ${displayName}`);
  out = out.split("Orphic plugin boilerplate").join(displayName);
  out = out.split("# Orphic WP Plugin Boilerplate").join(`# ${displayName}`);

  return out;
}

function transformFileContents(pluginRoot: string, repl: SlugDerivation, displayName: string): void {
  const files: string[] = [];
  walkFiles(pluginRoot, files);
  for (const file of files) {
    if (!isProbablyTextFile(file)) continue;
    let raw: string;
    try {
      raw = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (raw.includes("\u0000")) continue;
    const next = applyReplacements(raw, repl, displayName);
    if (next !== raw) writeFileSync(file, next, "utf8");
  }
}

function renameFilesWithOldSlug(pluginRoot: string, newKebab: string): void {
  const paths: string[] = [];
  walkFilesOnly(pluginRoot, paths);
  paths.sort((a, b) => b.length - a.length);
  const oldSnippet = OLD_KEBAB;
  const newSnippet = newKebab;

  for (const fp of paths) {
    const base = path.basename(fp);
    if (!base.includes(oldSnippet)) continue;
    const renamed = base.split(oldSnippet).join(newSnippet);
    const dest = path.join(path.dirname(fp), renamed);
    if (existsSync(dest)) {
      throw new Error(`Rename conflict: ${dest} already exists.`);
    }
    renameSync(fp, dest);
  }
}

export type SetupPluginOk = {
  wpRoot: string;
  pluginsDir: string;
  pluginDir: string;
  mainPhp: string;
};

export type SetupPluginResult =
  | { ok: true; setup: SetupPluginOk }
  | {
      ok: false;
      error: string;
    };

/**
 * Copy unpacked template → `plugins/{slug}`, replace tokens, rename files matching the boilerplate slug.
 * Expects `wpRoot` from `discoverWordPressRoot`; caller must verify `.orphstack-init` exists if required.
 */
export function setupPluginFromTemplate(options: {
  wpRoot: string;
  slug: string;
  displayName: string;
}): SetupPluginResult {
  const { wpRoot, slug, displayName } = options;
  const repl = deriveIdentifiers(slug);

  const tmpl = resolveBoilerplateTemplateDir();
  if (!existsSync(tmpl)) {
    return { ok: false, error: `Missing template folder: ${tmpl}` };
  }

  const pdir = pluginsDirectory(wpRoot);
  if (!existsSync(pdir)) {
    return { ok: false, error: `wp-content/plugins not found under ${wpRoot}` };
  }

  const pluginDir = path.join(pdir, repl.kebab);
  if (existsSync(pluginDir)) {
    return { ok: false, error: `Plugin folder already exists: ${pluginDir}` };
  }

  mkdirSync(pluginDir, { recursive: false });

  const mainPhp = path.join(pluginDir, `${repl.kebab}.php`);

  try {
    cpSync(tmpl, pluginDir, { recursive: true });

    /** Replace file bodies (includes PHP string paths → new filenames) before physical renames */
    transformFileContents(pluginDir, repl, displayName);
    renameFilesWithOldSlug(pluginDir, repl.kebab);

    if (!existsSync(mainPhp)) {
      return {
        ok: false,
        error: `Expected main bootstrap at ${mainPhp}. Check slug / template.`,
      };
    }

    writeOrphPluginMeta(pluginDir, { slug: repl.kebab, displayName });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Scaffold failed: ${msg}` };
  }

  return {
    ok: true,
    setup: {
      wpRoot,
      pluginsDir: pdir,
      pluginDir,
      mainPhp,
    },
  };
}
