import type { PresenceNamespace, PresenceSocket } from "./type";
import type { OnlineUserDTO } from "./dto/presence.dto";

const onlineUsers = new Map<string, OnlineUserDTO>();

export function registerPresenceHandler(
  nsp: PresenceNamespace,
  socket: PresenceSocket,
) {
  const user = socket.data.user;

  const onlineUser: OnlineUserDTO = {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
  };
  onlineUsers.set(user.id, onlineUser);

  socket.broadcast.emit("presence:user-joined", onlineUser);

  socket.on("presence:get-online-users", (ack) => {
    ack([...onlineUsers.values()]);
  });

  socket.on("presence:update-profile", (payload) => {
    const current = onlineUsers.get(user.id);
    if (!current) return;
    if (payload.avatar !== undefined) current.avatar = payload.avatar;
    if (payload.name) current.name = payload.name;
    onlineUsers.set(user.id, current);
    socket.broadcast.emit("presence:user-updated", current);
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(user.id);
    nsp.emit("presence:user-left", user.id);
  });
}
