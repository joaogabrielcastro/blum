const { neon } = require("@neondatabase/serverless");
const { Poppler } = require("node-poppler");
const path = require("path");
const fs = require("fs").promises;
const poppler = new Poppler();

require("dotenv").config();

const sql = neon(process.env.DATABASE_URL);

// ✅ MODELOS DISPONÍVEIS PARA TESTE
const AVAILABLE_MODELS = ["gemini-2.0-flash-exp", "gemini-2.0-flash"];

// Função para converter o buffer de imagem para base64
async function fileToGenerativePart(filePath, mimeType) {
  const data = await fs.readFile(filePath);
  return {
    inlineData: {
      data: data.toString("base64"),
      mimeType,
    },
  };
}

// ✅ FUNÇÃO OTIMIZADA PARA CHAMAR A API (COM MULTIPLOS MODELOS)
async function callGeminiAPI(promptText, imageParts) {
  console.log("🔗 Conectando à API Gemini (Modo Multimodal)...");

  for (const modelName of AVAILABLE_MODELS) {
    try {
      console.log(`🧪 Tentando modelo: ${modelName}`);

      const API_URL = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;

      const requestBody = {
        contents: [
          {
            parts: [{ text: promptText }, ...imageParts],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404) {
          console.log(`❌ ${modelName} não disponível`);
          continue; // Tenta próximo modelo
        }
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.candidates?.[0]?.content) {
        throw new Error("Resposta da API em formato inesperado");
      }

      console.log(`✅ Sucesso com modelo: ${modelName}`);

      return {
        text: data.candidates[0].content.parts[0].text,
        modelUsed: modelName,
      };
    } catch (error) {
      console.log(`❌ ${modelName} falhou: ${error.message}`);
      // Continua para o próximo modelo
    }
  }

  throw new Error(
    "Nenhum dos modelos disponíveis funcionou. Verifique sua chave API."
  );
}

// ✅ FUNÇÃO AUXILIAR PARA EXTRAIR MARCA DA DESCRIÇÃO
function extractBrandFromDescription(description) {
  if (!description) return "BLUMENAU";

  // Se a descrição contém "B" no início (como nos exemplos), usa BLUMENAU
  if (description.includes("B") && /^[A-Z]\d/.test(description)) {
    return "BLUMENAU";
  }

  // Você pode adicionar mais lógicas aqui baseado nos seus fornecedores
  const brandKeywords = {
    BLUMENAU: ["blumenau", "blu"],
    OUTRA_MARCA: ["outra", "marca"],
  };

  const descLower = description.toLowerCase();
  for (const [brand, keywords] of Object.entries(brandKeywords)) {
    if (keywords.some((keyword) => descLower.includes(keyword))) {
      return brand;
    }
  }

  return "BLUMENAU"; // Padrão
}

// ✅ FUNÇÃO DE FALLBACK PARA EXTRAÇÃO DE TEXTO - CORRIGIDA
async function fallbackTextExtraction(pdfBuffer) {
  try {
    // ✅ CORREÇÃO: Importar pdf-parse corretamente
    const pdf = require("pdf-parse");
    const data = await pdf(pdfBuffer);

    console.log("🔄 Usando fallback de extração de texto...");
    const text = data.text;
    console.log(`📝 Texto extraído (${text.length} caracteres):`, text.substring(0, 500) + "...");

    // Lógica de extração por regex baseada na estrutura do seu PDF
    const items = [];
    const lines = text.split("\n");

    let inItemsSection = false;

    for (const line of lines) {
      // Detecta início da seção de itens
      if (line.includes("ITENS") || line.match(/\|\s*Item\s*\|/)) {
        inItemsSection = true;
        continue;
      }

      // Detecta fim da seção de itens
      if (line.includes("ENDEREÇO DE ENTREGA") || line.includes("TOTAIS")) {
        inItemsSection = false;
        continue;
      }

      if (inItemsSection) {
        // Procura por padrões de linha de produto (ajuste conforme necessário)
        const productMatch = line.match(
          /\|\s*(\d+)\s*\|\s*[A-Z]?\s*\|\s*(\d+)\s*\|/
        );
        if (productMatch) {
          const itemNumber = productMatch[1];
          const productCode = productMatch[2];

          // Tenta extrair descrição e preço (lógica básica)
          const parts = line.split("|").filter((part) => part.trim());
          if (parts.length >= 6) {
            const description = parts[3]?.trim() || "";
            const quantity = parseInt(parts[4]?.trim()) || 0;
            const unitPrice =
              parseFloat(parts[5]?.trim().replace(",", ".")) || 0;

            if (productCode && description && quantity > 0) {
              items.push({
                productCode: productCode,
                description: description,
                quantity: quantity,
                unitPrice: unitPrice,
              });
            }
          }
        }
      }
    }

    console.log(`✅ Fallback extraiu ${items.length} itens`);
    return items;
  } catch (error) {
    console.log("❌ Fallback falhou:", error.message);
    return [];
  }
}

// ✅ CONTROLLER PRINCIPAL ATUALIZADO - CORRIGIDO
exports.processPdf = async (req, res) => {
  console.log("\n--- [PROCESSAMENTO DE PDF MULTIMODAL] ---");
  const tempDir = path.join(__dirname, "..", "temp");

  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo PDF enviado." });
    }

    // ✅ VALIDAÇÃO DE TAMANHO DO ARQUIVO
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        error: "Arquivo muito grande. Máximo: 10MB",
        details: `Tamanho atual: ${(req.file.size / (1024 * 1024)).toFixed(2)}MB`
      });
    }

    console.log("📄 Arquivo recebido:", req.file.originalname);
    console.log("📏 Tamanho do arquivo:", (req.file.size / 1024).toFixed(2), "KB");

    // Garante que a pasta temporária exista
    await fs.mkdir(tempDir, { recursive: true });
    const tempPdfPath = path.join(tempDir, req.file.originalname);
    await fs.writeFile(tempPdfPath, req.file.buffer);
    
    // ✅ CORREÇÃO: Definir variáveis corretamente
    const fileBaseName = path.basename(tempPdfPath, path.extname(tempPdfPath));
    const out_path_prefix = path.join(tempDir, fileBaseName);

    console.log("🖼️ Convertendo PDF para imagens com 'node-poppler'...");
    
    let conversionSuccess = false;
    let imageFiles = [];

    try {
      // ✅ TENTATIVA 1: Conversão simples sem opções problemáticas
      await poppler.pdfToCairo(tempPdfPath, out_path_prefix, {
        pngFile: true,
      });
      console.log("✅ PDF convertido para imagens com sucesso.");
      conversionSuccess = true;
    } catch (conversionError) {
      console.log("❌ Falha na conversão com pdfToCairo:", conversionError.message);
    }

    // ✅ VERIFICAR SE AS IMAGENS FORAM GERADAS
    if (conversionSuccess) {
      const files = await fs.readdir(tempDir);
      
      // ✅ CORREÇÃO: Buscar arquivos PNG de forma mais flexível
      imageFiles = files.filter((f) => 
        f.includes(fileBaseName) && f.endsWith(".png")
      );
      
      // ✅ Tentar também arquivos com numeração diferente
      if (imageFiles.length === 0) {
        imageFiles = files.filter((f) => f.endsWith(".png"));
        console.log(`🔍 Procurando qualquer arquivo PNG: ${imageFiles.length} encontrados`);
      }

      console.log(`📸 Arquivos PNG encontrados:`, imageFiles);
    }

    // Se não gerou imagens, usar fallback
    if (imageFiles.length === 0) {
      console.log("❌ Nenhuma imagem foi gerada, usando fallback...");
      const fallbackData = await fallbackTextExtraction(req.file.buffer);
      return res.status(200).json(fallbackData);
    }

    // Ordena as imagens numericamente
    imageFiles.sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)\.png$/)?.[1] || a.match(/-(\d+)\.png$/)?.[1] || 0, 10);
      const numB = parseInt(b.match(/(\d+)\.png$/)?.[1] || b.match(/-(\d+)\.png$/)?.[1] || 0, 10);
      return numA - numB;
    });

    console.log(`📸 ${imageFiles.length} imagens para processar:`, imageFiles);

    const imageParts = [];
    for (const file of imageFiles) {
      try {
        const imagePath = path.join(tempDir, file);
        // ✅ VERIFICAR se o arquivo existe e tem tamanho > 0
        const stats = await fs.stat(imagePath);
        if (stats.size > 0) {
          imageParts.push(
            await fileToGenerativePart(imagePath, "image/png")
          );
          console.log(`✅ Imagem ${file} carregada: ${stats.size} bytes`);
        } else {
          console.log(`⚠️ Imagem ${file} está vazia, ignorando...`);
        }
      } catch (imageError) {
        console.log(`⚠️ Erro ao processar imagem ${file}:`, imageError.message);
      }
    }

    if (imageParts.length === 0) {
      console.log("❌ Nenhuma imagem válida foi carregada, usando fallback...");
      const fallbackData = await fallbackTextExtraction(req.file.buffer);
      return res.status(200).json(fallbackData);
    }

    console.log(`📦 ${imageParts.length} imagens preparadas para a API.`);

    // ✅ PROMPT CORRIGIDO - AGORA EXTRAI O PREÇO COM IPI
    const prompt = `
Você é um especialista em extrair dados de tabelas de orçamentos em PDF.

ANALISE AS IMAGENS E EXTRAIA TODOS OS ITENS DA TABELA DE "ITENS" OU "PRODUTOS".

PARA CADA LINHA DA TABELA, extraia estas 4 informações EXATAS:
1. "productCode": Código do produto (coluna "Produto")
2. "description": Descrição completa (coluna "Descrição") 
3. "quantity": Quantidade (coluna "Quant. Solíc." ou similar)
4. "unitPrice": Preço unitário líquido + IPI (coluna "Preço Unit. Liq. + IPI" ou similar)

⚠️ ATENÇÃO CRÍTICA:
- Use SEMPRE o preço unitário líquido + IPI (NÃO use o preço líquido sem IPI)
- Procure pela coluna "Preço Unit. Liq. + IPI" ou "Preço Final Unit. com IPI + ST"
- Se houver "Preço Unit. Liq." e "Preço Unit. Liq. + IPI", use sempre o SEGUNDO (com IPI)

REGRA IMPORTANTES:
- IGNORE cabeçalhos, totais e linha que não sejam produtos
- Converta vírgulas em pontos para números decimais (ex: 8,01 → 8.01)
- Para quantity, use números inteiros
- Para unitPrice, use números decimais
- Inclua TODOS os itens de TODAS as páginas
- Foque apenas na tabela principal de produtos

ESTRUTURA ESPERADA DO JSON:
[
  {
    "productCode": "0324000",
    "description": "Lamp E27 2W/BI-Volt – Vela Chama 2 400K Flam. LED",
    "quantity": 10,
    "unitPrice": 8.01  // ✅ AGORA COM IPI
  }
]

Retorne APENAS o array JSON válido, sem markdown, sem texto adicional, sem explicações.
`;

    console.log("🤖 Enviando prompt e imagens para IA...");
    const result = await callGeminiAPI(prompt, imageParts);
    const aiText = result.text;
    const modelUsed = result.modelUsed;

    console.log("📝 Resposta recebida do modelo:", modelUsed);

    // 4. Processa a resposta da IA
    let parsedData;
    try {
      // Limpeza agressiva do texto
      let cleanedText = aiText
        .trim()
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .replace(/^[^[]*/, "")
        .replace(/[^\]]*$/, "")
        .trim();

      console.log(
        "📋 Texto limpo para parse:",
        cleanedText.substring(0, 200) + "..."
      );

      parsedData = JSON.parse(cleanedText);

      // Validação dos dados extraídos
      if (!Array.isArray(parsedData)) {
        throw new Error("A IA não retornou um array");
      }

      // ✅ VALIDAÇÃO MELHORADA - VERIFICA SE OS PREÇOS ESTÃO CORRETOS
      const validatedData = parsedData
        .filter((item) => {
          const hasRequiredFields =
            item.productCode &&
            item.description &&
            item.quantity != null &&
            item.unitPrice != null;

          if (!hasRequiredFields) {
            console.log("❌ Item incompleto filtrado:", item);
            return false;
          }

          // ✅ VERIFICA SE O PREÇO É RAZOÁVEL (não é zero ou muito baixo)
          if (item.unitPrice < 0.1) {
            console.log("⚠️ Preço muito baixo, possível erro:", item);
          }

          return true;
        })
        .map((item) => ({
          productCode: String(item.productCode).trim(),
          description: String(item.description).trim(),
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(parseFloat(item.unitPrice).toFixed(2)), // ✅ Formata para 2 casas decimais
        }));

      console.log(
        `✅ ${validatedData.length} itens válidos de ${parsedData.length} totais`
      );

      // ✅ LOG DOS PRIMEIROS ITENS PARA VERIFICAÇÃO
      console.log("📊 Primeiros itens extraídos:");
      validatedData.slice(0, 3).forEach((item, index) => {
        console.log(
          `   ${index + 1}. ${item.productCode} - ${item.description}`
        );
        console.log(
          `      Qtd: ${item.quantity} | Preço: R$ ${item.unitPrice}`
        );
      });

      parsedData = validatedData;
    } catch (parseError) {
      console.error("❌ Erro no parse do JSON:", parseError.message);
      console.log("📄 Resposta completa da IA:", aiText);

      // Tenta fallback em caso de erro no parse
      console.log("🔄 Tentando fallback devido a erro no JSON...");
      const fallbackData = await fallbackTextExtraction(req.file.buffer);
      return res.status(200).json(fallbackData);
    }

    res.status(200).json(parsedData);
  } catch (error) {
    console.error("💥 ERRO GERAL NO PROCESSAMENTO:", error.message);

    // Tenta fallback como último recurso
    console.log("🔄 Tentando fallback como último recurso...");
    try {
      const fallbackData = await fallbackTextExtraction(req.file.buffer);
      if (fallbackData.length > 0) {
        console.log(`✅ Fallback extraiu ${fallbackData.length} itens`);
        return res.status(200).json(fallbackData);
      }
    } catch (fallbackError) {
      console.log("❌ Fallback também falhou:", fallbackError.message);
    }

    res.status(500).json({
      error: "Falha no processamento do PDF",
      details: error.message,
      suggestion: "Verifique se o PDF contém uma tabela legível de produtos",
    });
  } finally {
    // 5. Limpa os arquivos temporários
    try {
      const files = await fs.readdir(tempDir);
      const deletePromises = files.map((file) =>
        fs
          .unlink(path.join(tempDir, file))
          .catch((err) =>
            console.log(`⚠️ Erro ao deletar ${file}:`, err.message)
          )
      );
      await Promise.all(deletePromises);
      console.log("🧹 Arquivos temporários limpos.");
    } catch (cleanError) {
      console.error("⚠️ Falha ao limpar arquivos temporários:", cleanError);
    }
  }
};

