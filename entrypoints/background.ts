import { GetMarkdownUrlResponse } from "../shared/messages";

// NOTE: This import is dynamically replcaced depending on `COPY_MARKDOWN_SOURCE`
// environment variable using Vite's `resolve.alias`.
import onGetUrl from "../shared/on-get-url-view";

const ICON_MAP: Record<string, string> = {
  "markdown-found": "/icon-blue.png",
  "markdown-likely": "/icon-green.png",
  "markdown-not-found": "/icon-gray.png",
};

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender) => {
    if (!sender.tab?.id) return;

    const iconPath = ICON_MAP[message.type];
    if (!iconPath) return;

    browser.action.setIcon({
      path: iconPath,
      tabId: sender.tab.id,
    });
  });

  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;

    try {
      const response = await browser.tabs.sendMessage<
        any,
        GetMarkdownUrlResponse
      >(tab.id, {
        type: "get-markdown-url",
      });
      if (response?.url) {
        onGetUrl(response);
      }
    } catch {
      // Tab is not available (e.g. chrome://newtab)
    }
  });
});
