// Active-group context. The web app resolves the active group from a cookie in
// hooks.server.ts; here the equivalent preference lives in AsyncStorage and is
// validated against the user's live memberships (fall back to the first active
// membership when the stored id is absent or no longer valid).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Membership } from '@/domain/types';
import { useSession } from './session';
import { supabase } from './supabase';

const ACTIVE_GROUP_STORAGE_KEY = 'sunday-bets.active-group-id';

type ActiveGroupContextValue = {
  /** undefined while memberships are loading; [] when the user has no active group. */
  memberships: Membership[] | undefined;
  activeGroupId: string | null;
  activeGroup: Membership | null;
  setActiveGroupId: (groupId: string) => void;
  membershipsError: Error | null;
};

const ActiveGroupContext = createContext<ActiveGroupContextValue | null>(null);

async function fetchMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('group_memberships')
    .select('group_id, role, status, joined_at, groups(name)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at');
  if (error) throw error;
  return (data ?? []).map((m) => ({
    groupId: m.group_id,
    groupName: m.groups?.name ?? m.group_id,
    role: m.role
  }));
}

export function ActiveGroupProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const membershipsQuery = useQuery({
    queryKey: ['memberships', userId],
    queryFn: () => fetchMemberships(userId!),
    enabled: !!userId
  });

  const [storedGroupId, setStoredGroupId] = useState<string | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(ACTIVE_GROUP_STORAGE_KEY).then((value) => {
      if (!mounted) return;
      setStoredGroupId(value);
      setStorageLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const memberships = userId ? membershipsQuery.data : undefined;

  const activeGroup = useMemo(() => {
    if (!memberships || memberships.length === 0 || !storageLoaded) return null;
    return memberships.find((m) => m.groupId === storedGroupId) ?? memberships[0];
  }, [memberships, storedGroupId, storageLoaded]);

  const value = useMemo<ActiveGroupContextValue>(
    () => ({
      memberships,
      activeGroup,
      activeGroupId: activeGroup?.groupId ?? null,
      setActiveGroupId: (groupId: string) => {
        setStoredGroupId(groupId);
        void AsyncStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, groupId);
      },
      membershipsError: (membershipsQuery.error as Error | null) ?? null
    }),
    [memberships, activeGroup, membershipsQuery.error]
  );

  return <ActiveGroupContext value={value}>{children}</ActiveGroupContext>;
}

export function useActiveGroup(): ActiveGroupContextValue {
  const ctx = use(ActiveGroupContext);
  if (!ctx) throw new Error('useActiveGroup must be used inside <ActiveGroupProvider>');
  return ctx;
}
