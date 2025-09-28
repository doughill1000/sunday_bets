begin;
select plan(4);

select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
set local role authenticated;

-- Missing game (should error)
do $$
begin
  begin
    perform public.lock_pick('99999999-9999-9999-9999-999999999999',
                             'home'::public.side_enum,
                             'L'::public.weight_enum,
                             'fanduel');
    perform fail('Expected error for missing game');
  exception when others then
    if position('game not found' in lower(sqlerrm)) > 0 then
      perform pass('Missing game rejected');
    else
      perform fail('Unexpected message: '||sqlerrm);
    end if;
  end;
end $$;

-- Game but no active line
insert into public.teams (id, name) values (2001,'XH') on conflict do nothing;
insert into public.teams (id, name) values (2002,'XA') on conflict do nothing;

insert into public.seasons (id, year) values (9002, 2100) on conflict do nothing;
insert into public.weeks (id, season_id, week_number, label)
values (9201, 9002, 5, 'Week 5')
on conflict do nothing;

insert into public.games (id, week_id, home_team_id, away_team_id, commence_time)
values ('44444444-4444-4444-4444-444444444444', 9201, 2001, 2002, now() + interval '1 hour')
on conflict do nothing;

do $$
begin
  begin
    perform public.lock_pick('44444444-4444-4444-4444-444444444444',
                             'home'::public.side_enum,
                             'L'::public.weight_enum,
                             'fanduel');
    perform fail('Expected error for no active line');
  exception when others then
    if position('no active line' in lower(sqlerrm)) > 0 then
      perform pass('No active line rejected');
    else
      perform fail('Unexpected message: '||sqlerrm);
    end if;
  end;
end $$;

-- Kickoff passed
insert into public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line, fetched_at)
values ('44444444-4444-4444-4444-444444444444','fanduel',2001,7.0,true, now());

-- Force commence_time in past
update public.games
  set commence_time = now() - interval '5 minutes'
where id = '44444444-4444-4444-4444-444444444444';

do $$
begin
  begin
    perform public.lock_pick('44444444-4444-4444-4444-444444444444',
                             'home'::public.side_enum,
                             'L'::public.weight_enum,
                             'fanduel');
    perform fail('Expected error after kickoff');
  exception when others then
    if position('edits are not allowed after kickoff' in lower(sqlerrm)) > 0 then
      perform pass('Kickoff lock rejected');
    else
      perform fail('Unexpected message: '||sqlerrm);
    end if;
  end;
end $$;

-- Invalid side
do $$
begin
  begin
    perform public.lock_pick('44444444-4444-4444-4444-444444444444',
                             'bogus'::public.side_enum,
                             'L'::public.weight_enum,
                             'fanduel');
    perform fail('Expected invalid side error');
  exception when others then
    if position('invalid side' in lower(sqlerrm)) > 0 then
      perform pass('Invalid side rejected');
    else
      perform fail('Unexpected message: '||sqlerrm);
    end if;
  end;
end $$;

select * from finish();
rollback;