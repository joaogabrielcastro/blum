import {
  PrimaryButton,
  SecondaryButton,
} from "../ui/Surface";

const PurchaseActions = ({
  onCancel,
  onConfirm,
  isLoading,
  confirmLabel = "Confirmar",
  secondaryAction,
}) => (
  <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
    {secondaryAction ? (
      <SecondaryButton
        type="button"
        onClick={secondaryAction.onClick}
        disabled={isLoading || secondaryAction.disabled}
        className="sm:mr-auto !border-amber-200 !text-amber-900 hover:!bg-amber-50"
      >
        {secondaryAction.label}
      </SecondaryButton>
    ) : null}
    <SecondaryButton type="button" onClick={onCancel}>
      Cancelar
    </SecondaryButton>
    <PrimaryButton type="button" onClick={onConfirm} disabled={isLoading}>
      {isLoading ? "A processar…" : confirmLabel}
    </PrimaryButton>
  </div>
);

export default PurchaseActions;
