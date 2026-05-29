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
export declare function getGroup(conversationId: string): GroupRecord | undefined;
export declare function saveGroup(record: GroupRecord): void;
export declare function deleteGroupRecord(conversationId: string): void;
export declare function addUserToGroup(userId: string, conversationId: string): void;
export declare function removeUserFromGroup(userId: string, conversationId: string): void;
export declare function getUserGroups(userId: string): Set<string> | undefined;
export declare function toGroupDto(record: GroupRecord): GroupCreatedDTO;
export declare function isAdmin(record: GroupRecord, userId: string): boolean;
