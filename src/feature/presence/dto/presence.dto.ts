import type { User } from "../../../shared/type";

export interface OnlineUserDTO extends User {}

export interface UpdateProfileDTO {
  avatar?: string;
  name?: string;
}

export interface PresenceServerToClientEvents {
  "presence:online-users": (users: OnlineUserDTO[]) => void;
  "presence:user-joined": (user: OnlineUserDTO) => void;
  "presence:user-left": (userId: string) => void;
  "presence:user-updated": (user: OnlineUserDTO) => void;
}

export interface PresenceClientToServerEvents {
  "presence:get-online-users": (ack: (users: OnlineUserDTO[]) => void) => void;
  "presence:update-profile": (payload: UpdateProfileDTO) => void;
}
