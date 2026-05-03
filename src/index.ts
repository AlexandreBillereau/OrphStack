#!/usr/bin/env node
import path from "node:path";
import { cancel, confirm, intro, isCancel, note, outro, select, spinner, text } from "@clack/prompts";
import {
  loadCommandCatalog,
  normalizeInvocation,
  resolveSubmittedCommand,
  type CatalogCommand,
} from "./command-catalog.js";
import { setupPluginFromTemplate } from "./setup-plugin.js";
import {
  discoverWordPressRoot,
  hasOrphWpInit,
  listOrphPlugins,
  writeOrphWpInit,
  type OrphPluginListed,
} from "./wp-context.js";

const SETUP_PLUGIN_NAME = "setup plugin";
const MODEL_NAME = "model";
const HELP_NAME = "help";
const WORDPRESS_INIT_NAME = "wordpress init";

/** folder slug pattern: wordpress-style kebab-case */
const SLUG_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function parseCli(argv: string[]): { commandLine: string; startSearchDir: string } {
  const args = argv.slice(2);
  let startSearchDir = process.cwd();
  const rest: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === undefined) {
      continue;
    }
    if (a === "--path" || a === "-p") {
      const next = args[++i];
      if (next?.length) {
        startSearchDir = path.resolve(next);
      }
      continue;
    }
    rest.push(a);
  }

  return { commandLine: rest.join(" ").trim(), startSearchDir };
}

function isSetupPluginCommand(cmd: CatalogCommand): boolean {
  return normalizeInvocation(cmd.name) === normalizeInvocation(SETUP_PLUGIN_NAME);
}

function isModelCommand(cmd: CatalogCommand): boolean {
  return normalizeInvocation(cmd.name) === normalizeInvocation(MODEL_NAME);
}

function isHelpCommand(cmd: CatalogCommand): boolean {
  return normalizeInvocation(cmd.name) === normalizeInvocation(HELP_NAME);
}

