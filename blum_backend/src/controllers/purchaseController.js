const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Verifica se a chave da API está carregada
if (!process.env.GEMINI_API_KEY) {
  console.error("ERRO CRÍTICO: A variável GEMINI_API_KEY não foi encontrada no .env!");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.processPdf = async (req, res) => {
  console.log("\n--- [NOVA TENTATIVA] Iniciando processamento de PDF ---");
  try {
    if (!req.file) {
      console.log("-> Erro: Nenhum arquivo foi recebido.");
      return res.status(400).json({ error: 'Nenhum arquivo PDF enviado.' });
    }
    console.log("-> 1. Arquivo recebido:", req.file.originalname);

    const data = await pdf(req.file.buffer);
    console.log("-> 2. Texto extraído do PDF com sucesso.");
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
      Você é um assistente especialista em extrair dados de documentos.
      Analise o texto a seguir, que foi extraído de um PDF de orçamento de compra.
      Identifique cada item na lista de produtos e extraia as seguintes informações para cada um:
      - O código do produto (coluna "Produto").
      - A descrição completa do produto (coluna "Descrição").
      - A quantidade solicitada (coluna "Quant. Solic.").
      - O preço unitário líquido (coluna "Preço Unit. Liq.").

      Retorne os dados estritamente como um array de objetos JSON VÁLIDO. Cada objeto deve ter as chaves: "productCode", "description", "quantity", e "unitPrice".
      Se um valor numérico não for encontrado, use 0. Se um valor de texto não for encontrado, use uma string vazia.
      NÃO inclua formatação markdown como \`\`\`json ou qualquer texto explicativo antes ou depois do array JSON. A resposta deve começar com '[' e terminar com ']'.

      TEXTO DO PDF:
      ---
      ${data.text}
      ---
    `;

    console.log("-> 3. Enviando prompt para a API de IA...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();
    
    console.log("-> 4. RESPOSTA BRUTA DA IA:\n", aiText);

    let parsedData;
    try {
      // Tenta fazer o parse do JSON
      parsedData = JSON.parse(aiText.trim());
      console.log("-> 5. JSON parseado com sucesso. Enviando para o frontend.");
    } catch (parseError) {
      console.error("!!! ERRO AO FAZER O PARSE DO JSON DA IA:", parseError);
      console.error("A IA retornou um texto que não é um JSON válido.");
      // Retorna um erro específico para o frontend saber o que aconteceu
      return res.status(500).json({ error: 'A resposta da IA não estava em um formato JSON válido.' });
    }
    
    res.status(200).json(parsedData);

  } catch (error) {
    // Este catch agora pegará erros de conexão com a API, etc.
    console.error("!!! ERRO GERAL NO BACKEND:", error);
      res.status(500).json({ error: 'Falha ao se comunicar com a API de IA ou processar o PDF.' });
    }
  };
  
  exports.finalizePurchase = async (req, res) => {
    const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Nenhum item válido foi recebido.' });
  }

  try {
    // Usar uma transação para garantir que todas as atualizações ocorram com sucesso
    await sql.transaction(async (tx) => {
      for (const item of items) {
        // Valida se cada item tem os dados necessários
        if (!item.mappedProductId || !item.quantity || item.unitPrice == null) {
          throw new Error('Item inválido encontrado na lista: ' + JSON.stringify(item));
        }

        const quantity = parseInt(item.quantity, 10);
        const price = parseFloat(item.unitPrice);
        const productId = parseInt(item.mappedProductId, 10);

        if (isNaN(quantity) || isNaN(price) || isNaN(productId)) {
             throw new Error('Dados numéricos inválidos para o item: ' + JSON.stringify(item));
        }

        // Atualiza o estoque (adicionando a nova quantidade) e o preço de custo do produto
        await tx`
          UPDATE products
          SET 
            stock = stock + ${quantity},
            price = ${price}
          WHERE id = ${productId}
        `;
      }
    });

    res.status(200).json({ message: 'Estoque atualizado com sucesso!' });
  } catch (error) {
    console.error("Erro ao finalizar a compra e atualizar o estoque:", error);
    res.status(500).json({ error: 'Falha ao atualizar o estoque no banco de dados.' });
  }
};