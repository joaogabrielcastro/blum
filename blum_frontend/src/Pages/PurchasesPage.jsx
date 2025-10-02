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

  // Carrega os produtos do usuário
  useEffect(() => {
    const fetchUserProducts = async () => {
      try {
        const productsData = await apiService.getProducts();
        setUserProducts(productsData);
      } catch (err) {
        console.error("Erro ao buscar produtos do usuário:", err);
      }
    };
    fetchUserProducts();
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

    // VALIDAÇÃO
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
    if (newProductsCount > 0) {
      const confirmMessage =
        `⚠️ ATENÇÃO!\n\n` +
        `${newProductsCount} produtos NÃO EXISTEM no seu catálogo e serão CRIADOS AUTOMATICAMENTE.\n\n` +
        `• Produtos existentes: ${parsedItems.length - newProductsCount}\n` +
        `• Novos produtos: ${newProductsCount}\n\n` +
        `Deseja continuar?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // PREPARA OS DADOS
      const payload = parsedItems.map((item) => ({
        mappedProductId: item.mappedProductId || "", // Garante que seja string vazia se null/undefined
        productCode: item.productCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

      console.log("📤 Payload enviado para API:", payload);

      const result = await apiService.finalizePurchase(payload);

      console.log("✅ Resposta da API:", result);

      alert(
        `✅ ${result.message}\n\n` +
          `📦 Resumo:\n` +
          `• ${parsedItems.length - newProductsCount} produtos atualizados\n` +
          `• ${newProductsCount} novos produtos criados`
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

    if (newProducts.length === 0) return null;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-2">
          <span className="text-yellow-600 font-bold text-lg">
            🆕 Novos Produtos Detectados
          </span>
        </div>
        <p className="text-yellow-700 mb-3">
          {newProducts.length} produtos não existem no seu catálogo e serão
          criados automaticamente:
        </p>
        <div className="max-h-40 overflow-y-auto">
          {newProducts.map((item, index) => (
            <div
              key={index}
              className="text-sm text-yellow-600 py-1 border-b border-yellow-100"
            >
              <strong>{item.productCode}</strong> - {item.description}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ✅ RENDERIZAÇÃO DA TABELA ATUALIZADA
  const renderVerificationTable = () => (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">
        Verifique os Itens Extraídos
      </h2>
      <p className="text-gray-600 mb-6">
        Mapeie os itens para produtos existentes ou deixe em "Selecione um
        produto..." para criar novos produtos automaticamente.
      </p>

      {/* RESUMO DE NOVOS PRODUTOS */}
      {renderNewProductsSummary()}

      <div className="overflow-x-auto bg-white rounded-lg shadow border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                Descrição (Extraído do PDF)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                Mapear Para Produto Existente
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qtd.*
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preço Unit.*
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parsedItems.map((item, index) => (
              <tr key={index} className={item.isNewProduct ? "bg-blue-50" : ""}>
                <td className="px-6 py-4 whitespace-normal align-top">
                  <p className="text-sm font-medium text-gray-900">
                    {item.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    Código: {item.productCode}
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap align-top">
                  <select
                    value={item.mappedProductId}
                    onChange={(e) =>
                      handleItemChange(index, "mappedProductId", e.target.value)
                    }
                    className={`w-full p-2 border rounded-md text-sm ${
                      item.isNewProduct
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300"
                    }`}
                  >
                    <option value="">🆕 Criar novo produto...</option>
                    {userProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.productcode})
                      </option>
                    ))}
                  </select>
                  {item.isNewProduct && (
                    <p className="text-xs text-blue-600 mt-1">
                      ✅ Será criado como novo produto
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
                    className="w-24 p-1 border border-gray-300 rounded-md text-center"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right align-top">
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
                    className="w-28 p-1 border border-gray-300 rounded-md text-right"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center align-top">
                  {item.isNewProduct ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Novo
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Existente
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-4 mt-8">
        <button
          onClick={() => setParsedItems([])}
          className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
        >
          Cancelar Importação
        </button>
        <button
          onClick={handleConfirmPurchase}
          disabled={isLoading}
          className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          {isLoading ? "Processando..." : "Confirmar e Atualizar Estoque"}
        </button>
      </div>
    </div>
  );

  // ✅ SEÇÃO DE UPLOAD (que estava faltando)
  const renderUploadSection = () => (
    <div className="bg-white p-8 rounded-xl shadow-md border max-w-2xl mx-auto text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Importar Nova Compra
      </h2>
      <p className="text-gray-600 mb-6">
        Envie o arquivo PDF do seu fornecedor para extrair os itens da compra
        automaticamente.
      </p>
      <div className="flex flex-col items-center gap-4">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isLoading}
          className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md disabled:opacity-50"
        >
          {isLoading ? "Processando..." : "Processar PDF"}
        </button>
      </div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">
        Gestão de Compras
      </h1>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {!isLoading && parsedItems.length === 0 && renderUploadSection()}
      {!isLoading && parsedItems.length > 0 && renderVerificationTable()}
    </div>
  );
};

export default PurchasesPage;
