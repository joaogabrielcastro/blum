/**
 * Smart Extractor - Extrator modular por fornecedor
 * Identifica o fornecedor e usa lógica específica
 */

// ===========================
// 🏭 DETECÇÃO DE FORNECEDOR
// ===========================

function detectSupplier(text) {
  const textUpper = text.toUpperCase();

  // ⚠️ ORDEM IMPORTANTE: Verifica fornecedores específicos ANTES dos genéricos

  // 1️⃣ BLUMENAU (específico) - deve vir antes do DANFE genérico
  if (
    textUpper.includes("BLUMENAU ILUMINAÇÃO") ||
    textUpper.includes("BLUMENAU ILUMINACAO") ||
    textUpper.includes("BLUMENAU")
  ) {
    return "BLUMENAU";
  }

  // 2️⃣ ELGIN (específico)
  if (textUpper.includes("ELGIN")) {
    return "ELGIN";
  }

  // 3️⃣ AVANT (pode ser genérico para outros DANFEs)
  if (
    textUpper.includes("AVANT") ||
    textUpper.includes("NOTA FISCAL ELETRÔNICA") ||
    (textUpper.includes("DANFE") && textUpper.includes("NCM/SH"))
  ) {
    return "AVANT";
  }

  return "GENERIC";
}

// ===========================
// 📄 EXTRAÇÃO - AVANT
// ===========================

function extractAvant(text) {
  console.log("🏭 smart_extractor: Usando lógica AVANT (DANFE)");

  const items = [];
  const itemsMap = new Map();

  // Encontra tabela de produtos
  const danfeHeaderEnd = Math.max(
    text.indexOf("DADOS DO PRODUTO"),
    text.indexOf("DESCRIÇÃO DO PROD"),
    text.indexOf("CÓDIGO PROD"),
    text.indexOf("NCM/SH"),
  );

  const productText =
    danfeHeaderEnd > 0 ? text.substring(danfeHeaderEnd) : text;
  console.log(`📄 Preview AVANT: ${productText.substring(0, 200)}...`);

  // Formato: "código descrição NCM(8dig) CST CFOP UN quantidade preço total"
  const danfePattern =
    /\b(\d{7,9})\s+([A-Za-z][A-Za-zÀ-ÿ0-9\s\-\/]{5,100}?)\s+(\d{8})\s+\d{2,3}\s+\d{4}\s+UN\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/g;
  let match;

  while ((match = danfePattern.exec(productText)) !== null) {
    const code = match[1];
    const description = match[2].trim();
    const quantity = parseFloat(match[4].replace(/\./g, "").replace(",", "."));
    const unitPrice = parseFloat(match[5].replace(/\./g, "").replace(",", "."));

    if (quantity > 0 && unitPrice > 0 && !itemsMap.has(code)) {
      itemsMap.set(code, {
        productCode: code,
        description: description.substring(0, 200),
        quantity: quantity,
        unitPrice: unitPrice,
      });

      console.log(
        `   ✅ ${code} - ${description.substring(0, 30)}... | Qtd: ${quantity} | R$ ${unitPrice}`,
      );
    }
  }

  return Array.from(itemsMap.values());
}

// ===========================
// 📄 EXTRAÇÃO - BLUMENAU
// ===========================

