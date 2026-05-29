"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreatePinned = getOrCreatePinned;
exports.getPinned = getPinned;
exports.setPinned = setPinned;
const pinnedStore = new Map();
function getOrCreatePinned(conversationId) {
    let list = pinnedStore.get(conversationId);
    if (!list) {
        list = [];
        pinnedStore.set(conversationId, list);
    }
    return list;
}
function getPinned(conversationId) {
    return pinnedStore.get(conversationId);
}
function setPinned(conversationId, list) {
    pinnedStore.set(conversationId, list);
}
