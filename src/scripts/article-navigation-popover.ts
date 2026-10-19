import { computePosition, flip, inline, shift } from "@floating-ui/dom";

declare global {
  interface Window {
    addCleanup?: (callback: () => void) => void;
  }
}

let activeAnchor: HTMLAnchorElement | null = null;
let parser: DOMParser | undefined;
const boundLinks = new WeakSet<HTMLAnchorElement>();

function normalizeRelativeUrls(document: Document, destination: URL): void {
  for (const attribute of ["href", "src"] as const) {
    const selector = `[${attribute}=""], [${attribute}^="./"], [${attribute}^="../"]`;
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      const value = element.getAttribute(attribute);
      if (value === null) continue;
      const rebased = new URL(value, destination);
      element.setAttribute(attribute, `${rebased.pathname}${rebased.search}${rebased.hash}`);
    }
  }
}

async function fetchCanonical(url: URL): Promise<Response> {
  const response = await fetch(url);
  if (!response.headers.get("content-type")?.startsWith("text/html")) return response;

  const contents = await response.clone().text();
  const parsed = (parser ??= new DOMParser()).parseFromString(contents, "text/html");
  const canonical = parsed
    .querySelector<HTMLLinkElement>('link[rel="canonical"]')
    ?.getAttribute("href");
  return canonical ? fetch(new URL(canonical, url)) : response;
}

function clearActivePopover(): void {
  activeAnchor = null;
  for (const popover of document.querySelectorAll(".popover")) {
    popover.classList.remove("active-popover");
  }
}

async function showArticleNavigationPopover(link: HTMLAnchorElement, event: MouseEvent) {
  activeAnchor = link;
  if (link.dataset.noPopover === "true") return;

  const targetUrl = new URL(link.href);
  const hash = decodeURIComponent(targetUrl.hash);
  targetUrl.hash = "";
  targetUrl.search = "";
  const popoverId = `popover-${link.pathname}`;

  const positionAndShow = async (popover: HTMLElement) => {
    clearActivePopover();
    activeAnchor = link;
    popover.classList.add("active-popover");
    const { x, y } = await computePosition(link, popover, {
      strategy: "fixed",
      middleware: [inline({ x: event.clientX, y: event.clientY }), shift(), flip()],
    });
    Object.assign(popover.style, {
      transform: `translate(${x.toFixed()}px, ${y.toFixed()}px)`,
    });

    if (hash) {
      const inner = popover.querySelector<HTMLElement>(".popover-inner");
      const heading = inner?.querySelector<HTMLElement>(`#popover-internal-${hash.slice(1)}`);
      if (heading) inner?.scroll({ top: heading.offsetTop - 12, behavior: "instant" });
    }
  };

  const existing = document.getElementById(popoverId);
  if (existing) {
    await positionAndShow(existing);
    return;
  }

  const response = await fetchCanonical(targetUrl).catch((error) => {
    console.error(error);
    return undefined;
  });
  if (!response?.headers.get("content-type")?.startsWith("text/html")) return;

  const contents = await response.text();
  const html = (parser ??= new DOMParser()).parseFromString(contents, "text/html");
  normalizeRelativeUrls(html, targetUrl);
  for (const element of html.querySelectorAll<HTMLElement>("[id]")) {
    element.id = `popover-internal-${element.id}`;
  }
  const hints = [...html.getElementsByClassName("popover-hint")];
  if (hints.length === 0) return;

  const popover = document.createElement("div");
  popover.id = popoverId;
  popover.className = "popover";
  const inner = document.createElement("div");
  inner.className = "popover-inner";
  inner.dataset.contentType = response.headers.get("content-type") ?? undefined;
  for (const hint of hints) inner.appendChild(hint);
  popover.appendChild(inner);

  if (document.getElementById(popoverId)) return;
  document.body.appendChild(popover);
  if (activeAnchor === link) await positionAndShow(popover);
}

/** Attach Quartz-compatible popovers only to dynamically generated article links. */
export function bindArticleNavigationPopovers(container: ParentNode): void {
  const links = container.querySelectorAll<HTMLAnchorElement>("a.cfes-article-navigation-link");
  for (const link of links) {
    if (boundLinks.has(link)) continue;
    boundLinks.add(link);

    const enter = (event: MouseEvent) => void showArticleNavigationPopover(link, event);
    const leave = () => clearActivePopover();
    link.addEventListener("mouseenter", enter);
    link.addEventListener("mouseleave", leave);
    window.addCleanup?.(() => {
      link.removeEventListener("mouseenter", enter);
      link.removeEventListener("mouseleave", leave);
      if (activeAnchor === link) clearActivePopover();
    });
  }
}
