#!/usr/bin/env node
import { cancel, confirm, intro, isCancel, note, outro, select, spinner, text } from "@clack/prompts";
import {
  loadCommandCatalog,
  normalizeInvocation,
  resolveSubmittedCommand,
  type CatalogCommand,
} from "./command-catalog.js";

const SETUP_PLUGIN_NAME = "setup plugin";

/** folder slug pattern: wordpress-style kebab-case */
const SLUG_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function isSetupPluginCommand(cmd: CatalogCommand): boolean {
  return normalizeInvocation(cmd.name) === normalizeInvocation(SETUP_PLUGIN_NAME);
}

function slugFromDisplayName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

async function promptNewPluginIdentifiers(): Promise<
  | { ok: true; displayName: string; slug: string }
  | { ok: false; reason: symbol }
> {
  const displayRaw = await text({
    message: "Plugin display name (shown in WordPress)",
    placeholder: "My Vendor Extension",
    validate: (value) => (value.trim().length === 0 ? "Enter a plugin name." : undefined),
  });
  if (isCancel(displayRaw)) {
    return { ok: false, reason: displayRaw };
  }
  const displayName = displayRaw.trim();
  const suggestion = slugFromDisplayName(displayName) || "my-plugin";

  const slugRaw = await text({
    message: "Plugin folder slug → will live at wp-content/plugins/{slug}/",
    placeholder: suggestion,
    initialValue: suggestion,
    validate: (value) => {
      const slug = value.trim().toLowerCase();
      if (slug.length === 0) {
        return "Enter a slug.";
      }
      if (!SLUG_RE.test(slug)) {
        return "Use lowercase letters, numbers and single hyphens (e.g. my-vendor-extension).";
      }
      return undefined;
    },
  });
  if (isCancel(slugRaw)) {
    return { ok: false, reason: slugRaw };
  }

  return { ok: true, displayName, slug: slugRaw.trim().toLowerCase() };
}

async function chooseCommandFromCatalog(all: CatalogCommand[]): Promise<CatalogCommand | symbol> {
  const choice = await select({
    message: "Pick a workflow",
    options: all
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((cmd) => ({
        value: cmd.name,
        label: cmd.name,
        hint: cmd.description,
      })),
    initialValue: all[0]?.name ?? "",
  });
  if (isCancel(choice)) {
    return choice;
  }
  return all.find((c) => c.name === choice)!;
}

async function main(): Promise<void> {
  intro(`orphstack`);

  const spin = spinner();
  spin.start("Loading command catalog");
  const catalog = await loadCommandCatalog();
  spin.stop(catalog.length > 0 ? "Catalog loaded" : "No catalog entries");

  if (catalog.length === 0) {
    cancel("Missing or empty commands/catalog.json next to dist/. Run npm run dev from repo root.");
    process.exitCode = 1;
    return;
  }

  const argvArg = process.argv.slice(2).join(" ").trim();

  let chosen: CatalogCommand | symbol;
  if (argvArg) {
    const hit = resolveSubmittedCommand(catalog, argvArg);
    if (!hit) {
      cancel(`Unknown command: "${argvArg}". Try without args to browse the catalog.`);
      process.exitCode = 1;
      return;
    }
    chosen = hit;
  } else {
    chosen = await chooseCommandFromCatalog(catalog);
    if (isCancel(chosen)) {
      cancel("Aborted.");
      return;
    }
  }

  let pluginContext = "";
  if (isSetupPluginCommand(chosen)) {
    const ids = await promptNewPluginIdentifiers();
    if (!ids.ok) {
      cancel("Aborted.");
      return;
    }
    pluginContext =
      `\nTarget identification:\n` +
      `  Display name: ${ids.displayName}\n` +
      `  Folder slug:  ${ids.slug}\n`;
  }

  note(
    `${chosen.description ? `${chosen.description}\n\n` : ""}${pluginContext}` +
      `Mapped invocation (wired next):\n` +
      `  ${chosen.npx}`,
    chosen.name,
  );

  const go = await confirm({
    message: "Continue? (runs nothing yet — execution will be wired next)",
    initialValue: true,
  });

  if (isCancel(go) || !go) {
    cancel("Stopped before run.");
    return;
  }

  outro("Next step: wire Spawn / child_process for mapped npx (or fork in-repo scripts).");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
