import { useState, useEffect } from "react";
import apiService from "../services/apiService";
import LoadingSpinner from "../components/LoadingSpinner";

const PurchasesPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedItems, setParsedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userProducts, setUserProducts] = useState([]);
  const [showNewProducts, setShowNewProducts] = useState(false);
  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [activeTab, setActiveTab] = useState("pdf"); // "pdf" ou "csv"

  const handleItemChange = (index, field, value) => {
    setParsedItems((prevItems) => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
        // Se mudou o mapeamento, atualiza o status de novo produto
        ...(field === "mappedProductId" && {
          isNewProduct: !value,
        }),
      };
      return updatedItems;
    });
  };

  // Carrega os produtos do usuário
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [productsData, brandsData] = await Promise.all([
          apiService.getProducts(),
          apiService.getBrands(),
        ]);

        setUserProducts(productsData);
        setBrands(brandsData);

        // ✅ DEBUG DETALHADO DAS BRANDS
        console.log("🔍 Brands recebidas da API:", brandsData);

        if (brandsData.length > 0) {
          // ✅ VERIFICA A ESTRUTURA DE CADA BRAND
          brandsData.forEach((brand, index) => {
            console.log(`🔍 Brand ${index}:`, brand);
            console.log(`   - ID: ${brand.id} (tipo: ${typeof brand.id})`);
            console.log(`   - Name: ${brand.name}`);
            console.log(`   - Commission Rate: ${brand.commission_rate}`);
          });

          // ✅ SELECIONA A PRIMEIRA BRAND VÁLIDA
          const firstBrand = brandsData[0];
          if (firstBrand && firstBrand.id) {
            const brandId = String(firstBrand.id);
            setSelectedBrandId(brandId);
            console.log(
              "✅ Representada padrão definida:",
              brandId,
              "Nome:",
              firstBrand.name
            );
          } else {
            console.error(
              "❌ Primeira brand não tem estrutura válida:",
              firstBrand
            );
          }
        } else {
          console.warn("⚠️ Nenhuma Representada disponível");
        }
      } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
      }
    };
    fetchUserData();
  }, []);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Por favor, selecione um arquivo PDF.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setParsedItems([]);
    setShowNewProducts(false);

    try {
      const formData = new FormData();
      formData.append("purchasePdf", selectedFile);

      const itemsFromAI = await apiService.processPurchasePdf(formData);

      // Pré-mapeia os produtos existentes
      const preMappedItems = itemsFromAI.map((item) => {
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
        };
      });

      setParsedItems(preMappedItems);

      // Mostra quantos produtos novos serão criados
      const newProductsCount = preMappedItems.filter(
        (item) => !item.mappedProductId
      ).length;
      if (newProductsCount > 0) {
        setShowNewProducts(true);
      }
    } catch (err) {
      setError(
        "Falha ao processar o PDF. Verifique o arquivo e tente novamente."
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPurchase = async () => {
    console.log("🔄 Iniciando confirmação de compra...");
    console.log("📋 Itens a serem processados:", parsedItems);

    // ✅ VALIDAÇÃO ATUALIZADA - verifica também a Representada
    if (!selectedBrandId) {
      alert("Erro: Selecione uma Representada para os produtos.");
      return;
    }

    const invalidItems = parsedItems.filter(
      (item) => !item.quantity || item.unitPrice == null || item.unitPrice <= 0
    );

    if (invalidItems.length > 0) {
      console.error("❌ Itens inválidos encontrados:", invalidItems);
      alert(
        "Erro: Todos os itens devem ter quantidade e preço unitário válidos."
      );
      return;
    }

    // CONFIRMAÇÃO PARA NOVOS PRODUTOS
    const newProductsCount = parsedItems.filter(
      (item) => item.isNewProduct
    ).length;
    console.log("🔄 Iniciando confirmação de compra...");
    console.log("📋 Itens a serem processados:", parsedItems);

    // ✅ DEBUG DETALHADO
    console.log("🔍 DEBUG - Brand ID:", selectedBrandId);
    console.log("🔍 DEBUG - Tipo do Brand ID:", typeof selectedBrandId);
    console.log("🔍 DEBUG - Brands disponíveis:", brands);

    // ✅ VALIDAÇÃO ATUALIZADA - verifica também a Representada
    if (
      !selectedBrandId ||
      selectedBrandId === "" ||
      selectedBrandId === "NaN"
    ) {
      console.error("❌ Brand ID inválido:", selectedBrandId);
      alert("Erro: Selecione uma Representada válida para os produtos.");
      return;
    }
    if (newProductsCount > 0) {
      const selectedBrand = brands.find((b) => b.id === selectedBrandId);
      const confirmMessage =
        `⚠️ ATENÇÃO!\n\n` +
        `${newProductsCount} produtos NÃO EXISTEM no seu catálogo e serão CRIADOS AUTOMATICAMENTE.\n\n` +
        `• Produtos existentes: ${parsedItems.length - newProductsCount}\n` +
        `• Novos produtos: ${newProductsCount}\n` +
        `• Representada: ${selectedBrand?.name || "Não selecionada"}\n\n` +
        `Deseja continuar?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // ✅ PREPARA OS DADOS ATUALIZADOS - inclui brandId
      const payload = {
        brandId: selectedBrandId, // ✅ NOVO: ID da Representada selecionada
        items: parsedItems.map((item) => ({
          mappedProductId: item.mappedProductId || "",
          productCode: item.productCode,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      console.log("📤 Payload enviado para API:", payload);

      const result = await apiService.finalizePurchaseFromPdf(payload);

      console.log("✅ Resposta da API:", result);

      alert(
        `✅ ${result.message}\n\n` +
          `📦 Resumo:\n` +
          `• ${parsedItems.length - newProductsCount} produtos atualizados\n` +
          `• ${newProductsCount} novos produtos criados\n` +
          `• Representada: ${
            brands.find((b) => b.id === selectedBrandId)?.name
          }`
      );

      // Limpa a tela
      setParsedItems([]);
      setSelectedFile(null);
      setShowNewProducts(false);

      // Recarrega produtos
      const updatedProducts = await apiService.getProducts();
      setUserProducts(updatedProducts);
    } catch (err) {
      console.error("💥 Erro detalhado:", err);
      setError(err.message || "Ocorreu um erro ao processar a compra.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ COMPONENTE PARA MOSTRAR RESUMO DE NOVOS PRODUTOS
  const renderNewProductsSummary = () => {
    const newProducts = parsedItems.filter((item) => item.isNewProduct);
    const selectedBrand = brands.find((b) => b.id === selectedBrandId);

    if (newProducts.length === 0) return null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-center mb-3">
          <span className="text-blue-600 font-bold text-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Novos Produtos Detectados
          </span>
        </div>
        <p className="text-blue-700 mb-3">
          {newProducts.length} produtos não existem no seu catálogo e serão
          criados automaticamente na Representada{" "}
          <strong className="text-blue-800">{selectedBrand?.name || "Não selecionada"}</strong>:
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
                <strong className="text-blue-800">{item.productCode}</strong> - {item.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ✅ RENDERIZAÇÃO DA TABELA ATUALIZADA
  const renderVerificationTable = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Verifique os Itens Extraídos
        </h2>
        <p className="text-gray-600">
          Mapeie os itens para produtos existentes ou deixe em "Selecione um
          produto..." para criar novos produtos automaticamente.
        </p>
      </div>

      {/* RESUMO DE NOVOS PRODUTOS */}
      {renderNewProductsSummary()}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-2/5">
                Descrição (Extraído do PDF)
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-2/5">
                Mapear Para Produto Existente
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Qtd.*
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Preço Unit.*
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parsedItems.map((item, index) => (
              <tr 
                key={index} 
                className={`transition-colors duration-150 ${
                  item.isNewProduct 
                    ? "bg-blue-50 hover:bg-blue-100" 
                    : "hover:bg-gray-50"
                }`}
              >
                <td className="px-6 py-4 whitespace-normal align-top">
                  <p className="text-sm font-medium text-gray-900">
                    {item.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Código: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{item.productCode}</span>
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap align-top">
                  <select
                    value={item.mappedProductId}
                    onChange={(e) =>
                      handleItemChange(index, "mappedProductId", e.target.value)
                    }
                    className={`w-full p-2.5 border rounded-lg text-sm transition-colors focus:ring-2 focus:outline-none ${
                      item.isNewProduct
                        ? "border-blue-300 bg-blue-50 focus:ring-blue-200 focus:border-blue-400"
                        : "border-gray-300 focus:ring-blue-200 focus:border-blue-400"
                    }`}
                  >
                    <option value="" className="text-blue-600 font-medium">🆕 Criar novo produto...</option>
                    {userProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.productcode})
                      </option>
                    ))}
                  </select>
                  {item.isNewProduct && (
                    <p className="text-xs text-blue-600 mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Será criado como novo produto
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap align-top">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "quantity",
                        parseInt(e.target.value)
                      )
                    }
                    className="w-20 p-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none transition-colors"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                  <div className="flex items-center justify-end">
                    <span className="text-gray-500 mr-2">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "unitPrice",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-28 p-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none transition-colors"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center align-top">
                  {item.isNewProduct ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      Novo
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Existente
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          * Campos obrigatórios para todos os itens
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setParsedItems([])}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            Cancelar Importação
          </button>
          <button
            onClick={handleConfirmPurchase}
            disabled={isLoading}
            className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-200 shadow-sm flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirmar e Atualizar Estoque
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ✅ SEÇÃO DE UPLOAD (que estava faltando)
  const renderUploadSection = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Importar Nova Compra
        </h2>
        <p className="text-gray-600">
          Envie o arquivo PDF do seu fornecedor para extrair os itens da compra
          automaticamente.
        </p>
      </div>

      {/* ✅ CORRIGIDO: Seletor de Representada usa ID numérico */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Representada dos Produtos:
        </label>
        <select
          value={selectedBrandId}
          onChange={(e) => setSelectedBrandId(e.target.value)}
          className="w-full p-3.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none transition-colors"
        >
          <option value="">Selecione uma Representada...</option>
          {brands.map((brand) => {
            const displayName =
              typeof brand.name === "string"
                ? brand.name
                : brand.name && typeof brand.name === "object"
                ? // try common nested fields or fallback to JSON
                  (brand.name.label || brand.name.value || JSON.stringify(brand.name))
                : String(brand.name || "");

            const commissionValue =
              typeof brand.commission_rate === "number" || typeof brand.commission_rate === "string"
                ? brand.commission_rate
                : brand.commission_rate && typeof brand.commission_rate === "object"
                ? brand.commission_rate.value || brand.commission_rate.rate || ""
                : "";

            return (
              <option key={brand.id} value={brand.id}>
                {displayName}{commissionValue ? ` (${commissionValue}%)` : ""}
              </option>
            );
          })}
        </select>
        <p className="text-xs text-gray-500 mt-2">
          Todos os novos produtos criados serão associados a esta Representada
        </p>
      </div>

      <div className="flex flex-col items-center gap-5">
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Arquivo PDF da Compra:
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Clique para enviar</span> ou arraste o arquivo
                </p>
                <p className="text-xs text-gray-500">PDF (MAX. 10MB)</p>
              </div>
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </label>
          </div>
          {selectedFile && (
            <div className="mt-3 flex items-center justify-between bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
              <span className="text-sm font-medium truncate flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {selectedFile.name}
              </span>
              <button 
                onClick={() => setSelectedFile(null)}
                className="text-blue-500 hover:text-blue-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={handleUpload}
          disabled={!selectedFile || !selectedBrandId || isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processando PDF...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Processar PDF
            </>
          )}
        </button>
      </div>
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start">
          <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );

  const CsvImportSection = () => {
    const [csvFile, setCsvFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [selectedCsvBrandId, setSelectedCsvBrandId] = useState("");

    // ✅ Define Representada padrão quando as brands são carregadas
    useEffect(() => {
      if (brands.length > 0 && !selectedCsvBrandId) {
        setSelectedCsvBrandId(String(brands[0].id));
      }
    }, [brands, selectedCsvBrandId]);

    const handleCsvImport = async () => {
      if (!csvFile) {
        alert("Por favor, selecione um arquivo CSV");
        return;
      }

      // ✅ VALIDAÇÃO DA REPRESENTADA PARA CSV
      if (!selectedCsvBrandId) {
        alert("Por favor, selecione uma Representada para os produtos do CSV");
        return;
      }

      setIsImporting(true);
      setImportResult(null);

      try {
        const formData = new FormData();
        formData.append("productsCsv", csvFile);
        formData.append("brandId", selectedCsvBrandId); // ✅ ENVIA BRAND ID

        const result = await apiService.importCsv(formData);

        setImportResult(result);
        alert(`✅ ${result.message}`);

        // Limpa o arquivo
        setCsvFile(null);

        // Recarrega produtos
        const updatedProducts = await apiService.getProducts();
        setUserProducts(updatedProducts);
      } catch (error) {
        setImportResult({ error: error.message });
        alert(`❌ Erro na importação: ${error.message}`);
      } finally {
        setIsImporting(false);
      }
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            Importar Produtos do CSV
          </h3>
          <p className="text-gray-600">
            Importe produtos em lote através de um arquivo CSV
          </p>
        </div>

        <div className="space-y-5">
          {/* ✅ SELETOR DE Representada PARA CSV */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Representada dos Produtos:
            </label>
            <select
              value={selectedCsvBrandId}
              onChange={(e) => setSelectedCsvBrandId(e.target.value)}
              className="w-full p-3.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-200 focus:border-green-400 focus:outline-none transition-colors"
            >
              <option value="">Selecione uma Representada...</option>
              {brands.map((brand) => {
                const displayName =
                  typeof brand.name === "string"
                    ? brand.name
                    : brand.name && typeof brand.name === "object"
                    ? (brand.name.label || brand.name.value || JSON.stringify(brand.name))
                    : String(brand.name || "");

                const commissionValue =
                  typeof brand.commission_rate === "number" || typeof brand.commission_rate === "string"
                    ? brand.commission_rate
                    : brand.commission_rate && typeof brand.commission_rate === "object"
                    ? brand.commission_rate.value || brand.commission_rate.rate || ""
                    : "";

                return (
                  <option key={brand.id} value={brand.id}>
                    {displayName}{commissionValue ? ` (${commissionValue}%)` : ""}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Todos os produtos do CSV serão associados a esta Representada
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Arquivo CSV com produtos:
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Clique para enviar</span> ou arraste o arquivo
                  </p>
                  <p className="text-xs text-gray-500">CSV (MAX. 10MB)</p>
                </div>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={(e) => setCsvFile(e.target.files[0])} 
                  className="hidden" 
                />
              </label>
            </div>
            {csvFile && (
              <div className="mt-3 flex items-center justify-between bg-green-50 text-green-700 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium truncate flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {csvFile.name}
                </span>
                <button 
                  onClick={() => setCsvFile(null)}
                  className="text-green-500 hover:text-green-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleCsvImport}
            disabled={!csvFile || !selectedCsvBrandId || isImporting}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-medium py-3 px-6 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-200 shadow-sm flex items-center justify-center"
          >
            {isImporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Importando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importar CSV
              </>
            )}
          </button>

          {importResult && (
            <div
              className={`p-4 rounded-lg border ${
                importResult.error
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-green-50 text-green-700 border-green-200"
              }`}
            >
              <pre className="text-sm whitespace-pre-wrap">
                {importResult.error || importResult.message}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <svg className="w-8 h-8 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Gestão de Compras
          </h1>
          <p className="text-gray-600">Importe e gerencie suas compras de forma eficiente</p>
        </div>

        {/* Abas de Navegação */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("pdf")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "pdf"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Importar PDF
              </button>
              <button
                onClick={() => setActiveTab("csv")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "csv"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Importar CSV
              </button>
            </nav>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <LoadingSpinner />
              <p className="mt-4 text-gray-600">Processando sua solicitação...</p>
            </div>
          </div>
        ) : activeTab === "csv" ? (
          <CsvImportSection />
        ) : parsedItems.length === 0 ? (
          renderUploadSection()
        ) : (
          renderVerificationTable()
        )}
      </div>
    </div>
  );
};

export default PurchasesPage;