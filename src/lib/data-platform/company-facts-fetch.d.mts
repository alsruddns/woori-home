export function fetchCompanyFacts(
  url: string,
  options?: {
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
    wait?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  },
): Promise<Response>;
