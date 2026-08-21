import FormField, { inputClassName } from "../ui/FormField";

export default function BrandSelectField({
  brands,
  selectedBrandId,
  onBrandChange,
  required = true,
  hint = "Troque aqui para buscar produtos de outra marca — sem voltar ao passo 1.",
}) {
  return (
    <FormField label="Representada" required={required} hint={hint}>
      <select
        value={selectedBrandId}
        onChange={(e) => onBrandChange(e.target.value)}
        className={`${inputClassName()} min-h-12`}
      >
        <option value="">Selecione uma representada</option>
        {Array.isArray(brands) &&
          brands.map((brand) => (
            <option key={brand.id ?? brand.name} value={String(brand.id)}>
              {brand.name}
            </option>
          ))}
      </select>
      {Array.isArray(brands) && brands.length === 0 ? (
        <p className="mt-1 text-sm text-amber-700">
          Nenhuma representada cadastrada. Cadastre em Produtos.
        </p>
      ) : null}
    </FormField>
  );
}
