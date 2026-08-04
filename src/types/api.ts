export type AuthLoginPayload = {
  user: string;
  pwd: string;
};

export type AuthLoginResponse = {
  user: string;
  userId: number;
  token: string;
  role: string;
  roleId: number;
  permisos: unknown[];
  expires: string;
};
