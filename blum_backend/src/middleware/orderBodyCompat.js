/**
 * Aceita corpo em camelCase (v2) ou snake_case (legado) antes da validação/handlers.
 */
function normalizeOrderPayloadBody(req, res, next) {
  if (!req.body || typeof req.body !== "object") return next();
  const b = req.body;
  if (b.clientid == null && b.clientId != null) {
    b.clientid = Number(b.clientId);
  }
  if (b.userid == null && b.userId != null) {
    b.userid = Number(b.userId);
  }
  if (b.totalprice == null && b.totalPrice != null) {
    b.totalprice = Number(b.totalPrice);
  }
  if (b.document_type == null && b.documentType != null) {
    b.document_type = b.documentType;
  }
  if (b.payment_method == null && b.paymentMethod != null) {
    b.payment_method = b.paymentMethod;
  }
  if (b.createdat == null && b.createdAt != null) {
    b.createdat = b.createdAt;
  }
  next();
}

function normalizePaymentMethodBody(req, res, next) {
  if (!req.body || typeof req.body !== "object") return next();
  if (req.body.payment_method == null && req.body.paymentMethod != null) {
    req.body.payment_method = req.body.paymentMethod;
  }
  next();
}

module.exports = {
  normalizeOrderPayloadBody,
  normalizePaymentMethodBody,
};
