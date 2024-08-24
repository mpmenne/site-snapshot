const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');
const axios = require('axios');

async function fetchSitemap(url) {
    const response = await axios.get(url);
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    return result.urlset.url.map(url => url.loc[0]);
}

async function imagesHaveLoaded() {
  return Array.from(document.images).every((i) => i.complete);
}

async function captureScreenshot(page, url, outputDir) {
    const fileName = url.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
    const filePath = path.join(outputDir, fileName);
    console.log(`Navigating to ${url} and saving screenshot to ${filePath}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for all images to load
    await page.waitForFunction(imagesHaveLoaded);

    // Additional wait to ensure any post-load rendering is complete
    await page.waitForTimeout(2000);

    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Generated screenshot: ${filePath}`);
}

async function main() {
    if (process.argv.length < 3) {
        console.log('Usage: node script.js <sitemap_url>');
        process.exit(1);
    }

    const sitemapUrl = process.argv[2];
    const outputDir = 'pdfs';

    try {
        await fs.mkdir(outputDir, { recursive: true });

        const urls = await fetchSitemap(sitemapUrl);
        const browser = await chromium.launch();
        const page = await browser.newPage();

        for (const url of urls) {
            await captureScreenshot(page, url, outputDir);
        }

        await browser.close();
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

main();

