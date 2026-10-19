interface ManifestRule {
  order: string[];
  hidden: string[];
}

interface ExplorerOrderManifest {
  version: 1;
  folders: Record<string, ManifestRule>;
  articleNavigation?: {
    previousProperty: string;
    nextProperty: string;
    pages: Record<
      string,
      {
        previous?: { slug: string; title: string };
        next?: { slug: string; title: string };
        contentLinks?: string[];
      }
    >;
  };
}

interface RankedItem<T> {
  value: T;
  key?: string;
}

const naturalCompare = new Intl.Collator(undefined, {
  usage: "sort",
  sensitivity: "base",
  numeric: true,
}).compare;

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

function pathParts(path: string): string[] {
  const normalized = normalizePath(path);
  return normalized === "/" ? [] : normalized.split("/").filter(Boolean);
}

function childKey(parts: string[], depth: number, rule: ManifestRule | undefined): string {
  const childPath = parts.slice(0, depth + 1).join("/");
  const folderKey = `folder:${childPath}`;
  const fileKey = `file:${childPath}`;
  if (rule && ruleKeys(rule).has(folderKey)) return folderKey;
  return depth < parts.length - 1 ? folderKey : fileKey;
}

function childRank(rule: ManifestRule | undefined, key: string): number | undefined {
  if (!rule) return undefined;
  const rank = rule.order.indexOf(key);
  return rank < 0 ? undefined : rank;
}

