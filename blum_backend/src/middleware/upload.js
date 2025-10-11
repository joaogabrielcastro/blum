// src/middleware/upload.js
const multer = require('multer');
const path = require('path');

// Configuração do multer para armazenamento em memória
const storage = multer.memoryStorage();

// Filtro de arquivos - aceita apenas PDF e CSV
const fileFilter = (req, file, cb) => {
  // Verifica se é PDF ou CSV
  if (file.mimetype === 'application/pdf' || 
      file.mimetype === 'text/csv' ||
      file.originalname.toLowerCase().endsWith('.pdf') ||
      file.originalname.toLowerCase().endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos PDF e CSV são permitidos'), false);
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
const uploadPdf = upload.single('purchasePdf');
const uploadCsv = upload.single('productsCsv');

module.exports = {
  upload,
  uploadPdf,
  uploadCsv
};