// ✅ CONTROLLER PARA FINALIZAR COMPRA
exports.finalizePurchaseFromCsv = async (req, res) => {
  const { brandId, purchaseDate, items } = req.body;

  console.log("📦 [CSV] Dados recebidos para finalizar compra:");
  console.log("🏷️ Brand ID:", brandId);
  console.log("📅 Data da compra:", purchaseDate);
  console.log("📋 Items recebidos:", JSON.stringify(items, null, 2));

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Nenhum item válido foi recebido." });
  }

  // ✅ VALIDAÇÃO DA MARCA
  if (!brandId) {
    return res.status(400).json({ error: "ID da marca é obrigatório." });
  }

  // ✅ VALIDAÇÃO DOS SUBCÓDIGOS
  const missingSubcodes = items.filter(
    (item) => !item.subcode || item.subcode.trim() === ""
  );
  if (missingSubcodes.length > 0) {
    return res.status(400).json({
      error: "Subcódigo é obrigatório para todos os produtos.",
      details: `${missingSubcodes.length} itens sem subcódigo`,
    });
  }

  // ✅ VALIDAÇÃO DE SUBCÓDIGOS ÚNICOS
  const subcodes = items.map((item) => item.subcode.trim());
  const duplicateSubcodes = subcodes.filter(
    (code, index) => subcodes.indexOf(code) !== index
  );
  if (duplicateSubcodes.length > 0) {
    return res.status(400).json({
      error: "Subcódigos duplicados encontrados.",
      details: `Códigos repetidos: ${duplicateSubcodes.join(", ")}`,
    });
  }

  try {
    const results = {
      updated: 0,
      created: 0,
      newProducts: [],
      errors: [],
    };

    // ✅ CONVERSÃO SEGURA DO BRAND ID
    const brandIdInt = parseInt(brandId, 10);
    if (isNaN(brandIdInt)) {
      return res.status(400).json({
        error: "ID da marca inválido.",
        details: `Não foi possível converter '${brandId}' para número`,
      });
    }

    console.log(`🏷️ [CSV] Brand ID convertido: ${brandIdInt}`);

    // ✅ BUSCA A MARCA NO BANCO
    const brandResult = await sql`
      SELECT id, name FROM brands WHERE id = ${brandIdInt}
    `;

    if (brandResult.length === 0) {
      return res.status(400).json({
        error: "Marca não encontrada.",
        details: `ID: ${brandIdInt}`,
      });
    }

    const brandName = brandResult[0].name;
    console.log(`🏷️ [CSV] Usando marca: ${brandName}`);

    // ✅ VERIFICAR SUBCÓDIGOS EXISTENTES ANTES DE PROCESSAR
    for (const item of items) {
      const subcode = item.subcode.trim();

      // Verifica se o subcódigo já existe em outro produto
      const existingSubcode = await sql`
        SELECT id, name FROM products 
        WHERE subcode = ${subcode} 
        AND id != COALESCE(${item.mappedProductId || 0}, 0)
      `;

      if (existingSubcode.length > 0) {
        return res.status(400).json({
          error: `Subcódigo "${subcode}" já está em uso.`,
          details: `Usado pelo produto: ${existingSubcode[0].name}`,
        });
      }
    }

    // ✅ PROCESSAR CADA ITEM
    for (const item of items) {
      console.log("🔍 [CSV] Processando item:", item);

      try {
        // Validações básicas
        if (!item.quantity || item.unitPrice == null) {
          throw new Error("Item sem quantidade ou preço");
        }

        const quantity = parseInt(item.quantity, 10);
        const price = parseFloat(item.unitPrice);
        const subcode = item.subcode.trim();

        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(`Quantidade inválida: ${item.quantity}`);
        }

        if (isNaN(price) || price < 0) {
          throw new Error(`Preço unitário inválido: ${item.unitPrice}`);
        }

        // ✅ ATUALIZAR PRODUTO EXISTENTE (quando usuário mapeou)
        if (item.mappedProductId && item.mappedProductId !== "") {
          const productId = parseInt(item.mappedProductId, 10);

          if (isNaN(productId)) {
            throw new Error(`ID do produto inválido: ${item.mappedProductId}`);
          }

          // Verifica se o produto existe antes de atualizar
          const existingProduct = await sql`
            SELECT id, name, price as current_price FROM products WHERE id = ${productId}
          `;

          if (existingProduct.length === 0) {
            throw new Error(`Produto não encontrado com ID: ${productId}`);
          }

          const currentPrice = existingProduct[0].current_price;

          // Atualiza produto existente com NOVO subcódigo
          await sql`
            UPDATE products 
            SET stock = stock + ${quantity}, 
                price = ${price},
                subcode = ${subcode}
            WHERE id = ${productId}
          `;

          // ✅ REGISTRA NO HISTÓRICO DE PREÇOS (só se o preço mudou)
          if (currentPrice !== price) {
            await sql`
              INSERT INTO price_history (product_id, purchase_price, quantity, purchase_date)
              VALUES (${productId}, ${price}, ${quantity}, ${
              purchaseDate || new Date().toISOString()
            })
            `;
            console.log(
              `📊 Histórico de preço atualizado para produto ID ${productId}`
            );
          }

          console.log(`✅ [CSV] Produto existente atualizado: ID ${productId}`);
          results.updated++;
        }
        // ✅ CRIAR NOVO PRODUTO A PARTIR DO CSV
        else if (item.productCode && item.description) {
          console.log(
            `🆕 [CSV] Criando novo produto: ${item.productCode} - ${item.description}`
          );

          // Verifica se já existe um produto com esse código
          const existingWithCode = await sql`
            SELECT id FROM products WHERE productcode = ${item.productCode}
          `;

          if (existingWithCode.length > 0) {
            // Se já existe, atualiza em vez de criar
            await sql`
              UPDATE products 
              SET stock = stock + ${quantity}, 
                  price = ${price},
                  subcode = ${subcode}
              WHERE productcode = ${item.productCode}
            `;

            // ✅ REGISTRA NO HISTÓRICO DE PREÇOS para produto existente
            await sql`
              INSERT INTO price_history (product_id, purchase_price, quantity, purchase_date)
              VALUES (${existingWithCode[0].id}, ${price}, ${quantity}, ${
              purchaseDate || new Date().toISOString()
            })
            `;

            console.log(
              `✅ [CSV] Produto existente atualizado pelo código: ${item.productCode}`
            );
            results.updated++;
          } else {
            // ✅ CRIA NOVO PRODUTO COM A MARCA SELECIONADA E SUBCODE
            const newProduct = await sql`
              INSERT INTO products (
                name, 
                productcode, 
                subcode,
                price, 
                stock, 
                brand,
                minstock,
                createdat
              ) VALUES (
                ${item.description},
                ${item.productCode},
                ${subcode},
                ${price},
                ${quantity},
                ${brandName},
                0,
                NOW()
              )
              RETURNING id, name, productcode, brand, subcode
            `;

            // ✅ REGISTRA NO HISTÓRICO DE PREÇOS para novo produto
            await sql`
              INSERT INTO price_history (product_id, purchase_price, quantity, purchase_date)
              VALUES (${newProduct[0].id}, ${price}, ${quantity}, ${
              purchaseDate || new Date().toISOString()
            })
            `;

            console.log(`✅ [CSV] Novo produto criado: ID ${newProduct[0].id}`);
            results.created++;
            results.newProducts.push({
              id: newProduct[0].id,
              name: newProduct[0].name,
              productcode: newProduct[0].productcode,
              brand: newProduct[0].brand,
              subcode: newProduct[0].subcode,
            });
          }
        } else {
          throw new Error("Item sem código de produto ou descrição");
        }
      } catch (error) {
        console.error(
          `❌ [CSV] Erro no item ${item.productCode}:`,
          error.message
        );
        results.errors.push({
          productCode: item.productCode,
          description: item.description,
          error: error.message,
        });
      }
    }

    console.log(
      `📊 [CSV] Resultado final: ${results.updated} atualizados, ${results.created} criados, ${results.errors.length} erros`
    );

    res.status(200).json({
      message: `Importação CSV processada com sucesso! ${results.updated} produtos atualizados e ${results.created} novos produtos criados na marca ${brandName}.`,
      type: "success",
      results: results,
      brandUsed: brandName,
    });
  } catch (error) {
    console.error("💥 [CSV] ERRO ao finalizar compra:", error.message);
    console.error("Stack trace:", error.stack);

    res.status(500).json({
      error: "Falha ao processar importação do CSV.",
      details: error.message,
      suggestion:
        "Verifique se todos os campos estão preenchidos corretamente.",
    });
  }
};

