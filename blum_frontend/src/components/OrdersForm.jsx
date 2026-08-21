import { useState, useEffect, useMemo, useRef } from "react";
import apiService from "../services/apiService";
import { useToast } from "../context/ToastContext";
import { normalizeOrderLineItems } from "../utils/format";
import ClientItemPriceHistoryModal from "./ClientItemPriceHistoryModal";
import { useOrderCatalogSearch } from "../hooks/useOrderCatalogSearch";
import { useOrderEditHydration } from "../hooks/useOrderEditHydration";
import { useOrderFormClients } from "../hooks/useOrderFormClients";
import { useOrderFormItems } from "../hooks/useOrderFormItems";
import { computeOrderTotals } from "../utils/orderLineTotals";
import {
  findBrandById,
  findBrandByName,
} from "../utils/brandSelection";
import {
  parseQuantityByBrand,
  toDateTimeLocalValue,
  parseDecimalInput,
} from "../utils/orderFormUtils";
import { isBrowserOnline, enqueuePendingOrder } from "../offline";
import OrderFormLineItems from "./orders/OrderFormLineItems";
import OrderFormMetaSection from "./orders/OrderFormMetaSection";
import OrderFormProductSearch from "./orders/OrderFormProductSearch";
import OrderFormProductStaging from "./orders/OrderFormProductStaging";
import OrderFormTotals from "./orders/OrderFormTotals";
import OrderFormStepper from "./orders/OrderFormStepper";
import OrderFormSummaryCard from "./orders/OrderFormSummaryCard";
import OrderStockWarningModal from "./orders/OrderStockWarningModal";
import BrandSelectField from "./orders/BrandSelectField";
import { findClientOptionByTypedValue } from "../utils/clients";
import { getStockWarningLines } from "../utils/orderStockWarnings";
import { hasPaymentMethod } from "../utils/paymentMethods";
import {
  OrderMobileClientPicker,
  OrderMobileProductPicker,
} from "./orders/OrderMobilePickers";
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
} from "./ui/Surface";

const LAST_BRAND_KEY = "blum.lastOrderBrandId";

