const pdf = require("pdf-parse");
const { neon } = require("@neondatabase/serverless");
require("dotenv").config();

// Conexão com o banco Neon
const sql = neon(process.env.DATABASE_URL);

// ✅ MODELOS DISPONÍVEIS PARA SUA CONTA (baseado no teste)
const AVAILABLE_MODELS = [
  'gemini-1.5-flash',          // Modelo mais rápido e econômico
  'gemini-1.5-flash-002',      // Versão estável
  'gemini-1.5-flash-8b',       // Versão compacta
  'gemini-1.5-pro',            // Modelo mais capaz
  'gemini-2.0-flash',          // Versão 2.0
  'gemini-2.5-flash',          // Mais recente
];

// ✅ FUNÇÃO OTIMIZADA PARA CHAMAR A API
async function callGeminiAPI(promptText) {
  console.log("🔗 Conectando à API Gemini...");
  
  for (const modelName of AVAILABLE_MODELS) {
    try {
      console.log(`🧪 Tentando: ${modelName}`);
      
      const API_URL = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const requestBody = {
        contents: [{
          parts: [{
            text: promptText
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        }
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
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
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Resposta da API em formato inesperado');
      }
      
      console.log(`✅ Sucesso com: ${modelName}`);
      return {
        text: data.candidates[0].content.parts[0].text,
        modelUsed: modelName
      };
      
    } catch (error) {
      console.log(`❌ ${modelName} falhou: ${error.message}`);
      // Continua para o próximo modelo
    }
  }
  
  throw new Error('Nenhum dos modelos disponíveis funcionou. Verifique sua chave API.');
}

exports.processPdf = async (req, res) => {
  console.log("\n--- [PROCESSAMENTO DE PDF] ---");
  try {
    if (!req.file) {
      console.log("❌ Nenhum arquivo recebido");
      return res.status(400).json({ error: "Nenhum arquivo PDF enviado." });
    }
    
    console.log("📄 Arquivo recebido:", req.file.originalname);

    // Extrai texto do PDF
    const data = await pdf(req.file.buffer);
    console.log("✅ Texto extraído do PDF");

    const prompt = `
      Você é um especialista em extrair dados de documentos de orçamento.
      
      ANALISE este texto extraído de um PDF e extraia TODOS os produtos listados.
      
      PARA CADA ITEM, extraia estas informações:
      - productCode: código do produto (coluna "Produto" ou similar)
      - description: descrição completa do produto
      - quantity: quantidade solicitada (converta para número)
      - unitPrice: preço unitário líquido (converta para número decimal)
      
      REGRAS IMPORTANTES:
      - Retorne APENAS um array JSON válido, sem texto adicional
      - Formato: [{"productCode": "123", "description": "Nome", "quantity": 10, "unitPrice": 25.50}]
      - Use 0 para valores numéricos não encontrados
      - Use "" para textos não encontrados
      - Inclua TODOS os itens da lista
      
      TEXTO DO PDF:
      ${data.text}
    `;

    console.log("🤖 Enviando prompt para IA...");
    const result = await callGeminiAPI(prompt);
    const aiText = result.text;
    const modelUsed = result.modelUsed;

    console.log("📝 Resposta recebida do modelo:", modelUsed);

    let parsedData;
    try {
      // Limpa o texto para parse JSON
      const cleanedText = aiText
        .trim()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/^[^{[]*/, '') // Remove texto antes do JSON
        .replace(/[^}\]]*$/, ''); // Remove texto depois do JSON
      
      parsedData = JSON.parse(cleanedText);
      console.log("✅ JSON parseado com sucesso. Itens encontrados:", parsedData.length);
    } catch (parseError) {
      console.error("❌ Erro no parse do JSON:", parseError.message);
      console.log("📄 Texto recebido (primeiros 500 chars):", aiText.substring(0, 500));
      
      // Tenta corrigir o JSON
      try {
        // Encontra o primeiro [ e último ]
        const start = aiText.indexOf('[');
        const end = aiText.lastIndexOf(']') + 1;
        if (start !== -1 && end !== -1) {
          const jsonText = aiText.substring(start, end);
          parsedData = JSON.parse(jsonText);
          console.log("✅ JSON corrigido com sucesso!");
        } else {
          throw new Error('Não foi possível encontrar JSON na resposta');
        }
      } catch (secondError) {
        return res.status(500).json({
          error: "Resposta da IA em formato inválido",
          suggestion: "A IA não retornou um JSON válido",
          rawResponse: aiText.substring(0, 300) + "..."
        });
      }
    }

    res.status(200).json(parsedData);
    
  } catch (error) {
    console.error("💥 ERRO NO PROCESSAMENTO:", error.message);
    res.status(500).json({
      error: "Falha no processamento do PDF",
      details: error.message
    });
  }
};

exports.finalizePurchase = async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Nenhum item válido foi recebido." });
  }

  try {
    await sql.transaction(async (tx) => {
      for (const item of items) {
        if (!item.mappedProductId || !item.quantity || item.unitPrice == null) {
          throw new Error("Item inválido: " + JSON.stringify(item));
        }

        const quantity = parseInt(item.quantity, 10);
        const price = parseFloat(item.unitPrice);
        const productId = parseInt(item.mappedProductId, 10);

        if (isNaN(quantity) || isNaN(price) || isNaN(productId)) {
          throw new Error("Dados numéricos inválidos: " + JSON.stringify(item));
        }

        await tx`
          UPDATE products 
          SET stock = stock + ${quantity}, price = ${price}
          WHERE id = ${productId}
        `;
      }
    });

    res.status(200).json({ message: "Estoque atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao finalizar compra:", error);
    res.status(500).json({ error: "Falha ao atualizar estoque." });
  }
};

// ✅ Rota de teste
exports.testConnection = async (req, res) => {
  try {
    console.log("🧪 Testando conexão com modelos disponíveis...");
    
    const testPrompt = "Responda apenas com a palavra 'CONECTADO'";
    const result = await callGeminiAPI(testPrompt);
    
    res.status(200).json({
      success: true,
      message: "Conexão estabelecida com sucesso!",
      modelUsed: result.modelUsed,
      response: result.text
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};