export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randomPick = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const randomString = (length: number, chars: string): string =>
  Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
