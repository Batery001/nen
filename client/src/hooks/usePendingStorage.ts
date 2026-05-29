export interface StoredPendingRequest {
  requestId: string;
  code: string;
  sessionId: string;
  name: string;
}

function keyFor(code: string): string {
  return `nen_pending_${code.toUpperCase()}`;
}

export function loadPendingRequest(code: string): StoredPendingRequest | null {
  try {
    const raw = localStorage.getItem(keyFor(code));
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredPendingRequest;
    return data.code.toUpperCase() === code.toUpperCase() ? data : null;
  } catch {
    return null;
  }
}

export function savePendingRequest(data: StoredPendingRequest): void {
  localStorage.setItem(keyFor(data.code), JSON.stringify(data));
}

export function clearPendingRequest(code?: string): void {
  if (code) {
    localStorage.removeItem(keyFor(code));
    return;
  }
  // Limpieza legacy
  localStorage.removeItem("nen_pending");
}