// ✅ ROTA DE TESTE DE CONEXÃO ATUALIZADA
exports.testConnection = async (req, res) => {
  try {
    console.log("🧪 Testando conexão com modelos disponíveis...");
    console.log("📋 Modelos disponíveis:", AVAILABLE_MODELS);

    const testPrompt = "Responda apenas com a palavra 'CONECTADO'";
    const result = await callGeminiAPI(testPrompt, []); // Sem imagens para teste simples

    res.status(200).json({
      success: true,
      message: "Conexão estabelecida com sucesso!",
      modelUsed: result.modelUsed,
      availableModels: AVAILABLE_MODELS,
      response: result.text,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      availableModels: AVAILABLE_MODELS,
    });
  }
};

// ✅ NOVO ENDPOINT PARA DIAGNÓSTICO DE PDF
exports.debugPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo PDF enviado." });
    }

    // ✅ CORREÇÃO: Importar pdf-parse corretamente
    const pdf = require("pdf-parse");
    const data = await pdf(req.file.buffer);

    const analysis = {
      totalLength: data.text.length,
      firstLines: data.text.split("\n").slice(0, 10),
      hasItens: data.text.includes("ITENS"),
      hasProduct: data.text.includes("Produto"),
      hasDescription: data.text.includes("Descrição"),
      hasQuantity:
        data.text.includes("Quant. Solíc") || data.text.includes("Quant"),
      hasPrice: data.text.includes("Preço Unit. Liq"),
      sampleText: data.text.substring(0, 1500),
      availableModels: AVAILABLE_MODELS,
    };

    res.status(200).json(analysis);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      availableModels: AVAILABLE_MODELS,
    });
  }
};

