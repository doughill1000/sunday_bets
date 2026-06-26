-- picks PK is (user_id, game_id); group reads via picks_group_view rely on RLS
-- is_member(group_id) with no group_id-leading index. ADR-0002 requires group-owned
-- queries to lead with a group_id-prefixed index. Mirrors
-- idx_pick_settlement_group_game_user (0202_pick_settlement.sql).
create index if not exists idx_picks_group_game_user
  on public.picks (group_id, game_id, user_id);