function extractBlumenau(text) {
  console.log("🏭 smart_extractor: Usando lógica BLUMENAU");

  const itemsMap = new Map();

  // Formato Blumenau: Tabela estruturada
  // Item | Marca | Produto | Descrição | NCM | Quan Solic. | Preço Unit. Líq. + IPI
  // 1    | B     | 03224000| Vela LED E27 2,5W... | 85395200 | 10 | 7.52 8.01

  console.log(`📄 Preview do texto: ${text.substring(0, 200)}...`);

  // Conta total de ocorrências de "B" seguido de código no texto
  const allBMatches = text.match(/\bB\s+[\d.]{6,12}\b/gi);
  console.log(
    `\n🔍 Total de padrões "B + código" encontrados no texto: ${allBMatches ? allBMatches.length : 0}`,
  );

  // ESTRATÉGIA 1: Padrão principal com NCM completo
  // Padrão: B + código(6-12dig) + descrição + NCM(8dig ou com hífen/espaço) + quantidade + preço
  const pattern =
    /\bB\s+([\d.]{6,12})\s+([A-Zaà-ÿ][A-Zaà-ÿ0-9\s\-\/\.,()°ºª]+?)\s+(\d{5}[\-\s]\d{3}|\d{8})\s+(\d{1,5})\s+([\d.,]+)/gi;

  let match;
  let count = 0;

  while ((match = pattern.exec(text)) !== null) {
    count++;
    const code = match[1]; // Mantém o código como está (com ou sem pontos)
    let description = match[2].trim();
    const ncm = match[3];
    const quantity = parseInt(match[4], 10);
    let unitPrice = parseFloat(match[5].replace(/\./g, "").replace(",", "."));

    // Limpa descrição: remove espaços extras e caracteres indesejados
    description = description
      .replace(/\s+/g, " ")
      .replace(/\s+([,.])/g, "$1")
      .trim();

    // Limita tamanho da descrição (até 150 caracteres)
    if (description.length > 150) {
      description = description.substring(0, 150);
    }

    console.log(`\n✅ Item #${count}:`);
    console.log(`   Código: ${code}`);
    console.log(`   Descrição: ${description}`);
    console.log(`   NCM: ${ncm}`);
    console.log(`   Quantidade: ${quantity}`);
    console.log(`   Preço Unit.: R$ ${unitPrice.toFixed(2)}`);

    // Validação final
    if (code && description.length >= 5 && quantity > 0 && unitPrice > 0) {
      if (!itemsMap.has(code)) {
        itemsMap.set(code, {
          productCode: code,
          description: description,
          quantity: quantity,
          unitPrice: unitPrice,
        });
        console.log(`   ✔️ Adicionado ao mapa`);
      } else {
        console.log(`   ⚠️ Código duplicado, ignorado`);
      }
    } else {
      console.log(
        `   ❌ Validação falhou: code=${!!code}, desc.len=${description.length}, qty=${quantity}, price=${unitPrice}`,
      );
    }
  }

  console.log(`\n📊 Estratégia 1 (com NCM espaçado): ${itemsMap.size} itens`);

  // ESTRATÉGIA 2: Captura itens com NCM sem espaço (85395200 ao invés de 85395 200)
  if (allBMatches && allBMatches.length > itemsMap.size) {
    console.log(
      `\n🔄 Tentando capturar ${allBMatches.length - itemsMap.size} itens restantes...`,
    );

    const pattern2 =
      /\bB\s+([\d.]{6,12})\s+([A-Zaà-ÿ][A-Zaà-ÿ0-9\s\-\/\.,()°ºª]+?)\s+(\d{8})\s+(\d{1,5})\s+([\d.,]+)/gi;
    let match2;

    while ((match2 = pattern2.exec(text)) !== null) {
      const code = match2[1];

      if (!itemsMap.has(code)) {
        count++;
        let description = match2[2]
          .trim()
          .replace(/\s+/g, " ")
          .replace(/\s+([,.])/g, "$1")
          .trim();

        if (description.length > 150) {
          description = description.substring(0, 150);
        }

        const ncm = match2[3];
        const quantity = parseInt(match2[4], 10);
        const unitPrice = parseFloat(
          match2[5].replace(/\./g, "").replace(",", "."),
        );

        console.log(`\n✅ Item #${count} (Estratégia 2):`);
        console.log(`   Código: ${code}`);
        console.log(`   Descrição: ${description}`);
        console.log(`   NCM: ${ncm}`);
        console.log(`   Quantidade: ${quantity}`);
        console.log(`   Preço Unit.: R$ ${unitPrice.toFixed(2)}`);

        if (code && description.length >= 5 && quantity > 0 && unitPrice > 0) {
          itemsMap.set(code, {
            productCode: code,
            description: description,
            quantity: quantity,
            unitPrice: unitPrice,
          });
          console.log(`   ✔️ Adicionado ao mapa`);
        }
      }
    }
  }

  // ESTRATÉGIA 3: Captura itens com descrições mais longas/complexas
  if (allBMatches && allBMatches.length > itemsMap.size) {
    console.log(`\n🔄 Estratégia 3: Tentando com descrições mais longas...`);

    // Permite descrições de até 200 caracteres e NCM em qualquer formato
    const pattern3 =
      /\bB\s+([\d.]{6,12})\s+(.+?)\s+(\d{5}[\-\s]\d{3}|\d{8})\s+(\d{1,5})\s+([\d.,]+)/gi;
    let match3;

    while ((match3 = pattern3.exec(text)) !== null) {
      const code = match3[1];

      if (!itemsMap.has(code)) {
        count++;
        let description = match3[2]
          .trim()
          .replace(/\s+/g, " ")
          .replace(/\s+([,.])/g, "$1")
          .trim();

        // Limita descrição a 200 caracteres
        if (description.length > 200) {
          description = description.substring(0, 200);
        }

        const ncm = match3[3];
        const quantity = parseInt(match3[4], 10);
        const unitPrice = parseFloat(
          match3[5].replace(/\./g, "").replace(",", "."),
        );

        console.log(`\n✅ Item #${count} (Estratégia 3 - desc. longa):`);
        console.log(`   Código: ${code}`);
        console.log(`   Descrição: ${description}`);
        console.log(`   NCM: ${ncm}`);
        console.log(`   Quantidade: ${quantity}`);
        console.log(`   Preço Unit.: R$ ${unitPrice.toFixed(2)}`);

        if (code && description.length >= 3 && quantity > 0 && unitPrice > 0) {
          itemsMap.set(code, {
            productCode: code,
            description: description,
            quantity: quantity,
            unitPrice: unitPrice,
          });
          console.log(`   ✔️ Adicionado ao mapa`);
        }
      }
    }
  }

  // ESTRATÉGIA 4: Captura itens com espaçamento irregular e múltiplos espaços
  if (allBMatches && allBMatches.length > itemsMap.size) {
    console.log(
      `\n🔄 Estratégia 4: Tentando itens com espaçamento irregular...`,
    );

    // Aceita múltiplos espaços em qualquer lugar: B + código + descrição + NCM (com ou sem espaço) + quantidade + preço
    // NCM pode estar com espaço adicional: "85395 200" ou "85395200"
    const pattern4 =
      /\bB\s+([\d.]{6,12})\s+([A-Zaà-ÿ][A-Zaà-ÿ0-9\s\-\/\.,()°ºª]+?)\s+(\d{5})\s+(\d{3})\s+(\d{1,5})\s+([\d.,]+)/gi;
    let match4;

    while ((match4 = pattern4.exec(text)) !== null) {
      const code = match4[1];

      if (!itemsMap.has(code)) {
        count++;
        let description = match4[2]
          .trim()
          .replace(/\s+/g, " ")
          .replace(/\s+([,.])/g, "$1")
          .trim();

        if (description.length > 150) {
          description = description.substring(0, 150);
        }

        const ncm = match4[3] + match4[4]; // Junta as duas partes do NCM
        const quantity = parseInt(match4[5], 10);
        const unitPrice = parseFloat(
          match4[6].replace(/\./g, "").replace(",", "."),
        );

        console.log(`\n✅ Item #${count} (Estratégia 4 - espaçamento):`);
        console.log(`   Código: ${code}`);
        console.log(`   Descrição: ${description}`);
        console.log(`   NCM: ${ncm} (juntado: ${match4[3]} + ${match4[4]})`);
        console.log(`   Quantidade: ${quantity}`);
        console.log(`   Preço Unit.: R$ ${unitPrice.toFixed(2)}`);

        if (code && description.length >= 3 && quantity > 0 && unitPrice > 0) {
          itemsMap.set(code, {
            productCode: code,
            description: description,
            quantity: quantity,
            unitPrice: unitPrice,
          });
          console.log(`   ✔️ Adicionado ao mapa`);
        }
      }
    }
  }

  // ESTRATÉGIA 5: Captura itens com NCM espaçado e múltiplos preços
  if (allBMatches && allBMatches.length > itemsMap.size) {
    console.log(
      `\n🔄 Estratégia 5: Tentando itens com NCM espaçado e múltiplos preços...`,
    );

    // Formato: B + código + descrição + NCM (5dig espaço 3dig) + quantidade + preço1 + preço2
    // Exemplo: B   03127016  Lamp. LED... 6.500K  85395 200   500   2,62   2,79
    // Aceita códigos com ou sem pontos, múltiplos espaços
    const pattern5 =
      /\bB\s+([\d.]+)\s+([A-Zaà-ÿ].{10,150}?)\s+(\d{5})\s+(\d{3})\s+(\d{1,5})\s+([\d.,]+)\s+([\d.,]+)/gi;
    let match5;

    while ((match5 = pattern5.exec(text)) !== null) {
      const code = match5[1];

      if (!itemsMap.has(code)) {
        count++;
        let description = match5[2]
          .trim()
          .replace(/\s+/g, " ")
          .replace(/\s+([,.])/g, "$1")
          .trim();

        if (description.length > 150) {
          description = description.substring(0, 150);
        }

        const ncm = match5[3] + match5[4]; // Junta NCM: 85395 + 200
        const quantity = parseInt(match5[5], 10);
        // Pega o segundo preço (geralmente o preço unitário com IPI)
        const unitPrice = parseFloat(
          match5[7].replace(/\./g, "").replace(",", "."),
        );

        console.log(
          `\n✅ Item #${count} (Estratégia 5 - NCM espaçado + 2 preços):`,
        );
        console.log(`   Código: ${code}`);
        console.log(`   Descrição: ${description}`);
        console.log(`   NCM: ${ncm} (juntado: ${match5[3]} + ${match5[4]})`);
        console.log(`   Quantidade: ${quantity}`);
        console.log(
          `   Preço 1: ${match5[6]} | Preço 2: ${match5[7]} (usando Preço 2)`,
        );
        console.log(`   Preço Unit.: R$ ${unitPrice.toFixed(2)}`);

        if (code && description.length >= 3 && quantity > 0 && unitPrice > 0) {
          itemsMap.set(code, {
            productCode: code,
            description: description,
            quantity: quantity,
            unitPrice: unitPrice,
          });
          console.log(`   ✔️ Adicionado ao mapa`);
        }
      }
    }
  }

  // ESTRATÉGIA 6: Último recurso - captura linha por linha para itens complexos
  if (allBMatches && allBMatches.length > itemsMap.size) {
    console.log(
      `\n🔄 Estratégia 6 (ÚLTIMO RECURSO): Análise manual de itens restantes...`,
    );

    // Busca todos os códigos que começam com B
    const bCodePattern = /\bB\s+([\d.]+)/gi;
    let bMatch;

    while ((bMatch = bCodePattern.exec(text)) !== null) {
      const code = bMatch[1];

      if (!itemsMap.has(code)) {
        const startPos = bMatch.index;
        // Pega um contexto maior (500 caracteres)
        const context = text.substring(startPos, startPos + 500);

        // Tenta extrair manualmente os componentes
        // Formato esperado: B código descrição NCM(espaçado?) quantidade preço(s)

        // Remove o "B" e código do início
        let remaining = context
          .substring(context.indexOf(code) + code.length)
          .trim();

        // Tenta encontrar NCM (5 dígitos seguido de 3 dígitos com ou sem espaço)
        const ncmMatch = remaining.match(/(\d{5})\s+(\d{3})/);

        if (ncmMatch) {
          const ncmPos = remaining.indexOf(ncmMatch[0]);
          const description = remaining.substring(0, ncmPos).trim();

          // Pega o que vem depois do NCM
          const afterNCM = remaining
            .substring(ncmPos + ncmMatch[0].length)
            .trim();

          // Tenta extrair: quantidade + preços
          const valuesMatch = afterNCM.match(
            /(\d{1,5})\s+([\d.,]+)\s+([\d.,]+)/,
          );

          if (valuesMatch && description.length >= 5) {
            const quantity = parseInt(valuesMatch[1], 10);
            const unitPrice = parseFloat(
              valuesMatch[3].replace(/\./g, "").replace(",", "."),
            );

            if (quantity > 0 && unitPrice > 0) {
              count++;
              const cleanDescription = description
                .replace(/\s+/g, " ")
                .substring(0, 150)
                .trim();

              console.log(`\n✅ Item #${count} (Estratégia 6 - manual):`);
              console.log(`   Código: ${code}`);
              console.log(`   Descrição: ${cleanDescription}`);
              console.log(`   NCM: ${ncmMatch[1]}${ncmMatch[2]}`);
              console.log(`   Quantidade: ${quantity}`);
              console.log(
                `   Preço 1: ${valuesMatch[2]} | Preço 2: ${valuesMatch[3]}`,
              );
              console.log(`   Preço Unit.: R$ ${unitPrice.toFixed(2)}`);

              itemsMap.set(code, {
                productCode: code,
                description: cleanDescription,
                quantity: quantity,
                unitPrice: unitPrice,
              });
              console.log(`   ✔️ Adicionado ao mapa`);
            }
          }
        }
      }
    }
  }

  console.log(`\n📊 BLUMENAU Total extraído: ${itemsMap.size} itens`);

  // Se ainda falta itens, mostra mais informações para debug
  if (allBMatches && allBMatches.length > itemsMap.size) {
    console.log(`\n⚠️ FALTAM ${allBMatches.length - itemsMap.size} ITENS!`);
    console.log(
      `🔍 Total esperado: ${allBMatches.length} | Capturados: ${itemsMap.size}`,
    );
    console.log('🔍 Analisando os padrões "B" não capturados (máx 10)...');

    let notCaptured = 0;
    const bPattern = /\bB\s+([\d.]{6,12})/gi;
    let bMatch;

    while ((bMatch = bPattern.exec(text)) !== null && notCaptured < 10) {
      const code = bMatch[1];
      if (!itemsMap.has(code)) {
        notCaptured++;
        const startPos = bMatch.index;
        const context = text
          .substring(startPos, startPos + 300)
          .replace(/\n/g, " ");
        console.log(`\n   🔴 #${notCaptured} - Código não capturado: ${code}`);
        console.log(`      Contexto: ${context.substring(0, 250)}...`);

        // Tenta identificar o problema
        const hasNCM = /\d{8}|\d{5}[\-\s]\d{3}/.test(context);
        const hasQuantity = /\s\d{1,5}\s/.test(context);
        const hasPrice = /[\d.,]+/.test(context);

        console.log(
          `      ✓ NCM: ${hasNCM} | Quantity: ${hasQuantity} | Price: ${hasPrice}`,
        );
      }
    }

    // Sugestão específica se ainda falta itens
    if (notCaptured > 0) {
      console.log(
        `\n💡 DICA: Verifique se os ${notCaptured} itens acima têm formato diferente`,
      );
      console.log("   - NCM em formato diferente?");
      console.log("   - Descrição muito longa/curta?");
      console.log("   - Espaçamento diferente?");
    }
  }

  // Se não encontrou nada, mostra mais informações para debug
  if (itemsMap.size === 0) {
    console.log("\n⚠️ NENHUM ITEM EXTRAÍDO!");
    console.log('🔍 Procurando padrões "B" no texto...');

    const bMatches = text.match(/\bB\s+[\d.]{6,12}/g);
    if (bMatches) {
      console.log(`   Encontrados ${bMatches.length} padrões "B + código":`);
      bMatches.slice(0, 5).forEach((m) => console.log(`   - ${m}`));
    } else {
      console.log('   ❌ Nenhum padrão "B + código" encontrado');
    }

    console.log("\n🔍 Procurando códigos NCM no texto...");
    const ncmMatches = text.match(/\d{8}|\d{5}[\-\s]\d{3}/g);
    if (ncmMatches) {
      console.log(`   Encontrados ${ncmMatches.length} possíveis NCMs:`);
      ncmMatches.slice(0, 5).forEach((m) => console.log(`   - ${m}`));
    }
  }

  return Array.from(itemsMap.values());
}

