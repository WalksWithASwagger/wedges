export interface Critique {
  fromMemberId: string;
  fromName: string;
  text: string;
  wouldShip: "ship" | "hold" | "cut";
  createdAt: number;
}

export interface Submission {
  id: string;
  memberId: string;
  authorName: string;
  title: string;
  body: string;
  createdAt: number;
  critiques: Critique[];
}

export interface Member {
  id: string;
  name: string;
  /** Secret cookie value identifying this member on return visits. Never sent to the browser in PublicRoom. */
  token: string;
  /** The member's Wedges taste profile (markdown). The lens their agent uses. */
  profileMarkdown: string;
  joinedAt: number;
}

export interface Room {
  code: string;
  title: string;
  createdAt: number;
  /** Secret held by the creator; required to delete the room. */
  ownerToken: string;
  members: Member[];
  submissions: Submission[];
}

/** Room shape safe to send to the browser — secrets and full profiles stripped. */
export interface PublicRoom {
  code: string;
  title: string;
  createdAt: number;
  members: { id: string; name: string; hasProfile: boolean }[];
  submissions: Submission[];
}

export function toPublicRoom(room: Room): PublicRoom {
  return {
    code: room.code,
    title: room.title,
    createdAt: room.createdAt,
    members: room.members.map((m) => ({ id: m.id, name: m.name, hasProfile: m.profileMarkdown.length > 0 })),
    submissions: room.submissions,
  };
}