// ✅ NOVO CONTROLLER PARA IMPORTAR CSV
exports.importCsv = async (req, res) => {
  console.log("\n--- [IMPORTAÇÃO DE CSV] ---");

  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo CSV enviado." });
    }

    // ✅ RECEBE BRAND ID DO CSV
    const { brandId } = req.body;
    console.log("🏷️ Brand ID recebido para CSV:", brandId);

    if (!brandId) {
      return res
        .status(400)
        .json({ error: "ID da marca é obrigatório para importação CSV." });
    }

    // ✅ BUSCA A MARCA
    const brandResult =
      await sql`SELECT id, name FROM brands WHERE id = ${parseInt(
        brandId,
        10
      )}`;
    if (brandResult.length === 0) {
      return res.status(400).json({ error: "Marca não encontrada." });
    }

    const brandName = brandResult[0].name;
    console.log(`🏷️ Usando marca para CSV: ${brandName} (ID: ${brandId})`);

    console.log("📄 CSV recebido:", req.file.originalname);

    // Converte buffer para string
    const csvText = req.file.buffer.toString("utf8");

    // Processa o CSV
    const products = await processCsvData(csvText, brandName); // ✅ PASSA A MARCA

    console.log(`✅ CSV processado: ${products.length} produtos encontrados`);

    // ✅ DEBUG: Verifica se há dados válidos
    if (products.length === 0) {
      console.log("❌ Nenhum produto válido encontrado no CSV");
      return res.status(400).json({
        error: "Nenhum produto válido encontrado no CSV",
        details: "Verifique os cabeçalhos e formato do arquivo",
      });
    }

    // ✅ DEBUG: Verifica dados dos primeiros produtos
    console.log("🔍 Amostra dos dados processados:");
    products.slice(0, 3).forEach((product, index) => {
      console.log(
        `   ${index + 1}. Código: "${
          product.productCode
        }", Nome: "${product.name.substring(0, 30)}...", Preço: ${
          product.price
        }, Estoque: ${product.stock}, Marca: "${product.brand}"`
      );
    });

    // Importa para o banco
    console.log("🚀 Iniciando importação para o banco de dados...");
    const results = await importProductsToDatabase(products);

    res.status(200).json({
      message: `Importação concluída! ${results.created} novos produtos, ${results.updated} atualizados na marca ${brandName}`,
      results: results,
      type: "success",
      brandUsed: brandName,
    });
  } catch (error) {
    console.error("💥 ERRO na importação CSV:", error);
    res.status(500).json({
      error: "Falha na importação do CSV",
      details: error.message,
    });
  }
};

