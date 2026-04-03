const TOKEN_KEY = "notion_token";

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
  exists: (): boolean => localStorage.getItem(TOKEN_KEY) !== null,
};
