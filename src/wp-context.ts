import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export const FILENAME_ORPH_WP_INIT = ".orphstack-init";
export const FILENAME_ORPH_PLUGIN = ".orphstack-plugin";

export type OrphWpInitFile = {
  schemaVersion: 1;
};

export type OrphPluginMetaFile = {
  schemaVersion: 1;
  slug: string;
  displayName: string;
};

/**
 * Walk upward from startDir until both `wp-config.php` and `wp-content/plugins` exist.
 */
export function discoverWordPressRoot(startDir: string): string | undefined {
  let dir = path.resolve(startDir);
  for (;;) {
    const config = path.join(dir, "wp-config.php");
    const pluginsRoot = path.join(dir, "wp-content", "plugins");
    if (existsSync(config) && existsSync(pluginsRoot)) {
      try {
        if (statSync(pluginsRoot).isDirectory()) {
          return dir;
        }
      } catch {
        /* ignore */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export function hasOrphWpInit(wpRoot: string): boolean {
  return existsSync(path.join(wpRoot, FILENAME_ORPH_WP_INIT));
}

export function writeOrphWpInit(wpRoot: string): void {
  const data: OrphWpInitFile = { schemaVersion: 1 };
  writeFileSync(path.join(wpRoot, FILENAME_ORPH_WP_INIT), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function readOrphPluginMeta(pluginDir: string): OrphPluginMetaFile | undefined {
  const fp = path.join(pluginDir, FILENAME_ORPH_PLUGIN);
  if (!existsSync(fp)) return undefined;
  try {
    const raw = JSON.parse(readFileSync(fp, "utf8")) as Partial<OrphPluginMetaFile>;
    if (raw.schemaVersion !== 1 || typeof raw.slug !== "string" || typeof raw.displayName !== "string") {
      return undefined;
    }
    return raw as OrphPluginMetaFile;
  } catch {
    return undefined;
  }
}

export function writeOrphPluginMeta(pluginDir: string, meta: Pick<OrphPluginMetaFile, "slug" | "displayName">): void {
  const data: OrphPluginMetaFile = { schemaVersion: 1, slug: meta.slug, displayName: meta.displayName };
  writeFileSync(path.join(pluginDir, FILENAME_ORPH_PLUGIN), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export type OrphPluginListed = {
  folderName: string;
  absoluteDir: string;
  slug: string;
  displayName: string;
};

/** Chaque dossier dans wp-content/plugins qui contient `.orphstack-plugin`. */
export function listOrphPlugins(wpRoot: string): OrphPluginListed[] {
  const pluginsRoot = path.join(wpRoot, "wp-content", "plugins");
  if (!existsSync(pluginsRoot)) return [];

  const out: OrphPluginListed[] = [];
  for (const name of readdirSync(pluginsRoot)) {
    if (name.startsWith(".")) continue;
    const abs = path.join(pluginsRoot, name);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;

    const meta = readOrphPluginMeta(abs);
    if (!meta) continue;

    out.push({
      folderName: name,
      absoluteDir: abs,
      slug: meta.slug,
      displayName: meta.displayName,
    });
  }

  out.sort((a, b) => a.slug.localeCompare(b.slug));
  return out;
}
