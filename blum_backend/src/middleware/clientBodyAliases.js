/**
 * Copia aliases comuns para os campos esperados pelo express-validator e pelo service.
 * Deve rodar antes de validateClient.
 */
function aliasClientPayload(req, _res, next) {
  const b = req.body;
  if (!b || typeof b !== "object") return next();

  if (b.companyName == null && b.company_name != null) {
    b.companyName = b.company_name;
  }
  if (b.companyName == null && b.companyname != null) {
    b.companyName = b.companyname;
  }
  if (b.contactPerson == null && b.contactperson != null) {
    b.contactPerson = b.contactperson;
  }
  if (b.contactPerson == null && b.contact_person != null) {
    b.contactPerson = b.contact_person;
  }

  next();
}

module.exports = { aliasClientPayload };
