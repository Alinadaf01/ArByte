export interface ResetPasswordResponse {
  password: string;
}

export interface ImpersonateResponse {
  ticket: string;
  expiresInSeconds: number;
  /** Ready-made storefront link carrying the ticket as a query param — the
   * ticket is fine to travel in a URL (single-use, 60s-lived); the real
   * session token it's exchanged for never is. */
  url: string;
}

export interface ForceLogoutResponse {
  tokensRevoked: number;
}
