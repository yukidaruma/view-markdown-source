import { GetMarkdownUrlResponse } from "../shared/messages";

import copyOnGetMarkdownUrl from "../shared/on-get-markdown-url-copy";
import viewOnGetMarkdown from "../shared/on-get-markdown-url-view";

const handler = import.meta.env.COPY_MARKDOWN_SOURCE
  ? copyOnGetMarkdownUrl
  : viewOnGetMarkdown;

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

    return browser.action
      .setIcon({
        path: iconPath,
        tabId: sender.tab.id,
      })
      .catch(() => {
        /* suppress error */
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
        handler(response);
      }
    } catch {
      // Tab is not available (e.g. chrome://newtab)
    }
  });
});
