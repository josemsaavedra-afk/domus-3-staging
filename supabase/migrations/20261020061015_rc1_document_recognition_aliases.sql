-- Additive documentary hints only; existing economic records and RLS are unchanged.
alter table public.people add column if not exists aliases text[] not null default '{}';
alter table public.accounts add column if not exists aliases text[] not null default '{}';
alter table public.treasury_rules add column if not exists document_payment_rules jsonb not null default '[]'::jsonb;
