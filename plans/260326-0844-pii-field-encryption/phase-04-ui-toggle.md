# Phase 4: UI Toggle Reveal

**Priority:** High | **Effort:** M | **Status:** Pending | **Blocked by:** Phase 3

## Overview

UI shows masked PII by default. Eye icon toggle to reveal/hide actual values.

## Context Links

- `src/app/report/customers/[id]/components/khcn-profile-card.tsx` — InfoChip displays

## Implementation Steps

### Step 1: Create `PiiField` component

New file: `src/components/ui/pii-field.tsx`

```tsx
"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PiiFieldProps = {
  label: string;
  maskedValue: string;      // from API (masked)
  customerId: string;       // for reveal fetch
  fieldKey: string;         // "customer_code" | "phone" | "cccd"
  className?: string;
};

export function PiiField({ label, maskedValue, customerId, fieldKey, className }: PiiFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const [rawValue, setRawValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    if (rawValue) {
      setRevealed(true);
      return;
    }
    // Fetch raw value
    setLoading(true);
    const res = await fetch(`/api/customers/${customerId}?reveal=${fieldKey}`);
    const data = await res.json();
    if (data.ok) {
      setRawValue(data.customer[fieldKey]);
      setRevealed(true);
    }
    setLoading(false);
  };

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="font-mono text-sm">{revealed ? rawValue : maskedValue}</span>
      <button onClick={toggle} className="p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded" title={revealed ? "Ẩn" : "Hiện"}>
        {loading ? "..." : revealed ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </span>
  );
}
```

### Step 2: Replace InfoChip in khcn-profile-card.tsx

```tsx
// Before:
<InfoChip label="CIF" value={customer.customer_code} />

// After:
<PiiField label="CIF" maskedValue={customer.customer_code} customerId={customerId} fieldKey="customer_code" />
<PiiField label="CCCD" maskedValue={customer.cccd} customerId={customerId} fieldKey="cccd" />
<PiiField label="SĐT" maskedValue={customer.phone} customerId={customerId} fieldKey="phone" />
```

### Step 3: Handle forms

Forms need raw values for editing. Options:
- Form fetch with `?reveal=all` on mount
- OR: form auto-reveals for editor/admin roles

Simplest: form components fetch with reveal=all since they need real data to edit.

## Todo

- [ ] Create `src/components/ui/pii-field.tsx`
- [ ] Replace InfoChip with PiiField in khcn-profile-card.tsx
- [ ] Ensure form components fetch with reveal=all
- [ ] Compile check
- [ ] Visual test: masked by default, eye toggle works

## Success Criteria

- [ ] Profile card shows `****1234` for CIF, `091****678` for phone
- [ ] Click eye icon → shows real value
- [ ] Click again → hides
- [ ] Forms still work with real editable values
