import type { UUID, UserRole } from './domain';
export type AuthPoolType = 'users' | 'admin' | 'customer';
export interface JWTPayload {
    user_id: UUID;
    company_id: UUID;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
}
export interface AuthContext {
    user_id: UUID;
    company_id: UUID;
    role: UserRole;
    email?: string;
    pool_type?: AuthPoolType;
}
export interface TokenPair {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}
//# sourceMappingURL=auth.d.ts.map