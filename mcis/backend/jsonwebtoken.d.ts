declare module "jsonwebtoken" {
  export type JwtPayload = Record<string, unknown>;

  export function sign(
    payload: object | string,
    secret: string,
    options?: { expiresIn?: string | number },
  ): string;

  export function verify(token: string, secret: string): JwtPayload;
}
