export type CheckStatus = "ok" | "warn" | "fail";

export type CheckResult = {
  name: string;
  status: CheckStatus;
  detail: string;
  fix?: string;
};

export type CheckGroup = {
  title: string;
  results: CheckResult[];
};
