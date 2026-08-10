import { useState, useEffect, useMemo } from "react";
import apiService from "../../services/apiService";
import VerificationTable from "../common/VerificationTable";
import UploadSection from "../common/UploadSection";
import PurchaseActions from "../purchases/PurchaseActions";
import ConfirmationModal from "../ConfirmationModal";
import FormField, { inputClassName } from "../ui/FormField";
import { SecondaryButton } from "../ui/Surface";
import {
  buildVerificationCatalog,
  buildProductImportPayload,
  buildProductImportSuccessSummary,
  getDuplicateProductCodesFromItems,
  mergePurchaseItemsByProductCode,
  validateProductImportRows,
} from "../../utils/productImportUtils";

export default function ProductImportSection({
  brands,
  defaultBrandId,
  onSuccess,
  onClose,
}) {
  const [file, setFile] = useState(null);
  const [parsedItems, setParsedItems] = useState([]);
  const [userProducts, setUserProducts] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState(
    defaultBrandId ? String(defaultBrandId) : "",
  );
  const [stockMode, setStockMode] = useState("replace");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [profile, setProfile] = useState("");
  const [createConfirm, setCreateConfirm] = useState(null);
  const [mergeConfirm, setMergeConfirm] = useState(null);

  const duplicateProductCodes = useMemo(
    () => getDuplicateProductCodesFromItems(parsedItems),
    [parsedItems],
  );

  useEffect(() => {
    if (defaultBrandId) {
      setSelectedBrandId(String(defaultBrandId));
    } else if (brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(String(brands[0].id));
    }
  }, [brands, defaultBrandId, selectedBrandId]);

  const handleProcess = async () => {
    if (!file) {
      setError("Selecione um arquivo CSV ou Excel.");
      return;
    }
    if (!selectedBrandId) {
      setError("Selecione uma representada.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("productsFile", file);
      const preview = await apiService.previewProductImport(formData);

      const rawItems = (preview.items || []).map((item, index) => ({
        productCode: item.productCode || item.codigo || `CODE_${index + 1}`,
        description: item.description || item.nome || `Produto ${index + 1}`,
        quantity: Number(item.quantity ?? item.estoque ?? item.stock ?? 0),
        unitPrice: Number(item.unitPrice ?? item.preco ?? item.price ?? 0),
        minStock: Number(item.minStock ?? item.minstock ?? 0),
      }));

      if (rawItems.length === 0) {
        throw new Error("Nenhum produto válido encontrado no arquivo.");
      }

      const selectedBrand = brands.find(
        (b) => String(b.id) === String(selectedBrandId),
      );

      const { items: preMappedItems, catalogProducts } =
        await buildVerificationCatalog(
          apiService,
          rawItems,
          selectedBrand?.name || "",
          selectedBrandId,
        );

      setWarnings(preview.warnings || []);
      setProfile(preview.profile || "");
      setUserProducts(catalogProducts);
      setParsedItems(preMappedItems);
    } catch (err) {
      console.error("Erro ao processar planilha:", err);
      setError(
        err.message ||
          "Não foi possível processar a planilha. Verifique o arquivo e tente novamente.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    setError(null);
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

  const finalizeRows = async (rows) => {
    const selectedBrand = brands.find(
      (b) => String(b.id) === String(selectedBrandId),
    );
    const mergedRows = mergePurchaseItemsByProductCode(rows);
    setParsedItems(mergedRows);
    setIsLoading(true);
    setCreateConfirm(null);
    setMergeConfirm(null);

    try {
      const result = await apiService.finalizeProductImport(
        buildProductImportPayload(selectedBrandId, stockMode, mergedRows),
      );
      const summary = buildProductImportSuccessSummary(
        result,
        selectedBrand,
        mergedRows.length,
        stockMode,
      );
      setSuccessMessage(summary);
      setParsedItems([]);
      setFile(null);
      setUserProducts([]);
      onSuccess?.();
    } catch (err) {
      console.error("Erro ao importar produtos:", err);
      setError(err.message || "Não foi possível importar os produtos.");
    } finally {
      setIsLoading(false);
    }
  };

  const continueAfterRowsReady = async (rows) => {
    const validation = validateProductImportRows(rows, stockMode);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const newProductsCount = rows.filter((item) => item.isNewProduct).length;
    if (newProductsCount > 0) {
      setCreateConfirm({ rows, newProductsCount });
      return;
    }

    await finalizeRows(rows);
  };

  const handleConfirm = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!selectedBrandId) {
      setError("Selecione uma representada.");
      return;
    }

    const rows = [...parsedItems];
    const codes = getDuplicateProductCodesFromItems(rows);
    if (codes.length > 0) {
      setMergeConfirm({ rows, codes });
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

  if (parsedItems.length === 0) {
    return (
      <div>
        {successMessage ? (
          <div className="mb-4 whitespace-pre-line rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            {successMessage}
          </div>
        ) : null}

        <FormField
          className="mb-4"
          label="Modo de importação"
          hint="Use «Sincronizar» para planilhas do ERP. Use «Somar» para entradas de compra."
        >
          <select
            value={stockMode}
            onChange={(e) => setStockMode(e.target.value)}
            className={`${inputClassName()} md:max-w-md`}
          >
            <option value="replace">
              Sincronizar catálogo (substituir estoque)
            </option>
            <option value="add">Somar estoque (entrada)</option>
          </select>
        </FormField>

        <UploadSection
          onFileChange={(e) => {
            setSuccessMessage(null);
            setFile(e.target.files[0]);
          }}
          selectedFile={file}
          onUpload={handleProcess}
          isLoading={isProcessing}
          error={error}
          brands={brands}
          selectedBrandId={selectedBrandId}
          onBrandChange={(e) => setSelectedBrandId(e.target.value)}
          title="Importar planilha de produtos"
          description="Envie CSV ou Excel (.xlsx) exportado do ERP."
          accept=".csv,.xlsx,.xls"
          fileType="planilha"
        />

        {onClose ? (
          <div className="mt-4 flex justify-end">
            <SecondaryButton type="button" onClick={onClose}>
              Fechar
            </SecondaryButton>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="text-base font-semibold text-emerald-900">
          Planilha processada
        </h3>
        <p className="mt-1 text-sm text-emerald-800">
          {parsedItems.length} produto(s) encontrados
          {profile ? ` (perfil: ${profile})` : ""}.
        </p>
        {warnings.length > 0 ? (
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
            {warnings.slice(0, 5).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {warnings.length > 5 ? (
              <li>… e mais {warnings.length - 5} aviso(s)</li>
            ) : null}
          </ul>
        ) : null}
        {duplicateProductCodes.length > 0 ? (
          <p className="mt-2 text-sm font-medium text-amber-900">
            Códigos repetidos: {duplicateProductCodes.join(", ")}
          </p>
        ) : null}
      </div>

      <VerificationTable
        items={parsedItems}
        onItemChange={handleItemChange}
        userProducts={userProducts}
        title="Revise os produtos"
        description="Confira código, estoque e preço antes de importar."
        source="Planilha"
      />

      <PurchaseActions
        onCancel={() => {
          setParsedItems([]);
          setFile(null);
          setError(null);
        }}
        onConfirm={handleConfirm}
        isLoading={isLoading}
        confirmLabel="Confirmar importação"
        secondaryAction={
          duplicateProductCodes.length > 0
            ? {
                label: "Unificar códigos duplicados",
                onClick: () => {
                  setParsedItems(
                    mergePurchaseItemsByProductCode(parsedItems),
                  );
                },
              }
            : undefined
        }
      />

      <ConfirmationModal
        show={!!mergeConfirm}
        title="Unificar códigos duplicados?"
        tone="primary"
        confirmText="Unificar e continuar"
        message={
          mergeConfirm
            ? `Códigos repetidos: ${mergeConfirm.codes.join(", ")}. Vamos somar quantidades e usar média ponderada.`
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
            ? `${createConfirm.newProductsCount} produto(s) serão criados no catálogo. Deseja continuar?`
            : ""
        }
        onConfirm={() =>
          createConfirm?.rows && finalizeRows(createConfirm.rows)
        }
        onCancel={() => setCreateConfirm(null)}
      />
    </div>
  );
}
