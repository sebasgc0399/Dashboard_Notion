import { Select } from "@base-ui/react/select";
import { Check } from "lucide-react";
import { getNotionColor } from "@/constants";
import { cn } from "@/lib/utils";
import type { SchemaOption } from "@/types";

const CLEAR_VALUE = "__clear__";

export interface SelectPopoverProps {
  options: SchemaOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** If true, adds a "clear" item that calls onChange(null). */
  allowClear?: boolean;
  /** Label for the clear item. Default: "Sin valor". */
  clearLabel?: string;
  disabled?: boolean;
  /** Visual content of the trigger button (e.g. a chip). */
  children: React.ReactNode;
  /** Optional className for the trigger button. */
  triggerClassName?: string;
}

export function SelectPopover({
  options,
  value,
  onChange,
  allowClear = false,
  clearLabel = "Sin valor",
  disabled = false,
  children,
  triggerClassName,
}: SelectPopoverProps) {
  const handleValueChange = (next: string | null) => {
    if (next === null || next === CLEAR_VALUE) {
      onChange(null);
    } else {
      onChange(next);
    }
  };

  return (
    <Select.Root
      value={value ?? ""}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <Select.Trigger
        disabled={disabled}
        className={cn(
          "inline-flex cursor-pointer items-center border-0 bg-transparent p-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
          triggerClassName
        )}
      >
        {children}
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={4} alignItemWithTrigger={false}>
          <Select.Popup className="z-50 min-w-[160px] max-h-[300px] overflow-y-auto rounded-md border border-border-subtle bg-bg-elevated p-1 shadow-lg">
            {options.map((opt) => {
              const colors = getNotionColor(opt.color);
              return (
                <Select.Item
                  key={opt.name}
                  value={opt.name}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-text-primary outline-none data-[highlighted]:bg-bg-hover"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: colors.text }}
                  />
                  <Select.ItemText>{opt.name}</Select.ItemText>
                  <Select.ItemIndicator className="ml-auto">
                    <Check className="size-3 text-text-secondary" />
                  </Select.ItemIndicator>
                </Select.Item>
              );
            })}
            {allowClear && (
              <Select.Item
                value={CLEAR_VALUE}
                className="mt-1 flex cursor-pointer items-center gap-2 rounded border-t border-border-subtle px-2 py-1.5 pt-2 text-xs text-text-muted outline-none data-[highlighted]:bg-bg-hover"
              >
                <Select.ItemText>{clearLabel}</Select.ItemText>
              </Select.Item>
            )}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
