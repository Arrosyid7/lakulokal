export function ownsOrder(orderUserId: string, authenticatedUserId: string) {
  return orderUserId === authenticatedUserId;
}

export function hasAdminRole(role: string | null | undefined) {
  return role === "ADMIN";
}
