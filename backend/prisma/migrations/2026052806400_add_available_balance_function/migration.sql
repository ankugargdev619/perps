-- Function to calculate the balance available for use 
CREATE OR REPLACE FUNCTION public.get_usable_balance(p_account_id text)
RETURNS numeric(36,18)
LANGUAGE sql
STABLE
AS $$
  SELECT (
    COALESCE(a."balance", 0)::numeric(36,18)
    - COALESCE(a."lockedMargin",0)::numeric(36,18)
    - COALESCE(a."withdrawalReserve",0)::numeric(36,18)
  )::numeric(36,18)
  FROM "Account" a
  WHERE a."id" = p_account_id;
$$;
