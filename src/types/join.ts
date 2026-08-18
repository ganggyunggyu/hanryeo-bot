export interface JoinAccount {
  id: string;
  password: string;
  name: string;
  email: string;
  phone?: string;
  gender: "male" | "female";
  status: "pending" | "success" | "failed";
  message?: string;
  createdAt: string;
}

export interface JoinConfig {
  baseUrl: string;
  count: number;
}

export interface JoinLogEntry {
  timestamp: string;
  level: "info" | "success" | "error" | "warn";
  message: string;
}

export interface SSEMessage {
  type: "log" | "account" | "done" | "error";
  data: JoinLogEntry | JoinAccount | { message: string };
}
