create or replace function public.admin_wallet_customers(p_query text default '') returns table(user_id uuid,full_name text,phone text,balance numeric) language plpgsql security definer set search_path='public','pg_temp' as $$ begin
if not public.is_admin() then raise exception 'VOYNU: admin access required'; end if;
return query select p.id,p.full_name,p.phone,coalesce(w.balance,0) from public.profiles p left join public.wallet_accounts w on w.user_id=p.id where coalesce(p.role,'customer')<>'admin' and (trim(coalesce(p_query,''))='' or p.full_name ilike '%'||trim(p_query)||'%' or p.phone ilike '%'||trim(p_query)||'%') order by p.created_at desc nulls last limit 50;
end; $$;
revoke all on function public.admin_wallet_customers(text) from public;
grant execute on function public.admin_wallet_customers(text) to authenticated;