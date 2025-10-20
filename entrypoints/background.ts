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
      const response = await browser.tabs.sendMessage(tab.id, {
        type: "get-markdown-url",
      });
      if (response?.url) {
        browser.tabs.create({ url: response.url });
      }
    } catch {
      // Tab is not available (e.g. chrome://newtab)
    }
  });
});
