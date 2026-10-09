-- RC1 additive Staging change. Existing dates, records and policies remain intact.
alter table public.movement_occurrence_states add column if not exists document_date date;
comment on column public.movement_occurrence_states.document_date is 'Economic/documentary date for this occurrence. Independent of actual_date and rescheduled_date.';
alter table public.movement_series add constraint rc1_professional_income_scope check (
 type <> 'income' or (
 activity_project_id is null and nullif(btrim(invoice_number),'') is null
 and coalesce(counterparty,'') !~* '(lyreco|onlogist)'
 ) or expense_scope is not distinct from 'business'
) not valid;
