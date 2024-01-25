// import puppeteer from "puppeteer";
// Instead of importing puppeteer directly, it seems that for Netlify we need to
// use Puppeteer via chrome-aws-lambda. See
// https://levelup.gitconnected.com/using-puppeteer-on-netlify-e2d3801893c2
import chromium from "chrome-aws-lambda";
const puppeteer = chromium.puppeteer;

import { replaceExtension, toString } from "@weborigami/origami";

let browserPromise;
let instanceCount = 0;

export default async function screenshot(input, options = {}) {
  const html = toString(input);

  // Try to share browser instances across multiple calls.
  instanceCount++;
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: "new",
    });
  }
  const browser = await browserPromise;

  // Create the page for the screenshot.
  const page = await browser.newPage();
  const pageHeight = options.height || 768;
  const pageWidth = options.width || 1024;
  const deviceScaleFactor = options.deviceScaleFactor || 1;
  await page.setContent(html);
  await page.setViewport({
    deviceScaleFactor,
    height: pageHeight,
    width: pageWidth,
  });

  // Get the height and width of the body including any margin.
  const { bodyHeight, bodyWidth } = await page.evaluate(() => {
    // Because we want to include margin, we need to get the computed style
    // and convert the margins from a `px` string to a number.
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

  // Take the screenshot.
  const buffer = await page.screenshot({
    clip: {
      height: bodyHeight,
      width: bodyWidth,
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

screenshot.keyMap = (sourceKey) => replaceExtension(sourceKey, ".html", ".png");
screenshot.inverseKeyMap = (resultKey) =>
  replaceExtension(resultKey, ".png", ".html");
