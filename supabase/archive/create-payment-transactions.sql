create table if not exists payment_transactions (
  id uuid default gen_random_uuid() primary key,
  reference text unique not null,
  amount_in_cents bigint not null,
  currency text not null,
  status text default 'PENDING',
  invoice_ids jsonb not null, -- Array of invoice IDs
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS (though this table is mostly backend-only)
alter table payment_transactions enable row level security;

-- Allow authenticated users (clients) to view their own transactions? 
-- For now, maybe just service role access is enough for the webhook.
-- But if we want to show transaction history later, we might need policies.
-- Let's keep it simple for now: Service Role has full access.
