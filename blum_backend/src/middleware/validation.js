const { body, param, query, validationResult } = require("express-validator");

// Middleware para capturar erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Erro de validação",
      details: errors.array(),
    });
  }

  next();
};

// Validações para produtos
exports.validateProduct = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Nome é obrigatório")
    .isLength({ min: 3, max: 255 })
    .withMessage("Nome deve ter entre 3 e 255 caracteres"),

  body("price")
    .isFloat({ min: 0.01 })
    .withMessage("Preço deve ser maior que zero"),

  body("stock")
    .isInt({ min: 0 })
    .withMessage("Estoque deve ser um número inteiro positivo"),

  body("brand").trim().notEmpty().withMessage("Marca é obrigatória"),

  body("productcode").optional().trim(),

  body("subcode").optional().trim(),

  body("minstock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Estoque mínimo deve ser um número inteiro positivo"),

  handleValidationErrors,
];

// Validações para atualização de produto
exports.validateProductUpdate = [
  param("id").isInt({ min: 1 }).withMessage("ID inválido"),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Nome não pode ser vazio")
    .isLength({ min: 3, max: 255 })
    .withMessage("Nome deve ter entre 3 e 255 caracteres"),

  body("price")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Preço deve ser maior que zero"),

  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Estoque deve ser um número inteiro positivo"),

  body("brand")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Marca não pode ser vazia"),

  handleValidationErrors,
];

// Validações para clientes
exports.validateClient = [
  body("companyName")
    .trim()
    .notEmpty()
    .withMessage("Nome da empresa é obrigatório")
    .isLength({ min: 3, max: 255 })
    .withMessage("Nome deve ter entre 3 e 255 caracteres"),

  body("contactPerson").optional().trim(),

  body("phone")
    .optional()
    .trim()
    .matches(/^[0-9\s\-\(\)\+]+$/)
    .withMessage("Telefone inválido"),

  body("region").optional().trim(),

  body("cnpj")
    .trim()
    .notEmpty()
    .withMessage("CNPJ é obrigatório")
    .matches(/^[0-9]{14}$|^[0-9]{2}\.[0-9]{3}\.[0-9]{3}\/[0-9]{4}-[0-9]{2}$/)
    .withMessage(
      "CNPJ inválido - deve ter 14 dígitos ou estar formatado corretamente"
    ),

  body("email").optional().trim().isEmail().withMessage("E-mail inválido"),

  handleValidationErrors,
];

// Validações para pedidos
exports.validateOrder = [
  body("clientid").isInt({ min: 1 }).withMessage("ID do cliente inválido"),

  body("userid").isInt({ min: 1 }).withMessage("ID do usuário inválido"),

  body("items")
    .isArray({ min: 1 })
    .withMessage("Pedido deve conter pelo menos um item"),

  body("items.*.productId")
    .isInt({ min: 1 })
    .withMessage("ID do produto inválido"),

  body("items.*.productName")
    .trim()
    .notEmpty()
    .withMessage("Nome do produto é obrigatório"),

  body("items.*.brand")
    .trim()
    .notEmpty()
    .withMessage("Marca do produto é obrigatória"),

  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantidade deve ser maior que zero"),

  body("items.*.price").isFloat({ min: 0 }).withMessage("Preço inválido"),

  body("discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Desconto deve estar entre 0 e 100"),

  body("description").optional().trim(),

  handleValidationErrors,
];

// Validações para marcas
exports.validateBrand = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Nome da marca é obrigatório")
    .isLength({ min: 2, max: 255 })
    .withMessage("Nome deve ter entre 2 e 255 caracteres"),

  body("commission_rate")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Taxa de comissão deve estar entre 0 e 100"),

  handleValidationErrors,
];

// Validações para login
exports.validateLogin = [
  body("username").trim().notEmpty().withMessage("Usuário é obrigatório"),

  body("password").notEmpty().withMessage("Senha é obrigatória"),

  handleValidationErrors,
];

// Validações para criação de usuário
exports.validateUserCreate = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Usuário é obrigatório")
    .isLength({ min: 3, max: 50 })
    .withMessage("Usuário deve ter entre 3 e 50 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Usuário pode conter apenas letras, números e underscore"),

  body("password")
    .notEmpty()
    .withMessage("Senha é obrigatória")
    .isLength({ min: 6 })
    .withMessage("Senha deve ter no mínimo 6 caracteres"),

  body("role")
    .isIn(["admin", "salesperson"])
    .withMessage("Role deve ser admin ou salesperson"),

  body("name").optional().trim(),

  handleValidationErrors,
];

// Validações para atualização de senha
exports.validatePasswordUpdate = [
  body("currentPassword").notEmpty().withMessage("Senha atual é obrigatória"),

  body("newPassword")
    .notEmpty()
    .withMessage("Nova senha é obrigatória")
    .isLength({ min: 6 })
    .withMessage("Nova senha deve ter no mínimo 6 caracteres"),

  handleValidationErrors,
];

// Validação de ID genérico
exports.validateId = [
  param("id").isInt({ min: 1 }).withMessage("ID inválido"),

  handleValidationErrors,
];

// Validação de query de busca
exports.validateSearchQuery = [
  query("q")
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Termo de busca não pode ser vazio"),

  handleValidationErrors,
];
