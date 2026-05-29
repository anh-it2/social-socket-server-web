"use strict";
/**
 * DTOs — exact shape of data on the wire (what server sends/receives).
 * When backend changes a field, update ONLY this file and the mappers —
 * components never know.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REACTION_KEYS = void 0;
exports.REACTION_KEYS = [
    "like",
    "love",
    "haha",
    "wow",
    "sad",
    "angry",
];
