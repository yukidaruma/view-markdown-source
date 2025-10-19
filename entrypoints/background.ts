const ICON_MAP: Record<string, string> = {
  "markdown-found": "/icon-blue.png",
  "markdown-likely": "/icon-green.png",
  "markdown-not-found": "/icon-gray.png",
};

export default defineBackground(() => {
  const markdownUrls = new Map<Required<Browser.tabs.Tab>["id"], string>();

  browser.runtime.onMessage.addListener((message, sender) => {
    if (!sender.tab?.id) return;

    const iconPath = ICON_MAP[message.type];
    if (!iconPath) return;

    if (message.type === "markdown-not-found") {
      markdownUrls.delete(sender.tab.id);
    } else {
      markdownUrls.set(sender.tab.id, message.url);
    }

    browser.action.setIcon({
      path: iconPath,
      tabId: sender.tab.id,
    });
  });

  browser.action.onClicked.addListener((tab) => {
    if (tab.id && markdownUrls.has(tab.id)) {
      browser.tabs.create({ url: markdownUrls.get(tab.id) });
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    markdownUrls.delete(tabId);
  });
});
