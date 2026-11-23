const invoiceService = require("../services/purchase/purchaseInvoiceService");

function sendError(res, error, fallback) {
  const status = error.statusCode || 500;
  if (status >= 500) console.error(fallback, error);
  res.status(status).json({ error: status >= 500 ? fallback : error.message });
}

exports.preview = async (req, res) => {
  try {
    const result = await invoiceService.preview({
      xml: req.body?.xml,
      brandId: req.body?.brandId,
      tenantId: req.user.tenantId,
    });
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error, "Erro ao ler o XML da nota.");
  }
};

exports.confirm = async (req, res) => {
  try {
    const invoice = await invoiceService.confirm({
      xml: req.body?.xml,
      brandId: req.body?.brandId,
      items: req.body?.items,
      tenantId: req.user.tenantId,
      user: req.user,
    });
    res.status(201).json(invoice);
  } catch (error) {
    sendError(res, error, "Erro ao registrar a nota.");
  }
};

exports.list = async (req, res) => {
  try {
    const invoices = await invoiceService.listInvoices({
      tenantId: req.user.tenantId,
      limit: req.query.limit,
    });
    res.status(200).json(invoices);
  } catch (error) {
    sendError(res, error, "Erro ao listar notas.");
  }
};

exports.getById = async (req, res) => {
  try {
    const invoice = await invoiceService.getInvoice(req.params.id, req.user.tenantId);
    res.status(200).json(invoice);
  } catch (error) {
    sendError(res, error, "Erro ao carregar a nota.");
  }
};

exports.reverse = async (req, res) => {
  try {
    const result = await invoiceService.reverseInvoice({
      id: req.params.id,
      tenantId: req.user.tenantId,
      user: req.user,
    });
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error, "Erro ao estornar a nota.");
  }
};
