// Copy Markdown Source: fetch and copy the markdown source to clipboard
import { copyToClipboardViaOffscreen } from "wxt-module-clipboard/client";
import { GetMarkdownUrlResponse } from "./messages";

function showNotification(message: string) {
  return browser.notifications.create({
    type: "basic",
    title: "Copy Markdown Source",
    iconUrl: "/icon-blue.png",
    message,
  });
}

export default async function onGetMarkdownUrl(
  response: GetMarkdownUrlResponse
) {
  try {
    const markdownResponse = await fetch(response.url);

    const contentType = markdownResponse.headers.get("content-type");
    if (contentType?.includes("text/html")) {
      // Skip when content type is text/html (typically 4xx or 5xx responses)
      await showNotification("Failed: Invalid content type");
      return;
    }

    const markdownText = await markdownResponse.text();
    await copyToClipboardViaOffscreen(markdownText);

    await showNotification("Markdown source copied to clipboard");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await showNotification(`Error: ${errorMessage}`);
  }
}
