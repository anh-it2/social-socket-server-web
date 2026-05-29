import type { ReplyContext } from "../type";
export declare function buildReplyContext(conversationId: string, clientReplyTo?: ReplyContext): Promise<ReplyContext | undefined>;
