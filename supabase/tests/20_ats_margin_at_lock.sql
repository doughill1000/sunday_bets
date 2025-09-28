begin;
select plan(3);

-- home 24, away 20, favorite = home, spread 3.5
select is(
  public.ats_margin_at_lock(24,20, 1,2, 1, 3.5),
  (24-20) - 3.5,
  'Home favorite margin = raw diff - spread'
);

-- away favorite (spread team = away); home 17, away 21, spread 2.0
-- Adjust: margin = (home - away) + (+spread) because favorite != home
select is(
  public.ats_margin_at_lock(17,21, 10,20, 20, 2.0),
  (17-21) + 2.0,
  'Away favorite margin adds spread'
);

-- Neutral (spread_team_id not matching either) => raw diff
select is(
  public.ats_margin_at_lock(30,27, 5,6, 9999, 7.0),
  (30-27),
  'Unknown spread team id -> pure score diff'
);

select * from finish();
rollback;