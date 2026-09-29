// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - This file is bundled into a browser script string.

const manifestFile = "static/custom-file-explorer-sorting.json";
let currentManifest;
let manifestRequest;
let scheduled;

function normalizePath(value) {
  let path = String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.html$/i, "");
  if (path === "index") return "/";
  if (path.endsWith("/index")) path = path.slice(0, -6);
  return path || "/";
}

function basePath() {
  return normalizePath(document.documentElement.dataset.basepath || "") === "/"
    ? ""
    : normalizePath(document.documentElement.dataset.basepath || "");
}

function manifestUrl() {
  const base = basePath();
  const pathname = `/${[base, manifestFile].filter(Boolean).join("/")}`;
  return new URL(pathname, window.location.origin).href;
}

async function loadManifest(force = false) {
  if (force) manifestRequest = undefined;
  manifestRequest ??= fetch(manifestUrl(), { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((manifest) => {
      if (manifest?.version !== 1 || typeof manifest.folders !== "object") {
        throw new Error("unsupported manifest format");
      }
      currentManifest = manifest;
      return manifest;
    })
    .catch((error) => {
      console.error("[Custom File Explorer Sorting Support] Could not load order manifest", error);
      return undefined;
    });
  return manifestRequest;
}

function fileKey(link) {
  try {
    let pathname = decodeURIComponent(new URL(link.href, window.location.href).pathname);
    const base = basePath();
    pathname = pathname.replace(/^\/+|\/+$/g, "");
    if (base && (pathname === base || pathname.startsWith(`${base}/`))) {
      pathname = pathname.slice(base.length).replace(/^\/+/, "");
    }
    return `file:${normalizePath(pathname)}`;
  } catch {
    return undefined;
  }
}

function itemInfo(item) {
  const folder = item.querySelector(":scope > .folder-container[data-folderpath]");
  if (folder) {
    const path = normalizePath(folder.dataset.folderpath);
    return { key: `folder:${path}`, folderPath: path };
  }
  const link = item.querySelector(":scope > a.nav-file-title");
  const key = link ? fileKey(link) : undefined;
  return key ? { key } : undefined;
}

function directItems(list) {
  return Array.from(list.children).filter(
    (child) => child instanceof HTMLElement && !child.classList.contains("overflow-end"),
  );
}

function applyList(list, folderPath, manifest) {
  const items = directItems(list);
  const described = items.map((item) => ({ item, info: itemInfo(item) }));
  const rule = manifest.folders[normalizePath(folderPath)];

  if (rule) {
    const hidden = new Set(rule.hidden);
    for (const { item, info } of described) {
      const shouldHide = !!info && hidden.has(info.key);
      if (item.hidden !== shouldHide) item.hidden = shouldHide;
      if (shouldHide) item.dataset.cfesHidden = "true";
      else delete item.dataset.cfesHidden;
    }

    const rank = new Map(rule.order.map((key, index) => [key, index]));
    const ordered = [...described].sort((left, right) => {
      const leftRank = left.info ? rank.get(left.info.key) : undefined;
      const rightRank = right.info ? rank.get(right.info.key) : undefined;
      if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank;
      if (leftRank !== undefined) return -1;
      if (rightRank !== undefined) return 1;
      return items.indexOf(left.item) - items.indexOf(right.item);
    });
    if (ordered.some(({ item }, index) => item !== items[index])) {
      for (const { item } of ordered) list.appendChild(item);
    }
  }

  for (const { item, info } of described) {
    if (!info?.folderPath) continue;
    const childList = item.querySelector(":scope > .folder-outer > ul.content");
    if (childList) applyList(childList, info.folderPath, manifest);
  }
}

function applyAll() {
  scheduled = undefined;
  if (!currentManifest) return;
  for (const explorer of document.querySelectorAll("div.explorer")) {
    const root = explorer.querySelector(".explorer-ul");
    if (root) applyList(root, "/", currentManifest);
  }
}

function scheduleApply() {
  if (scheduled !== undefined) return;
  scheduled = window.requestAnimationFrame(applyAll);
}

async function refresh(force = false) {
  await loadManifest(force);
  scheduleApply();
}

const observer = new MutationObserver((records) => {
  if (
    records.some((record) =>
      record.target instanceof Element
        ? record.target.closest("div.explorer") || record.target.matches("div.explorer")
        : false,
    )
  ) {
    scheduleApply();
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });

const navHandler = () => void refresh(true);
const renderHandler = () => void refresh(true);
document.addEventListener("nav", navHandler);
document.addEventListener("render", renderHandler);
void refresh();

window.addCleanup?.(() => {
  observer.disconnect();
  document.removeEventListener("nav", navHandler);
  document.removeEventListener("render", renderHandler);
  if (scheduled !== undefined) window.cancelAnimationFrame(scheduled);
});