// ===========================
// 📄 EXTRAÇÃO - ELGIN (DANFE)
// ===========================

function extractElgin(text) {
  console.log("🏭 smart_extractor: Usando lógica ELGIN (DANFE)");

  const items = [];
  const itemsMap = new Map();
  let count = 0;

  // Formato DANFE Elgin: Similar ao AVANT
  // Produto | Descrição | NCM | CST | CFOP | UN | Quantidade | Valor Unit | Valor Total

  // Encontra início da tabela de produtos
  const danfeHeaderEnd = Math.max(
    text.indexOf("DADOS DO PRODUTO"),
    text.indexOf("DESCRIÇÃO DO PROD"),
    text.indexOf("CÓDIGO"),
    text.indexOf("NCM"),
    text.indexOf("PROD"),
  );

  const productText =
    danfeHeaderEnd > 0 ? text.substring(danfeHeaderEnd) : text;
  console.log(`📄 Preview ELGIN: ${productText.substring(0, 250)}...`);

  // Conta códigos válidos: devem ter pelo menos 1 dígito E 1 letra (não apenas letras)
  const allCodesMatches = productText.match(
    /\b(?=.*\d)(?=.*[A-Z])[A-Z0-9]{8,15}\b/gi,
  );
  console.log(
    `\n🔍 Total de códigos válidos encontrados: ${allCodesMatches ? allCodesMatches.length : 0}`,
  );

  // ESTRATÉGIA 1: Código + Descrição + NCM com pontos + CST + CFOP + Unidade (UN/PC/KG) + valores
  // Exemplo: "52BNL0000010 Barram. Neutro c Sup. Lateral - 10P 8544.49.00 100 5102 UN 5,000 4,450000 22,25"
  // Ou: "48BLED2F09YU Lampada Bulbo Led 9W Bivolt 6500K 8539.52.00 100 5102 PC 5.000,000 1,350000"
  // Código deve ter pelo menos 1 dígito E 1 letra
  const elginPattern1 =
    /\b((?=.*\d)(?=.*[A-Z])[A-Z0-9]{8,15})\s+([A-Za-zÀ-ÿ].{10,150}?)\s+(\d{4}\.\d{2}\.\d{2})\s+[\d.]+\s+[\d.]+\s+[A-Z]{2,3}\s+([\d.,]+)\s+([\d.,]+)/gi;

  let match;
  while ((match = elginPattern1.exec(productText)) !== null) {
    const code = match[1];

    if (!itemsMap.has(code)) {
      count++;
      let description = match[2].trim().replace(/\s+/g, " ").substring(0, 200);
      const ncm = match[3];
      const qtyRaw = match[4];
      const priceRaw = match[5];

      // Converte valores (formato brasileiro: 24.000,000 ou 1.150000)
      const quantity = parseFloat(qtyRaw.replace(/\./g, "").replace(",", "."));
      const unitPrice = parseFloat(
        priceRaw.replace(/\./g, "").replace(",", "."),
      );

      console.log(`\n✅ Item #${count} (Estratégia 1 - ELGIN):`);
      console.log(`   Código: ${code}`);
      console.log(`   Descrição: ${description}`);
      console.log(`   NCM: ${ncm}`);
      console.log(`   Quantidade: ${quantity}`);
      console.log(`   Preço Unit.: R$ ${unitPrice.toFixed(2)}`);

      if (quantity > 0 && unitPrice > 0) {
        itemsMap.set(code, {
          productCode: code,
          description: description,
          quantity: quantity,
          unitPrice: unitPrice,
        });
        console.log(`   ✔️ Adicionado ao mapa`);
      }
    }
  }

  console.log(`\n📊 Estratégia 1: ${itemsMap.size} itens`);

  // ESTRATÉGIA 2: Código + Descrição + NCM sem pontos + Unidade + valores
  if (allCodesMatches && allCodesMatches.length > itemsMap.size) {
    console.log(`\n🔄 Estratégia 2: Tentando NCM sem pontos...`);

    const elginPattern2 =
      /\b((?=.*\d)(?=.*[A-Z])[A-Z0-9]{8,15})\s+([A-Za-zÀ-ÿ].{10,150}?)\s+(\d{8})\s+[\d.]+\s+[\d.]+\s+[A-Z]{2,3}\s+([\d.,]+)\s+([\d.,]+)/gi;
    let match2;

    while ((match2 = elginPattern2.exec(productText)) !== null) {
      const code = match2[1];

      if (!itemsMap.has(code)) {
        count++;
        let description = match2[2]
          .trim()
          .replace(/\s+/g, " ")
          .substring(0, 200);
        const ncm = match2[3];
        const quantity = parseFloat(
          match2[4].replace(/\./g, "").replace(",", "."),
        );
        const unitPrice = parseFloat(
          match2[5].replace(/\./g, "").replace(",", "."),
        );

        console.log(`\n✅ Item #${count} (Estratégia 2 - ELGIN):`);
        console.log(`   Código: ${code}`);
        console.log(`   Descrição: ${description}`);
        console.log(`   NCM: ${ncm}`);
        console.log(`   Quantidade: ${quantity}`);
        console.log(`   Preço Unit.: R$ ${unitPrice.toFixed(2)}`);

        if (quantity > 0 && unitPrice > 0) {
          itemsMap.set(code, {
            productCode: code,
            description: description,
            quantity: quantity,
            unitPrice: unitPrice,
          });
          console.log(`   ✔️ Adicionado ao mapa`);
        }
      }
    }
  }

  console.log(`\n📊 Estratégia 2: ${itemsMap.size} itens totais`);
  console.log(`\n📊 Estratégia 2: ${itemsMap.size} itens totais`);

  // ESTRATÉGIA 3: Análise linha por linha (fallback para itens complexos)
  if (allCodesMatches && allCodesMatches.length > itemsMap.size) {
    console.log(`\n🔄 Estratégia 3: Análise linha por linha...`);

    const lines = productText.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Busca por código alfanumérico no início da linha (deve ter dígito E letra)
      const codeMatch = line.match(/^\s*((?=.*\d)(?=.*[A-Z])[A-Z0-9]{8,15})\s/);

      if (codeMatch) {
        const code = codeMatch[1];

        if (!itemsMap.has(code)) {
          // Pega contexto (3 linhas)
          const contextLines = lines.slice(
            Math.max(0, i),
            Math.min(i + 3, lines.length),
          );
          const context = contextLines.join(" ");

          // Busca por NCM (formato: 9999.99.99 ou 99999999)
          const ncmMatch = context.match(/\b(\d{4}\.\d{2}\.\d{2}|\d{8})\b/);

          if (ncmMatch) {
            const ncm = ncmMatch[1];

            // Extrai descrição (entre código e NCM)
            const beforeNCM = context.substring(
              context.indexOf(code) + code.length,
              context.indexOf(ncm),
            );
            const description = beforeNCM
              .trim()
              .replace(/\s+/g, " ")
              .substring(0, 200);

            // Extrai quantidade e preço (depois do NCM)
            const afterNCM = context.substring(
              context.indexOf(ncm) + ncm.length,
            );
            // Formato: CST + CFOP + Unidade (UN/PC/KG) + quantidade + preço
            // Exemplo: "100 5102 UN 5,000 4,450000 22,25" ou "100 5102 PC 5.000,000 1,350000"
            const valuesPattern =
              /[\d.]+\s+[\d.]+\s+[A-Z]{2,3}\s+([\d.,]+)\s+([\d.,]+)/;
            const valuesMatch = afterNCM.match(valuesPattern);

            if (valuesMatch && description.length >= 5) {
              const quantity = parseFloat(
                valuesMatch[1].replace(/\./g, "").replace(",", "."),
              );
              const unitPrice = parseFloat(
                valuesMatch[2].replace(/\./g, "").replace(",", "."),
              );

              if (quantity > 0 && unitPrice > 0) {
                count++;
                console.log(
                  `\n✅ Item #${count} (Estratégia 3 - ELGIN linha):`,
                );
                console.log(`   Código: ${code}`);
                console.log(`   Descrição: ${description}`);
                console.log(`   NCM: ${ncm}`);
                console.log(`   Quantidade: ${quantity}`);
                console.log(`   Preço Unit.: R$ ${unitPrice.toFixed(2)}`);

                itemsMap.set(code, {
                  productCode: code,
                  description: description,
                  quantity: quantity,
                  unitPrice: unitPrice,
                });
                console.log(`   ✔️ Adicionado ao mapa`);
              }
            }
          }
        }
      }
    }
  }

  console.log(`\n📊 ELGIN Total extraído: ${itemsMap.size} itens`);

  // Debug de itens não capturados (apenas códigos alfanuméricos válidos)
  if (allCodesMatches && allCodesMatches.length > itemsMap.size) {
    console.log(
      `\n⚠️ FALTAM ${allCodesMatches.length - itemsMap.size} ITENS ELGIN!`,
    );
    console.log(
      `🔍 Total esperado: ${allCodesMatches.length} | Capturados: ${itemsMap.size}`,
    );
    console.log(
      "🔍 Analisando códigos não capturados (somente alfanuméricos com dígitos, máx 10)...",
    );

    let notCaptured = 0;
    const codePattern = /\b((?=.*\d)(?=.*[A-Z])[A-Z0-9]{8,15})\b/gi;
    let codeMatch;
    const seenCodes = new Set();

    while (
      (codeMatch = codePattern.exec(productText)) !== null &&
      notCaptured < 10
    ) {
      const code = codeMatch[1];

      // Verifica se é código válido: tem dígitos E letras
      const hasDigits = /\d/.test(code);
      const hasLetters = /[A-Z]/i.test(code);

      if (
        !itemsMap.has(code) &&
        hasDigits &&
        hasLetters &&
        !seenCodes.has(code)
      ) {
        seenCodes.add(code);
        notCaptured++;
        const startPos = codeMatch.index;
        const context = productText
          .substring(startPos, startPos + 250)
          .replace(/\n/g, " ");
        console.log(`\n   🔴 #${notCaptured} - Código não capturado: ${code}`);
        console.log(`      Contexto: ${context}...`);
      }
    }

    if (notCaptured === 0) {
      console.log(
        "   ✅ Nenhum código alfanumérico adicional encontrado (possível problema de formatação)",
      );
    }
  }

  return Array.from(itemsMap.values());
}

