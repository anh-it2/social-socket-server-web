"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroup = getGroup;
exports.saveGroup = saveGroup;
exports.deleteGroupRecord = deleteGroupRecord;
exports.addUserToGroup = addUserToGroup;
exports.removeUserFromGroup = removeUserFromGroup;
exports.getUserGroups = getUserGroups;
exports.toGroupDto = toGroupDto;
exports.isAdmin = isAdmin;
const groupStore = new Map();
const groupsByUser = new Map();
function getGroup(conversationId) {
    return groupStore.get(conversationId);
}
function saveGroup(record) {
    groupStore.set(record.conversationId, record);
}
function deleteGroupRecord(conversationId) {
    groupStore.delete(conversationId);
}
function addUserToGroup(userId, conversationId) {
    let set = groupsByUser.get(userId);
    if (!set) {
        set = new Set();
        groupsByUser.set(userId, set);
    }
    set.add(conversationId);
}
function removeUserFromGroup(userId, conversationId) {
    const set = groupsByUser.get(userId);
    if (!set)
        return;
    set.delete(conversationId);
    if (set.size === 0)
        groupsByUser.delete(userId);
}
function getUserGroups(userId) {
    return groupsByUser.get(userId);
}
function toGroupDto(record) {
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
function isAdmin(record, userId) {
    return record.adminIds.includes(userId);
}
