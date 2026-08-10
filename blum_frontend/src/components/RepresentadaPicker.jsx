import { useMemo, useState } from "react";
import { normalizeBrand } from "../utils/brandUtils";
import FormField, { inputClassName } from "./ui/FormField";
import {
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  GhostButton,
} from "./ui/Surface";
import EmptyState from "./EmptyState";
import ListPageSkeleton from "./ListPageSkeleton";

const BuildingIcon = ({ className = "h-6 w-6" }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
    />
  </svg>
);

/**
 * Lista de representadas → ao entrar, abre o catálogo.
 */
const RepresentadaPicker = ({
  brands = [],
  loading,
  onSelect,
  onCadastrar,
  userRole,
  brandsRaw = [],
  onEditBrand,
  onRequestDeleteBrand,
  confirmDelete,
  deleteType,
  onConfirmDelete,
  onCancelDelete,
}) => {
  const [query, setQuery] = useState("");
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [editCommission, setEditCommission] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");

  const isAdmin = userRole === "admin";

  const normalized = useMemo(
    () => (brands || []).map(normalizeBrand),
    [brands],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((b) => {
      const idStr = String(b.id ?? "").toLowerCase();
      return (
        b.displayName.toLowerCase().includes(q) ||
        (idStr && idStr.includes(q))
      );
    });
  }, [normalized, query]);

  const handleEditClick = (brand, e) => {
    e.stopPropagation();
    setEditingBrandId(brand.id);
    setEditCommission(String(brand.commission ?? ""));
    setEditLogoUrl(
      brand.logoUrl || brand.raw?.logo_url || brand.raw?.logoUrl || "",
    );
  };

  const handleSaveEdit = async (brandId, e) => {
    e.preventDefault();
    const original = brandsRaw.find((b) => {
      const n = normalizeBrand(b);
      return String(n.id) === String(brandId);
    });
    if (original) {
      const parsed = parseFloat(
        String(editCommission).trim().replace(",", "."),
      );
      const commission_rate = Number.isFinite(parsed)
        ? Math.min(100, Math.max(0, parsed))
        : 0;
      await onEditBrand(original.name, {
        name: original.name,
        commission_rate,
        logo_url: editLogoUrl.trim() || null,
      });
    }
    setEditingBrandId(null);
    setEditCommission("");
    setEditLogoUrl("");
  };

  const handleCommissionChange = (e) => {
    const value = e.target.value;
    const normalizedValue = value.replace(",", ".");
    if (
      /^\d*[.,]?\d*$/.test(value) &&
      (value === "" || parseFloat(normalizedValue) <= 100)
    ) {
      setEditCommission(value);
    }
  };

  if (loading) {
    return <ListPageSkeleton variant="list" rows={4} />;
  }

  if (normalized.length === 0) {
    return (
      <div className="rounded-2xl border border-edge bg-surface p-8 text-center shadow-soft">
        <EmptyState
          title="Nenhuma representada cadastrada"
          message="Cadastre uma representada para começar a usar o catálogo."
          actionLabel={isAdmin && onCadastrar ? "Cadastrar representada" : undefined}
          onAction={isAdmin ? onCadastrar : undefined}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-edge bg-surface shadow-soft">
      <div className="border-b border-edge bg-surface-muted/80 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <BuildingIcon />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
                Representadas
              </h2>
              <p className="text-xs text-ink-muted">
                Escolha uma marca para abrir o catálogo
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:max-w-2xl">
            {isAdmin && onCadastrar ? (
              <PrimaryButton type="button" onClick={onCadastrar} className="shrink-0">
                Nova representada
              </PrimaryButton>
            ) : null}
            <div className="relative min-w-[160px] max-w-md flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-4 w-4 text-ink-muted"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar…"
                aria-label="Filtrar representadas"
                className="block w-full rounded-xl border border-edge bg-surface py-2.5 pl-9 pr-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      </div>

      {isAdmin && confirmDelete && deleteType === "brand" ? (
        <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm sm:mx-5">
          <p className="font-semibold text-amber-950">
            Excluir representada &quot;{confirmDelete}&quot;?
          </p>
          <p className="mt-1 text-xs text-amber-900/90">
            Produtos vinculados a esta representada podem ser afetados.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <DangerButton type="button" onClick={onConfirmDelete} className="!py-2 !text-sm">
              Confirmar exclusão
            </DangerButton>
            <SecondaryButton type="button" onClick={onCancelDelete} className="!py-2 !text-sm">
              Cancelar
            </SecondaryButton>
          </div>
        </div>
      ) : null}

      <ul className="divide-y divide-edge">
        {filtered.length === 0 ? (
          <li className="px-5 py-12 text-center text-sm text-ink-muted">
            Nenhuma representada encontrada para &quot;{query.trim()}&quot;.
          </li>
        ) : (
          filtered.map((brand) => (
            <li
              key={brand.id}
              className="relative px-4 py-4 transition-colors hover:bg-surface-muted/80 sm:px-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {brand.logoUrl ? (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-edge bg-surface">
                      <img
                        src={brand.logoUrl}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-edge bg-brand-50 text-base font-semibold text-brand">
                      {(brand.displayName || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-ink">
                      {brand.displayName}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      Comissão {brand.commission}%
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                  <PrimaryButton
                    type="button"
                    onClick={() => onSelect(brand)}
                    className="!px-4 !py-2 !text-sm"
                  >
                    Abrir catálogo
                  </PrimaryButton>
                  {isAdmin ? (
                    <>
                      <SecondaryButton
                        type="button"
                        onClick={(e) => handleEditClick(brand, e)}
                        className="!px-3 !py-2 !text-sm"
                      >
                        Alterar
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestDeleteBrand(brand.displayName);
                        }}
                        className="!border-red-200 !px-3 !py-2 !text-sm !text-red-700 hover:!bg-red-50"
                      >
                        Excluir
                      </SecondaryButton>
                    </>
                  ) : null}
                </div>
              </div>

              {isAdmin && editingBrandId === brand.id ? (
                <div className="mt-4 max-w-sm rounded-xl border border-edge bg-surface p-4 shadow-soft">
                  <h4 className="mb-3 text-sm font-semibold text-ink">
                    Editar — {brand.displayName}
                  </h4>
                  <FormField label="URL do logo" className="mb-3">
                    <input
                      type="url"
                      value={editLogoUrl}
                      onChange={(e) => setEditLogoUrl(e.target.value)}
                      className={inputClassName()}
                      placeholder="https://…"
                    />
                  </FormField>
                  <FormField label="Comissão (%)" className="mb-3">
                    <input
                      type="text"
                      value={editCommission}
                      onChange={handleCommissionChange}
                      className={inputClassName()}
                      placeholder="0"
                    />
                  </FormField>
                  <div className="flex justify-end gap-2">
                    <GhostButton
                      type="button"
                      onClick={() => {
                        setEditingBrandId(null);
                        setEditCommission("");
                        setEditLogoUrl("");
                      }}
                      className="!py-2 !text-sm"
                    >
                      Cancelar
                    </GhostButton>
                    <PrimaryButton
                      type="button"
                      onClick={(e) => handleSaveEdit(brand.id, e)}
                      className="!py-2 !text-sm"
                    >
                      Salvar
                    </PrimaryButton>
                  </div>
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default RepresentadaPicker;
