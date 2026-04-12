const path = require("path");
const { pathToFileURL } = require("url");
const fs = require("fs").promises;
const { Poppler } = require("node-poppler");
const { fallbackTextExtraction } = require("./pdfTextExtractionService");

async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerPath = path.join(
    path.dirname(require.resolve("pdfjs-dist/package.json")),
    "legacy/build/pdf.worker.mjs",
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  return pdfjsLib;
}

const poppler = new Poppler();

async function processPdf(req, res) {
  const tempDir = path.join(__dirname, "..", "..", "temp");

  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo PDF enviado." });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: "Arquivo muito grande. Máximo: 10MB",
        details: `Tamanho atual: ${(req.file.size / (1024 * 1024)).toFixed(2)}MB`,
      });
    }

    await fs.mkdir(tempDir, { recursive: true });

    const timestamp = Date.now();
    const sanitizedFileName = `upload_${timestamp}.pdf`;
    const tempPdfPath = path.join(tempDir, sanitizedFileName);
    await fs.writeFile(tempPdfPath, req.file.buffer);

    const fileBaseName = path.basename(tempPdfPath, path.extname(tempPdfPath));
    const out_path_prefix = path.join(tempDir, fileBaseName);

    let imageFiles = [];

    try {
      try {
        await poppler.pdfToCairo(tempPdfPath, out_path_prefix, {
          pngFile: true,
        });

        const files = await fs.readdir(tempDir);
        imageFiles = files.filter(
          (f) => f.includes(fileBaseName) && f.endsWith(".png"),
        );

        if (imageFiles.length === 0) {
          imageFiles = files.filter((f) => f.endsWith(".png"));
        }
      } catch (popplerError) {
        const pdfjsLib = await loadPdfJs();
        const { createCanvas, DOMMatrix } = require("canvas");

        if (!globalThis.DOMMatrix) {
          globalThis.DOMMatrix = DOMMatrix;
        }

        const data = new Uint8Array(req.file.buffer);
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdfDocument = await loadingTask.promise;

        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
          const page = await pdfDocument.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 });

          const canvas = createCanvas(viewport.width, viewport.height);
          const context = canvas.getContext("2d");

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          const pngFileName = `${fileBaseName}-${pageNum}.png`;
          const pngPath = path.join(tempDir, pngFileName);
          const buffer = canvas.toBuffer("image/png");
          await fs.writeFile(pngPath, buffer);

          imageFiles.push(pngFileName);
        }
      }
    } catch (error) {
      console.error("Erro ao processar PDF:", error);
      return res.status(500).json({
        error: "Falha ao processar PDF",
        details: error.message,
      });
    }

    if (imageFiles.length === 0) {
      return res.status(500).json({
        error: "Falha ao processar PDF",
        details: "Não foi possível converter o PDF para imagens.",
      });
    }

    imageFiles.sort((a, b) => {
      const numA = parseInt(
        a.match(/(\d+)\.png$/)?.[1] || a.match(/-(\d+)\.png$/)?.[1] || 0,
        10,
      );
      const numB = parseInt(
        b.match(/(\d+)\.png$/)?.[1] || b.match(/-(\d+)\.png$/)?.[1] || 0,
        10,
      );
      return numA - numB;
    });

    let extractedItems = await fallbackTextExtraction(req.file.buffer);

    if (!extractedItems || extractedItems.length === 0) {
      return res.status(400).json({
        error: "Não foi possível extrair itens do PDF",
        details:
          "Verifique se o PDF está no formato correto da Blumenau Iluminação",
      });
    }

    let parsedData = extractedItems;

    if (!Array.isArray(parsedData)) {
      throw new Error("Extração não retornou um array");
    }

    const validatedData = parsedData
      .filter((item) => {
        const hasRequiredFields =
          item.productCode &&
          item.description &&
          item.quantity != null &&
          item.unitPrice != null;
        return hasRequiredFields;
      })
      .map((item) => ({
        productCode: String(item.productCode).trim(),
        description: String(item.description).trim(),
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(parseFloat(item.unitPrice).toFixed(2)),
      }));

    parsedData = validatedData;

    return res.status(200).json(parsedData);
  } catch (error) {
    console.error("ERRO no processamento do PDF:", error.message);

    try {
      const fallbackData = await fallbackTextExtraction(req.file.buffer);
      if (fallbackData.length > 0) {
        return res.status(200).json(fallbackData);
      }
    } catch (fallbackError) {
      /* ignore */
    }

    return res.status(500).json({
      error: "Falha no processamento do PDF",
      details: error.message,
      suggestion: "Verifique se o PDF contém uma tabela legível de produtos",
    });
  } finally {
    try {
      const files = await fs.readdir(tempDir);
      const deletePromises = files.map((file) =>
        fs.unlink(path.join(tempDir, file)).catch(() => {}),
      );
      await Promise.all(deletePromises);
    } catch (cleanError) {
      console.error("Falha ao limpar arquivos temporários:", cleanError);
    }
  }
}

module.exports = { processPdf };
