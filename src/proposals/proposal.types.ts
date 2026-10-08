import { ProposalStatus, SkemaProposal, SumberPendanaan } from "../generated/prisma/enums";

export interface CreateProposalBody {
  title: string;
  faculty?: string;
  skema: SkemaProposal;
  sumber_pendanaan?: SumberPendanaan;
  funding_request_amount?: string | number;
  sumber_data_penelitian?: string;
  detail_sumber_penelitian?: string;
  instansi?: string;
  nama_ketua?: string;
  nidn_ketua?: string;
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
  skema: SkemaProposal;
  sumber_pendanaan?: SumberPendanaan | null;
  funding_request_amount: number;
  sumber_data_penelitian?: string | null;
  detail_sumber_penelitian?: string | null;
  instansi?: string | null;
  nama_ketua?: string | null;
  nidn_ketua?: string | null;
  status: ProposalStatus;
  lead_researcher_id: number;
  proposal_file_path: string | null;
  rab_file_path: string | null;
  submitted_at: Date | null;
}
