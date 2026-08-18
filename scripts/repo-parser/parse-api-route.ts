import type { ApiRoute } from "./types.ts";

const HTTP_METHOD = /^\s*export\s+(?:const|async\s+function|function)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/gm;

const toRoutePath = (relPath: string): string =>
  `/${relPath.replace(/^src\/app\//, "").replace(/\/route\.tsx?$/, "")}`;

export const parseApiRoutes = (
  files: string[],
  readSource: (relPath: string) => string
): ApiRoute[] =>
  files
    .filter((file) => /^src\/app\/.*\/route\.tsx?$/.test(file))
    .map((file) => {
      const source = readSource(file);
      HTTP_METHOD.lastIndex = 0;

      const methods: string[] = [];
      let match = HTTP_METHOD.exec(source);

      while (match !== null) {
        methods.push(match[1]);
        match = HTTP_METHOD.exec(source);
      }

      return {
        route: toRoutePath(file),
        path: file,
        methods: [...new Set(methods)].sort(),
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));