// ✅ PROCESSADOR DE CSV ATUALIZADO - USA MARCA SELECIONADA
async function processCsvData(csvText, selectedBrand) {
  const lines = csvText.split("\n").filter((line) => line.trim());
  const products = [];

  // Assume que a primeira linha é cabeçalho
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  console.log("📋 Cabeçalhos do CSV:", headers);

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);

    // ✅ CORREÇÃO: Incluir subcode no mapeamento
    const product = {
      productCode: getValueByHeader(headers, values, [
        "codigo",
        "sku",
        "productcode",
        "código",
        "ean",
      ]),
      name: getValueByHeader(headers, values, [
        "nome",
        "descricao",
        "descrição",
        "name",
        "product",
        "produto",
      ]),
      price:
        parseFloat(
          getValueByHeader(headers, values, [
            "preco",
            "preço",
            "price",
            "valor",
            "precounitario",
          ])
        ) || 0,
      stock:
        parseInt(
          getValueByHeader(headers, values, [
            "estoque",
            "stock",
            "quantidade",
            "qtd",
            "quantity",
          ])
        ) || 0,
      // ✅ NOVO: Extrair subcode do CSV
      subcode: getValueByHeader(headers, values, [
        "subcode",
        "subcodigo",
        "subcódigo",
        "codigointerno",
        "interno",
      ]),
      brand: selectedBrand,
      category: getValueByHeader(headers, values, [
        "categoria",
        "category",
        "grupo",
      ]),
    };

    // ✅ CORREÇÃO: Só adiciona se tiver código E nome
    if (product.productCode && product.name && product.productCode.trim() !== "") {
      products.push(product);
    }
  }

  console.log(`✅ ${products.length} produtos extraídos do CSV`);
  return products;
}

