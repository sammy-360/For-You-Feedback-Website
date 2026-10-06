export interface ApiRequest {
  method?: string;
  body?: unknown;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): ApiResponse;
  send(body: string): ApiResponse;
  setHeader(name: string, value: string): void;
}
