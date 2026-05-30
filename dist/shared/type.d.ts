export interface User {
    id: string;
    name: string;
    avatar?: string;
    /** Role from the BE-issued JWT (e.g. "USER" | "ADMIN"). */
    role?: string;
}
