export type EntrypointGroup = "root" | "scripts";

export type SecretSeverity = "high" | "medium" | "low";

export type SecretHit = {
  line: number;
  kind: string;
  severity: SecretSeverity;
  preview: string;
};

export type Entrypoint = {
  path: string;
  group: EntrypointGroup;
  summary: string;
  usage: string[];
  runCommand: string;
  internalImports: string[];
  packageImports: string[];
  envKeys: string[];
  dataFiles: string[];
  hosts: string[];
  secrets: SecretHit[];
  lines: number;
};

export type FeatureSegment = {
  name: string;
  files: string[];
  exports: string[];
};

export type Feature = {
  name: string;
  segments: FeatureSegment[];
  publicApi: string[];
};

export type ApiRoute = {
  route: string;
  path: string;
  methods: string[];
};

export type EnvUsage = {
  key: string;
  usedIn: string[];
};

export type RepoStats = {
  trackedFiles: number;
  entrypoints: number;
  features: number;
  apiRoutes: number;
  envKeys: number;
  filesWithSecrets: number;
  filesWithHighSeverity: number;
};

export type RepoMap = {
  name: string;
  generatedBy: string;
  packageManager: string;
  runtime: string;
  packageScripts: Record<string, string>;
  dependencies: Record<string, string>;
  entrypoints: Entrypoint[];
  features: Feature[];
  apiRoutes: ApiRoute[];
  env: EnvUsage[];
  docs: string[];
  stats: RepoStats;
};
