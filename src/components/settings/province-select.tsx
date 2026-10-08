import type { ComponentProps } from "react";
import { Select } from "@/components/ui/field";
import { AR_PROVINCES } from "@/lib/constants";

/** Select de provincias argentinas (conserva un valor previo que no esté en la lista). */
export function ProvinceSelect({
  value,
  placeholder = "Elegí una provincia",
  ...props
}: Omit<ComponentProps<typeof Select>, "children" | "value"> & { value: string; placeholder?: string }) {
  const known = (AR_PROVINCES as readonly string[]).includes(value);
  return (
    <Select value={value} {...props}>
      <option value="">{placeholder}</option>
      {!known && value ? <option value={value}>{value}</option> : null}
      {AR_PROVINCES.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </Select>
  );
}
