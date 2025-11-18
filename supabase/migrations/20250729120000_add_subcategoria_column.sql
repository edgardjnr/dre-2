/*
# [Operation] Add `subcategoria` column to `contas_contabeis` table
This migration adds a new text column named `subcategoria` to the `contas_contabeis` table to store optional subcategories for accounting entries.

## Query Description:
This is a non-destructive operation that adds a new, nullable column to an existing table. It will not affect existing data, and all current rows will have a `NULL` value for this new column by default.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (The column can be dropped)

## Structure Details:
- Table Affected: `public.contas_contabeis`
- Column Added: `subcategoria` (Type: TEXT, Nullable: YES)

## Security Implications:
- RLS Status: Unchanged. Existing RLS policies on the table will apply to this new column as well.
- Policy Changes: No.
- Auth Requirements: None.

## Performance Impact:
- Indexes: None added.
- Triggers: None added.
- Estimated Impact: Negligible. Adding a nullable column is a fast metadata-only change.
*/

ALTER TABLE public.contas_contabeis
ADD COLUMN IF NOT EXISTS subcategoria TEXT;
