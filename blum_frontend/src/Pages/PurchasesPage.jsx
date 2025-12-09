import { useState, useEffect } from "react";
import apiService from "../services/apiService";
import LoadingSpinner from "../components/LoadingSpinner";
import VerificationTable from "../components/common/VerificationTable";
import UploadSection from "../components/common/UploadSection";
import PurchaseTabs from "../components/purchases/PurchaseTabs";
import PurchaseDateSection from "../components/purchases/PurchaseDateSection";
import PurchaseActions from "../components/purchases/PurchaseActions";

// ✅ HOOK PERSONALIZADO PARA LÓGICA DE COMPRAS
const usePurchaseLogic = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedItems, setParsedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userProducts, setUserProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Carrega dados iniciais
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [productsResponse, brandsData] = await Promise.all([
          apiService.getProducts(),
          apiService.getBrands(),
        ]);

        // ✅ COMPATIBILIDADE: Verifica se tem paginação ou array direto
        const productsData = productsResponse?.data || productsResponse;
        
        setUserProducts(productsData);
        setBrands(brandsData);

        if (brandsData.length > 0) {
          const firstBrand = brandsData[0];
          if (firstBrand && firstBrand.id) {
            setSelectedBrandId(String(firstBrand.id));
          }
        }
      } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
      }
    };
    fetchUserData();
  }, []);

  return {
    selectedFile,
    setSelectedFile,
    parsedItems,
    setParsedItems,
    isLoading,
    setIsLoading,
    error,
    setError,
    userProducts,
    setUserProducts,
    brands,
    selectedBrandId,
    setSelectedBrandId,
    purchaseDate,
    setPurchaseDate,
  };
};

