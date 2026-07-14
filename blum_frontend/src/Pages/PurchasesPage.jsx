import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import apiService from "../services/apiService";
import LoadingSpinner from "../components/LoadingSpinner";
import VerificationTable from "../components/common/VerificationTable";
import UploadSection from "../components/common/UploadSection";
import PurchaseTabs from "../components/purchases/PurchaseTabs";
import PurchaseDateSection from "../components/purchases/PurchaseDateSection";
import PurchaseActions from "../components/purchases/PurchaseActions";
import PurchaseInlineNotice from "../components/purchases/PurchaseInlineNotice";
import CsvImportSection from "../components/purchases/CsvImportSection";
import { usePurchaseLogic } from "../hooks/usePurchaseLogic";
import {
  buildVerificationCatalog,
  buildImportSuccessSummary,
  buildFinalizePurchasePayload,
  getDuplicateProductCodesFromItems,
  mergePurchaseItemsByProductCode,
  maybeMergeDuplicateProductCodes,
  validatePurchaseImportRows,
} from "../utils/purchaseImportUtils";
import { canUseFeature } from "../utils/planFeatures";

const PurchasesPage = ({ subscription }) => {
  const purchaseLogic = usePurchaseLogic();
  const [activeTab, setActiveTab] = useState("pdf");
  const canImportPurchases = canUseFeature(subscription, "purchase-import");

  const {
    selectedFile,
    setSelectedFile,
    parsedItems,
    setParsedItems,
    isLoading,
    setIsLoading,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    userProducts,
    setUserProducts,
    brands,
    selectedBrandId,
    setSelectedBrandId,
    purchaseDate,
    setPurchaseDate,
  } = purchaseLogic;

  useEffect(() => {
    setSuccessMessage(null);
  }, [activeTab, setSuccessMessage]);

  const pdfDuplicateProductCodes = useMemo(
    () => getDuplicateProductCodesFromItems(parsedItems),
    [parsedItems],
  );

  const handleItemChange = (index, field, value) => {
    setError(null);
    setSuccessMessage(null);
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
    setSuccessMessage(null);
    setParsedItems([]);

    try {
      const formData = new FormData();
      formData.append("purchasePdf", selectedFile);
      const itemsFromAI = await apiService.processPurchasePdf(formData);

      const selectedBrand = brands.find(
        (b) => String(b.id) === String(selectedBrandId),
      );

      const { items: preMappedItems, catalogProducts } =
        await buildVerificationCatalog(
          apiService,
          itemsFromAI,
          selectedBrand?.name || "",
          selectedBrandId,
        );

      setUserProducts(catalogProducts);
      setParsedItems(preMappedItems);
    } catch (err) {
      console.error("Erro ao processar PDF:", err);
      setError(
        "Falha ao processar o PDF. Verifique o arquivo e tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfConfirm = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!selectedBrandId) {
      setError("Selecione uma representada para os produtos.");
      return;
    }

    let rows = [...parsedItems];
    const merged = await maybeMergeDuplicateProductCodes(rows, setParsedItems);
    if (merged === null) return;
    rows = merged;

    const validation = validatePurchaseImportRows(rows);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const selectedBrand = brands.find(
      (b) => String(b.id) === String(selectedBrandId),
    );
    const newProductsCount = rows.filter((item) => item.isNewProduct).length;

    if (newProductsCount > 0) {
      const confirmMessage =
        `⚠️ ATENÇÃO!\n\n` +
        `${newProductsCount} produtos NÃO EXISTEM no seu catálogo e serão CRIADOS AUTOMATICAMENTE.\n\n` +
        `• Produtos existentes: ${rows.length - newProductsCount}\n` +
        `• Novos produtos: ${newProductsCount}\n` +
        `• Representada: ${selectedBrand?.name || "Não selecionada"}\n` +
        `• Data da compra: ${purchaseDate}\n\n` +
        `Deseja continuar?`;
      if (!window.confirm(confirmMessage)) return;
    }

    rows = mergePurchaseItemsByProductCode(rows);
    setParsedItems(rows);
    setIsLoading(true);

    try {
      const result = await apiService.finalizePurchaseFromPdf(
        buildFinalizePurchasePayload(selectedBrandId, purchaseDate, rows),
      );
      setSuccessMessage(
        buildImportSuccessSummary(
          result,
          selectedBrand,
          purchaseDate,
          rows.length,
        ),
      );
      setParsedItems([]);
      setSelectedFile(null);
      setUserProducts([]);
    } catch (err) {
      console.error("Erro ao processar PDF:", err);
      setError(err.message || "Ocorreu um erro ao processar o PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <span className="mr-3">🛒</span>
            Gestão de Compras
          </h1>
          <p className="text-gray-600">
            Importe e gerencie suas compras de forma eficiente
          </p>
        </div>

        {!canImportPurchases ? (
          <div className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Importação de compras no plano Profissional
            </h2>
            <p className="mt-2 text-sm text-gray-600 max-w-xl">
              No Starter você continua com catálogo e orçamentos. A importação
              de compras por CSV/PDF, atualização de estoque e preços a partir
              de notas está disponível a partir do Profissional.
            </p>
            <Link
              to="/subscription"
              className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Ver planos e fazer upgrade
            </Link>
          </div>
        ) : (
          <>
        <PurchaseTabs activeTab={activeTab} onTabChange={setActiveTab} />

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
          <>
            <PurchaseInlineNotice
              variant="success"
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
            <UploadSection
              onFileChange={(e) => {
                setSuccessMessage(null);
                setSelectedFile(e.target.files[0]);
              }}
              selectedFile={selectedFile}
              onUpload={handlePdfUpload}
              isLoading={isLoading}
              error={error}
              brands={brands}
              selectedBrandId={selectedBrandId}
              onBrandChange={(e) => setSelectedBrandId(e.target.value)}
            />
          </>
        ) : (
          <>
            <PurchaseInlineNotice
              message={error}
              onDismiss={() => setError(null)}
            />
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
              <h3 className="text-green-800 font-bold text-lg">
                ✅ PDF Processado com Sucesso!
              </h3>
              <p className="text-green-700">
                {parsedItems.length} itens encontrados. Verifique e confirme os
                dados abaixo.
              </p>
              {pdfDuplicateProductCodes.length > 0 && (
                <p className="text-amber-800 text-sm mt-2 font-medium">
                  Há códigos repetidos. Use «Unificar códigos duplicados» ou
                  confirme — será perguntado se deseja agrupar.
                </p>
              )}
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
              onCancel={() => {
                setParsedItems([]);
                setSuccessMessage(null);
              }}
              onConfirm={handlePdfConfirm}
              isLoading={isLoading}
              confirmLabel="Confirmar e Atualizar Estoque"
              secondaryAction={
                pdfDuplicateProductCodes.length > 0
                  ? {
                      label: "Unificar códigos duplicados",
                      onClick: () => {
                        setError(null);
                        setSuccessMessage(null);
                        setParsedItems(
                          mergePurchaseItemsByProductCode(parsedItems),
                        );
                      },
                    }
                  : undefined
              }
            />
          </>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default PurchasesPage;
