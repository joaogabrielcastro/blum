import { useState, useEffect } from "react";
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
  allowsDecimalQuantityBrand,
  parseQuantityByBrand,
  toDateTimeLocalValue,
} from "../utils/orderFormUtils";
import OrderFormLineItems from "./orders/OrderFormLineItems";
import OrderFormMetaSection from "./orders/OrderFormMetaSection";
import OrderFormProductSearch from "./orders/OrderFormProductSearch";
import OrderFormTotals from "./orders/OrderFormTotals";
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
  const [totalPrice, setTotalPrice] = useState(0);
  const [productSearch, setProductSearch] = useState("");
  const {
    searchResults,
    setSearchResults,
    isSearching,
    clearSearch,
  } = useOrderCatalogSearch(apiService, { selectedBrand, productSearch });
  const [mobileProductPickerOpen, setMobileProductPickerOpen] =
    useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [historyModalItem, setHistoryModalItem] = useState(null);
  const [orderDateTime, setOrderDateTime] = useState(
    toDateTimeLocalValue(new Date()),
  );

  const { subtotalAfterLineDiscounts, discountAmount, netTotal } =
    computeOrderTotals(items, discount);

  const { handleItemChange, handleProductSelect, removeItem } = useOrderFormItems(
    items,
    setItems,
    {
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
      const firstBrand = lines.find((i) => i.brand)?.brand;
      if (firstBrand) setSelectedBrand(firstBrand);
      setPaymentMethod(editingOrder.paymentMethod || "");
      setOrderDateTime(toDateTimeLocalValue(editingOrder.createdAt));
    } else {
      setClientId("");
      setClientSearchTerm("");
      setDescription("");
      setItems([]);
      setDiscount(0);
      setSelectedBrand("");
      setTotalPrice(0);
      setProductSearch("");
      setSearchResults([]);
      setPaymentMethod("");
      setOrderDateTime(toDateTimeLocalValue(new Date()));
    }
  }, [editingOrder, brands, clients]);

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
    const exact = clientOptions.find(
      ({ label }) =>
        label.toLowerCase().trim() === value.toLowerCase().trim(),
    );
    if (exact) setClientId(exact.id);
    else setClientId("");
    setDesktopClientListOpen(true);
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

    // Valida estoque antes de submeter
    const stockErrors = [];
    items.forEach((item) => {
      const parsedQty = parseQuantityByBrand(item.quantity, item.brand);
      if (
        item.availableStock &&
        !allowsDecimalQuantityBrand(item.brand) &&
        parsedQty > item.availableStock
      ) {
        stockErrors.push(
          `"${item.productName}": Solicitado ${parsedQty}, Disponível ${item.availableStock}`,
        );
      }
    });

    if (stockErrors.length > 0) {
      toast.warning(
        `Estoque insuficiente para os seguintes produtos:\n\n${stockErrors.join(
          "\n",
        )}\n\nPor favor, ajuste as quantidades antes de continuar.`,
      );
      return;
    }

    try {
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
        items: items.map((item) => ({
          ...item,
          price: parseFloat(item.price) || 0,
          quantity: parseQuantityByBrand(item.quantity, item.brand),
          lineDiscount: Math.min(
            100,
            Math.max(0, parseFloat(item.lineDiscount) || 0),
          ),
        })),
        discount: parseFloat(discount) || 0,
        totalprice: parseFloat(netTotal) || 0,
        document_type: editingOrder
          ? editingOrder.documentType === "pedido"
            ? "pedido"
            : "orcamento"
          : "orcamento",
      };

      orderData.payment_method = paymentMethod || null;
      if (orderDateTime) {
        orderData.createdat = new Date(orderDateTime).toISOString();
      }

      if (editingOrder) {
        await apiService.updateOrder(editingOrder.id, orderData);
        toast.success("Pedido atualizado com sucesso.");
      } else {
        await apiService.createOrder(orderData);
        toast.success("Orçamento criado com sucesso.");
      }

      onOrderAdded();
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

  return (
    <>
      <div className="w-full max-w-none md:max-w-[1400px] md:mx-auto px-0 sm:px-0 md:px-8 lg:px-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-5 sm:mb-10 px-3 md:px-0 pt-1 md:pt-0">
          {editingOrder
            ? editingOrder.documentType === "orcamento"
              ? "Editar orçamento"
              : "Editar pedido"
            : "Novo orçamento"}
        </h2>
        {editingOrder?.status === "Entregue" ? (
          <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
            <p className="text-sm font-semibold">Pedido entregue em edição</p>
            <p className="mt-1 text-sm">
              Ao salvar este pedido, o sistema ajusta o estoque automaticamente
              conforme os itens adicionados, removidos ou alterados.
            </p>
          </div>
        ) : null}
        <div className="w-full">
          <form
            id="order-form-main"
            onSubmit={handleSubmit}
            className="bg-white rounded-none md:rounded-xl shadow-sm md:shadow-lg border-y border-gray-200 md:border border-gray-200 p-3 sm:p-5 md:p-10 lg:p-12 space-y-8 sm:space-y-10 w-full pb-28 md:pb-10"
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
            selectedBrand={selectedBrand}
            onBrandChange={setSelectedBrand}
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
          <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 md:p-6 space-y-5">
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
        <div className="max-w-4xl mx-auto flex flex-col-reverse gap-2">
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
          const exact = clientOptions.find(
            ({ label }) =>
              label.toLowerCase().trim() === value.toLowerCase().trim(),
          );
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
    </>
  );
};

export default OrdersForm;
