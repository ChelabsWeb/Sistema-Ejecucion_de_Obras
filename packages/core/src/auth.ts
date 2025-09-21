export const USER_ROLES = ["ADMIN", "PM", "SITE", "FINANCE", "VIEWER"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthContext {
  userId: string;
  email?: string;
  role: UserRole;
  orgId: string;
  projectIds?: string[];
}

export function ensureRole(role: string): UserRole {
  const normalized = role.toUpperCase();
  if ((USER_ROLES as readonly string[]).includes(normalized)) {
    return normalized as UserRole;
  }
  return "VIEWER";
}

export function hasRequiredRole(role: UserRole, allowed: UserRole[]): boolean {
  if (allowed.length === 0) {
    return true;
  }
  const hierarchy: UserRole[] = ["VIEWER", "SITE", "PM", "FINANCE", "ADMIN"];
  const level = hierarchy.indexOf(role);
  const allowedLevels = allowed.map(value => hierarchy.indexOf(value));
  return allowedLevels.some(index => index <= level);
}
