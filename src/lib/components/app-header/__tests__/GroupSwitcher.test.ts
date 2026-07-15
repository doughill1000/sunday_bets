import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import GroupSwitcher from '../GroupSwitcher.svelte';

// #666: the app was renamed so a user's group of friends is a "League" — this pins the
// switcher's copy so it can't silently regress back to "Group".
describe('GroupSwitcher', () => {
  it('labels the multi-league trigger with "League", not "Group"', () => {
    render(GroupSwitcher, {
      props: {
        memberships: [
          { groupId: 'a', groupName: 'Sunday Squad', role: 'commissioner' },
          { groupId: 'b', groupName: 'Office Pool', role: 'member' }
        ],
        activeGroupId: 'a'
      }
    });

    const trigger = screen.getByTestId('group-switcher-trigger');
    expect(trigger).toHaveAccessibleName('Switch active league');
    expect(trigger).not.toHaveTextContent('Group');
  });
});
