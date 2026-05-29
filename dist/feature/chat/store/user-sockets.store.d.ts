export declare function addUserSocket(userId: string, socketId: string): {
    wasEmpty: boolean;
};
export declare function removeUserSocket(userId: string, socketId: string): void;
export declare function getUserSockets(userId: string): Set<string> | undefined;
export declare function getLastSeen(userId: string): number;
