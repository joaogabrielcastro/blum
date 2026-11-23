import { useEffect, useState } from "react";
import Dialog from "../ui/Dialog";
import Button from "../ui/Button";

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR");

/**
 * Exclusão definitiva de uma representada junto com todo o catálogo dela.
 * Exige digitar o nome da representada para liberar o botão.
 */
export default function DeleteBrandWithProductsDialog({
  brand,
  onConfirm,
  onCancel,
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTyped("");
    setBusy(false);
  }, [brand?.id]);

  if (!brand) return null;

  const count = Number(brand.productCount) || 0;
  const countLabel = `${count.toLocaleString("pt-BR")} ${
    count === 1 ? "produto" : "produtos"
  }`;
  const matches = normalize(typed) === normalize(brand.name);

  const handleConfirm = async () => {
    if (!matches || busy) return;
    setBusy(true);
    try {
      await onConfirm(brand);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={busy ? undefined : onCancel}
      dismissible={!busy}
      size="md"
      title="Excluir representada e produtos?"
      description={`“${brand.name}” tem ${countLabel} no catálogo.`}
      footer={
        <>
          <Button
            onClick={onCancel}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!matches}
            loading={busy}
            className="w-full sm:w-auto"
          >
            Excluir tudo
          </Button>
        </>
      }
    >
      <form
        className="space-y-3 text-sm text-ink"
        onSubmit={(event) => {
          event.preventDefault();
          handleConfirm();
        }}
      >
        <ul className="list-disc space-y-1 pl-5 text-ink-muted">
          <li>
            A representada e os {countLabel} serão apagados{" "}
            <strong className="text-ink">de forma definitiva</strong>.
          </li>
          <li>
            Orçamentos, pedidos e relatórios antigos continuam com nome, marca e
            preço dos itens.
          </li>
        </ul>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">
            Para confirmar, digite o nome da representada:{" "}
            <strong className="text-ink">{brand.name}</strong>
          </span>
          <input
            type="text"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            disabled={busy}
            autoComplete="off"
            aria-label="Nome da representada para confirmar"
            className="w-full rounded-xl border border-edge bg-surface px-3 py-2 text-sm"
          />
        </label>
      </form>
    </Dialog>
  );
}
