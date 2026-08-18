import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import FormField, { inputClassName } from "./ui/FormField";
import { PrimaryButton, SecondaryButton } from "./ui/Surface";

const ProductsForm = ({
  product,
  brands,
  onSubmit,
  onCancel,
  defaultBrand = "",
}) => {
  const [formData, setFormData] = useState({
    name: "",
    productcode: "",
    price: "",
    brand: "",
    stock: "",
    minstock: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        productcode: product.productcode || product.productCode || "",
        price: product.price?.toString() || "",
        brand: product.brand || "",
        stock: product.stock?.toString() || "",
        minstock: product.minstock?.toString() || "0",
      });
    } else {
      setFormData({
        name: "",
        productcode: "",
        price: "",
        brand: defaultBrand || "",
        stock: "",
        minstock: "",
      });
    }
  }, [product, defaultBrand]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Nome é obrigatório";
    if (!formData.productcode.trim())
      newErrors.productcode = "Código é obrigatório";
    if (!formData.price || parseFloat(formData.price) <= 0)
      newErrors.price = "Preço deve ser maior que zero";
    if (!formData.brand) newErrors.brand = "Representada é obrigatória";
    if (formData.stock === "" || parseInt(formData.stock, 10) < 0)
      newErrors.stock = "Estoque não pode ser negativo";
    if (formData.minstock === "" || parseInt(formData.minstock, 10) < 0)
      newErrors.minstock = "Estoque mínimo não pode ser negativo";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.warning("Corrija os campos assinalados.");
      return;
    }

    setIsSubmitting(true);
    try {
      const productData = {
        name: formData.name.trim(),
        productcode: formData.productcode.trim(),
        price: parseFloat(String(formData.price).replace(",", ".")) || 0,
        brand: formData.brand,
        stock: parseInt(formData.stock, 10) || 0,
        minstock: parseInt(formData.minstock, 10) || 0,
      };
      await onSubmit(productData);
    } catch (error) {
      console.error("Erro no formulário:", error);
      let errorMessage = "Não foi possível guardar o produto. Tente novamente.";

      if (
        error.message &&
        (error.message.includes("Já existe") ||
          error.message.includes("já está em uso"))
      ) {
        errorMessage = error.message;
      } else if (error.details && Array.isArray(error.details)) {
        const fieldErrors = error.details
          .map(
            (err) =>
              `${err.path || err.param || "Campo"}: ${err.msg || err.message}`,
          )
          .join("\n");
        errorMessage = `Não foi possível guardar o produto.\n${fieldErrors}`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const getBrandName = (brand) => {
    if (typeof brand === "object" && brand !== null) {
      return brand.name || brand;
    }
    return brand;
  };

  const getBrandValue = (brand) => {
    if (typeof brand === "object" && brand !== null) {
      return brand.name || brand;
    }
    return brand;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nome do produto" required error={errors.name}>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={inputClassName(Boolean(errors.name))}
          placeholder="Nome do produto"
        />
      </FormField>

      <FormField
        label="Código"
        required
        error={errors.productcode}
        hint="Código do fabricante (único no catálogo)"
      >
        <input
          type="text"
          name="productcode"
          value={formData.productcode}
          onChange={handleChange}
          className={inputClassName(Boolean(errors.productcode))}
          placeholder="Ex.: SKU-001"
        />
      </FormField>

      <FormField label="Preço" required error={errors.price}>
        <input
          type="number"
          step="0.01"
          min="0"
          name="price"
          value={formData.price}
          onChange={handleChange}
          className={inputClassName(Boolean(errors.price))}
          placeholder="0,00"
        />
      </FormField>

      <FormField label="Representada" required error={errors.brand}>
        <select
          name="brand"
          value={formData.brand}
          onChange={handleChange}
          className={inputClassName(Boolean(errors.brand))}
          disabled={!brands || brands.length === 0}
        >
          <option value="">Selecione uma representada</option>
          {brands &&
            brands.map((brand, index) => (
              <option key={index} value={getBrandValue(brand)}>
                {getBrandName(brand)}
              </option>
            ))}
        </select>
        {(!brands || brands.length === 0) && (
          <p className="mt-1 text-xs text-amber-700">
            Cadastre uma representada antes de adicionar produtos.
          </p>
        )}
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Estoque" required error={errors.stock}>
          <input
            type="number"
            min="0"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            className={inputClassName(Boolean(errors.stock))}
            placeholder="0"
          />
        </FormField>
        <FormField label="Estoque mínimo" required error={errors.minstock}>
          <input
            type="number"
            min="0"
            name="minstock"
            value={formData.minstock}
            onChange={handleChange}
            className={inputClassName(Boolean(errors.minstock))}
            placeholder="0"
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
        <SecondaryButton
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </SecondaryButton>
        <PrimaryButton
          type="submit"
          disabled={isSubmitting || !brands || brands.length === 0}
        >
          {isSubmitting
            ? "A guardar…"
            : product
              ? "Atualizar produto"
              : "Adicionar produto"}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default ProductsForm;