// ===========================
// 📄 EXTRAÇÃO - GENÉRICA
// ===========================

function extractGeneric(text) {
  console.log("🏭 smart_extractor: Usando lógica GENÉRICA");

  const items = [];
  const itemsMap = new Map();
  // ESTRATÉGIA 1: Buscar por códigos de 8-9 dígitos (padrão mais comum)
  // ========================================

  // Busca genérica básica por códigos
  const codePattern = /\b(\d{7,9})\b/g;
  let match;

  while ((match = codePattern.exec(text)) !== null) {
    const code = match[1];
    const codeIndex = text.indexOf(code);
    const context = text.substring(codeIndex, codeIndex + 300);

    // Tenta extrair descrição e preço
    const descMatch = context.match(/\s+([A-Za-zÀ-ÿ\s\-]{10,100}?)\s+/);
    const priceMatch = context.match(/(\d{1,4})\s+([\d,.]+)/);

    if (descMatch && priceMatch) {
      const description = descMatch[1].trim();
      const quantity = parseInt(priceMatch[1]) || 1;
      const unitPrice =
        parseFloat(priceMatch[2].replace(/\./g, "").replace(",", ".")) || 0;

      if (quantity > 0 && unitPrice > 0 && !itemsMap.has(code)) {
        itemsMap.set(code, {
          productCode: code,
          description: description.substring(0, 200),
          quantity: quantity,
          unitPrice: unitPrice,
        });
      }
    }
  }

  return Array.from(itemsMap.values());
}

