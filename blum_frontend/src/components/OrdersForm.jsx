import { useState, useEffect, useMemo } from "react";
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
} from "../utils/orderFormUtils";
import OrderFormLineItems from "./orders/OrderFormLineItems";
import OrderFormMetaSection from "./orders/OrderFormMetaSection";
import OrderFormProductSearch from "./orders/OrderFormProductSearch";
import OrderFormTotals from "./orders/OrderFormTotals";
import OrderStockWarningModal from "./orders/OrderStockWarningModal";
import { findClientOptionByTypedValue } from "../utils/clients";
import { getStockWarningLines } from "../utils/orderStockWarnings";
import {
  OrderMobileClientPicker,
  OrderMobileProductPicker,
} from "./orders/OrderMobilePickers";

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

  const { handleItemChange, handleProductSelect, removeItem } = useOrderFormItems(
    items,
    setItems,
    {
      selectedBrandId,
      setProductSearch,
      setSearchResults,
      setMobileProductPickerOpen,
    },
  );
  const canApplyGeneralDiscount =
    paymentMethod === "pix" || paymentMethod === "dinheiro";
  const canEditUnitPrice = userRole === "admin";

  useEffect(() => {
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
    } else {
      setClientId("");
      setClientSearchTerm("");
      setDescription("");
      setItems([]);
      setDiscount(0);
      setSelectedBrand("");
      setSelectedBrandId("");
      setTotalPrice(0);
      setProductSearch("");
      setSearchResults([]);
      setPaymentMethod("");
      setOrderDateTime(toDateTimeLocalValue(new Date()));
    }
    // Apenas editingOrder deve resetar o formulário; mudanças de referência
    // em brands/clients (re-render do pai) não podem apagar o que foi digitado.
  }, [editingOrder]);

  useOrderEditHydration(apiService, editingOrder, items, setItems);

  useEffect(() => {
    // Atualiza o total sempre que items ou discount mudar
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
          price: parseFloat(item.price) || 0,
          quantity: parseQuantityByBrand(item.quantity, item.brand),
          lineDiscount: Math.min(
            100,
            Math.max(0, parseFloat(item.lineDiscount) || 0),
          ),
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
    if (!clientId) {
      toast.warning("Por favor, selecione um cliente.");
      return;
    }

    if (!selectedBrand) {
      toast.warning("Por favor, selecione uma representada.");
      return;
    }

    if (items.length === 0) {
      toast.warning("Adicione pelo menos um item ao pedido.");
      return;
    }

    if (items.some((item) => !item.productName || !item.price)) {
      toast.warning("Por favor, preencha todos os campos dos produtos.");
      return;
    }

    const missingQty = items.some((item) => {
      const q = parseQuantityByBrand(item.quantity, item.brand);
      return !q || q <= 0;
    });
    if (missingQty) {
      toast.warning(
        "Informe a quantidade de cada produto (maior que zero) antes de guardar.",
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
      toast.warning("Para PIX ou dinheiro, o desconto geral máximo permitido é 2%.");
      return;
    }
    if (!userId) {
      toast.warning(
        "ID do usuário não disponível. Por favor, tente fazer login novamente.",
      );
      return;
    }
    if (!orderDateTime || Number.isNaN(new Date(orderDateTime).getTime())) {
      toast.warning("Informe uma data/hora válida para o pedido.");
      return;
    }

    if (hasLiveStockWarnings) {
      setStockWarningModalOpen(true);
      return;
    }

    try {
      await saveOrder();
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);

      // Mostra detalhes de validação se disponíveis
      let errorMessage = `Falha ao ${
        editingOrder ? "atualizar" : "criar"
      } o pedido.`;

      if (error.details && Array.isArray(error.details)) {
        const fieldErrors = error.details
          .map(
            (err) =>
              `${err.path || err.param || "Campo"}: ${err.msg || err.message}`,
          )
          .join("\n");
        errorMessage += `\n\nErros de validação:\n${fieldErrors}`;
      } else if (error.message) {
        errorMessage += `\n${error.message}`;
      }

      toast.error(errorMessage);
    }
  };

  const handleConfirmStockWarningSave = async () => {
    try {
      await saveOrder({
        confirmStockWarning: documentType === "pedido",
      });
      setStockWarningModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      toast.error(error?.message || "Falha ao salvar o pedido.");
    }
  };

  return (
    <>
      <div className="w-full min-w-0 max-w-none">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-3 sm:mb-5 pt-0.5">
          {editingOrder
            ? editingOrder.documentType === "orcamento"
              ? "Editar orçamento"
              : "Editar pedido"
            : "Novo orçamento"}
        </h2>
        {editingOrder?.status === "Entregue" ? (
          <div className="mb-4 sm:mb-5 rounded-lg border border-amber-300 bg-amber-50 px-3 sm:px-4 py-3 text-amber-900">
            <p className="text-sm font-semibold">Pedido entregue em edição</p>
            <p className="mt-1 text-sm">
              Ao salvar este pedido, o sistema ajusta o estoque automaticamente
              conforme os itens adicionados, removidos ou alterados.
            </p>
          </div>
        ) : null}
        {hasLiveStockWarnings ? (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 sm:px-4 py-3 text-amber-950">
            <p className="text-sm font-semibold">
              Atenção: {stockWarningLines.length} item(ns) sem estoque suficiente
            </p>
            <p className="mt-1 text-sm text-amber-900/90">
              {documentType === "pedido"
                ? "Ao salvar o pedido será necessária confirmação explícita. A entrega continuará bloqueada até haver estoque."
                : "Você pode salvar o orçamento; o aviso ficará registrado para o admin."}
            </p>
          </div>
        ) : null}
        <div className="w-full">
          <form
            id="order-form-main"
            onSubmit={handleSubmit}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 space-y-5 sm:space-y-7 w-full min-w-0 overflow-hidden pb-28 md:pb-8"
          >
          <OrderFormMetaSection
            brands={brands}
            clientId={clientId}
            clientOptions={clientOptions}
            clientSearchTerm={clientSearchTerm}
            onClientSearchTermChange={handleClientSearchTermChange}
            onOpenMobileClientPicker={() => setMobileClientPickerOpen(true)}
            onResetClient={resetClient}
            mobileClientPickerOpen={mobileClientPickerOpen}
            desktopClientListOpen={desktopClientListOpen}
            onDesktopClientListOpen={setDesktopClientListOpen}
            filteredClientOptions={filteredClientOptions}
            onSelectClient={selectClientOption}
            selectedBrandId={selectedBrandId}
            onBrandChange={handleBrandChange}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={handlePaymentMethodChange}
            orderDateTime={orderDateTime}
            onOrderDateTimeChange={setOrderDateTime}
            description={description}
            onDescriptionChange={setDescription}
            discount={discount}
            onDiscountChange={setDiscount}
            canApplyGeneralDiscount={canApplyGeneralDiscount}
          />

          {/* --- Seção de Produtos (mobile: tela cheia; desktop: dropdown) --- */}
          <section className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 md:p-5 space-y-4 sm:space-y-5 min-w-0">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                Produtos do pedido
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Busque e adicione itens, depois ajuste quantidade, desconto e preço.
              </p>
            </div>
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

          <OrderFormLineItems
            items={items}
            clientId={clientId}
            canEditUnitPrice={canEditUnitPrice}
            onItemChange={handleItemChange}
            onRemoveItem={removeItem}
            onOpenHistory={setHistoryModalItem}
          />

          </section>

          <OrderFormTotals
            subtotalAfterLineDiscounts={subtotalAfterLineDiscounts}
            discount={discount}
            discountAmount={discountAmount}
            totalPrice={totalPrice}
          />

          {/* --- Ações (desktop) --- */}
          <div className="hidden md:flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto min-h-11 px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto min-h-11 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              {editingOrder ? "Atualizar Pedido" : "Criar Pedido"}
            </button>
          </div>
        </form>
      </div>

      {/* Barra fixa: acoes no mobile */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-3 pt-3 md:hidden"
        style={{
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="w-full flex flex-col-reverse gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-11 px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="order-form-main"
            className="w-full min-h-12 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            {editingOrder ? "Atualizar Pedido" : "Criar Pedido"}
          </button>
        </div>
      </div>
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
