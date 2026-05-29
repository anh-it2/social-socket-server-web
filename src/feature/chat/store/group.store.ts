import type { GroupCreatedDTO } from "../dto/chat.dto";

export interface GroupRecord {
  conversationId: string;
  name: string;
  memberIds: string[];
  adminIds: string[];
  mutedMembers: string[];
  blockedMembers: string[];
  createdAt: number;
  createdBy: string;
}

const groupStore = new Map<string, GroupRecord>();
const groupsByUser = new Map<string, Set<string>>();

export function getGroup(conversationId: string): GroupRecord | undefined {
  return groupStore.get(conversationId);
}

export function saveGroup(record: GroupRecord): void {
  groupStore.set(record.conversationId, record);
}

export function deleteGroupRecord(conversationId: string): void {
  groupStore.delete(conversationId);
}

export function addUserToGroup(userId: string, conversationId: string): void {
  let set = groupsByUser.get(userId);
  if (!set) {
    set = new Set();
    groupsByUser.set(userId, set);
  }
  set.add(conversationId);
}

export function removeUserFromGroup(
  userId: string,
  conversationId: string,
): void {
  const set = groupsByUser.get(userId);
  if (!set) return;
  set.delete(conversationId);
  if (set.size === 0) groupsByUser.delete(userId);
}

export function getUserGroups(userId: string): Set<string> | undefined {
  return groupsByUser.get(userId);
}

export function toGroupDto(record: GroupRecord): GroupCreatedDTO {
  return {
    conversationId: record.conversationId,
    name: record.name,
    memberIds: record.memberIds,
    adminIds: record.adminIds,
    mutedMembers: record.mutedMembers,
    blockedMembers: record.blockedMembers,
    createdAt: record.createdAt,
    createdBy: record.createdBy,
  };
}

export function isAdmin(record: GroupRecord, userId: string): boolean {
  return record.adminIds.includes(userId);
}
