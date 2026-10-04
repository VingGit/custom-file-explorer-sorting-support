// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - This file is bundled into a browser script string.

import { applyNavigationSorting, manifestUrlFromDocument } from "./navigation";

let currentManifest;
let manifestRequest;
let scheduled;

function manifestUrl() {
  return manifestUrlFromDocument(document, window.location.origin);
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

function applyAll() {
  scheduled = undefined;
  if (!currentManifest) return;
  applyNavigationSorting(document, currentManifest, window.location.href);
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
        ? record.target.closest("div.explorer, .page-listing") ||
          record.target.matches("div.explorer, .page-listing")
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
