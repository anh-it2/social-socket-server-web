import type { Namespace, Socket } from "socket.io";
import type { InternalServerEvents, SocketData } from "../../socket/type";
import type {
  ChatClientToServerEvents,
  ChatServerToClientEvents,
  MessageReactionDTO,
} from "./dto/chat.dto";

export interface ReplyContext {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: "text" | "image" | "file" | "video";
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: "text" | "image" | "file" | "video" | "system";
  replyTo?: ReplyContext;
  editedAt?: number;
  deleted?: boolean;
  reactions?: MessageReactionDTO[];
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface ReadReceipt {
  conversationId: string;
  userId: string;
  messageId: string;
}

export type {
  ChatClientToServerEvents,
  ChatServerToClientEvents,
} from "./dto/chat.dto";

export type ChatNamespace = Namespace<
  ChatClientToServerEvents,
  ChatServerToClientEvents,
  InternalServerEvents,
  SocketData
>;

export type ChatSocket = Socket<
  ChatClientToServerEvents,
  ChatServerToClientEvents,
  InternalServerEvents,
  SocketData
>;
