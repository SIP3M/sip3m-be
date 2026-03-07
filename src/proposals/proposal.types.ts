import { ProposalStatus } from "../generated/prisma/enums";

export interface CreateProposalBody {
  title: string;
  faculty?: string;
  skema?: string;
  funding_request_amount?: string | number;
  is_draft?: string | boolean;
}

export interface ProposalFiles {
  proposal_file?: Express.Multer.File[];
  rab_file?: Express.Multer.File[];
}

export interface UploadResult {
  publicUrl: string;
}

export interface CreateProposalData {
  title: string;
  faculty?: string;
  skema?: string;
  funding_request_amount: number;
  status: ProposalStatus;
  lead_researcher_id: number;
  proposal_file_path: string | null;
  rab_file_path: string | null;
  submitted_at: Date | null;
}
