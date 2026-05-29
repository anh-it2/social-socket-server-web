"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addUserSocket = addUserSocket;
exports.removeUserSocket = removeUserSocket;
exports.getUserSockets = getUserSockets;
exports.getLastSeen = getLastSeen;
const activeUserSockets = new Map();
const lastSeenStore = new Map();
function addUserSocket(userId, socketId) {
    let set = activeUserSockets.get(userId);
    if (!set) {
        set = new Set();
        activeUserSockets.set(userId, set);
    }
    const wasEmpty = set.size === 0;
    set.add(socketId);
    return { wasEmpty };
}
function removeUserSocket(userId, socketId) {
    const set = activeUserSockets.get(userId);
    if (!set)
        return;
    set.delete(socketId);
    if (set.size === 0) {
        activeUserSockets.delete(userId);
        lastSeenStore.set(userId, Date.now());
    }
}
function getUserSockets(userId) {
    return activeUserSockets.get(userId);
}
function getLastSeen(userId) {
    var _a;
    return (_a = lastSeenStore.get(userId)) !== null && _a !== void 0 ? _a : 0;
}