/** Compare two page paths by their position in the hierarchical Explorer order. */
export function compareManifestPaths(
  leftPath: string,
  rightPath: string,
  manifest: ExplorerOrderManifest,
): number {
  const left = pathParts(leftPath);
  const right = pathParts(rightPath);
  const sharedDepth = Math.min(left.length, right.length);

  for (let depth = 0; depth < sharedDepth; depth += 1) {
    const parent = depth === 0 ? "/" : left.slice(0, depth).join("/");
    const rightParent = depth === 0 ? "/" : right.slice(0, depth).join("/");
    if (parent !== rightParent) {
      return naturalCompare(left[depth] ?? "", right[depth] ?? "");
    }

    const rule = manifest.folders[parent];
    const leftRank = childRank(rule, childKey(left, depth, rule));
    const rightRank = childRank(rule, childKey(right, depth, rule));
    if (leftRank !== undefined && rightRank !== undefined && leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    if (leftRank !== undefined && rightRank === undefined) return -1;
    if (leftRank === undefined && rightRank !== undefined) return 1;

    const segmentResult = naturalCompare(left[depth] ?? "", right[depth] ?? "");
    if (segmentResult !== 0) return segmentResult;
  }

  return left.length - right.length;
}

export function isArticleNavigationBacklink(
  sourcePath: string,
  currentPath: string,
  manifest: ExplorerOrderManifest,
): boolean {
  const source = manifest.articleNavigation?.pages[normalizePath(sourcePath)];
  const current = normalizePath(currentPath);
  const navigationTarget =
    (!!source?.previous && normalizePath(source.previous.slug) === current) ||
    (!!source?.next && normalizePath(source.next.slug) === current);
  const intentionalContentLink = source?.contentLinks?.some(
    (link) => normalizePath(link) === current,
  );
  return navigationTarget && !intentionalContentLink;
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

function applyBacklinkList(
  list: Element,
  manifest: ExplorerOrderManifest,
  currentPath: string,
  locationHref: string,
  basePath: string,
): void {
  const end = list.querySelector<HTMLElement>(":scope > .overflow-end");
  const items = directElements(list, "overflow-end");
  const described = items.map((value, index) => {
    const link = value.querySelector<HTMLAnchorElement>("a.internal");
    const path = link ? pathFromUrl(link.href, locationHref, basePath) : undefined;
    const navigationOnly =
      !!path &&
      !!manifest.articleNavigation &&
      isArticleNavigationBacklink(path, currentPath, manifest);
    value.hidden = navigationOnly;
    if (navigationOnly) value.dataset.cfesNavigationBacklink = "true";
    else delete value.dataset.cfesNavigationBacklink;
    return { value, index, path };
  });

  const ordered = [...described].sort((left, right) => {
    if (!left.path && !right.path) return left.index - right.index;
    if (!left.path) return 1;
    if (!right.path) return -1;
    return compareManifestPaths(left.path, right.path, manifest) || left.index - right.index;
  });
  if (ordered.some(({ value }, index) => value !== described[index]?.value)) {
    for (const { value } of ordered) list.insertBefore(value, end ?? null);
  }

  const backlinks = list.closest<HTMLElement>(".backlinks");
  if (!backlinks) return;
  const linkedItems = described.filter(({ path }) => path !== undefined);
  const allNavigationOnly =
    linkedItems.length > 0 && linkedItems.every(({ value }) => value.hidden === true);
  if (allNavigationOnly) {
    backlinks.hidden = true;
    backlinks.dataset.cfesNavigationBacklinksHidden = "true";
  } else if (backlinks.dataset.cfesNavigationBacklinksHidden === "true") {
    backlinks.hidden = false;
    delete backlinks.dataset.cfesNavigationBacklinksHidden;
  }
}

function articleHref(slug: string, basePath: string, locationHref: string): string {
  const encoded = [basePath, normalizePath(slug)]
    .filter((part) => part && part !== "/")
    .flatMap((part) => part.split("/"))
    .map(encodeURIComponent)
    .join("/");
  return new URL(`/${encoded}`, locationHref).pathname;
}

function navigationSlot(
  document: Document,
  direction: "previous" | "next",
  link: { slug: string; title: string },
  basePath: string,
  locationHref: string,
  labels: ArticleNavigationLabels,
): HTMLElement {
  const slot = document.createElement("div");
  slot.className = `cfes-article-navigation-slot cfes-article-navigation-${direction}`;

  const anchor = document.createElement("a");
  anchor.className = "internal internal-link cfes-article-navigation-link";
  anchor.href = articleHref(link.slug, basePath, locationHref);
  anchor.dataset.slug = link.slug;
  anchor.setAttribute(
    "aria-label",
    `${direction === "previous" ? labels.previous : labels.next}: ${link.title}`,
  );

  const label = document.createElement("div");
  label.className = "cfes-article-navigation-label";
  label.textContent = direction === "previous" ? `‹ ${labels.previous}` : `${labels.next} ›`;
  const title = document.createElement("div");
  title.className = "cfes-article-navigation-title";
  title.textContent = link.title;
  anchor.append(label, title);
  slot.appendChild(anchor);
  return slot;
}

interface ArticleNavigationLabels {
  previous: string;
  next: string;
  navigation: string;
}

type ArticleNavigationPage = NonNullable<
  ExplorerOrderManifest["articleNavigation"]
>["pages"][string];

export function articleNavigationLabels(locale: string | undefined): ArticleNavigationLabels {
  if (locale?.toLocaleLowerCase().startsWith("fi")) {
    return {
      previous: "Edellinen",
      next: "Seuraava",
      navigation: "Artikkelien selaus",
    };
  }
  return { previous: "Previous", next: "Next", navigation: "Article navigation" };
}

export function articleNavigationKey(
  currentPath: string,
  page: ArticleNavigationPage,
  locale: string | undefined,
): string {
  const labels = articleNavigationLabels(locale);
  return JSON.stringify([
    normalizePath(currentPath),
    labels.previous,
    labels.next,
    labels.navigation,
    page.previous?.slug ?? "",
    page.previous?.title ?? "",
    page.next?.slug ?? "",
    page.next?.title ?? "",
  ]);
}

function applyArticleNavigation(
  document: Document,
  manifest: ExplorerOrderManifest,
  currentPath: string,
  locationHref: string,
  basePath: string,
): void {
  const existing = document.querySelector<HTMLElement>(".cfes-article-navigation");
  const page = manifest.articleNavigation?.pages[normalizePath(currentPath)];
  if (!page || (!page.previous && !page.next)) {
    existing?.remove();
    return;
  }

  const center = document.querySelector("#quartz-body > .center");
  const footer = center?.querySelector(":scope > .page-footer");
  if (!center || !footer) {
    existing?.remove();
    return;
  }

  const labels = articleNavigationLabels(document.documentElement.lang);
  const navigationKey = articleNavigationKey(currentPath, page, document.documentElement.lang);
  if (existing?.dataset.cfesNavigationKey === navigationKey) return;

  const navigation = document.createElement("nav");
  navigation.className = "cfes-article-navigation";
  navigation.dataset.cfesNavigationKey = navigationKey;
  navigation.setAttribute("aria-label", labels.navigation);
  if (page.previous) {
    navigation.appendChild(
      navigationSlot(document, "previous", page.previous, basePath, locationHref, labels),
    );
  }
  if (page.next) {
    navigation.appendChild(
      navigationSlot(document, "next", page.next, basePath, locationHref, labels),
    );
  }
  if (existing?.parentElement === center) existing.replaceWith(navigation);
  else {
    existing?.remove();
    center.insertBefore(navigation, footer);
  }
  document.dispatchEvent(
    new CustomEvent("render", {
      detail: {
        source: "cfes-article-navigation",
        url: document.body?.dataset.slug ?? normalizePath(currentPath),
      },
    }),
  );
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

  for (const list of document.querySelectorAll(".backlinks ul.overflow")) {
    applyBacklinkList(list, manifest, folderPath, locationHref, basePath);
  }
  applyArticleNavigation(document, manifest, folderPath, locationHref, basePath);
}
