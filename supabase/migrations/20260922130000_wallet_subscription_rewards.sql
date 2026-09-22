create or replace function public.admin_set_subscription_wallet_reward(p_id uuid,p_reward_amount numeric)
returns public.subscription_plans language plpgsql security definer set search_path='public','pg_temp' as $$ declare v public.subscription_plans;
begin
if not public.is_admin() then raise exception 'VOYNU: admin access required'; end if;
if p_reward_amount<0 then raise exception 'VOYNU: subscription wallet reward cannot be negative'; end if;
update public.subscription_plans set wallet_reward_amount=round(p_reward_amount,2),updated_at=now() where id=p_id returning * into v;
if not found then raise exception 'VOYNU: subscription plan not found'; end if;
return v;
end; $$;
revoke all on function public.admin_set_subscription_wallet_reward(uuid,numeric) from public;
grant execute on function public.admin_set_subscription_wallet_reward(uuid,numeric) to authenticated;

create or replace function public.issue_subscription_wallet_reward()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare v_reward numeric(12,2); v_plan_id uuid; v_expiry timestamptz;
begin
if new.payment_status='paid' and new.status='active' and (old.payment_status is distinct from new.payment_status or old.status is distinct from new.status) then
  select sp.id,sp.wallet_reward_amount into v_plan_id,v_reward from public.subscription_plans sp where sp.id=new.plan_id;
  if coalesce(v_reward,0)>0 then
    select case when ws.reward_expiry_days>0 then now()+(ws.reward_expiry_days||' days')::interval else null end into v_expiry from public.wallet_settings ws where ws.id=true;
    perform public.wallet_credit(new.user_id,v_reward,'reward','subscription_reward','subscription_reward:'||new.id::text||':'||v_plan_id::text,null,new.id,'VOYNU wallet reward for activating a paid commute subscription',v_expiry,null);
  end if;
end if;
return new;
end; $$;
drop trigger if exists trg_issue_subscription_wallet_reward on public.commute_subscriptions;
create trigger trg_issue_subscription_wallet_reward after update on public.commute_subscriptions for each row execute function public.issue_subscription_wallet_reward();