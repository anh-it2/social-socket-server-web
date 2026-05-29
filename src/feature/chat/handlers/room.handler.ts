import type { ChatNamespace, ChatSocket } from "../type";
import { getPinned } from "../store/pin.store";

export function registerRoomHandlers(_nsp: ChatNamespace, socket: ChatSocket) {
  socket.on("chat:join", (conversationId) => {
    socket.join(`chat:${conversationId}`);
    const pins = getPinned(conversationId);
    if (pins && pins.length) {
      socket.emit("chat:pins-replay", { conversationId, pinned: pins });
    }
  });

  socket.on("chat:leave", (conversationId) => {
    socket.leave(`chat:${conversationId}`);
  });
}
