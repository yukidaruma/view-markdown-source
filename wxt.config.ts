import { defineConfig } from "wxt";

const isCopyVersion = process.env.COPY_MARKDOWN_SOURCE === "1";

const extensionName = isCopyVersion
  ? "Copy Markdown Source"
  : "View Markdown Source";

const zipName = isCopyVersion ? "copy-markdown-source" : "view-markdown-source";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: isCopyVersion ? ["wxt-module-clipboard"] : [],
  zip: {
    name: zipName,
  },
  manifest: {
    name: extensionName,
    icons: {
      128: "icon-gray.png",
    },
    action: {
      default_title: extensionName,
    },
  },
  vite: () => ({
    define: {
      "import.meta.env.COPY_MARKDOWN_SOURCE": JSON.stringify(isCopyVersion),
    },
    resolve: {
      alias: isCopyVersion
        ? {
            "../shared/on-get-url-view": "../shared/on-get-url-copy",
          }
        : ({} as Record<string, string>),
    },
  }),
  webExt: {
    disabled: true,
  },
  dev: {
    server: {
      host: "0.0.0.0",
    },
  },
});
