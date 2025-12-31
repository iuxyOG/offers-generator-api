export type ApiError = {
  field?: string;
  message: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  errors?: ApiError[];
};

export const okResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
});

export const errorResponse = (errors: ApiError[]): ApiResponse<null> => ({
  success: false,
  data: null,
  errors,
});
