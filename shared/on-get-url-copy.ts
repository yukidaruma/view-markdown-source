// Copy Markdown Source: fetch and copy the markdown source to clipboard
import { copyToClipboardViaOffscreen } from "wxt-module-clipboard/client";
import { GetMarkdownUrlResponse } from "./messages";

export default async function onGetUrl(response: GetMarkdownUrlResponse) {
  const markdownResponse = await fetch(response.url);

  const contentType = markdownResponse.headers.get("content-type");
  if (contentType?.includes("text/html")) {
    // Skip when content type is text/html (e.g. 4xx or 5xx responses)
    return;
  }

  const markdownText = await markdownResponse.text();
  await copyToClipboardViaOffscreen(markdownText);
}
