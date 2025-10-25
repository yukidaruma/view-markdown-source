function getMarkdownUrl(): string | null {
  const linkAlternate = document.querySelector<HTMLLinkElement>(
    'link[rel="alternate"][type="text/markdown"]'
  );
  if (linkAlternate) {
    return linkAlternate.href;
  }

  const mdAnchor = findMarkdownAnchor();
  if (mdAnchor) {
    return convertToGitHubRawUrl(mdAnchor.href);
  }

  return null;
}

export function checkForMarkdown() {
  const linkAlternate = document.querySelector<HTMLLinkElement>(
    'link[rel="alternate"][type="text/markdown"]'
  );
  if (linkAlternate) {
    browser.runtime.sendMessage({
      type: "markdown-found",
    });
    return;
  }

  const mdAnchor = findMarkdownAnchor();
  if (mdAnchor) {
    browser.runtime.sendMessage({
      type: "markdown-likely",
    });
    return;
  }

  browser.runtime.sendMessage({
    type: "markdown-not-found",
  });
}

export function convertToGitHubRawUrl(url: string): string {
  if (url.includes("github.com") && !url.includes("/raw/")) {
    return url.replace(/\/(blob|edit|tree)\//g, "/raw/");
  }

  return url;
}

export function findMarkdownAnchor(): HTMLAnchorElement | null {
  const allAnchors = document.querySelectorAll<HTMLAnchorElement>("a[href]");
  const allMdAnchors: HTMLAnchorElement[] = [];

  // Find all anchors that point to .md, .mdx, or .rst files (excluding query strings)
  for (const anchor of allAnchors) {
    try {
      const url = new URL(anchor.href);
      if (
        url.pathname.endsWith(".md") ||
        url.pathname.endsWith(".mdx") ||
        url.pathname.endsWith(".rst")
      ) {
        allMdAnchors.push(anchor);
      }
    } catch {
      // Skip Invalid URL
    }
  }

  if (allMdAnchors.length === 0) return null;

  const currentPath = window.location.pathname;

  // For GitHub repo root, assume the filename is README.md
  if (window.location.hostname === "github.com") {
    const pathMatch = currentPath.match(/^\/([^\/]+)\/([^\/]+)\/?$/);
    if (pathMatch) {
      // URL is in format https://github.com/user/repo or https://github.com/user/repo/
      for (const anchor of allMdAnchors) {
        try {
          const url = new URL(anchor.href);
          const filename = url.pathname
            .split("/")
            .pop()
            ?.replace(/\.(mdx?|rst)$/, "");

          if (filename === "README") {
            return anchor;
          }
        } catch {
          // Skip Invalid URL
        }
      }
    }
  }

  // Extract filename without extension as candidate: "/foo/bar/baz.html" -> ["baz"]
  // If path ends with "/", use "index" and last folder name as candidates: "/foo/bar/" -> ["index", "bar"]
  const pathParts = currentPath.split("/").filter(Boolean);
  const currentFilename =
    pathParts.length > 0
      ? pathParts[pathParts.length - 1].replace(/\.(html?)$/, "")
      : null;

  // Build candidates list
  const candidates: string[] = [];
  if (currentFilename) {
    candidates.push(currentFilename);
    // If URL ends with "/", also consider "index" as a candidate
    if (currentPath.endsWith("/")) {
      candidates.push("index");
    }
  }

  // Prioritize anchors matching current filename candidates
  for (const candidate of candidates) {
    for (const anchor of allMdAnchors) {
      try {
        const url = new URL(anchor.href);
        const filename = url.pathname
          .split("/")
          .pop()
          ?.replace(/\.(mdx?|rst)$/, "");

        if (filename === candidate) {
          return anchor;
        }
      } catch {
        // Skip Invalid URL
      }
    }
  }

  // For anchors on GitHub, prioritize /raw/ anchor
  if (window.location.hostname.includes("github.com")) {
    for (const anchor of allMdAnchors) {
      if (anchor.href.includes("/raw/")) {
        return anchor;
      }
    }
  }

  // If no matched anchor is found, use the first .md anchor
  return allMdAnchors[0];
}

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    // Initial check
    checkForMarkdown();

    // Watch for DOM changes (SPA)
    const observer = new MutationObserver(checkForMarkdown);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Handle browser back/forward navigation
    window.addEventListener("pageshow", checkForMarkdown);

    // Handle messages from background script
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === "get-markdown-url") {
        sendResponse({ url: getMarkdownUrl() });
      }
    });
  },
});