// ✅ FUNÇÃO AUXILIAR PARA MAPEAR COLUNAS
function getValueByHeader(headers, values, possibleHeaders) {
  for (const header of possibleHeaders) {
    const index = headers.indexOf(header);
    if (index !== -1 && values[index]) {
      return values[index].trim();
    }
  }
  return "";
}

// ✅ PARSER DE LINHA CSV (simples)
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map((val) => val.replace(/^"|"$/g, "").trim());
}

// ✅ IMPORTAR PARA BANCO (reutiliza lógica similar à do PDF)
async function importProductsToDatabase(products) {
  const results = {
    created: 0,
    updated: 0,
    errors: 0,
    details: [],
  };

  console.log(`🔄 Iniciando importação de ${products.length} produtos...`);

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    try {
      console.log(`\n📦 Processando produto ${i + 1}/${products.length}:`);
      console.log(`   Código: ${product.productCode}`);
      console.log(`   Subcódigo: ${product.subcode || "Não informado"}`);
      console.log(`   Nome: ${product.name.substring(0, 50)}...`);

      // ✅ GERAR SUBCÓDIGO AUTOMÁTICO SE NÃO INFORMADO
      let subcode = product.subcode;
      if (!subcode) {
        subcode = `CSV-${product.productCode}-${Date.now().toString(36)}`;
        console.log(`   🆔 Subcódigo auto-gerado: ${subcode}`);
      }

      // Verifica se produto já existe
      const existing = await sql`
        SELECT id, name, productcode, stock, price 
        FROM products 
        WHERE productcode = ${product.productCode}
      `;

      if (existing.length > 0) {
        // ✅ ATUALIZA produto existente COM SUBCODE
        const updateResult = await sql`
          UPDATE products SET 
            name = ${product.name},
            price = ${product.price},
            stock = stock + ${product.stock},
            brand = ${product.brand},
            subcode = ${subcode}
          WHERE productcode = ${product.productCode}
          RETURNING id, name, stock, price, subcode
        `;

        console.log(`   ✅ Produto atualizado:`, updateResult[0]);
        results.updated++;
        results.details.push(
          `✅ Atualizado: ${product.productCode} - ${product.name.substring(
            0,
            30
          )}...`
        );
      } else {
        // ✅ CRIA novo produto COM SUBCODE
        const newProduct = await sql`
          INSERT INTO products (
            name, productcode, subcode, price, stock, brand,
            minstock, createdat
          ) VALUES (
            ${product.name}, ${product.productCode}, ${subcode}, ${product.price}, 
            ${product.stock}, ${product.brand}, 0, NOW()
          )
          RETURNING id, name, productcode, brand, subcode
        `;

        console.log(`   ✅ Novo produto criado: ID ${newProduct[0].id}`);
        results.created++;
        results.details.push(
          `🆕 Criado: ${product.productCode} - ${product.name.substring(
            0,
            30
          )}...`
        );
      }
    } catch (error) {
      console.error(
        `   ❌ ERRO no produto ${product.productCode}:`,
        error.message
      );
      results.errors++;
      results.details.push(
        `❌ Erro: ${product.productCode} - ${error.message}`
      );
    }
  }

  console.log(`\n📊 RESUMO DA IMPORTAÇÃO:`);
  console.log(`   ✅ Criados: ${results.created}`);
  console.log(`   🔄 Atualizados: ${results.updated}`);
  console.log(`   ❌ Erros: ${results.errors}`);

  return results;
}