function isWordPressInitCommand(cmd: CatalogCommand): boolean {
  return normalizeInvocation(cmd.name) === normalizeInvocation(WORDPRESS_INIT_NAME);
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
    message: "Nom d’affichage du plugin (visible dans WordPress)",
    placeholder: "My Vendor Extension",
    validate: (value) => (value.trim().length === 0 ? "Saisissez un nom." : undefined),
  });
  if (isCancel(displayRaw)) {
    return { ok: false, reason: displayRaw };
  }
  const displayName = displayRaw.trim();
  const suggestion = slugFromDisplayName(displayName) || "my-plugin";

  const slugRaw = await text({
    message: "Slug du dossier → le plugin sera dans wp-content/plugins/{slug}/",
    placeholder: suggestion,
    initialValue: suggestion,
    validate: (value) => {
      const slug = value.trim().toLowerCase();
      if (slug.length === 0) {
        return "Saisissez un slug.";
      }
      if (!SLUG_RE.test(slug)) {
        return "Lettres minuscules, chiffres et tirets uniquement (ex. mon-plugin).";
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
    message: "Choisir un workflow",
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

type EnsureWpOrphResult =
  | { ok: true; wpRoot: string }
  | { ok: false; kind: "no_wordpress"; message: string }
  | { ok: false; kind: "aborted" };

/**
 * Résoudre la racine WordPress et garantir `.orphstack-init`.
 */
async function ensureWordPressAndOrphInit(startSearchDir: string): Promise<EnsureWpOrphResult> {
  const wpRoot = discoverWordPressRoot(startSearchDir);
  if (!wpRoot) {
    return {
      ok: false,
      kind: "no_wordpress",
      message:
        `Aucune installation WordPress détectée au-dessus de :\n  ${path.resolve(startSearchDir)}\n\n` +
        `Placez-vous sous la racine WordPress ou utilisez --path <dossier>.`,
    };
  }

  if (hasOrphWpInit(wpRoot)) {
    return { ok: true, wpRoot };
  }

  const go = await confirm({
    message:
      `Le dossier WordPress suivant n’a pas encore .orphstack-init :\n  ${wpRoot}\n\n` +
      `Créer ce marqueur pour activer le contexte projet OrphStack ?`,
    initialValue: true,
  });

  if (isCancel(go)) {
    return { ok: false, kind: "aborted" };
  }

  if (!go) {
    cancel("Sans .orphstack-init, les commandes OrphStack projet sont désactivées. Utilisez « wordpress init » si besoin.");
    return { ok: false, kind: "aborted" };
  }

  writeOrphWpInit(wpRoot);
  return { ok: true, wpRoot };
}

function summaryOrphPlugins(plugins: OrphPluginListed[]): string {
  if (plugins.length === 0) {
    return `Plugins OrphStack détectés : aucun (.orphstack-plugin manquant).\nAprès « setup plugin », les plugins scaffoldés seront listés ici.\n`;
  }
  const lines = plugins.map(
    (p) => `  • ${p.displayName} (${p.slug})\n    ${p.folderName} → ${p.absoluteDir}`,
  );
  return `Plugins OrphStack détectés (${plugins.length}) :\n${lines.join("\n")}\n`;
}

async function pickOrphPlugin(plugins: OrphPluginListed[]): Promise<OrphPluginListed | symbol> {
  const choice = await select({
    message: "Choisissez le plugin OrphStack cible",
    options: plugins.map((p) => ({
      value: p.absoluteDir,
      label: `${p.displayName} (${p.slug})`,
      hint: p.folderName,
    })),
  });
  if (isCancel(choice)) {
    return choice;
  }
  return plugins.find((p) => p.absoluteDir === choice)!;
}

async function runWordPressInit(startSearchDir: string): Promise<void> {
  const wpRoot = discoverWordPressRoot(startSearchDir);
  if (!wpRoot) {
    cancel(
      `Aucune racine WordPress trouvée au-dessus de :\n  ${path.resolve(startSearchDir)}`,
    );
    process.exitCode = 1;
    return;
  }

  if (hasOrphWpInit(wpRoot)) {
    note(`Ce site est déjà initialisé :\n\n  ${wpRoot}\n\n  fichier : .orphstack-init`, WORDPRESS_INIT_NAME);
    outro("Rien à faire.");
    return;
  }

  note(`Racine WordPress :\n  ${wpRoot}\n\nUn fichier .orphstack-init sera créé à cet emplacement.`, WORDPRESS_INIT_NAME);

  const go = await confirm({
    message: "Créer .orphstack-init à la racine de ce WordPress ?",
    initialValue: true,
  });

  if (isCancel(go) || !go) {
    cancel("Annulé.");
    return;
  }

  writeOrphWpInit(wpRoot);
  outro(`Marqueur créé : ${path.join(wpRoot, ".orphstack-init")}`);
}

async function main(): Promise<void> {
  const { commandLine, startSearchDir } = parseCli(process.argv);

  intro(`orphstack`);

  const spin = spinner();
  spin.start("Chargement du catalogue");
  const catalog = await loadCommandCatalog();
  spin.stop(catalog.length > 0 ? "Catalogue chargé" : "Catalogue vide");

  if (catalog.length === 0) {
    cancel("catalog.json manquant ou vide à côté de dist/. Lancez depuis la racine du paquet npm.");
    process.exitCode = 1;
    return;
  }

  let chosen: CatalogCommand | symbol;
  if (commandLine) {
    const hit = resolveSubmittedCommand(catalog, commandLine);
    if (!hit) {
      cancel(`Commande inconnue : « ${commandLine} ». Lancez sans argument pour choisir dans le catalogue.`);
      process.exitCode = 1;
      return;
    }
    chosen = hit;
  } else {
    chosen = await chooseCommandFromCatalog(catalog);
    if (isCancel(chosen)) {
      cancel("Annulé.");
      return;
    }
  }

  if (isWordPressInitCommand(chosen)) {
    await runWordPressInit(startSearchDir);
    return;
  }

  if (isHelpCommand(chosen)) {
    const bullets = catalog
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => `  • ${c.name}${c.description ? ` — ${c.description}` : ""}`)
      .join("\n");
    note(`${bullets}\n\nAstuce : \`orphstack --path /chemin/vers/wp/\` définit où chercher wp-config.php.`, chosen.name);
    outro("Pour le mode interactif, lancez orphstack sans argument.");
    return;
  }

  let wpRootForSetup: string | undefined;
  /** Only set for `setup plugin` */
  let pluginIds: { displayName: string; slug: string } | undefined;

  if (isSetupPluginCommand(chosen)) {
    const ctx = await ensureWordPressAndOrphInit(startSearchDir);
    if (!ctx.ok) {
      if (ctx.kind === "no_wordpress") {
        cancel(ctx.message);
        process.exitCode = 1;
      }
      return;
    }

    wpRootForSetup = ctx.wpRoot;
    const orphPlugins = listOrphPlugins(wpRootForSetup);

    const ids = await promptNewPluginIdentifiers();
    if (!ids.ok) {
      cancel("Annulé.");
      return;
    }
    pluginIds = ids;

    const recapBody =
      `${chosen.description ? `${chosen.description}\n\n` : ""}` +
      `Racine WordPress :\n  ${wpRootForSetup}\n\n` +
      summaryOrphPlugins(orphPlugins) +
      `\nNouveau plugin :\n` +
      `  Nom d’affichage : ${ids.displayName}\n` +
      `  Slug dossier :    ${ids.slug}\n\n` +
      `Le boilerplate sera copié vers wp-content/plugins/${ids.slug}/ et un fichier .orphstack-plugin sera ajouté.`;

    note(recapBody, chosen.name);

    const go = await confirm({
      message: "Copier le boilerplate vers ce WordPress maintenant ?",
      initialValue: true,
    });

    if (isCancel(go) || !go) {
      cancel("Arrêt avant exécution.");
      return;
    }

    if (pluginIds && wpRootForSetup) {
      const work = spinner();
      work.start("Scaffolding (copie + renommage)");
      const result = setupPluginFromTemplate({
        wpRoot: wpRootForSetup,
        slug: pluginIds.slug,
        displayName: pluginIds.displayName,
      });
      work.stop(result.ok ? "Plugin scaffoldé" : "Échec du scaffold");

      if (!result.ok) {
        cancel(result.error);
        process.exitCode = 1;
        return;
      }

      const { setup } = result;
      outro(
        [
          `Racine WordPress : ${setup.wpRoot}`,
          `Dossier plugin :  ${setup.pluginDir}`,
          `Bootstrap PHP :    ${setup.mainPhp}`,
          `Métadonnées CLI : ${path.join(setup.pluginDir, ".orphstack-plugin")}`,
        ].join("\n"),
      );
    }
    return;
  }

  if (isModelCommand(chosen)) {
    const ctx = await ensureWordPressAndOrphInit(startSearchDir);
    if (!ctx.ok) {
      if (ctx.kind === "no_wordpress") {
        cancel(ctx.message);
        process.exitCode = 1;
      }
      return;
    }

    const orphPlugins = listOrphPlugins(ctx.wpRoot);
    if (orphPlugins.length === 0) {
      cancel(
        `Aucun plugin OrphStack dans ce WordPress (${ctx.wpRoot}).\nCréez un plugin avec « setup plugin » (.orphstack-plugin) ou ajoutez le fichier dans un dossier plugins existant.`,
      );
      process.exitCode = 1;
      return;
    }

    const picked = await pickOrphPlugin(orphPlugins);
    if (isCancel(picked)) {
      cancel("Annulé.");
      return;
    }

    note(
      `${chosen.description ? `${chosen.description}\n\n` : ""}` +
        `Plugin cible :\n  ${picked.displayName} (${picked.slug})\n  ${picked.absoluteDir}\n\n` +
        `(Cette commande n’est pas encore implémentée.)`,
      chosen.name,
    );

    const go = await confirm({
      message: "Continuer (aucune action encore, placeholder) ?",
      initialValue: true,
    });

    if (isCancel(go) || !go) {
      cancel("Arrêt.");
      return;
    }

    outro(`Contexte réservé pour le futur générateur ACF : ${picked.absoluteDir}`);
    return;
  }

  note(`${chosen.description ? `${chosen.description}\n\n` : ""}(Pas encore relié au CLI.)\n${chosen.npx}`, chosen.name);
  const go = await confirm({
    message: "Continuer ?",
    initialValue: true,
  });
  if (isCancel(go) || !go) {
    cancel("Arrêt.");
    return;
  }

  outro("Cette commande n’est pas encore implémentée.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
