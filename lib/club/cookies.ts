const YEAR = 60 * 60 * 24 * 365;

export const ownerCookie = (code: string) => `club_owner_${code}`;
export const memberCookie = (code: string) => `club_member_${code}`;

export const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: YEAR,
};
