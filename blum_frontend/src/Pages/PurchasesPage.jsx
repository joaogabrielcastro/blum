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
import ConfirmationModal from "../components/ConfirmationModal";
import Surface, { PageHeader } from "../components/ui/Surface";
import { usePurchaseLogic } from "../hooks/usePurchaseLogic";
import {
  buildVerificationCatalog,
  buildImportSuccessSummary,
  buildFinalizePurchasePayload,
  getDuplicateProductCodesFromItems,
  mergePurchaseItemsByProductCode,
  validatePurchaseImportRows,
} from "../utils/purchaseImportUtils";
import { canUseFeature } from "../utils/planFeatures";

const PurchasesPage = ({ subscription }) => {
  const purchaseLogic = usePurchaseLogic();
  const [activeTab, setActiveTab] = useState("pdf");
  const [createConfirm, setCreateConfirm] = useState(null);
  const [mergeConfirm, setMergeConfirm] = useState(null);
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
      setError("Selecione um arquivo PDF.");
      return;
    }
    if (!selectedBrandId) {
      setError("Selecione uma representada para os produtos.");
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
        "Não foi possível processar o PDF. Verifique o arquivo e tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const finalizePdfRows = async (rows) => {
    const selectedBrand = brands.find(
      (b) => String(b.id) === String(selectedBrandId),
    );
    const mergedRows = mergePurchaseItemsByProductCode(rows);
    setParsedItems(mergedRows);
    setIsLoading(true);
    setCreateConfirm(null);

    try {
      const result = await apiService.finalizePurchaseFromPdf(
        buildFinalizePurchasePayload(
          selectedBrandId,
          purchaseDate,
          mergedRows,
        ),
      );
      setSuccessMessage(
        buildImportSuccessSummary(
          result,
          selectedBrand,
          purchaseDate,
          mergedRows.length,
        ),
      );
      setParsedItems([]);
      setSelectedFile(null);
      setUserProducts([]);
    } catch (err) {
      console.error("Erro ao processar PDF:", err);
      setError(
        err.message ||
          "Não foi possível finalizar a compra. Tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const continueAfterRowsReady = async (rows) => {
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
      setCreateConfirm({
        rows,
        newProductsCount,
        existingCount: rows.length - newProductsCount,
        brandName: selectedBrand?.name || "Não selecionada",
      });
      return;
    }

    await finalizePdfRows(rows);
  };

  const handlePdfConfirm = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!selectedBrandId) {
      setError("Selecione uma representada para os produtos.");
      return;
    }

    const rows = [...parsedItems];
    const duplicateProductCodes = getDuplicateProductCodesFromItems(rows);
    if (duplicateProductCodes.length > 0) {
      setMergeConfirm({ rows, codes: duplicateProductCodes });
      return;
    }

    await continueAfterRowsReady(rows);
  };

  const handleMergeConfirm = async () => {
    if (!mergeConfirm?.rows) return;
    const merged = mergePurchaseItemsByProductCode(mergeConfirm.rows);
    setParsedItems(merged);
    setMergeConfirm(null);
    await continueAfterRowsReady(merged);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Compras"
          description="Importe notas em PDF ou CSV para atualizar estoque e custos."
        />

        {!canImportPurchases ? (
          <Surface>
            <h2 className="text-lg font-semibold text-ink">
              Importação no plano Profissional
            </h2>
            <p className="mt-2 max-w-xl text-sm text-ink-muted">
              No Starter você continua com catálogo e orçamentos. A importação
              de compras por CSV/PDF está disponível a partir do Profissional.
            </p>
            <Link
              to="/subscription"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-brand-600"
            >
              Ver planos e fazer upgrade
            </Link>
          </Surface>
        ) : (
          <>
            <PurchaseTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <LoadingSpinner message="A processar…" />
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
                  title="Importar PDF da nota"
                  description="Envie o PDF da compra e selecione a representada correspondente."
                  accept=".pdf,application/pdf"
                  fileType="pdf"
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
                <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="text-base font-semibold text-emerald-900">
                    PDF processado
                  </h3>
                  <p className="mt-1 text-sm text-emerald-800">
                    {parsedItems.length} itens encontrados. Verifique e
                    confirme os dados abaixo.
                  </p>
                  {pdfDuplicateProductCodes.length > 0 ? (
                    <p className="mt-2 text-sm font-medium text-amber-900">
                      Há códigos repetidos. Use «Unificar códigos duplicados»
                      ou confirme — será perguntado se deseja agrupar.
                    </p>
                  ) : null}
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
                  confirmLabel="Confirmar e atualizar estoque"
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

      <ConfirmationModal
        show={!!mergeConfirm}
        title="Unificar códigos duplicados?"
        tone="primary"
        confirmText="Unificar e continuar"
        message={
          mergeConfirm
            ? `Códigos repetidos: ${mergeConfirm.codes.join(", ")}. Vamos somar quantidades e usar média ponderada de preço. Cancelar interrompe a importação.`
            : ""
        }
        onConfirm={handleMergeConfirm}
        onCancel={() => setMergeConfirm(null)}
      />
      <ConfirmationModal
        show={!!createConfirm}
        title="Criar produtos novos?"
        tone="primary"
        confirmText="Continuar"
        message={
          createConfirm
            ? `${createConfirm.newProductsCount} produto(s) não existem no catálogo e serão criados automaticamente. Existentes: ${createConfirm.existingCount}. Representada: ${createConfirm.brandName}. Data: ${purchaseDate}.`
            : ""
        }
        onConfirm={() =>
          createConfirm?.rows && finalizePdfRows(createConfirm.rows)
        }
        onCancel={() => setCreateConfirm(null)}
      />
    </div>
  );
};

export default PurchasesPage;