const OrdersForm = ({
  userId,
  userRole,
  clients,
  clientsList = [],
  onOrderAdded,
  onCancel,
  brands,
  editingOrder,
}) => {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const hydratedOrderKeyRef = useRef(null);
  /** Evita que o 2º clique de um double-click no "Continuar" dispare "Criar orçamento". */
  const blockSaveUntilRef = useRef(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    clientId,
    setClientId,
    clientSearchTerm,
    setClientSearchTerm,
    desktopClientListOpen,
    setDesktopClientListOpen,
    mobileClientPickerOpen,
    setMobileClientPickerOpen,
    clientOptions,
    filteredClientOptions,
    mobileClientDisplayList,
    selectClientOption,
    resetClient,
    MOBILE_CLIENT_BROWSE_COUNT,
  } = useOrderFormClients(clients, clientsList);

  const [description, setDescription] = useState("");
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [productSearch, setProductSearch] = useState("");
  const {
    searchResults,
    setSearchResults,
    isSearching,
    clearSearch,
  } = useOrderCatalogSearch(apiService, {
    selectedBrand,
    selectedBrandId,
    productSearch,
  });
  const [mobileProductPickerOpen, setMobileProductPickerOpen] =
    useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [historyModalItem, setHistoryModalItem] = useState(null);
  const [orderDateTime, setOrderDateTime] = useState(
    toDateTimeLocalValue(new Date()),
  );
  const [stockWarningModalOpen, setStockWarningModalOpen] = useState(false);

  const documentType = editingOrder
    ? editingOrder.documentType === "pedido"
      ? "pedido"
      : "orcamento"
    : "orcamento";
  const stockWarningLines = useMemo(
    () => getStockWarningLines(items),
    [items],
  );
  const hasLiveStockWarnings = stockWarningLines.length > 0;

  const { subtotalAfterLineDiscounts, discountAmount, netTotal } =
    computeOrderTotals(items, discount);

  const {
    handleItemChange,
    handleProductSelect,
    removeItem,
    stagingItem,
    updateStagingField,
    confirmStaging,
    cancelStaging,
    selectLineItemForStaging,
  } = useOrderFormItems(items, setItems, {
    selectedBrandId,
    setProductSearch,
    setSearchResults,
    setMobileProductPickerOpen,
  });
  const canApplyGeneralDiscount =
    paymentMethod === "pix" || paymentMethod === "dinheiro";
  const canEditUnitPrice =
    userRole === "admin" || userRole === "salesperson";

  useEffect(() => {
    const orderKey =
      editingOrder?.id != null ? `edit-${editingOrder.id}` : "new";
    // Evita resetar passo/marca se o pai recriar o objeto editingOrder.
    if (hydratedOrderKeyRef.current === orderKey) return;
    hydratedOrderKeyRef.current = orderKey;

    if (editingOrder) {
      const cid =
        editingOrder.clientId ?? editingOrder.clientid ?? editingOrder.client_id;
      setClientId(cid != null && cid !== "" ? String(cid) : "");
      setDescription(editingOrder.description || "");
      const lines = normalizeOrderLineItems(editingOrder.items);
      setItems(lines);
      setDiscount(editingOrder.discount || 0);
      setTotalPrice(editingOrder.totalPrice ?? editingOrder.totalprice ?? 0);
      const firstLine = lines.find((i) => i.brand || i.brandId);
      if (firstLine?.brandId) {
        setSelectedBrandId(String(firstLine.brandId));
        const b = findBrandById(brands, firstLine.brandId);
        setSelectedBrand(b?.name || firstLine.brand || "");
      } else if (firstLine?.brand) {
        setSelectedBrand(firstLine.brand);
        const b = findBrandByName(brands, firstLine.brand);
        setSelectedBrandId(b?.id != null ? String(b.id) : "");
      }
      setPaymentMethod(editingOrder.paymentMethod || "");
      setOrderDateTime(toDateTimeLocalValue(editingOrder.createdAt));
      setStep(lines.length > 0 ? 3 : 1);
      setShowAdvanced(Boolean(editingOrder.description));
    } else {
      setClientId("");
      setClientSearchTerm("");
      setDescription("");
      setItems([]);
      setDiscount(0);
      setTotalPrice(0);
      setProductSearch("");
      setSearchResults([]);
      setPaymentMethod("");
      setOrderDateTime(toDateTimeLocalValue(new Date()));
      setStep(1);
      setShowAdvanced(false);

      let remembered = "";
      try {
        remembered = localStorage.getItem(LAST_BRAND_KEY) || "";
      } catch {
        remembered = "";
      }
      if (remembered && findBrandById(brands, remembered)) {
        const brand = findBrandById(brands, remembered);
        setSelectedBrandId(String(brand.id));
        setSelectedBrand(brand.name || "");
      } else {
        setSelectedBrand("");
        setSelectedBrandId("");
      }
    }
  }, [editingOrder, brands]);

  // Se a lista de marcas chega depois, preenche só quando ainda não há seleção.
  useEffect(() => {
    if (selectedBrandId || !editingOrder || !Array.isArray(brands) || brands.length === 0) {
      return;
    }
    const firstLine = items.find((i) => i.brand || i.brandId);
    if (firstLine?.brandId && findBrandById(brands, firstLine.brandId)) {
      const b = findBrandById(brands, firstLine.brandId);
      setSelectedBrandId(String(b.id));
      setSelectedBrand(b.name || firstLine.brand || "");
      return;
    }
    if (firstLine?.brand) {
      const b = findBrandByName(brands, firstLine.brand);
      if (b?.id != null) {
        setSelectedBrandId(String(b.id));
        setSelectedBrand(b.name || firstLine.brand);
      }
    }
  }, [brands, editingOrder, items, selectedBrandId]);

  useEffect(() => {
    cancelStaging();
  }, [editingOrder, cancelStaging]);

  useOrderEditHydration(apiService, editingOrder, items, setItems);

  useEffect(() => {
    setTotalPrice(netTotal);
  }, [items, discount, netTotal]);

  useEffect(() => {
    if (!mobileProductPickerOpen && !mobileClientPickerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileProductPickerOpen, mobileClientPickerOpen]);

  useEffect(() => {
    if (!mobileProductPickerOpen && !mobileClientPickerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMobileProductPickerOpen(false);
        setMobileClientPickerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileProductPickerOpen, mobileClientPickerOpen]);

  const resetProductSearch = () => {
    setProductSearch("");
    clearSearch();
  };

  const handleClientSearchTermChange = (value) => {
    setClientSearchTerm(value);
    const exact = findClientOptionByTypedValue(clientOptions, value);
    if (exact) setClientId(exact.id);
    else setClientId("");
    setDesktopClientListOpen(true);
  };

  const handleBrandChange = (brandId) => {
    setSelectedBrandId(brandId);
    const brand = findBrandById(brands, brandId);
    setSelectedBrand(brand?.name || "");
    setProductSearch("");
    clearSearch();
    cancelStaging();
    if (brandId) {
      try {
        localStorage.setItem(LAST_BRAND_KEY, String(brandId));
      } catch {
        /* ignore */
      }
      if (step === 2 && brand?.name) {
        toast.info(
          `Buscando produtos de ${brand.name}. Os itens já adicionados permanecem no pedido.`,
        );
      }
    }
  };

  const handlePaymentMethodChange = (nextMethod) => {
    setPaymentMethod(nextMethod);
    const currentDiscount = parseFloat(discount) || 0;
    if (nextMethod === "pix" || nextMethod === "dinheiro") {
      if (currentDiscount > 2) {
        setDiscount(2);
        toast.info(
          "Para PIX ou dinheiro, o desconto geral foi ajustado para o máximo de 2%.",
        );
      }
    } else if (currentDiscount > 0) {
      setDiscount(0);
      toast.info(
        "Para esta forma de pagamento, desconto geral não é permitido.",
      );
    }
  };

  const clientLabel =
    clientOptions.find((opt) => opt.id === String(clientId))?.label ||
    clients[String(clientId)] ||
    "";

  const validateStep = (targetStep) => {
    if (targetStep >= 2) {
      if (!clientId) {
        toast.warning("Selecione um cliente para continuar.");
        return false;
      }
    }
    if (targetStep >= 3) {
      if (!selectedBrandId && !selectedBrand && items.length === 0) {
        toast.warning("Selecione uma representada e adicione itens.");
        return false;
      }
      if (items.length === 0) {
        toast.warning("Adicione pelo menos um item ao pedido.");
        return false;
      }
      if (items.some((item) => !item.productName)) {
        toast.warning("Preencha todos os campos dos produtos.");
        return false;
      }
      const missingPrice = items.some((item) => {
        const p = parseDecimalInput(item.price);
        return !Number.isFinite(p) || p < 0;
      });
      if (missingPrice) {
        toast.warning("Informe o preço de cada produto.");
        return false;
      }
      const missingQty = items.some((item) => {
        const q = parseQuantityByBrand(item.quantity, item.brand);
        return !q || q <= 0;
      });
      if (missingQty) {
        toast.warning(
          "Informe a quantidade de cada produto (maior que zero).",
        );
        return false;
      }
    }
    return true;
  };

  const goToStep = (target) => {
    const next = Math.min(3, Math.max(1, Number(target) || 1));
    if (next === step) return;
    if (next > step && step === 2 && stagingItem) {
      if (!validateStep(2)) return;
      if (!confirmStaging()) return;
      blockSaveUntilRef.current = Date.now() + 500;
      setStep(next);
      return;
    }
    if (next > step && !validateStep(next)) return;
    if (next > step) {
      // Mesma posição do botão vira "Criar orçamento"; ignora clique residual.
      blockSaveUntilRef.current = Date.now() + 500;
    }
    setStep(next);
  };

  const goNext = () => goToStep(step + 1);

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const saveOrder = async ({ confirmStockWarning = false } = {}) => {
    const originalSellerId =
      editingOrder?.userId ?? editingOrder?.userid ?? editingOrder?.user_ref;
    const normalizedOriginalSellerId = parseInt(String(originalSellerId), 10);
    const orderData = {
      clientid: parseInt(clientId),
      userid:
        editingOrder && Number.isFinite(normalizedOriginalSellerId)
          ? normalizedOriginalSellerId
          : userId,
      description: description,
      items: items.map((item) => {
        const resolvedBrandId =
          item.brandId ??
          (selectedBrandId || findBrandByName(brands, item.brand)?.id);
        return {
          ...item,
          brandId: resolvedBrandId != null ? resolvedBrandId : null,
          price: (() => {
            const p = parseDecimalInput(item.price);
            return Number.isFinite(p) && p > 0 ? p : 0;
          })(),
          quantity: parseQuantityByBrand(item.quantity, item.brand),
          lineDiscount: (() => {
            const d = parseDecimalInput(item.lineDiscount);
            if (!Number.isFinite(d)) return 0;
            return Math.min(100, Math.max(0, d));
          })(),
        };
      }),
      discount: parseFloat(discount) || 0,
      totalprice: parseFloat(netTotal) || 0,
      document_type: documentType,
      confirmStockWarning,
    };

    orderData.payment_method = paymentMethod || null;
    if (orderDateTime) {
      orderData.createdat = new Date(orderDateTime).toISOString();
    }

    if (!isBrowserOnline()) {
      if (editingOrder) {
        toast.warning(
          "Sem internet — não é possível editar pedidos offline. Tente novamente quando estiver online.",
        );
        return;
      }
      await enqueuePendingOrder({
        payload: orderData,
        clientLabel: clientLabel || "Cliente",
        totalPrice: netTotal,
      });
      toast.success(
        "Orçamento guardado neste aparelho. Será enviado automaticamente quando houver internet.",
      );
      onOrderAdded();
      return;
    }

    if (editingOrder) {
      await apiService.updateOrder(editingOrder.id, orderData);
      toast.success(
        hasLiveStockWarnings
          ? "Pedido atualizado com aviso de ruptura de estoque."
          : "Pedido atualizado com sucesso.",
      );
    } else {
      await apiService.createOrder(orderData);
      toast.success(
        hasLiveStockWarnings
          ? "Orçamento criado com aviso de ruptura de estoque."
          : "Orçamento criado com sucesso.",
      );
    }

    onOrderAdded();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 3) {
      goNext();
      return;
    }
    if (Date.now() < blockSaveUntilRef.current) {
      return;
    }
    if (!validateStep(3)) return;
    if (!hasPaymentMethod(paymentMethod)) {
      toast.warning(
        documentType === "pedido"
          ? "Selecione a forma de pagamento para guardar o pedido."
          : "Selecione a forma de pagamento para criar o orçamento.",
      );
      return;
    }

    const discountValue = parseFloat(discount) || 0;
    if (!canApplyGeneralDiscount && discountValue > 0) {
      toast.warning(
        "Desconto geral só é permitido para PIX ou dinheiro (máximo 2%).",
      );
      return;
    }
    if (canApplyGeneralDiscount && discountValue > 2) {
      toast.warning(
        "Para PIX ou dinheiro, o desconto geral máximo permitido é 2%.",
      );
      return;
    }
    if (!userId) {
      toast.warning(
        "Sessão inválida. Faça login novamente para guardar o pedido.",
      );
      return;
    }
    if (!orderDateTime || Number.isNaN(new Date(orderDateTime).getTime())) {
      toast.warning("Informe uma data/hora válida para o pedido.");
      setShowAdvanced(true);
      return;
    }

    if (hasLiveStockWarnings) {
      setStockWarningModalOpen(true);
      return;
    }

    try {
      setSaving(true);
      await saveOrder();
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      if (error?.code === "STOCK_WARNING_CONFIRM_REQUIRED") {
        setStockWarningModalOpen(true);
        return;
      }
      let errorMessage = `Não foi possível ${
        editingOrder ? "atualizar" : "criar"
      } o pedido.`;
      if (error.details && Array.isArray(error.details)) {
        const fieldErrors = error.details
          .map(
            (err) =>
              `${err.path || err.param || "Campo"}: ${err.msg || err.message}`,
          )
          .join("\n");
        errorMessage += `\n\n${fieldErrors}`;
      } else if (error.message) {
        errorMessage += `\n${error.message}`;
      }
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmStockWarningSave = async () => {
    try {
      setSaving(true);
      await saveOrder({
        confirmStockWarning: documentType === "pedido",
      });
      setStockWarningModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      toast.error(
        error?.message ||
          "Não foi possível salvar. Verifique os dados e tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const title = editingOrder
    ? editingOrder.documentType === "orcamento"
      ? "Editar orçamento"
      : "Editar pedido"
    : "Novo orçamento";

  const metaProps = {
    brands,
    clientId,
    clientOptions,
    clientSearchTerm,
    onClientSearchTermChange: handleClientSearchTermChange,
    onOpenMobileClientPicker: () => setMobileClientPickerOpen(true),
    onResetClient: resetClient,
    mobileClientPickerOpen,
    desktopClientListOpen,
    onDesktopClientListOpen: setDesktopClientListOpen,
    filteredClientOptions,
    onSelectClient: selectClientOption,
    selectedBrandId,
    onBrandChange: handleBrandChange,
    paymentMethod,
    onPaymentMethodChange: handlePaymentMethodChange,
    paymentRequired: true,
    orderDateTime,
    onOrderDateTimeChange: setOrderDateTime,
    description,
    onDescriptionChange: setDescription,
    discount,
    onDiscountChange: setDiscount,
    canApplyGeneralDiscount,
    showAdvanced,
    onToggleAdvanced: () => setShowAdvanced((v) => !v),
  };

  const summary = (
    <OrderFormSummaryCard
      documentType={documentType}
      clientLabel={clientLabel}
      brandLabel={selectedBrand}
      itemCount={items.length}
      subtotalAfterLineDiscounts={subtotalAfterLineDiscounts}
      discount={discount}
      discountAmount={discountAmount}
      totalPrice={totalPrice}
    />
  );

  const renderActionButtons = () => (
    <>
      {step > 1 ? (
        <SecondaryButton
          type="button"
          onClick={goBack}
          disabled={saving}
          className="w-full md:w-auto"
        >
          Voltar
        </SecondaryButton>
      ) : (
        <GhostButton
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="w-full md:w-auto"
        >
          Cancelar
        </GhostButton>
      )}
      {step < 3 ? (
        <PrimaryButton
          type="button"
          onClick={goNext}
          className="w-full md:w-auto"
        >
          Continuar
        </PrimaryButton>
      ) : (
        <PrimaryButton
          type="button"
          disabled={saving}
          className="w-full md:w-auto"
          onClick={(e) => {
            if (Date.now() < blockSaveUntilRef.current) return;
            handleSubmit(e);
          }}
        >
          {saving
            ? "A guardar…"
            : editingOrder
              ? "Guardar alterações"
              : "Criar orçamento"}
        </PrimaryButton>
      )}
    </>
  );

  return (
    <>
      <div className="w-full min-w-0 max-w-none pb-36 md:pb-8">
        <PageHeader
          title={title}
          description="Três passos: cliente, itens e forma de pagamento."
          actions={
            <GhostButton type="button" onClick={onCancel} className="hidden sm:inline-flex">
              Voltar à lista
            </GhostButton>
          }
        />

        <OrderFormStepper step={step} onStepSelect={goToStep} />

        {editingOrder?.status === "Entregue" ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            <p className="text-sm font-semibold">Pedido entregue em edição</p>
            <p className="mt-1 text-sm">
              Ao salvar, o estoque é ajustado conforme os itens alterados.
            </p>
          </div>
        ) : null}
        {hasLiveStockWarnings ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            <p className="text-sm font-semibold">
              Atenção: {stockWarningLines.length} item(ns) sem estoque suficiente
            </p>
            <p className="mt-1 text-sm text-amber-900/90">
              {documentType === "pedido"
                ? "Ao salvar o pedido será necessária confirmação. A entrega fica bloqueada até haver estoque."
                : "Você pode salvar o orçamento; o aviso ficará registrado."}
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="min-w-0 lg:col-span-2">
            <form
              id="order-form-main"
              onSubmit={handleSubmit}
              className="min-w-0 space-y-5 overflow-visible rounded-2xl border border-edge bg-surface p-3 shadow-soft sm:space-y-6 sm:p-4 md:p-6"
            >
              {step === 1 ? (
                <OrderFormMetaSection variant="basics" {...metaProps} />
              ) : null}

              {step === 2 ? (
                <section className="min-w-0 space-y-4 sm:space-y-5">
                  <div>
                    <h3 className="text-base font-semibold text-ink sm:text-lg">
                      Produtos
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted sm:text-sm">
                      Escolha a representada, busque o produto e adicione ao
                      pedido. Para outra marca, troque a representada aqui —
                      não precisa voltar ao passo 1.
                    </p>
                  </div>
                  <BrandSelectField
                    brands={brands}
                    selectedBrandId={selectedBrandId}
                    onBrandChange={handleBrandChange}
                  />
                  {!selectedBrand ? (
                    <p className="text-sm text-amber-700">
                      Selecione a representada acima para buscar produtos.
                    </p>
                  ) : null}
                  <OrderFormProductSearch
                    selectedBrand={selectedBrand}
                    productSearch={productSearch}
                    onProductSearchChange={setProductSearch}
                    isSearching={isSearching}
                    searchResults={searchResults}
                    onResetSearch={resetProductSearch}
                    onOpenMobilePicker={() => setMobileProductPickerOpen(true)}
                    onProductSelect={handleProductSelect}
                  />
                  <OrderFormProductStaging
                    stagingItem={stagingItem}
                    clientId={clientId}
                    canEditUnitPrice={canEditUnitPrice}
                    onFieldChange={updateStagingField}
                    onConfirm={confirmStaging}
                    onCancel={cancelStaging}
                    onOpenFullHistory={() => {
                      if (stagingItem) {
                        setHistoryModalItem({
                          productId: stagingItem.productId,
                          productName: stagingItem.productName,
                          productcode: stagingItem.productcode,
                        });
                      }
                    }}
                  />
                  <OrderFormLineItems
                    items={items}
                    clientId={clientId}
                    canEditUnitPrice={canEditUnitPrice}
                    activeItemIndex={
                      stagingItem?.mode === "edit"
                        ? stagingItem.editIndex
                        : null
                    }
                    onItemChange={handleItemChange}
                    onRemoveItem={removeItem}
                    onSelectItem={selectLineItemForStaging}
                    onOpenHistory={setHistoryModalItem}
                  />
                </section>
              ) : null}

              {step === 3 ? (
                <>
                  <OrderFormMetaSection variant="conditions" {...metaProps} />
                  <OrderFormTotals
                    subtotalAfterLineDiscounts={subtotalAfterLineDiscounts}
                    discount={discount}
                    discountAmount={discountAmount}
                    totalPrice={totalPrice}
                  />
                </>
              ) : null}

              <div className="hidden justify-end gap-3 border-t border-edge pt-4 md:flex">
                {renderActionButtons()}
              </div>
            </form>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-4 space-y-3">{summary}</div>
          </div>
        </div>

        <div className="mt-4 lg:hidden">{summary}</div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-edge bg-surface/95 px-3 pt-3 backdrop-blur-sm md:hidden"
        style={{
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex flex-col-reverse gap-2">{renderActionButtons()}</div>
      </div>

      <OrderMobileProductPicker
        open={mobileProductPickerOpen}
        onClose={() => setMobileProductPickerOpen(false)}
        selectedBrand={selectedBrand}
        productSearch={productSearch}
        onProductSearchChange={setProductSearch}
        isSearching={isSearching}
        searchResults={searchResults}
        onProductSelect={handleProductSelect}
      />

      <OrderMobileClientPicker
        open={mobileClientPickerOpen}
        onClose={() => setMobileClientPickerOpen(false)}
        clientSearchTerm={clientSearchTerm}
        onClientSearchChange={(value) => {
          setClientSearchTerm(value);
          const exact = findClientOptionByTypedValue(clientOptions, value);
          if (exact) setClientId(exact.id);
          else setClientId("");
        }}
        clientOptions={clientOptions}
        mobileClientDisplayList={mobileClientDisplayList}
        browseCount={MOBILE_CLIENT_BROWSE_COUNT}
        onSelectClient={selectClientOption}
      />

      {historyModalItem && (
        <ClientItemPriceHistoryModal
          clientId={clientId}
          item={historyModalItem}
          onClose={() => setHistoryModalItem(null)}
        />
      )}

      <OrderStockWarningModal
        open={stockWarningModalOpen}
        title={
          documentType === "pedido"
            ? "Pedido com itens sem estoque"
            : "Orçamento com itens sem estoque"
        }
        description={
          documentType === "pedido"
            ? "Confirme apenas se o cliente está ciente. A finalização da entrega continuará bloqueada enquanto faltar estoque."
            : "O orçamento será salvo com aviso visível para o admin e para você."
        }
        lines={stockWarningLines}
        requireExplicitConfirm={documentType === "pedido"}
        confirmLabel={
          documentType === "pedido"
            ? "Salvar pedido com aviso"
            : "Salvar orçamento com aviso"
        }
        onConfirm={handleConfirmStockWarningSave}
        onCancel={() => setStockWarningModalOpen(false)}
      />
    </>
  );
};

export default OrdersForm;
