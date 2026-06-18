export interface PaginationMeta {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface PaginatedResponse<T> {
  status: string;
  message: string;
  data: T[];
  meta: {
    pagination: PaginationMeta;
  };
}

export interface DataTableParams {
  page: number;
  page_size: number;
  search?: string;
  ordering?: string;
  [key: string]: unknown;
}
