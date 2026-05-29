import type { ChatNamespace, ChatSocket } from "./type";
import { getDirectMessagesSince } from "./store/message.store";
import {
  getGroup,
  getUserGroups,
  toGroupDto,
} from "./store/group.store";
import {
  addUserSocket,
  getLastSeen,
  removeUserSocket,
} from "./store/user-sockets.store";
import { registerMessageHandlers } from "./handlers/message.handler";
import { registerTypingReadHandlers } from "./handlers/typing-read.handler";
import { registerRoomHandlers } from "./handlers/room.handler";
import { registerGroupHandlers } from "./handlers/group.handler";
import { registerPinHandlers } from "./handlers/pin.handler";
import { registerReactionHandlers } from "./handlers/reaction.handler";

async function flushPendingMessages(
  socket: ChatSocket,
  userId: string,
): Promise<void> {
  const lastSeen = getLastSeen(userId);
  // DB query already excludes deleted / own / older-than-lastSeen and is
  // scoped to DM conversations involving this user.
  const pending = await getDirectMessagesSince(userId, lastSeen);
  for (const m of pending) {
    socket.emit("chat:message", m);
  }
}

function rejoinUserGroups(socket: ChatSocket, userId: string): void {
  const memberOf = getUserGroups(userId);
  if (!memberOf) return;
  for (const conversationId of memberOf) {
    const group = getGroup(conversationId);
    if (!group) continue;
    if (!group.blockedMembers.includes(userId)) {
      socket.join(`chat:${conversationId}`);
    }
    socket.emit("group:created", toGroupDto(group));
  }
}

export async function registerChatHandler(
  nsp: ChatNamespace,
  socket: ChatSocket,
) {
  const user = socket.data.user;

  socket.join(`user:${user.id}`);

  const { wasEmpty } = addUserSocket(user.id, socket.id);

  rejoinUserGroups(socket, user.id);

  socket.on("disconnect", () => {
    removeUserSocket(user.id, socket.id);
  });

  // Register inbound handlers before the awaited flush so no client event
  // sent during the (now async) flush is missed. flushPendingMessages only
  // emits outbound, so its ordering vs handler registration is irrelevant.
  registerRoomHandlers(nsp, socket);
  registerMessageHandlers(nsp, socket);
  registerTypingReadHandlers(nsp, socket);
  registerGroupHandlers(nsp, socket);
  registerPinHandlers(nsp, socket);
  registerReactionHandlers(nsp, socket);

  if (wasEmpty) {
    await flushPendingMessages(socket, user.id);
  }
}
