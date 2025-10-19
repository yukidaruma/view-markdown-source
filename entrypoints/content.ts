function checkMarkdownLink() {
  const linkAlternate = document.querySelector<HTMLLinkElement>(
    'link[rel="alternate"][type="text/markdown"]'
  );
  if (linkAlternate) {
    browser.runtime.sendMessage({
      type: "markdown-found",
      url: linkAlternate.href,
    });
    return;
  }

  const mdAnchor = findMarkdownAnchor();
  if (mdAnchor) {
    const url = convertToGitHubRawUrl(mdAnchor.href);
    browser.runtime.sendMessage({
      type: "markdown-likely",
      url: url,
    });

    return;
  }

  browser.runtime.sendMessage({
    type: "markdown-not-found",
  });
}

function convertToGitHubRawUrl(url: string): string {
  if (url.includes("github.com") && !url.includes("/raw/")) {
    return url.replace(/\/(blob|edit|tree)\//g, "/raw/");
  }

  return url;
}

function findMarkdownAnchor(): HTMLAnchorElement | null {
  const allAnchors = document.querySelectorAll<HTMLAnchorElement>("a[href]");
  const allMdAnchors: HTMLAnchorElement[] = [];

  // Find all anchors that point to .md or .mdx files (excluding query strings)
  for (const anchor of allAnchors) {
    try {
      const url = new URL(anchor.href);
      if (url.pathname.endsWith(".md") || url.pathname.endsWith(".mdx")) {
        allMdAnchors.push(anchor);
      }
    } catch {
      // Skip Invalid URL
    }
  }

  if (allMdAnchors.length === 0) return null;

  const currentPath = window.location.pathname;

  // Extract filename without extension
  // e.g., "/foo/bar/baz.html" -> "baz"
  const currentFilename = currentPath
    .split("/")
    .pop()
    ?.replace(/\.(html?)$/, "");

  // Prioritize anchors matching current filename
  if (currentFilename) {
    for (const anchor of allMdAnchors) {
      try {
        const url = new URL(anchor.href);
        const filename = url.pathname
          .split("/")
          .pop()
          ?.replace(/\.mdx?$/, "");

        if (filename === currentFilename) {
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
    checkMarkdownLink();

    // Watch for DOM changes (SPA)
    const observer = new MutationObserver(checkMarkdownLink);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Handle browser back/forward navigation
    window.addEventListener("pageshow", checkMarkdownLink);
  },
});
