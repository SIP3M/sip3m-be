export type UpdateProjectDetailsInput = {
  summary?: string;
  start_date?: string | Date;
  end_date?: string | Date;
};

export type GetAllPengabdianProjectsParams = {
  page: number;
  limit: number;
  search?: string;
  is_archived?: boolean;
  userId: number;
  userRole: string;
};