import type { Issue } from "./editor-model";

export const ISSUE_CACHE_KEY = "lexozine-issues-v1";

export type IssueSyncState = "synced" | "local";

export interface IssueStore {
  list(): Promise<Issue[]>;
  get(id: string): Promise<Issue | null>;
  save(issue: Issue): Promise<Issue>;
  remove(id: string): Promise<void>;
}

export class BrowserIssueStore implements IssueStore {
  readAll(): Issue[] {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(window.localStorage.getItem(ISSUE_CACHE_KEY) ?? "[]") as Issue[]; }
    catch { return []; }
  }

  writeAll(issues: Issue[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(ISSUE_CACHE_KEY, JSON.stringify(issues));
  }

  async list() { return this.readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async get(id: string) { return this.readAll().find((issue) => issue.id === id) ?? null; }
  async save(issue: Issue) {
    const issues = this.readAll();
    const next = { ...issue, updatedAt: new Date().toISOString() };
    const index = issues.findIndex((item) => item.id === next.id);
    if (index >= 0) issues[index] = next; else issues.unshift(next);
    this.writeAll(issues);
    return next;
  }
  async remove(id: string) { this.writeAll(this.readAll().filter((issue) => issue.id !== id)); }
}

export class RemoteIssueStore implements IssueStore {
  async list() {
    const response = await fetch("/api/issues", { cache: "no-store" });
    if (!response.ok) throw new Error(`Issue sync failed (${response.status})`);
    return (await response.json()).issues as Issue[];
  }
  async get(id: string) {
    const response = await fetch(`/api/issues/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Issue fetch failed (${response.status})`);
    return (await response.json()).issue as Issue;
  }
  async save(issue: Issue) {
    const response = await fetch("/api/issues", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(issue),
    });
    if (!response.ok) throw new Error(`Issue save failed (${response.status})`);
    return (await response.json()).issue as Issue;
  }
  async remove(id: string) {
    const response = await fetch(`/api/issues/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) throw new Error(`Issue deletion failed (${response.status})`);
  }
}

export class HybridIssueStore implements IssueStore {
  browser = new BrowserIssueStore();
  remote = new RemoteIssueStore();
  lastSyncState: IssueSyncState = "synced";
  lastSyncError = "";

  getSyncState() {
    return { state: this.lastSyncState, error: this.lastSyncError };
  }

  async list() {
    try {
      const issues = await this.remote.list();
      this.browser.writeAll(issues);
      this.lastSyncState = "synced";
      this.lastSyncError = "";
      return issues;
    } catch (error) {
      this.lastSyncState = "local";
      this.lastSyncError = error instanceof Error ? error.message : "Cloud sync unavailable";
      return this.browser.list();
    }
  }
  async get(id: string) {
    try {
      const issue = await this.remote.get(id);
      if (issue) await this.cache(issue);
      this.lastSyncState = "synced";
      this.lastSyncError = "";
      return issue;
    } catch (error) {
      this.lastSyncState = "local";
      this.lastSyncError = error instanceof Error ? error.message : "Cloud sync unavailable";
      return this.browser.get(id);
    }
  }
  async save(issue: Issue) {
    const cached = await this.browser.save(issue);
    try {
      const saved = await this.remote.save(cached);
      await this.replaceCachedId(cached.id, saved);
      this.lastSyncState = "synced";
      this.lastSyncError = "";
      return saved;
    } catch (error) {
      this.lastSyncState = "local";
      this.lastSyncError = error instanceof Error ? error.message : "Cloud sync unavailable";
      return cached;
    }
  }
  async remove(id: string) {
    await this.browser.remove(id);
    try {
      await this.remote.remove(id);
      this.lastSyncState = "synced";
      this.lastSyncError = "";
    } catch (error) {
      this.lastSyncState = "local";
      this.lastSyncError = error instanceof Error ? error.message : "Cloud sync unavailable";
    }
  }
  private async cache(issue: Issue) {
    const all = this.browser.readAll();
    const index = all.findIndex((item) => item.id === issue.id);
    if (index >= 0) all[index] = issue; else all.unshift(issue);
    this.browser.writeAll(all);
  }
  private async replaceCachedId(oldId: string, issue: Issue) {
    const all = this.browser.readAll().filter((item) => item.id !== oldId && item.id !== issue.id);
    this.browser.writeAll([issue, ...all]);
  }
}

export const issueStore = typeof window === "undefined" ? null : new HybridIssueStore();
