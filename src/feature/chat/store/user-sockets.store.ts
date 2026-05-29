const activeUserSockets = new Map<string, Set<string>>();
const lastSeenStore = new Map<string, number>();

export function addUserSocket(
  userId: string,
  socketId: string,
): { wasEmpty: boolean } {
  let set = activeUserSockets.get(userId);
  if (!set) {
    set = new Set();
    activeUserSockets.set(userId, set);
  }
  const wasEmpty = set.size === 0;
  set.add(socketId);
  return { wasEmpty };
}

export function removeUserSocket(userId: string, socketId: string): void {
  const set = activeUserSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) {
    activeUserSockets.delete(userId);
    lastSeenStore.set(userId, Date.now());
  }
}

export function getUserSockets(userId: string): Set<string> | undefined {
  return activeUserSockets.get(userId);
}

export function getLastSeen(userId: string): number {
  return lastSeenStore.get(userId) ?? 0;
}
