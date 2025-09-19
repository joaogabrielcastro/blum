import { useState, useEffect } from "react";
import apiService from "../services/apiService";
import LoadingSpinner from "../components/LoadingSpinner"; // Reutilize seu componente de loading

const PurchasesPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedItems, setParsedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userProducts, setUserProducts] = useState([]); // Para o mapeamento

  // Carrega os produtos do usuário para o dropdown de mapeamento
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

    try {
      const formData = new FormData();
      formData.append("purchasePdf", selectedFile);

      const itemsFromAI = await apiService.processPurchasePdf(formData);

      // Pré-mapeia os produtos com base na correspondência de nome/código
      const preMappedItems = itemsFromAI.map(item => {
          const foundProduct = userProducts.find(p => 
              p.productcode === item.productCode || 
              p.name.toLowerCase().includes(item.description.toLowerCase().substring(0, 15))
          );
          return { ...item, mappedProductId: foundProduct ? foundProduct.id : "" };
      });

      setParsedItems(preMappedItems);

    } catch (err) {
      setError("Falha ao processar o PDF. Verifique o arquivo e tente novamente.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para lidar com mudanças na tabela de verificação
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...parsedItems];
    updatedItems[index][field] = value;
    setParsedItems(updatedItems);
  };

  const handleConfirmPurchase = async () => {
    // 1. Validação: Verifica se todos os itens foram mapeados
    const unmappedItem = parsedItems.find(item => !item.mappedProductId);
    if (unmappedItem) {
      alert("Erro: Todos os itens devem ser mapeados para um produto do sistema antes de continuar.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 2. Preparação dos dados: envia apenas o necessário
      const payload = parsedItems.map(item => ({
        mappedProductId: item.mappedProductId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }));

      // 3. Chamada da API
      await apiService.finalizePurchase(payload);

      alert("Estoque atualizado com sucesso!");
      
      // 4. Limpa a tela para a próxima importação
      setParsedItems([]);
      setSelectedFile(null);

    } catch (err) {
      setError(err.message || "Ocorreu um erro ao atualizar o estoque.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Renderiza a seção de Upload
  const renderUploadSection = () => (
    <div className="bg-white p-8 rounded-xl shadow-md border max-w-2xl mx-auto text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Importar Nova Compra</h2>
      <p className="text-gray-600 mb-6">Envie o arquivo PDF do seu fornecedor para extrair os itens da compra automaticamente.</p>
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
          {isLoading ? 'Processando...' : 'Processar PDF'}
        </button>
      </div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );

  // Renderiza a Tabela de Verificação
const renderVerificationTable = () => (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Verifique os Itens Extraídos</h2>
      <p className="text-gray-600 mb-6">
        Ajuste as informações abaixo e mapeie cada item para um produto do seu sistema. 
        Itens com o campo "Mapear Para" em vermelho precisam de atenção.
      </p>

      <div className="overflow-x-auto bg-white rounded-lg shadow border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Descrição (Extraído do PDF)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Mapear Para Produto do Sistema*</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd.*</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preço Unit.*</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parsedItems.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-normal align-top">
                  <p className="text-sm font-medium text-gray-900">{item.description}</p>
                  <p className="text-xs text-gray-500">Código no PDF: {item.productCode}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap align-top">
                  <select
                    value={item.mappedProductId}
                    onChange={(e) => handleItemChange(index, "mappedProductId", e.target.value)}
                    className={`w-full p-2 border rounded-md text-sm ${
                      !item.mappedProductId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione um produto...</option>
                    {userProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.productcode})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap align-top">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value))}
                    className="w-24 p-1 border border-gray-300 rounded-md text-center"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                   <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, "unitPrice", parseFloat(e.target.value))}
                    className="w-28 p-1 border border-gray-300 rounded-md text-right"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-4 mt-8">
        <button onClick={() => setParsedItems([])} className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition">
            Cancelar Importação
        </button>
        <button 
           // A função para o onClick será o nosso próximo passo (Fase 3)
           className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
         >
           Confirmar e Atualizar Estoque
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Gestão de Compras</h1>
      
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