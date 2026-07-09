// src/middleware/upload.js
const multer = require('multer');

// Configuração do multer para armazenamento em memória
const storage = multer.memoryStorage();

const SPREADSHEET_EXTENSIONS = [".csv", ".xlsx", ".xls"];
const SPREADSHEET_MIMES = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/csv",
  "text/plain",
]);

function isSpreadsheetFile(file) {
  const name = String(file.originalname || "").toLowerCase();
  return SPREADSHEET_EXTENSIONS.some((ext) => name.endsWith(ext))
    || SPREADSHEET_MIMES.has(file.mimetype);
}

// Filtro de arquivos - aceita PDF e CSV (compras)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf"
      || file.mimetype === "text/csv"
      || file.originalname.toLowerCase().endsWith(".pdf")
      || file.originalname.toLowerCase().endsWith(".csv")) {
    cb(null, true);
  } else {
    cb(new Error("Apenas arquivos PDF e CSV são permitidos"), false);
  }
};

const spreadsheetFileFilter = (req, file, cb) => {
  if (isSpreadsheetFile(file)) {
    cb(null, true);
  } else {
    cb(new Error("Apenas arquivos CSV ou Excel (.xlsx, .xls) são permitidos"), false);
  }
};

// Configuração do multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limite
  }
});

// Middlewares específicos para cada tipo de arquivo
const uploadPdf = upload.single("purchasePdf");
const uploadCsv = upload.single("productsCsv");

const uploadSpreadsheet = multer({
  storage,
  fileFilter: spreadsheetFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single("productsFile");

module.exports = {
  upload,
  uploadPdf,
  uploadCsv,
  uploadSpreadsheet,
};