// ✅ CONTROLLER PARA FINALIZAR COMPRA DE PDF - CORRIGIDO
exports.finalizePurchaseFromPdf = async (req, res) => {
  const { brandId, purchaseDate ,items } = req.body;

  console.log("📦 [PDF] Dados recebidos para finalizar compra:");
  console.log("🏷️ Brand ID:", brandId, "Tipo:", typeof brandId);
  console.log("📋 Items recebidos:", JSON.stringify(items, null, 2));

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Nenhum item válido foi recebido." });
  }

  // ✅ VALIDAÇÃO DA MARCA
  if (!brandId) {
    return res.status(400).json({ error: "ID da marca é obrigatório." });
  }

  // ✅ VALIDAÇÃO DOS SUBCÓDIGOS
  const missingSubcodes = items.filter(
    (item) => !item.subcode || item.subcode.trim() === ""
  );
  if (missingSubcodes.length > 0) {
    return res.status(400).json({
      error: "Subcódigo é obrigatório para todos os produtos.",
      details: `${missingSubcodes.length} itens sem subcódigo`,
    });
  }

  // ✅ VALIDAÇÃO DE SUBCÓDIGOS ÚNICOS
  const subcodes = items.map((item) => item.subcode.trim());
  const duplicateSubcodes = subcodes.filter(
    (code, index) => subcodes.indexOf(code) !== index
  );
  if (duplicateSubcodes.length > 0) {
    return res.status(400).json({
      error: "Subcódigos duplicados encontrados.",
      details: `Códigos repetidos: ${duplicateSubcodes.join(", ")}`,
    });
  }

  try {
    const results = {
      updated: 0,
      created: 0,
      newProducts: [],
      errors: [],
    };

    // ✅ CONVERSÃO SEGURA DO BRAND ID
    const brandIdInt = parseInt(brandId, 10);
    if (isNaN(brandIdInt)) {
      return res.status(400).json({
        error: "ID da marca inválido.",
        details: `Não foi possível converter '${brandId}' para número`,
      });
    }

    console.log(
      `🏷️ [PDF] Brand ID convertido: ${brandIdInt} (original: ${brandId})`
    );

    // ✅ BUSCA A MARCA NO BANCO
    const brandResult = await sql`
      SELECT id, name FROM brands WHERE id = ${brandIdInt}
    `;

    if (brandResult.length === 0) {
      return res.status(400).json({
        error: "Marca não encontrada.",
        details: `ID: ${brandIdInt}`,
      });
    }

    const brandName = brandResult[0].name;
    console.log(`🏷️ [PDF] Usando marca: ${brandName} (ID: ${brandIdInt})`);

    // ✅ VERIFICAR SUBCÓDIGOS EXISTENTES ANTES DE PROCESSAR
    for (const item of items) {
      const subcode = item.subcode.trim();

      // Verifica se o subcódigo já existe em outro produto
      const existingSubcode = await sql`
        SELECT id, name FROM products 
        WHERE subcode = ${subcode} 
        AND id != COALESCE(${item.mappedProductId || 0}, 0)
      `;

      if (existingSubcode.length > 0) {
        return res.status(400).json({
          error: `Subcódigo "${subcode}" já está em uso.`,
          details: `Usado pelo produto: ${existingSubcode[0].name}`,
        });
      }
    }

    // ✅ PROCESSAR CADA ITEM
    for (const item of items) {
      console.log("🔍 [PDF] Processando item:", item);

      try {
        // Validações básicas
        if (!item.quantity || item.unitPrice == null) {
          throw new Error("Item sem quantidade ou preço");
        }

        const quantity = parseInt(item.quantity, 10);
        const price = parseFloat(item.unitPrice);
        const subcode = item.subcode.trim();

        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(`Quantidade inválida: ${item.quantity}`);
        }

        if (isNaN(price) || price < 0) {
          throw new Error(`Preço unitário inválido: ${item.unitPrice}`);
        }

        // ✅ ATUALIZAR PRODUTO EXISTENTE (quando usuário mapeou)
        if (item.mappedProductId && item.mappedProductId !== "") {
          const productId = parseInt(item.mappedProductId, 10);

          if (isNaN(productId)) {
            throw new Error(`ID do produto inválido: ${item.mappedProductId}`);
          }

          // Verifica se o produto existe antes de atualizar
          const existingProduct = await sql`
            SELECT id, name, price as current_price FROM products WHERE id = ${productId}
          `;

          if (existingProduct.length === 0) {
            throw new Error(`Produto não encontrado com ID: ${productId}`);
          }

          const currentPrice = existingProduct[0].current_price;

          // Atualiza produto existente com NOVO subcódigo
          await sql`
            UPDATE products 
            SET stock = stock + ${quantity}, 
                price = ${price},
                subcode = ${subcode}
            WHERE id = ${productId}
          `;

          // ✅ REGISTRA NO HISTÓRICO DE PREÇOS (só se o preço mudou)
          if (currentPrice !== price) {
            await sql`
              INSERT INTO price_history (product_id, purchase_price, quantity, purchase_date)
              VALUES (${productId}, ${price}, ${quantity}, ${purchaseDate || new Date().toISOString()})
            `;
            console.log(
              `📊 Histórico de preço atualizado para produto ID ${productId}`
            );
          }

          console.log(`✅ [PDF] Produto existente atualizado: ID ${productId}`);
          results.updated++;
        }
        // ✅ CRIAR NOVO PRODUTO A PARTIR DO PDF
        else if (item.productCode && item.description) {
          console.log(
            `🆕 [PDF] Criando novo produto: ${item.productCode} - ${item.description}`
          );

          // Verifica se já existe um produto com esse código
          const existingWithCode = await sql`
            SELECT id FROM products WHERE productcode = ${item.productCode}
          `;

          if (existingWithCode.length > 0) {
            // Se já existe, atualiza em vez de criar
            await sql`
              UPDATE products 
              SET stock = stock + ${quantity}, 
                  price = ${price},
                  subcode = ${subcode}
              WHERE productcode = ${item.productCode}
            `;

            // ✅ REGISTRA NO HISTÓRICO DE PREÇOS para produto existente
            await sql`
              INSERT INTO price_history (product_id, purchase_price, quantity, purchase_date)
              VALUES (${existingWithCode[0].id}, ${price}, ${quantity} , ${purchaseDate || new Date().toISOString()})
            `;

            console.log(
              `✅ [PDF] Produto existente atualizado pelo código: ${item.productCode}`
            );
            results.updated++;
          } else {
            // ✅ CRIA NOVO PRODUTO COM A MARCA SELECIONADA E SUBCODE
            const newProduct = await sql`
              INSERT INTO products (
                name, 
                productcode, 
                subcode,
                price, 
                stock, 
                brand,
                minstock,
                createdat
              ) VALUES (
                ${item.description},
                ${item.productCode},
                ${subcode},
                ${price},
                ${quantity},
                ${brandName},
                0,
                NOW()
              )
              RETURNING id, name, productcode, brand, subcode
            `;

            // ✅ REGISTRA NO HISTÓRICO DE PREÇOS para novo produto
            await sql`
              INSERT INTO price_history (product_id, purchase_price, quantity, purchase_date)
              VALUES (${newProduct[0].id}, ${price}, ${quantity}, ${purchaseDate || new Date().toISOString()})
            `;

            console.log(`✅ [PDF] Novo produto criado: ID ${newProduct[0].id}`);
            results.created++;
            results.newProducts.push({
              id: newProduct[0].id,
              name: newProduct[0].name,
              productcode: newProduct[0].productcode,
              brand: newProduct[0].brand,
              subcode: newProduct[0].subcode,
            });
          }
        } else {
          throw new Error("Item sem código de produto ou descrição");
        }
      } catch (error) {
        console.error(
          `❌ [PDF] Erro no item ${item.productCode}:`,
          error.message
        );
        results.errors.push({
          productCode: item.productCode,
          description: item.description,
          error: error.message,
        });
      }
    }

    console.log(
      `📊 [PDF] Resultado final: ${results.updated} atualizados, ${results.created} criados, ${results.errors.length} erros`
    );

    res.status(200).json({
      message: `Compra processada com sucesso! ${results.updated} produtos atualizados e ${results.created} novos produtos criados na marca ${brandName}.`,
      type: "success",
      results: results,
      brandUsed: brandName,
    });
  } catch (error) {
    console.error("💥 [PDF] ERRO ao finalizar compra:", error.message);
    console.error("Stack trace:", error.stack);

    res.status(500).json({
      error: "Falha ao processar compra do PDF.",
      details: error.message,
      suggestion:
        "Verifique se todos os campos estão preenchidos corretamente.",
    });
  }
};

