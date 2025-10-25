import { describe, it, expect, beforeEach, mock } from "bun:test";

// Mock the browser/extension API
const mockBrowser = {
  runtime: {
    sendMessage: mock(() => {}),
    onMessage: {
      addListener: mock(() => {}),
    },
  },
};
(global as any).browser = mockBrowser as any;
(global as any).defineContentScript = mock((config: any) => config) as any;

const repoUrl = "https://github.com/user/repo";

// Helper to set window location
function setWindowLocation(pathname: string, hostname = "example.com") {
  const url = `https://${hostname}${pathname}`;
  Object.defineProperty(window, "location", {
    value: new URL(url),
    writable: true,
  });
}

describe("findMarkdownAnchor", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should return null when no markdown anchors exist", async () => {
    setWindowLocation("/foo/bar.html");
    document.body.innerHTML = `
      <a href="https://example.com/doc.pdf">PDF</a>
      <a href="https://example.com/doc.html">HTML</a>
    `;

    const { findMarkdownAnchor } = await import("../entrypoints/content");
    const result = findMarkdownAnchor();
    expect(result).toBeNull();
  });

  it("should find markdown anchor matching current filename", async () => {
    setWindowLocation("/foo/bar.html");
    document.body.innerHTML = `
      <a href="https://example.com/baz.md">Baz</a>
      <a href="https://example.com/bar.md">Bar</a>
    `;

    const { findMarkdownAnchor } = await import("../entrypoints/content");
    const result = findMarkdownAnchor();
    expect(result?.href).toBe("https://example.com/bar.md");
  });

  it("should find markdown anchor matching current filename without extension", async () => {
    setWindowLocation("/foo/bar");
    document.body.innerHTML = `
      <a href="https://example.com/baz.md">Baz</a>
      <a href="https://example.com/bar.md">Bar</a>
    `;

    const { findMarkdownAnchor } = await import("../entrypoints/content");
    const result = findMarkdownAnchor();
    expect(result?.href).toBe("https://example.com/bar.md");
  });

  it("should prioritize folder name first when path ends with slash", async () => {
    setWindowLocation("/foo/bar/");
    document.body.innerHTML = `
      <a href="https://example.com/bar.md">Bar</a>
      <a href="https://example.com/index.md">Index</a>
    `;

    const { findMarkdownAnchor } = await import("../entrypoints/content");
    const result = findMarkdownAnchor();
    expect(result?.href).toBe("https://example.com/bar.md");
  });

  it("should match index.md when path ends with slash and no folder name match", async () => {
    setWindowLocation("/foo/bar/");
    document.body.innerHTML = `
      <a href="https://example.com/baz.md">Baz</a>
      <a href="https://example.com/index.md">Index</a>
    `;

    const { findMarkdownAnchor } = await import("../entrypoints/content");
    const result = findMarkdownAnchor();
    expect(result?.href).toBe("https://example.com/index.md");
  });

  it("should support .mdx files", async () => {
    setWindowLocation("/foo/bar.html");
    document.body.innerHTML = `
      <a href="https://example.com/bar.mdx">Bar</a>
    `;

    const { findMarkdownAnchor } = await import("../entrypoints/content");
    const result = findMarkdownAnchor();
    expect(result?.href).toBe("https://example.com/bar.mdx");
  });

  it("should support .rst files", async () => {
    setWindowLocation("/foo/bar.html");
    document.body.innerHTML = `
      <a href="https://example.com/bar.rst">Bar</a>
    `;

    const { findMarkdownAnchor } = await import("../entrypoints/content");
    const result = findMarkdownAnchor();
    expect(result?.href).toBe("https://example.com/bar.rst");
  });

  it.each(["/user/repo", "/user/repo/"])(
    "should prioritize README.md on GitHub repo root (%s)",
    async (pathname) => {
      setWindowLocation(pathname, "github.com");
      document.body.innerHTML = `
      <a href="${repoUrl}/blob/main/other.md">Other</a>
      <a href="${repoUrl}/blob/main/README.md">README</a>
    `;

      const { findMarkdownAnchor } = await import("../entrypoints/content");
      const result = findMarkdownAnchor();
      expect(result?.href).toBe(`${repoUrl}/blob/main/README.md`);
    }
  );

  it("should prioritize /raw/ anchor on GitHub", async () => {
    setWindowLocation("/foo/bar.html", "github.com");
    document.body.innerHTML = `
      <a href="${repoUrl}/blob/main/baz.md">Blob</a>
      <a href="${repoUrl}/raw/main/other.md">Raw</a>
    `;

    const { findMarkdownAnchor } = await import("../entrypoints/content");
    const result = findMarkdownAnchor();
    expect(result?.href).toBe(`${repoUrl}/raw/main/other.md`);
  });

  it("should return first markdown anchor when no match found", async () => {
    setWindowLocation("/foo/bar.html");
    document.body.innerHTML = `
      <a href="https://example.com/first.md">First</a>
      <a href="https://example.com/second.md">Second</a>
    `;

    const { findMarkdownAnchor } = await import("../entrypoints/content");
    const result = findMarkdownAnchor();
    expect(result?.href).toBe("https://example.com/first.md");
  });

  it("should handle root path", async () => {
    setWindowLocation("/");
    document.body.innerHTML = `
      <a href="https://example.com/index.md">Index</a>
      <a href="https://example.com/readme.md">Readme</a>
    `;

    const { findMarkdownAnchor } = await import("../entrypoints/content");
    const result = findMarkdownAnchor();
    expect(result?.href).toBe("https://example.com/index.md");
  });
});

