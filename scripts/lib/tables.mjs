// Parent-to-child order (safe for delete-then-insert restores and for
// inserting fresh data without violating foreign key constraints).
export const TABLES_PARENT_FIRST = ['leaderboards', 'participants', 'rounds', 'scores']

// Child-to-parent order (safe for deleting existing rows before a restore).
export const TABLES_CHILD_FIRST = [...TABLES_PARENT_FIRST].reverse()