// ✅ COMPONENTE CSV IMPORT COMPLETO - CORRIGIDO
const CsvImportSection = ({ purchaseLogic }) => {
  const {
    isLoading,
    setIsLoading,
    error,
    setError,
    userProducts,
    setUserProducts,
    brands,
    purchaseDate,
    setPurchaseDate,
  } = purchaseLogic;

  const [csvFile, setCsvFile] = useState(null);
  const [parsedCsvItems, setParsedCsvItems] = useState([]);
  const [selectedCsvBrandId, setSelectedCsvBrandId] = useState("");
  const [isCsvProcessing, setIsCsvProcessing] = useState(false);

  // ✅ Inicializar com a primeira marca
  useEffect(() => {
    if (brands.length > 0 && !selectedCsvBrandId) {
      setSelectedCsvBrandId(String(brands[0].id));
    }
  }, [brands, selectedCsvBrandId]);

  // ✅ Função para processar CSV (DEFINIDA ANTES DE SER USADA)
  // ✅ CORREÇÃO: Atualize a função handleCsvProcess para buscar por subcódigo
const handleCsvProcess = async () => {
  console.log("🔄 [DEBUG] Iniciando processamento CSV...");
  console.log("📁 [DEBUG] Arquivo selecionado:", csvFile);
  console.log("🏷️ [DEBUG] Brand ID selecionado:", selectedCsvBrandId);

  if (!csvFile) {
    setError("Por favor, selecione um arquivo CSV.");
    return;
  }

  if (!selectedCsvBrandId) {
    setError("Por favor, selecione uma Representada para os produtos.");
    return;
  }

  setIsCsvProcessing(true);
  setError(null);

  try {
    const formData = new FormData();
    formData.append("productsCsv", csvFile);

    console.log("🔄 [DEBUG] Enviando para API...");

    const itemsFromAI = await apiService.processPurchaseCsv(formData);

    console.log("✅ [DEBUG] Resposta da API:", itemsFromAI);

    // ✅ VALIDAÇÃO CRÍTICA
    if (!itemsFromAI || !Array.isArray(itemsFromAI)) {
      throw new Error("Nenhum dado válido retornado do servidor");
    }

    console.log(`✅ [DEBUG] ${itemsFromAI.length} itens para verificação`);

const preMappedItems = itemsFromAI.map((item, index) => {
  // Garantir campos mínimos
  const safeItem = {
    productCode: item.productCode || item.codigo || `CODE_${index + 1}`,
    description: item.description || item.nome || `Produto ${index + 1}`,
    quantity: Number(item.quantity || item.estoque || item.stock || 1),
    unitPrice: Number(item.unitPrice || item.preco || item.price || 0),
    // ✅ INICIALMENTE: subcode vazio (será preenchido se produto existir)
    subcode: "", // ← COMEÇA VAZIO
    ...item,
  };

  // ✅ BUSCA INTELIGENTE
  let foundProduct = null;
  let matchType = 'none';
  
  // 1. Busca por PRODUCTCODE (mais confiável)
  if (safeItem.productCode && safeItem.productCode.trim() !== '') {
    foundProduct = userProducts.find(
      (p) => p.productcode && p.productcode.trim() === safeItem.productCode.trim()
    );
    if (foundProduct) {
      matchType = 'productcode';
      console.log(`✅ ENCONTRADO por PRODUCTCODE: ${safeItem.productCode} -> ${foundProduct.name}`);
    }
  }
  
  // 2. Busca por NOME (backup)
  if (!foundProduct && safeItem.description) {
    const searchName = safeItem.description.toLowerCase().substring(0, 25);
    foundProduct = userProducts.find(
      (p) => p.name && p.name.toLowerCase().includes(searchName)
    );
    if (foundProduct) {
      matchType = 'name';
      console.log(`✅ ENCONTRADO por NOME: ${searchName} -> ${foundProduct.name}`);
    }
  }

  // ✅ CORREÇÃO CRÍTICA: SE ENCONTROU PRODUTO, USA O SUBCÓDIGO DO BANCO
  if (foundProduct) {
    safeItem.subcode = foundProduct.subcode || ""; // ← PEGA O SUBCÓDIGO DO BANCO
    console.log(`🎯 SUBCÓDIGO DO BANCO: "${foundProduct.subcode}" para produto ${foundProduct.name}`);
  }

  return {
    ...safeItem,
    id: index,
    mappedProductId: foundProduct ? foundProduct.id : "",
    isNewProduct: !foundProduct,
    matchType: matchType,
    foundProductInfo: foundProduct ? {
      id: foundProduct.id,
      name: foundProduct.name,
      productcode: foundProduct.productcode,
      subcode: foundProduct.subcode, 
      price: foundProduct.price
    } : null
  };
});
    console.log("✅ [DEBUG] Todos os itens mapeados:", preMappedItems);

    if (preMappedItems.length === 0) {
      throw new Error("Nenhum item válido encontrado no CSV");
    }

    // ✅ DEBUG: Estatísticas de match
    const matchStats = {
      subcode: preMappedItems.filter(item => item.matchType === 'subcode').length,
      productcode: preMappedItems.filter(item => item.matchType === 'productcode').length,
      name: preMappedItems.filter(item => item.matchType === 'name').length,
      none: preMappedItems.filter(item => item.matchType === 'none').length
    };
    
    console.log("📊 Estatísticas de match:", matchStats);

    setParsedCsvItems(preMappedItems);
  } catch (err) {
    console.error("❌ Erro no processamento CSV:", err);
    setError(
      err.message ||
        "Falha ao processar o CSV. Verifique o formato do arquivo e tente novamente."
    );
  } finally {
    setIsCsvProcessing(false);
  }
};

  // ✅ Função para atualizar itens (igual ao PDF)
  const handleCsvItemChange = (index, field, value) => {
    setParsedCsvItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
        ...(field === "mappedProductId" && { isNewProduct: !value }),
      };
      return updated;
    });
  };

  // ✅ Função para confirmar importação do CSV
  const handleCsvConfirmPurchase = async () => {
    // Validações
    if (!selectedCsvBrandId) {
      alert("Erro: Selecione uma Representada para os produtos.");
      return;
    }

    const missingSubcodes = parsedCsvItems.filter(
      (item) => !item.subcode || item.subcode.trim() === ""
    );
    if (missingSubcodes.length > 0) {
      alert("Erro: Todos os itens devem ter um subcódigo preenchido.");
      return;
    }

    const subcodes = parsedCsvItems.map((item) => item.subcode.trim());
    const duplicateSubcodes = subcodes.filter(
      (code, index) => subcodes.indexOf(code) !== index
    );
    if (duplicateSubcodes.length > 0) {
      alert(
        `Erro: Subcódigos duplicados encontrados: ${duplicateSubcodes.join(
          ", "
        )}`
      );
      return;
    }

    const invalidItems = parsedCsvItems.filter(
      (item) => !item.quantity || item.unitPrice == null || item.unitPrice <= 0
    );

    if (invalidItems.length > 0) {
      alert(
        "Erro: Todos os itens devem ter quantidade e preço unitário válidos."
      );
      return;
    }

    // Confirmação
    const newProductsCount = parsedCsvItems.filter(
      (item) => item.isNewProduct
    ).length;
    const selectedBrand = brands.find((b) => b.id === selectedCsvBrandId);

    if (newProductsCount > 0) {
      const confirmMessage =
        `⚠️ ATENÇÃO!\n\n` +
        `${newProductsCount} produtos NÃO EXISTEM no seu catálogo e serão CRIADOS AUTOMATICAMENTE.\n\n` +
        `• Produtos existentes: ${parsedCsvItems.length - newProductsCount}\n` +
        `• Novos produtos: ${newProductsCount}\n` +
        `• Representada: ${selectedBrand?.name || "Não selecionada"}\n` +
        `• Data da compra: ${purchaseDate}\n\n` +
        `Deseja continuar?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        brandId: selectedCsvBrandId,
        purchaseDate: purchaseDate,
        items: parsedCsvItems.map((item) => ({
          mappedProductId: item.mappedProductId || "",
          productCode: item.productCode,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subcode: item.subcode.trim(),
        })),
      };

      console.log("📤 Payload CSV enviado para API:", payload);

      // ✅ Usar a função específica para CSV
      const result = await apiService.finalizePurchaseFromCsv(payload);

      alert(
        `✅ ${result.message}\n\n` +
          `📦 Resumo da Importação:\n` +
          `• ${
            parsedCsvItems.length - newProductsCount
          } produtos atualizados\n` +
          `• ${newProductsCount} novos produtos criados\n` +
          `• Representada: ${selectedBrand?.name}\n` +
          `• Data da compra: ${purchaseDate}\n` +
          `• Subcódigos aplicados: ${parsedCsvItems.length}`
      );

      // Limpa a tela
      setParsedCsvItems([]);
      setCsvFile(null);

      // Recarrega produtos
      const productsResponse = await apiService.getProducts();
      const updatedProducts = productsResponse?.data || productsResponse;
      setUserProducts(updatedProducts);
    } catch (err) {
      console.error("💥 Erro ao confirmar importação CSV:", err);
      setError(err.message || "Ocorreu um erro ao processar a importação.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Componente de Resumo de Novos Produtos
  const NewProductsSummary = ({ items, selectedBrand }) => {
    const newProducts = items.filter((item) => item.isNewProduct);

    if (newProducts.length === 0) return null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-center mb-3">
          <span className="text-blue-600 font-bold text-lg flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Novos Produtos Detectados
          </span>
        </div>
        <p className="text-blue-700 mb-3">
          {newProducts.length} produtos não existem no seu catálogo e serão
          criados automaticamente na Representada{" "}
          <strong className="text-blue-800">
            {selectedBrand?.name || "Não selecionada"}
          </strong>
          :
        </p>
        <div className="max-h-40 overflow-y-auto bg-white rounded-lg p-3 border border-blue-100">
          {newProducts.map((item, index) => (
            <div
              key={index}
              className="text-sm text-blue-600 py-2 border-b border-blue-50 last:border-b-0 flex items-start"
            >
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-2 mt-0.5 flex-shrink-0">
                {index + 1}
              </span>
              <div>
                <strong className="text-blue-800">{item.productCode}</strong> -{" "}
                {item.description}
                {item.subcode && (
                  <span className="text-green-600 ml-2">
                    [Subcódigo: {item.subcode}]
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ✅ Debug visual
  console.log(
    "🎯 [RENDER] CsvImportSection - parsedCsvItems:",
    parsedCsvItems.length
  );

  // ✅ Renderização condicional igual ao PDF
  return (
    <>
      {parsedCsvItems.length === 0 ? (
        // ✅ TELA DE UPLOAD (igual ao PDF)
        <UploadSection
          onFileChange={(e) => setCsvFile(e.target.files[0])}
          selectedFile={csvFile}
          onUpload={handleCsvProcess}
          isLoading={isCsvProcessing}
          error={error}
          brands={brands}
          selectedBrandId={selectedCsvBrandId}
          onBrandChange={(e) => setSelectedCsvBrandId(e.target.value)}
          title="Importar Produtos do CSV"
          description="Envie o arquivo CSV do seu fornecedor para importar os produtos em lote."
          accept=".csv"
          fileType="CSV"
        />
      ) : (
        // ✅ TELA DE VERIFICAÇÃO (igual ao PDF)
        <>
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
            <h3 className="text-green-800 font-bold text-lg">
              ✅ CSV Processado com Sucesso!
            </h3>
            <p className="text-green-700">
              {parsedCsvItems.length} itens encontrados. Verifique e confirme os
              dados abaixo.
            </p>
          </div>

          <PurchaseDateSection
            date={purchaseDate}
            onDateChange={setPurchaseDate}
          />

          <NewProductsSummary
            items={parsedCsvItems}
            selectedBrand={brands.find((b) => b.id === selectedCsvBrandId)}
          />

          <VerificationTable
            items={parsedCsvItems}
            onItemChange={handleCsvItemChange}
            userProducts={userProducts}
            title="Verifique os Itens do CSV"
            description="Mapeie os itens para produtos existentes e insira o subcódigo obrigatório para cada produto."
            source="CSV"
          />

          <PurchaseActions
            onCancel={() => {
              setParsedCsvItems([]);
              setCsvFile(null);
            }}
            onConfirm={handleCsvConfirmPurchase}
            isLoading={isLoading}
            confirmLabel="Confirmar e Importar Produtos"
          />
        </>
      )}
    </>
  );
};

// ✅ COMPONENTE PRINCIPAL REFATORADO
const PurchasesPage = () => {
  const purchaseLogic = usePurchaseLogic();
  const [activeTab, setActiveTab] = useState("pdf");

  const {
    selectedFile,
    setSelectedFile,
    parsedItems,
    setParsedItems,
    isLoading,
    setIsLoading,
    error,
    setError,
    userProducts,
    setUserProducts,
    brands,
    selectedBrandId,
    setSelectedBrandId,
    purchaseDate,
    setPurchaseDate,
  } = purchaseLogic;

  // ✅ FUNÇÃO handleItemChange PARA PDF (CORRIGIDA - NO LUGAR CERTO)
  const handleItemChange = (index, field, value) => {
    setParsedItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
        ...(field === "mappedProductId" && { isNewProduct: !value }),
      };
      return updated;
    });
  };

  const handlePdfUpload = async () => {
    console.log("🔄 [PDF DEBUG] Iniciando upload...");
    console.log("📁 [PDF DEBUG] Arquivo:", selectedFile?.name);
    console.log("🏷️ [PDF DEBUG] Brand ID:", selectedBrandId);

    if (!selectedFile) {
      setError("Por favor, selecione um arquivo PDF.");
      return;
    }

    if (!selectedBrandId) {
      setError("Por favor, selecione uma Representada para os produtos.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setParsedItems([]);

    try {
      const formData = new FormData();
      formData.append("purchasePdf", selectedFile);

      console.log("📤 Enviando PDF para processamento...");

      const itemsFromAI = await apiService.processPurchasePdf(formData);

      console.log("✅ PDF processado com sucesso:", itemsFromAI);

      // Pré-mapeia os produtos existentes
      const preMappedItems = itemsFromAI.map((item, index) => {
        const foundProduct = userProducts.find(
          (p) =>
            p.productcode === item.productCode ||
            p.name
              .toLowerCase()
              .includes(item.description.toLowerCase().substring(0, 15))
        );
        return {
          ...item,
          mappedProductId: foundProduct ? foundProduct.id : "",
          isNewProduct: !foundProduct,
          subcode: "",
        };
      });

      setParsedItems(preMappedItems);
    } catch (err) {
      console.error("❌ Erro ao processar PDF:", err);
      setError(
        "Falha ao processar o PDF. Verifique o arquivo e tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfConfirm = async () => {
    // Validações
    if (!selectedBrandId) {
      alert("Erro: Selecione uma Representada para os produtos.");
      return;
    }

    const missingSubcodes = parsedItems.filter(
      (item) => !item.subcode || item.subcode.trim() === ""
    );
    if (missingSubcodes.length > 0) {
      alert("Erro: Todos os itens devem ter um subcódigo preenchido.");
      return;
    }

    const subcodes = parsedItems.map((item) => item.subcode.trim());
    const duplicateSubcodes = subcodes.filter(
      (code, index) => subcodes.indexOf(code) !== index
    );
    if (duplicateSubcodes.length > 0) {
      alert(
        `Erro: Subcódigos duplicados encontrados: ${duplicateSubcodes.join(
          ", "
        )}`
      );
      return;
    }

    const invalidItems = parsedItems.filter(
      (item) => !item.quantity || item.unitPrice == null || item.unitPrice <= 0
    );

    if (invalidItems.length > 0) {
      alert(
        "Erro: Todos os itens devem ter quantidade e preço unitário válidos."
      );
      return;
    }

    // Confirmação
    const newProductsCount = parsedItems.filter(
      (item) => item.isNewProduct
    ).length;
    const selectedBrand = brands.find((b) => b.id === selectedBrandId);

    if (newProductsCount > 0) {
      const confirmMessage =
        `⚠️ ATENÇÃO!\n\n` +
        `${newProductsCount} produtos NÃO EXISTEM no seu catálogo e serão CRIADOS AUTOMATICAMENTE.\n\n` +
        `• Produtos existentes: ${parsedItems.length - newProductsCount}\n` +
        `• Novos produtos: ${newProductsCount}\n` +
        `• Representada: ${selectedBrand?.name || "Não selecionada"}\n` +
        `• Data da compra: ${purchaseDate}\n\n` +
        `Deseja continuar?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        brandId: selectedBrandId,
        purchaseDate: purchaseDate,
        items: parsedItems.map((item) => ({
          mappedProductId: item.mappedProductId || "",
          productCode: item.productCode,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subcode: item.subcode.trim(),
        })),
      };

      console.log("📤 Payload PDF enviado para API:", payload);

      const result = await apiService.finalizePurchaseFromPdf(payload);

      alert(
        `✅ ${result.message}\n\n` +
          `📦 Resumo:\n` +
          `• ${parsedItems.length - newProductsCount} produtos atualizados\n` +
          `• ${newProductsCount} novos produtos criados\n` +
          `• Representada: ${selectedBrand?.name}\n` +
          `• Data da compra: ${purchaseDate}\n` +
          `• Subcódigos aplicados: ${parsedItems.length}`
      );

      // Limpa a tela
      setParsedItems([]);
      setSelectedFile(null);

      // Recarrega produtos
      const productsResponse = await apiService.getProducts();
      const updatedProducts = productsResponse?.data || productsResponse;
      setUserProducts(updatedProducts);
    } catch (err) {
      console.error("💥 Erro ao processar PDF:", err);
      setError(err.message || "Ocorreu um erro ao processar o PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <span className="mr-3">🛒</span>
            Gestão de Compras
          </h1>
          <p className="text-gray-600">
            Importe e gerencie suas compras de forma eficiente
          </p>
        </div>

        {/* Abas */}
        <PurchaseTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Conteúdo */}
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <LoadingSpinner />
              <p className="mt-4 text-gray-600">
                Processando sua solicitação...
              </p>
            </div>
          </div>
        ) : activeTab === "csv" ? (
          <CsvImportSection purchaseLogic={purchaseLogic} />
        ) : parsedItems.length === 0 ? (
          <UploadSection
            onFileChange={(e) => setSelectedFile(e.target.files[0])}
            selectedFile={selectedFile}
            onUpload={handlePdfUpload}
            isLoading={isLoading}
            error={error}
            brands={brands}
            selectedBrandId={selectedBrandId}
            onBrandChange={(e) => setSelectedBrandId(e.target.value)}
          />
        ) : (
          <>
            {/* ✅ MENSAGEM DE SUCESSO VERDE - IGUAL AO CSV */}
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
              <h3 className="text-green-800 font-bold text-lg">
                ✅ PDF Processado com Sucesso!
              </h3>
              <p className="text-green-700">
                {parsedItems.length} itens encontrados. Verifique e confirme os dados abaixo.
              </p>
            </div>

            <PurchaseDateSection
              date={purchaseDate}
              onDateChange={setPurchaseDate}
            />

            <VerificationTable
              items={parsedItems}
              onItemChange={handleItemChange}
              userProducts={userProducts}
            />

            <PurchaseActions
              onCancel={() => setParsedItems([])}
              onConfirm={handlePdfConfirm}
              isLoading={isLoading}
              confirmLabel="Confirmar e Atualizar Estoque"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PurchasesPage;
