import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import apiService from "../services/apiService";
import Surface, { PageHeader } from "../components/ui/Surface";
import Button from "../components/ui/Button";
import InvoiceReview from "../components/purchases/InvoiceReview";
import InvoiceList from "../components/purchases/InvoiceList";
import { useAppData } from "../context/AppDataProvider";
import { useToast } from "../context/ToastContext";
import { canUseFeature } from "../utils/planFeatures";
import { readXmlFiles } from "../utils/purchaseInvoice";

/**
 * Compras por XML de NF-e: envia um ou vários XMLs, confere nota a nota e
 * confirma. Cada confirmação soma estoque e atualiza o custo dos produtos.
 */
const PurchasesPage = ({ subscription }) => {
  const canImportPurchases = canUseFeature(subscription, "purchase-import");
  const { brands } = useAppData();
  const toast = useToast();
  const inputRef = useRef(null);

  const [queue, setQueue] = useState([]); // [{ name, xml }]
  const [current, setCurrent] = useState(null); // { name, xml, preview }
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  const loadInvoices = useCallback(async () => {
    try {
      setInvoices(await apiService.getPurchaseInvoices());
    } catch {
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  useEffect(() => {
    if (canImportPurchases) loadInvoices();
  }, [canImportPurchases, loadInvoices]);

  const openPreview = useCallback(
    async (file, brandId) => {
      setLoadingPreview(true);
      try {
        const preview = await apiService.previewPurchaseInvoice({
          xml: file.xml,
          brandId: brandId || undefined,
        });
        setCurrent({ ...file, preview });
      } catch (err) {
        toast.error(`${file.name}: ${err.message || "não foi possível ler o XML."}`);
        setCurrent(null);
      } finally {
        setLoadingPreview(false);
      }
    },
    [toast],
  );

  // Próxima nota da fila quando não há nenhuma em conferência.
  useEffect(() => {
    if (current || loadingPreview || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    openPreview(next);
  }, [current, loadingPreview, queue, openPreview]);

  const addFiles = async (fileList) => {
    const files = await readXmlFiles(fileList);
    const readable = files.filter((f) => f.xml && !f.readError);
    if (files.length === 0) {
      toast.warning("Selecione arquivos .xml de NF-e.");
      return;
    }
    if (readable.length < files.length) {
      toast.error("Alguns arquivos não puderam ser lidos.");
    }
    setQueue((prev) => [...prev, ...readable]);
  };

  const handleConfirm = async ({ brandId, items }) => {
    setSaving(true);
    try {
      const invoice = await apiService.confirmPurchaseInvoice({
        xml: current.xml,
        brandId,
        items,
      });
      toast.success(
        `NF ${invoice.number} registrada: estoque e custo de ${invoice.itemsCount} item(ns) atualizados.`,
      );
      setCurrent(null);
      loadInvoices();
    } catch (err) {
      toast.error(err.message || "Não foi possível registrar a nota.");
    } finally {
      setSaving(false);
    }
  };

  if (!canImportPurchases) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Compras" description="Entrada de notas fiscais de compra." />
        <Surface>
          <h2 className="text-lg font-semibold text-ink">Importação no plano Profissional</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            No Starter você continua com catálogo e orçamentos. A entrada de compras pelo
            XML da nota está disponível a partir do Profissional.
          </p>
          <Link
            to="/subscription"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-brand-hover"
          >
            Ver planos e fazer upgrade
          </Link>
        </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title="Compras"
        description="Envie o XML da NF-e de compra: o custo final (com frete e impostos) e o estoque são atualizados após a sua conferência."
      />

      {current ? (
        <InvoiceReview
          key={`${current.name}-${current.preview.brand?.id ?? "none"}`}
          preview={current.preview}
          fileName={current.name}
          brands={brands}
          busy={saving}
          onBrandChange={(brandId) => openPreview(current, brandId)}
          onConfirm={handleConfirm}
          onSkip={() => setCurrent(null)}
        />
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragging ? "border-brand bg-brand-50" : "border-edge bg-surface"
          }`}
        >
          <p className="text-base font-semibold text-ink">
            {loadingPreview ? "Lendo a nota…" : "Arraste os XMLs das notas aqui"}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Aceita vários arquivos de uma vez. Só NF-e (modelo 55).
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            multiple
            className="hidden"
            aria-label="Selecionar XML da nota"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            variant="primary"
            className="mt-4"
            loading={loadingPreview}
            onClick={() => inputRef.current?.click()}
          >
            Selecionar XML
          </Button>
        </div>
      )}

      {queue.length > 0 ? (
        <p className="text-sm text-ink-muted">
          {queue.length} nota(s) na fila: {queue.map((f) => f.name).join(", ")}
        </p>
      ) : null}

      <InvoiceList invoices={invoices} loading={loadingInvoices} onChanged={loadInvoices} />
    </div>
  );
};

export default PurchasesPage;
