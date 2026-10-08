import type { HistoryFormValues, RowKey } from "@/components/clinical-history/schema";
import type { RowsUpdater } from "@/components/clinical-history/row-list";

export type SetField = <K extends keyof HistoryFormValues>(key: K, value: HistoryFormValues[K]) => void;

export type FieldSectionProps = {
  values: HistoryFormValues;
  errors: Record<string, string>;
  set: SetField;
};

export type RowSectionProps<K extends RowKey> = {
  rows: HistoryFormValues[K];
  errors: Record<string, string>;
  onRowsChange: RowsUpdater<HistoryFormValues[K][number]>;
  /** Actualiza campos de una fila y limpia sus errores. */
  patch: (id: string, changes: Partial<HistoryFormValues[K][number]>) => void;
};
