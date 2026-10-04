interface ManifestRule {
  order: string[];
  hidden: string[];
}

interface ExplorerOrderManifest {
  version: 1;
  folders: Record<string, ManifestRule>;
}

interface RankedItem<T> {
  value: T;
  key?: string;
}

export function normalizePath(value: unknown): string {
  let path = String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.html$/i, "");
  if (path === "index") return "/";
  if (path.endsWith("/index")) path = path.slice(0, -6);
  return path || "/";
}

export function basePathFromDocument(document: Document): string {
  const configured = document.body?.dataset.basepath ?? document.documentElement.dataset.basepath;
  const normalized = normalizePath(configured || "");
  return normalized === "/" ? "" : normalized;
}

export function manifestUrlFromDocument(document: Document, origin: string): string {
  const base = basePathFromDocument(document);
  const pathname = `/${[base, "static/custom-file-explorer-sorting.json"]
    .filter(Boolean)
    .join("/")}`;
  return new URL(pathname, origin).href;
}

function pathFromUrl(href: string, locationHref: string, basePath: string): string | undefined {
  try {
    let pathname = decodeURIComponent(new URL(href, locationHref).pathname);
    pathname = pathname.replace(/^\/+|\/+$/g, "");
    if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) {
      pathname = pathname.slice(basePath.length).replace(/^\/+/, "");
    }
    return normalizePath(pathname);
  } catch {
    return undefined;
  }
}

function ruleKeys(rule: ManifestRule): Set<string> {
  return new Set([...rule.order, ...rule.hidden]);
}

export function manifestKeyFromHref(
  href: string,
  locationHref: string,
  basePath: string,
  rule: ManifestRule,
  folderHint = false,
): string | undefined {
  const path = pathFromUrl(href, locationHref, basePath);
  if (!path) return undefined;

  const keys = ruleKeys(rule);
  const folderKey = `folder:${path}`;
  const fileKey = `file:${path}`;
  if (keys.has(folderKey)) return folderKey;
  if (keys.has(fileKey)) return fileKey;
  return folderHint ? folderKey : fileKey;
}

export function stableOrder<T>(items: RankedItem<T>[], rule: ManifestRule): RankedItem<T>[] {
  const rank = new Map(rule.order.map((key, index) => [key, index]));
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftRank = left.item.key ? rank.get(left.item.key) : undefined;
      const rightRank = right.item.key ? rank.get(right.item.key) : undefined;
      if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank;
      if (leftRank !== undefined) return -1;
      if (rightRank !== undefined) return 1;
      return left.index - right.index;
    })
    .map(({ item }) => item);
}

function directElements(list: Element, ignoredClass?: string): HTMLElement[] {
  return Array.from(list.children).filter(
    (child): child is HTMLElement =>
      child.nodeType === 1 && (!ignoredClass || !child.classList.contains(ignoredClass)),
  );
}

function applyRule(
  list: Element,
  described: Array<RankedItem<HTMLElement>>,
  rule: ManifestRule,
): void {
  const hidden = new Set(rule.hidden);
  for (const { value, key } of described) {
    const shouldHide = !!key && hidden.has(key);
    if (value.hidden !== shouldHide) value.hidden = shouldHide;
    if (shouldHide) value.dataset.cfesHidden = "true";
    else delete value.dataset.cfesHidden;
  }

  const ordered = stableOrder(described, rule);
  if (ordered.some(({ value }, index) => value !== described[index]?.value)) {
    for (const { value } of ordered) list.appendChild(value);
  }
}

function explorerItemInfo(
  item: HTMLElement,
  locationHref: string,
  basePath: string,
  rule: ManifestRule,
): { key?: string; folderPath?: string } {
  const folder = item.querySelector<HTMLElement>(":scope > .folder-container[data-folderpath]");
  if (folder) {
    const folderPath = normalizePath(folder.dataset.folderpath);
    return { key: `folder:${folderPath}`, folderPath };
  }
  const link = item.querySelector<HTMLAnchorElement>(":scope > a.nav-file-title");
  return {
    key: link ? manifestKeyFromHref(link.href, locationHref, basePath, rule, false) : undefined,
  };
}

function applyExplorerList(
  list: Element,
  folderPath: string,
  manifest: ExplorerOrderManifest,
  locationHref: string,
  basePath: string,
): void {
  const rule = manifest.folders[normalizePath(folderPath)];
  const items = directElements(list, "overflow-end");
  const described = items.map((value) => ({
    value,
    ...explorerItemInfo(value, locationHref, basePath, rule ?? { order: [], hidden: [] }),
  }));

  if (rule) applyRule(list, described, rule);

  for (const { value, folderPath: childFolderPath } of described) {
    if (!childFolderPath) continue;
    const childList = value.querySelector(":scope > .folder-outer > ul.content");
    if (childList) {
      applyExplorerList(childList, childFolderPath, manifest, locationHref, basePath);
    }
  }
}

function parentFolder(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === "/" || !normalized.includes("/")) return "/";
  return normalized.slice(0, normalized.lastIndexOf("/"));
}

function currentFolderPath(document: Document, locationHref: string, basePath: string): string {
  const slug = document.body?.dataset.slug ?? document.documentElement.dataset.slug;
  if (slug) return normalizePath(slug);
  return pathFromUrl(locationHref, locationHref, basePath) ?? "/";
}

function applyFolderPageList(
  list: Element,
  folderPath: string,
  manifest: ExplorerOrderManifest,
  locationHref: string,
  basePath: string,
): void {
  const normalizedFolder = normalizePath(folderPath);
  const rule = manifest.folders[normalizedFolder];
  if (!rule) return;

  const items = directElements(list).filter((item) => item.classList.contains("section-li"));
  const described = items.map((value) => {
    const link = value.querySelector<HTMLAnchorElement>(".section h3 a.internal");
    if (!link) return { value };

    const linkedPath = pathFromUrl(link.href, locationHref, basePath);
    if (!linkedPath || parentFolder(linkedPath) !== normalizedFolder) return { value };

    let folderHint = false;
    try {
      folderHint = decodeURIComponent(new URL(link.href, locationHref).pathname).endsWith("/");
    } catch {
      // The unresolved entry remains in its original relative position.
    }
    return {
      value,
      key: manifestKeyFromHref(link.href, locationHref, basePath, rule, folderHint),
    };
  });

  applyRule(list, described, rule);
}

export function applyNavigationSorting(
  document: Document,
  manifest: ExplorerOrderManifest,
  locationHref: string,
): void {
  const basePath = basePathFromDocument(document);
  for (const explorer of document.querySelectorAll("div.explorer")) {
    const root = explorer.querySelector(".explorer-ul");
    if (root) applyExplorerList(root, "/", manifest, locationHref, basePath);
  }

  const folderPath = currentFolderPath(document, locationHref, basePath);
  for (const list of document.querySelectorAll(".page-listing ul.section-ul")) {
    applyFolderPageList(list, folderPath, manifest, locationHref, basePath);
  }
}