// ===========================
// 🔄 FUNÇÃO PRINCIPAL
// ===========================

async function extractFromAnyText(text) {
  console.log("🧠 smart_extractor: iniciando extração...");

  if (!text || text.length < 50) {
    console.log("⚠️ smart_extractor: texto muito curto ou vazio");
    return [];
  }

  // ✅ DETECTA FORNECEDOR
  const supplier = detectSupplier(text);
  console.log(`🏭 Fornecedor detectado: ${supplier}`);

  // ✅ DIRECIONA PARA EXTRAÇÃO ESPECÍFICA
  let items = [];

  switch (supplier) {
    case "AVANT":
      items = extractAvant(text);
      break;
    case "BLUMENAU":
      items = extractBlumenau(text);
      break;
    case "ELGIN":
      items = extractElgin(text);
      break;
    default:
      items = extractGeneric(text);
  }

  console.log(
    `✅ smart_extractor: ${items.length} produtos extraídos com lógica ${supplier}`,
  );

  if (items.length > 0) {
    console.log("📊 Primeiros itens:");
    items.slice(0, 3).forEach((item, i) => {
      console.log(
        `   ${i + 1}. ${item.productCode} - ${item.description.substring(0, 40)}...`,
      );
    });
  }

  return items;
}

module.exports = {
  extractFromAnyText,
  extractProducts: extractFromAnyText, // Alias para compatibilidade
};
