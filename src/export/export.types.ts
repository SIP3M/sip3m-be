import { Prisma } from "../generated/prisma/client";

export type PengabdianProjectExport = Prisma.PengabdianProjectsGetPayload<{
  select: {
    project_code: true;
    title: true;
    status: true;
    overall_progress: true;
    proposal: {
      select: {
        funding_request_amount: true;
        user: {
          select: {
            name: true;
          };
        };
      };
    };
  };
}>;

export type WritableBuffer = Buffer | Uint8Array | ArrayBuffer;
