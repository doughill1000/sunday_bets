-- Seed division + conference for the 32 NFL teams (#425, League tab v2 epic).
--
-- Idempotent UPDATE keyed by external_key: safe to re-run (the generator re-emits a file's
-- full content whenever it changes) and safe to apply from empty -- with no team rows it
-- updates 0 rows, which keeps the ADR-0012 from-empty reproduce guard green. `league = 'NFL'`
-- scopes the seed so any non-NFL team keeps null division/conference (matching the epic's
-- non-goal). Runs after 0200_03_teams.sql (alphabetically later in schemas/), so the columns
-- it sets already exist. Consumed by league_ats_divisional -- a divisional matchup is same
-- conference AND same division -- and available to future League tab UI.
update public.teams t
set division = v.division,
    conference = v.conference
from (values
  ('BUF', 'East', 'AFC'),
  ('MIA', 'East', 'AFC'),
  ('NE', 'East', 'AFC'),
  ('NYJ', 'East', 'AFC'),
  ('BAL', 'North', 'AFC'),
  ('CIN', 'North', 'AFC'),
  ('CLE', 'North', 'AFC'),
  ('PIT', 'North', 'AFC'),
  ('HOU', 'South', 'AFC'),
  ('IND', 'South', 'AFC'),
  ('JAX', 'South', 'AFC'),
  ('TEN', 'South', 'AFC'),
  ('DEN', 'West', 'AFC'),
  ('KC', 'West', 'AFC'),
  ('LV', 'West', 'AFC'),
  ('LAC', 'West', 'AFC'),
  ('DAL', 'East', 'NFC'),
  ('NYG', 'East', 'NFC'),
  ('PHI', 'East', 'NFC'),
  ('WAS', 'East', 'NFC'),
  ('CHI', 'North', 'NFC'),
  ('DET', 'North', 'NFC'),
  ('GB', 'North', 'NFC'),
  ('MIN', 'North', 'NFC'),
  ('ATL', 'South', 'NFC'),
  ('CAR', 'South', 'NFC'),
  ('NO', 'South', 'NFC'),
  ('TB', 'South', 'NFC'),
  ('ARI', 'West', 'NFC'),
  ('LAR', 'West', 'NFC'),
  ('SF', 'West', 'NFC'),
  ('SEA', 'West', 'NFC')
) as v(external_key, division, conference)
where t.external_key = v.external_key
  and t.league = 'NFL';
