const KEY = "nen_pending";

export interface StoredPendingRequest {
  requestId: string;
  code: string;
  sessionId: string;
  name: string;
}

export function loadPendingRequest(code: string): StoredPendingRequest | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredPendingRequest;
    return data.code.toUpperCase() === code.toUpperCase() ? data : null;
  } catch {
    return null;
  }
}

export function savePendingRequest(data: StoredPendingRequest): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearPendingRequest(): void {
  localStorage.removeItem(KEY);
}
