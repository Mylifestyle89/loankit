import type { ValidationResponse } from "../types";

type ValidationResultPanelProps = {
  t: (key: string) => string;
  validation?: ValidationResponse["validation"];
};

export function ValidationResultPanel({ t, validation }: ValidationResultPanelProps) {
  return (
    <div className="rounded-xl border border-coral-tree-200 bg-white p-4">
      <h3 className="text-sm font-semibold">{t("mapping.validationResult")}</h3>
      {validation ? (
        <pre className="mt-2 overflow-auto rounded-md bg-coral-tree-950 p-3 text-xs text-coral-tree-50">
          {JSON.stringify(validation, null, 2)}
        </pre>
      ) : (
        <p className="mt-1 text-sm text-coral-tree-600">{t("mapping.noValidation")}</p>
      )}
    </div>
  );
}
