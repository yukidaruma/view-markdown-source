// View Markdown Source: open the markdown file in new tab
import { GetMarkdownUrlResponse } from "./messages";

export default async function onGetMarkdownUrl(
  response: GetMarkdownUrlResponse
) {
  browser.tabs.create({ url: response.url });
}
