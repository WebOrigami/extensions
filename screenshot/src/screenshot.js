import puppeteer from "puppeteer";

let browserPromise;
let instanceCount = 0;

/**
 * Take a screenshot via Puppeteer.
 *
 * The `preparePageFn` function will be called with a
 * [Page](https://pptr.dev/api/puppeteer.page) object; the function can do
 * whatever work is necessary to prepare the page for the screenshot.
 *
 * This returns the screenshot as an image buffer.
 *
 * @param {Function} preparePageFn
 * @param {{ deviceScaleFactor: number, height: number, width: number }} options
 * @returns {Uint8Array}
 */
export default async function screenshot(preparePageFn, options = {}) {
  // Try to share browser instances across multiple calls.
  instanceCount++;
  browserPromise ??= launchBrowser();
  const browser = await browserPromise;

  // Create the page for the screenshot.
  const page = await browser.newPage();
  const pageHeight = options.height || 768;
  const pageWidth = options.width || 1024;
  const deviceScaleFactor = options.deviceScaleFactor || 1;

  // Do whatever's necessary to get the page ready for the screenshot.
  await preparePageFn(page);

  await page.setViewport({
    deviceScaleFactor,
    height: pageHeight,
    width: pageWidth,
  });

  // Get the height and width of the body including any margin.
  const { bodyHeight, bodyWidth } = await page.evaluate(() => {
    // Because we want to include margin, we need to get the computed style and
    // convert the margins from a `px` string to a number.
    const body = document.body;
    const bodyStyle = window.getComputedStyle(body);
    const marginTop = parseInt(bodyStyle.marginTop);
    const marginBottom = parseInt(bodyStyle.marginBottom);
    const marginLeft = parseInt(bodyStyle.marginLeft);
    const marginRight = parseInt(bodyStyle.marginRight);

    const bodyHeight = body.offsetHeight + marginTop + marginBottom;
    const bodyWidth = body.offsetWidth + marginLeft + marginRight;

    return { bodyHeight, bodyWidth };
  });

  const clipHeight = options.height ?? bodyHeight;
  const clipWidth = options.width ?? bodyWidth;

  // Take the screenshot.
  const buffer = await page.screenshot({
    clip: {
      height: clipHeight,
      width: clipWidth,
      x: 0,
      y: 0,
    },
  });

  // If we're the last active instance, close the browser.
  instanceCount--;
  if (instanceCount === 0) {
    browserPromise = null;
    try {
      await browser.close();
    } catch (e) {
      // Another instance may have closed the browser before we could.
    }
  }

  return buffer;
}

async function launchBrowser() {
  return puppeteer.launch({
    headless: "new",
  });
}
