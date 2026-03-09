import fs from "node:fs/promises";
import path from "node:path";

const LOCK_DIR = path.join(process.cwd(), "report_assets", ".locks");
const RETRY_INTERVAL_MS = 200;
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_STALE_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeResourceId(resourceId: string): string {
  return resourceId.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function isAlreadyExistsError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "EEXIST");
}

function isNotFoundError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT");
}

export class FileLockService {
  private readonly timeoutMs: number;
  private readonly retryIntervalMs: number;
  private readonly staleMs: number;

  constructor(options?: { timeoutMs?: number; retryIntervalMs?: number; staleMs?: number }) {
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryIntervalMs = options?.retryIntervalMs ?? RETRY_INTERVAL_MS;
    this.staleMs = options?.staleMs ?? DEFAULT_STALE_MS;
  }

  private getLockFilePath(resourceId: string): string {
    const safeId = sanitizeResourceId(resourceId);
    return path.join(LOCK_DIR, `${safeId}.lock`);
  }

  private async isStaleLock(lockFilePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(lockFilePath);
      return Date.now() - stat.mtimeMs > this.staleMs;
    } catch (error) {
      if (isNotFoundError(error)) return false;
      throw error;
    }
  }

  async acquireLock(resourceId: string): Promise<void> {
    if (!resourceId.trim()) {
      throw new Error("resourceId is required.");
    }
    const lockFilePath = this.getLockFilePath(resourceId);
    const start = Date.now();

    try {
      await fs.mkdir(LOCK_DIR, { recursive: true });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EROFS" || code === "EPERM") return; // Read-only FS (Vercel)
      throw err;
    }

    while (Date.now() - start <= this.timeoutMs) {
      try {
        const fd = await fs.open(lockFilePath, "wx");
        try {
          await fd.writeFile(
            JSON.stringify(
              {
                resourceId,
                pid: process.pid,
                createdAt: new Date().toISOString(),
              },
              null,
              2,
            ),
            "utf-8",
          );
        } finally {
          await fd.close();
        }
        return;
      } catch (error) {
        if (!isAlreadyExistsError(error)) throw error;

        const stale = await this.isStaleLock(lockFilePath);
        if (stale) {
          try {
            await fs.unlink(lockFilePath);
          } catch (unlinkError) {
            if (!isNotFoundError(unlinkError)) {
              throw unlinkError;
            }
          }
          continue;
        }

        await sleep(this.retryIntervalMs);
      }
    }

    throw new Error(`Timeout acquiring lock for resource '${resourceId}' after ${this.timeoutMs}ms.`);
  }

  async releaseLock(resourceId: string): Promise<void> {
    if (!resourceId.trim()) return;
    const lockFilePath = this.getLockFilePath(resourceId);
    try {
      await fs.unlink(lockFilePath);
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }
  }
}

export const fileLockService = new FileLockService();
