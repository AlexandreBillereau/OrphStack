import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type CatalogCommand = {
  name: string;
  description?: string;
  npx: string;
};

export type CommandCatalogFile = {
  commands: CatalogCommand[];
};

const CATALOG_FILENAME = "catalog.json";

/** normalize: trim + collapse inner whitespace, lower case */
export function normalizeInvocation(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Path to bundled `commands/catalog.json` (next to compiled `dist/`) */
export function resolveCatalogPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "commands", CATALOG_FILENAME);
}

export async function loadCommandCatalog(fromPath?: string): Promise<CatalogCommand[]> {
  const p = fromPath ?? resolveCatalogPath();
  try {
    const raw = await readFile(p, "utf8");
    const parsed = JSON.parse(raw) as CommandCatalogFile;
    if (!Array.isArray(parsed.commands)) {
      return [];
    }
    return parsed.commands.filter((c) => typeof c.name === "string" && typeof c.npx === "string");
  } catch {
    return [];
  }
}

export function resolveSubmittedCommand(all: CatalogCommand[], lineRaw: string): CatalogCommand | undefined {
  const key = normalizeInvocation(lineRaw);
  if (!key) {
    return undefined;
  }
  return all.find((c) => normalizeInvocation(c.name) === key);
}