// ✅ NOVO ENDPOINT: PROCESSAR CSV E RETORNAR ITENS (NÃO IMPORTA AINDA)
exports.processCsv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo CSV enviado." });
    }

    // Converte buffer para string
    const csvText = req.file.buffer.toString("utf8");

    // ✅ CORREÇÃO: Processa CSV sem marca específica
    const products = await processCsvData(csvText, "");

    // ✅ CORREÇÃO: Normaliza para o formato esperado pelo frontend INCLUINDO SUBCODE
    const parsed = products.map((p, index) => ({
      productCode: p.productCode || "",
      description: p.name || `Produto ${index + 1}`,
      quantity: Number(p.stock || 1),
      unitPrice: Number(p.price || 0),
      // ✅ GARANTIR que o subcode seja incluído
      subcode: p.subcode || p.productCode || `CSV-${index + 1}`,
    }));

    console.log(`✅ CSV processado: ${parsed.length} itens com subcódigos`);
    
    return res.status(200).json(parsed);
  } catch (error) {
    console.error("💥 ERRO ao processar CSV (preview):", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getPriceHistory = async (req, res) => {
  const { productId } = req.params;

  try {
    console.log(
      `📊 Buscando histórico de preços para produto ID: ${productId}`
    );

    const history = await sql`
      SELECT 
        ph.id,
        ph.purchase_price,
        ph.quantity,
        ph.purchase_date,
        ph.created_at,
        p.name as product_name,
        p.productcode,
        p.subcode
      FROM price_history ph
      JOIN products p ON ph.product_id = p.id
      WHERE ph.product_id = ${parseInt(productId, 10)}
      ORDER BY ph.purchase_date DESC
    `;

    console.log(`✅ Histórico encontrado: ${history.length} registros`);

    res.status(200).json(history);
  } catch (error) {
    console.error("💥 ERRO ao buscar histórico de preços:", error.message);
    res.status(500).json({
      error: "Erro ao buscar histórico de preços.",
      details: error.message,
    });
  }
};

// ✅ CONTROLLER PARA OBTER ÚLTIMO PREÇO DE COMPRA
exports.getLastPurchasePrice = async (req, res) => {
  const { productId } = req.params;

  try {
    console.log(
      `💰 Buscando último preço de compra para produto ID: ${productId}`
    );

    const lastPurchase = await sql`
      SELECT 
        purchase_price,
        purchase_date,
        quantity
      FROM price_history 
      WHERE product_id = ${parseInt(productId, 10)}
      ORDER BY purchase_date DESC 
      LIMIT 1
    `;

    if (lastPurchase.length === 0) {
      return res.status(404).json({
        message: "Nenhum histórico de compra encontrado para este produto.",
      });
    }

    console.log(`✅ Último preço: R$ ${lastPurchase[0].purchase_price}`);

    res.status(200).json(lastPurchase[0]);
  } catch (error) {
    console.error("💥 ERRO ao buscar último preço:", error.message);
    res.status(500).json({
      error: "Erro ao buscar último preço de compra.",
      details: error.message,
    });
  }
};

// ✅ ADICIONAR FUNÇÃO PARA LISTAR ARQUIVOS TEMPORÁRIOS (DEBUG)
exports.listTempFiles = async (req, res) => {
  try {
    const tempDir = path.join(__dirname, "..", "temp");
    const files = await fs.readdir(tempDir);
    
    const fileDetails = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          isFile: stats.isFile(),
          created: stats.birthtime
        };
      })
    );

    res.status(200).json({
      tempDir,
      files: fileDetails
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

// ✅ EXPORTAR OS MODELOS DISPONÍVEIS
exports.AVAILABLE_MODELS = AVAILABLE_MODELS;