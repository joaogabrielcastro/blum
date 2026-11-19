import { useId } from "react";
import FormField, { inputClassName } from "../ui/FormField";
import { PrimaryButton } from "../ui/Surface";

const UploadSection = ({
  onFileChange,
  selectedFile,
  onUpload,
  isLoading,
  error,
  brands = [],
  selectedBrandId,
  onBrandChange = () => {},
  title = "Upload",
  description = "",
  accept = "*",
  fileType = "file",
  embedded = false,
}) => {
  const fileInputId = useId();
  return (
    <div
      className={
        embedded
          ? ""
          : "mb-6 rounded-2xl border border-zinc-200/80 bg-surface p-5 shadow-soft sm:p-6"
      }
    >
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)_auto] lg:items-end">
          <FormField label="Arquivo">
            <input
              id={fileInputId}
              type="file"
              accept={accept}
              onChange={onFileChange}
              className="sr-only"
            />
            <label
              htmlFor={fileInputId}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-brand/40 bg-brand-50/60 px-4 py-3 text-sm transition-colors hover:border-brand hover:bg-brand-50"
            >
              <span className="shrink-0 rounded-lg bg-surface px-3 py-1.5 font-semibold text-brand shadow-sm">
                Escolher arquivo
              </span>
              <span className="min-w-0 truncate text-ink-muted">
                {selectedFile?.name || "Nenhum arquivo selecionado"}
              </span>
            </label>
          </FormField>

          <FormField label="Representada (marca da NF)" required>
            {brands && brands.length > 0 ? (
              <select
                value={selectedBrandId}
                onChange={onBrandChange}
                className={`${inputClassName()} md:max-w-md`}
              >
                <option value="">Selecione a representada…</option>
                {brands.map((b) => (
                  <option key={b.id ?? b} value={b.id ?? b}>
                    {b.name || b.displayName || String(b)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Nenhuma representada encontrada. Cadastre marcas em{" "}
                <strong>Produtos</strong> antes de importar a NF.
              </p>
            )}
          </FormField>

        <PrimaryButton
          type="button"
          onClick={onUpload}
          disabled={isLoading}
          className="w-full shrink-0 lg:w-auto"
        >
          {isLoading ? "Enviando…" : `Enviar ${fileType.toUpperCase()}`}
        </PrimaryButton>
        {error ? (
          <p className="text-sm text-red-600 lg:col-span-3">{String(error)}</p>
        ) : null}
      </div>
    </div>
  );
};

export default UploadSection;
