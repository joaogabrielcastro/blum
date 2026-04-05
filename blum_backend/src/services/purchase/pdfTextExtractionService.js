const path = require("path");
const { pathToFileURL } = require("url");
const smartExtractor = require("../../../scripts/smart_extractor");

function configurePdfWorker(pdfjsLib) {
  const workerPath = path.join(
    path.dirname(require.resolve("pdfjs-dist/package.json")),
    "legacy/build/pdf.worker.mjs",
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
}

/**
 * Extrai texto do PDF com pdfjs-dist e aplica smart_extractor.
 */
async function fallbackTextExtraction(pdfBuffer) {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    configurePdfWorker(pdfjsLib);
    const data = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDocument = await loadingTask.promise;

    let fullText = "";
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    return await smartExtractor.extractFromAnyText(fullText);
  } catch (error) {
    console.log("Extração de texto do PDF falhou:", error.message);
    return [];
  }
}

module.exports = { fallbackTextExtraction };
