import FormField, { inputClassName } from "../ui/FormField";

const PurchaseDateSection = ({ date, onDateChange }) => (
  <div className="mb-6 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft sm:p-6">
    <h3 className="mb-3 text-base font-semibold text-zinc-900">
      Data da compra
    </h3>
    <FormField label="Quando os produtos foram comprados">
      <input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        className={`${inputClassName()} max-w-xs`}
      />
    </FormField>
  </div>
);

export default PurchaseDateSection;
