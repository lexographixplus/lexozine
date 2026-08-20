import type { Issue } from "./editor-model";

const STORAGE_KEY = "lexozine-issues-v1";

export interface IssueStore {
  list(): Promise<Issue[]>;
  get(id: string): Promise<Issue | null>;
  save(issue: Issue): Promise<Issue>;
  remove(id: string): Promise<void>;
}

export class BrowserIssueStore implements IssueStore {
  private readAll(): Issue[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as Issue[];
    } catch {
      return [];
    }
  }

  private writeAll(issues: Issue[]) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
  }

  async list() {
    return this.readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    return this.readAll().find((issue) => issue.id === id) ?? null;
  }

  async save(issue: Issue) {
    const issues = this.readAll();
    const next = { ...issue, updatedAt: new Date().toISOString() };
    const index = issues.findIndex((item) => item.id === issue.id);
    if (index >= 0) issues[index] = next;
    else issues.unshift(next);
    this.writeAll(issues);
    return next;
  }

  async remove(id: string) {
    this.writeAll(this.readAll().filter((issue) => issue.id !== id));
  }
}

// The UI talks to IssueStore rather than directly to a database. A Neon-backed
// implementation can replace BrowserIssueStore without changing editor features.
export const issueStore = typeof window === "undefined" ? null : new BrowserIssueStore();
