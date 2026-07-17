# SMR Module Plan

Add a new "SMR" section to the sidebar for Fleet Manager, Supplier, and Customer portals, listing SMR work items with full CRUD and a rich edit dialog.

## 1. Navigation

Add `{ label: "SMR", href: "/smr", icon: Wrench }` to all three roles in `src/lib/navigation.ts`, placed alphabetically near "Assets / Vehicles". Register the `/smr` route in `src/App.tsx` pointing to a new `src/pages/SMR.tsx`.

## 2. Database (migration)

New tables in `public`:

- `smr_items` — SMR header
  - `name text`, `valid_from timestamptz not null default now()`, `valid_to timestamptz null`
  - `applicable_asset_types text[]`, `applicable_makes text[]`, `applicable_models text[]`, `applicable_derivatives text[]`, `applicable_weight_bands text[]`, `applicable_axles int[]` (empty array = "all")
  - `fixed_price boolean not null default false`
  - `labour_net numeric(12,2)`, `parts_net numeric(12,2)`, `vat_band_id uuid references vat_bands`, `total numeric(12,2)`
  - `supplier_id uuid` / `fleet_id uuid` for tenancy (nullable — visible to all roles by default; scoped later if needed)
  - Standard `id, created_at, updated_at` + updated_at trigger

- `smr_work_details` — line items belonging to an SMR
  - `smr_item_id uuid references smr_items on delete cascade`
  - `name text not null`, `code text`, `checklist_id uuid null`, `document_required boolean default false`
  - `reason_for_work text not null` (enum-like: Routine/Damage/Repair/Warranty)
  - `work_type text not null` (Safety Inspection/Service/MOT/Maintenance/LOLER/Tacho/Other)
  - `work_type_other text` (only when work_type = 'Other')
  - `posting_definition_id uuid null` (referenced free-text for now — no posting_definitions table exists)
  - `labour_hours numeric(6,2) not null`
  - `vat_band_id uuid references vat_bands`
  - `sort_order int default 0`

GRANTs for `authenticated` + `service_role`, RLS enabled. Policies: authenticated users can select/insert/update/delete (matches existing tables like `work_categories`).

Note: no `posting_definitions` or `checklists` table exists in the project. I will render those as free-text inputs styled as dropdowns with a placeholder ("no options available"), so the UI is ready when those catalogues arrive.

## 3. SMR list page (`src/pages/SMR.tsx`)

Same visual style as `Suppliers`/`Customers`:
- Header + "Add SMR" button
- Search + sortable data table columns: Name, Valid from, Valid to, Fixed price (Yes/No), Work items count, Actions (Edit/Delete)
- Row click opens edit dialog; delete confirmation via AlertDialog
- Uses React Query hooks in a new `src/hooks/useSMR.ts`

## 4. Add/Edit dialog (`src/components/SMRDialog.tsx`)

Sections rendered as `CollapsibleCard`s, pinned Save/Cancel `DialogFooter`, mandatory `*` labels, standard input styling.

- Section 1 SMR Details: Name, Valid from* (DatePicker default now), Valid to (DatePicker)
- Section 2 Applicable Vehicles: multi-select for Asset type, Make, Model, Derivative, Weight band, No of axles — default all selected. Options sourced by distinct values from `vehicles`.
- Section 3 Fixed Price Details: toggle Fixed price. When on, show Labour NET*, Parts NET*, VAT Band* (from `useVatBands`), Total (readonly, computed = labour + parts + (labour+parts) * vat%). When off, disable.
- Section 4 Work Details: inline sub-table (like supplier contacts) with Add/Edit/Delete. Row fields listed above. "Other" work type reveals a text input; posting definition and checklist rendered as searchable selects (empty options for now).

## 5. Files to add / change

Add:
- `supabase/migrations/<ts>_smr.sql`
- `src/hooks/useSMR.ts`
- `src/pages/SMR.tsx`
- `src/components/SMRDialog.tsx`

Change:
- `src/lib/navigation.ts` — add SMR entry to all three roles
- `src/App.tsx` — register `/smr` route

## Open questions

1. Tenancy: should SMR items be per-supplier (created by a supplier and visible to that supplier + linked fleets/customers), or global to the workspace like `work_categories`? Default in this plan: global, authenticated CRUD.
2. "Posting definition" and "Checklist" — no matching table exists. OK to render as empty searchable dropdowns for now and wire them once those catalogues are built?
