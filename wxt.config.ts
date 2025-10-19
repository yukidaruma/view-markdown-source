import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: "View in Markdown",
    icons: {
      128: "icon-gray.png",
    },
    action: {
      default_title: "View in Markdown",
    },
  },
  webExt: {
    disabled: true,
  },
  dev: {
    server: {
      host: "0.0.0.0",
    },
  },
});
