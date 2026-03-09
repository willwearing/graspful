export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}
