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
}) => {
  return (
    <div className="mb-6 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft sm:p-6">
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      ) : null}

      <div className="mt-4 flex flex-col items-stretch gap-4 md:flex-row md:items-end">
        <div className="min-w-0 flex-1 space-y-4">
          <FormField
            label="Arquivo"
            hint={selectedFile ? selectedFile.name : undefined}
          >
            <input
              type="file"
              accept={accept}
              onChange={onFileChange}
              className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
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

          {error ? (
            <p className="text-sm text-red-600">{String(error)}</p>
          ) : null}
        </div>

        <PrimaryButton
          type="button"
          onClick={onUpload}
          disabled={isLoading}
          className="shrink-0"
        >
          {isLoading ? "A enviar…" : `Enviar ${fileType.toUpperCase()}`}
        </PrimaryButton>
      </div>
    </div>
  );
};

export default UploadSection;
