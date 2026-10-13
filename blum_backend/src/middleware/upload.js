const multer = require("multer");

const storage = multer.memoryStorage();
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function extension(file) {
  const name = String(file?.originalname || "").toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot) : "";
}

function typeError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.expose = true;
  return error;
}

function looksLikeText(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return false;
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  const blockedSignatures = [
    Buffer.from("%PDF-"),
    Buffer.from("MZ"),
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    OLE_SIGNATURE,
    Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    Buffer.from([0xff, 0xd8, 0xff]),
  ];
  if (blockedSignatures.some((signature) => sample.subarray(0, signature.length).equals(signature))) {
    return false;
  }
  if (sample.includes(0)) return false;
  const decoded = sample.toString("utf8");
  const replacements = (decoded.match(/\uFFFD/g) || []).length;
  return replacements <= Math.max(1, Math.floor(decoded.length * 0.01));
}

function validateFileContent(file, allowedTypes) {
  if (!file?.buffer?.length) throw typeError("Arquivo vazio ou ausente");
  const ext = extension(file);
  const buffer = file.buffer;
  const isPdf = buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  const isXlsx = buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  const isXls = buffer.subarray(0, 8).equals(OLE_SIGNATURE);
  const isCsv = looksLikeText(buffer);

  if (allowedTypes.includes("pdf") && ext === ".pdf" && isPdf) return;
  if (allowedTypes.includes("csv") && ext === ".csv" && isCsv) return;
  if (allowedTypes.includes("xlsx") && ext === ".xlsx" && isXlsx) return;
  if (allowedTypes.includes("xls") && ext === ".xls" && isXls) return;
  throw typeError("O conteúdo do arquivo não corresponde ao formato permitido");
}

function fileFilterFor(extensions, message) {
  return (_req, file, callback) => {
    if (extensions.includes(extension(file))) return callback(null, true);
    return callback(typeError(message), false);
  };
}

function secureSingle(field, extensions, allowedTypes, message) {
  const parser = multer({
    storage,
    fileFilter: fileFilterFor(extensions, message),
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  }).single(field);
  return (req, res, next) => {
    parser(req, res, (error) => {
      if (error) {
        error.statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        error.expose = true;
        return next(error);
      }
      try {
        validateFileContent(req.file, allowedTypes);
        return next();
      } catch (validationError) {
        return next(validationError);
      }
    });
  };
}

const uploadPdf = secureSingle(
  "purchasePdf",
  [".pdf"],
  ["pdf"],
  "Apenas arquivos PDF são permitidos",
);
const uploadCsv = secureSingle(
  "productsCsv",
  [".csv"],
  ["csv"],
  "Apenas arquivos CSV são permitidos",
);
const uploadSpreadsheet = secureSingle(
  "productsFile",
  [".csv", ".xlsx", ".xls"],
  ["csv", "xlsx", "xls"],
  "Apenas arquivos CSV ou Excel (.xlsx, .xls) são permitidos",
);

module.exports = {
  uploadPdf,
  uploadCsv,
  uploadSpreadsheet,
  validateFileContent,
};
