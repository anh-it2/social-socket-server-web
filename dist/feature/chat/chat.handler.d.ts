import type { ChatNamespace, ChatSocket } from "./type";
export declare function registerChatHandler(nsp: ChatNamespace, socket: ChatSocket): Promise<void>;
