import { useState, useEffect } from "react";
import FormField, { inputClassName } from "./ui/FormField";
import { PrimaryButton, SecondaryButton } from "./ui/Surface";

const BrandForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: "",
    commission_rate: "",
    logo_url: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        commission_rate: initialData.commission_rate?.toString() || "0",
        logo_url:
          initialData.logo_url != null ? String(initialData.logo_url) : "",
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Nome da representada é obrigatório";
    }
    if (formData.commission_rate === "" || formData.commission_rate === null) {
      newErrors.commission_rate = "Taxa de comissão é obrigatória";
    } else {
      const commission = parseFloat(formData.commission_rate);
      if (Number.isNaN(commission) || commission < 0 || commission > 100) {
        newErrors.commission_rate = "Taxa deve ser entre 0% e 100%";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: formData.name.trim(),
        commission_rate: parseFloat(formData.commission_rate),
        logo_url: formData.logo_url.trim() || null,
      });
    } catch (error) {
      console.error("Erro no formulário:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nome da representada" required error={errors.name}>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={inputClassName(Boolean(errors.name))}
          placeholder="Nome da marca / fornecedor"
        />
      </FormField>

      <FormField
        label="Taxa de comissão (%)"
        required
        error={errors.commission_rate}
        hint="Percentual aplicado aos produtos desta representada"
      >
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          name="commission_rate"
          value={formData.commission_rate}
          onChange={handleChange}
          className={inputClassName(Boolean(errors.commission_rate))}
          placeholder="0"
        />
      </FormField>

      <FormField
        label="URL do logo"
        hint="Opcional — PNG, JPG ou SVG público"
      >
        <input
          type="url"
          name="logo_url"
          value={formData.logo_url}
          onChange={handleChange}
          className={inputClassName()}
          placeholder="https://exemplo.com/logo.png"
        />
      </FormField>

      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
        <SecondaryButton
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "A guardar…"
            : initialData
              ? "Atualizar"
              : "Adicionar"}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default BrandForm;