describe("checkForMarkdown", () => {
  beforeEach(() => {
    mockBrowser.runtime.sendMessage.mockClear();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("should send 'markdown-found' when link element exists", async () => {
    document.head.innerHTML = `
      <link rel="alternate" type="text/markdown" href="https://example.com/doc.md">
    `;

    const { checkForMarkdown } = await import("../entrypoints/content");
    checkForMarkdown();

    expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
      type: "markdown-found",
    });
  });

  it("should prefer link element over anchor element", async () => {
    document.head.innerHTML = `
      <link rel="alternate" type="text/markdown" href="https://example.com/from-link.md">
    `;
    document.body.innerHTML = `
      <a href="https://example.com/from-anchor.md">Anchor</a>
    `;

    const { checkForMarkdown } = await import("../entrypoints/content");
    checkForMarkdown();

    expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
      type: "markdown-found",
    });
  });

  it("should send 'markdown-likely' when only anchor element exists", async () => {
    document.body.innerHTML = `
      <a href="https://example.com/doc.md">Doc</a>
    `;

    const { checkForMarkdown } = await import("../entrypoints/content");
    checkForMarkdown();

    expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
      type: "markdown-likely",
    });
  });

  it("should send 'markdown-not-found' when no markdown links exist", async () => {
    document.body.innerHTML = `
      <a href="https://example.com/doc.html">HTML</a>
    `;

    const { checkForMarkdown } = await import("../entrypoints/content");
    checkForMarkdown();

    expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
      type: "markdown-not-found",
    });
  });
});

describe("convertToGitHubRawUrl", () => {
  it("should convert GitHub blob URL to raw URL", async () => {
    const { convertToGitHubRawUrl } = await import("../entrypoints/content");
    const result = convertToGitHubRawUrl(`${repoUrl}/blob/main/file.md`);
    expect(result).toBe(`${repoUrl}/raw/main/file.md`);
  });

  it("should convert GitHub edit URL to raw URL", async () => {
    const { convertToGitHubRawUrl } = await import("../entrypoints/content");
    const result = convertToGitHubRawUrl(`${repoUrl}/edit/main/file.md`);
    expect(result).toBe(`${repoUrl}/raw/main/file.md`);
  });

  it("should convert GitHub tree URL to raw URL", async () => {
    const { convertToGitHubRawUrl } = await import("../entrypoints/content");
    const result = convertToGitHubRawUrl(`${repoUrl}/tree/main/file.md`);
    expect(result).toBe(`${repoUrl}/raw/main/file.md`);
  });

  it("should not modify already raw GitHub URL", async () => {
    const { convertToGitHubRawUrl } = await import("../entrypoints/content");
    const url = `${repoUrl}/raw/main/file.md`;
    const result = convertToGitHubRawUrl(url);
    expect(result).toBe(url);
  });

  it("should not modify non-GitHub URL", async () => {
    const { convertToGitHubRawUrl } = await import("../entrypoints/content");
    const url = "https://example.com/file.md";
    const result = convertToGitHubRawUrl(url);
    expect(result).toBe(url);
  });
});
