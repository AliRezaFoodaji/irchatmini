export type Signal =
  | { kind: "offer"; sdp: string }
  | { kind: "answer"; sdp: string }
  | { kind: "candidate"; candidate: RTCIceCandidateInit };

export type ClientMessage =
  | { type: "find" }
  | { type: "signal"; data: Signal }
  | { type: "next" }
  | { type: "leave" };

export type ServerMessage =
  | { type: "matched"; roomId: string; initiator: boolean }
  | { type: "signal"; data: Signal }
  | { type: "peer-left"; reason: "next" | "disconnect" }
  | { type: "stats"; online: number }
  | { type: "error"; message: string };