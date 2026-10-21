import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  DocumentVerificationStatus,
  PengabdianDocumentType,
  PengabdianMilestoneStatus,
} from "../src/generated/prisma/enums";
import {
  applyApprovalEffects,
  getBaseDocumentTypeFromMilestone,
} from "../src/pengabdian-documents/pengabdian-document.service";

const prisma = new PrismaClient();

const AUTO_APPROVED_NOTE = "Disetujui otomatis saat rilis fitur auto-approve";

/** Tambahkan flag `--execute` untuk benar-benar menulis ke database. */
const isExecute = process.argv.includes("--execute");

type PendingDocument = {
  id: number;
  title: string | null;
  document_type: PengabdianDocumentType;
  milestone_id: number | null;
  milestone: {
    id: number;
    title: string;
    sequence: number;
    status: PengabdianMilestoneStatus;
    target_percentage: number;
    project_id: number;
    project: {
      id: number;
      overall_progress: number;
      proposal: { lead_researcher_id: number };
    };
  } | null;
};

/**
 * Backfill sekali jalan: dokumen berstatus PENDING selain LAPORAN_AKHIR
 * di-set APPROVED, meniru perilaku upload setelah fitur auto-approve.
 *
 * Jalankan dry-run dulu (hanya membaca, TIDAK menulis apa pun):
 *   npx ts-node -r dotenv/config prisma/backfill-auto-approve-pengabdian.ts
 *
 * Setelah hasil dry-run disetujui, eksekusi dengan:
 *   npx ts-node -r dotenv/config prisma/backfill-auto-approve-pengabdian.ts --execute
 */
async function main() {
  const pendingDocuments = await prisma.pengabdianDocuments.findMany({
    where: {
      verification_status: DocumentVerificationStatus.PENDING,
      document_type: { not: PengabdianDocumentType.LAPORAN_AKHIR },
    },
    select: {
      id: true,
      title: true,
      document_type: true,
      milestone_id: true,
      milestone: {
        select: {
          id: true,
          title: true,
          sequence: true,
          status: true,
          target_percentage: true,
          project_id: true,
          project: {
            select: {
              id: true,
              overall_progress: true,
              proposal: { select: { lead_researcher_id: true } },
            },
          },
        },
      },
    },
    orderBy: [{ project_id: "asc" }, { milestone_id: "asc" }],
  });

  if (pendingDocuments.length === 0) {
    console.log(
      "Tidak ada dokumen PENDING selain LAPORAN_AKHIR. Tidak ada yang perlu di-backfill.",
    );
    return;
  }

  // Kelompokkan per milestone (milestone_id null = upload tanpa milestone).
  const groups = new Map<number | null, PendingDocument[]>();
  for (const document of pendingDocuments) {
    const key = document.milestone_id;
    const list = groups.get(key) ?? [];
    list.push(document);
    groups.set(key, list);
  }

  console.log(
    `${isExecute ? "🚀 EKSEKUSI" : "🔍 DRY RUN (tidak ada data yang diubah)"} — backfill auto-approve`,
  );
  console.log(
    `Total ${pendingDocuments.length} dokumen PENDING non-LAPORAN_AKHIR dalam ${groups.size} grup milestone.\n`,
  );

  let documentsToUpdate = 0;
  let milestonesToComplete = 0;
  let notificationsToCreate = 0;

  for (const [milestoneId, documents] of groups) {
    if (milestoneId === null) {
      console.log(
        `📄 Dokumen tanpa milestone (${documents.length} file) → status APPROVED saja:`,
      );
      for (const document of documents) {
        console.log(
          `   - [${document.id}] ${document.document_type} — ${document.title}`,
        );
      }
      documentsToUpdate += documents.length;
      console.log("");
      continue;
    }

    const milestone = documents[0].milestone;
    if (!milestone) {
      console.log(
        `⚠️ Grup milestone ${milestoneId} tidak punya relasi milestone — dilewati.\n`,
      );
      continue;
    }

    const isFinalMilestone =
      getBaseDocumentTypeFromMilestone(milestone.title, milestone.sequence) ===
        PengabdianDocumentType.LAPORAN_AKHIR ||
      (await prisma.pengabdianMilestones.count({
        where: {
          project_id: milestone.project_id,
          sequence: { gt: milestone.sequence },
        },
      })) === 0;

    const willComplete =
      !isFinalMilestone &&
      milestone.status !== PengabdianMilestoneStatus.COMPLETED;

    console.log(
      `🗂️ Proyek #${milestone.project_id} — milestone #${milestone.id} "${milestone.title}" (seq ${milestone.sequence})`,
    );
    for (const document of documents) {
      console.log(
        `   - [${document.id}] ${document.document_type} — ${document.title}`,
      );
    }
    console.log(
      `   → ${documents.length} dokumen jadi APPROVED (notes: "${AUTO_APPROVED_NOTE}")`,
    );

    if (willComplete) {
      const nextMilestone = await prisma.pengabdianMilestones.findUnique({
        where: {
          project_id_sequence: {
            project_id: milestone.project_id,
            sequence: milestone.sequence + 1,
          },
        },
        select: { id: true, title: true },
      });

      console.log(
        `   → milestone jadi COMPLETED; progres proyek ${milestone.project.overall_progress} → ${milestone.target_percentage}`,
      );
      console.log(
        `   → milestone berikutnya: ${nextMilestone ? `#${nextMilestone.id} "${nextMilestone.title}" → ONGOING` : "tidak ada (milestone terakhir)"}`,
      );
      console.log(
        `   → 1 notifikasi ke ketua peneliti (user #${milestone.project.proposal.lead_researcher_id})`,
      );
      milestonesToComplete += 1;
      notificationsToCreate += 1;
    } else if (isFinalMilestone) {
      console.log(
        "   → milestone AKHIR: TIDAK di-auto-complete (tetap menunggu persetujuan LAPORAN_AKHIR oleh Admin LPPM)",
      );
    } else {
      console.log("   → milestone sudah COMPLETED: efek tidak dijalankan ulang");
    }

    documentsToUpdate += documents.length;
    console.log("");
  }

  console.log("──────────────────────────────────────");
  console.log(
    `Ringkasan: ${documentsToUpdate} dokumen → APPROVED, ${milestonesToComplete} milestone → COMPLETED, ${notificationsToCreate} notifikasi.`,
  );

  if (!isExecute) {
    console.log(
      "\nDRY RUN selesai — tidak ada data yang diubah. Jalankan ulang dengan flag `--execute` untuk menulis.",
    );
    return;
  }

  let updatedDocuments = 0;
  let completedMilestones = 0;
  let failed = 0;

  for (const [milestoneId, documents] of groups) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.pengabdianDocuments.updateMany({
          where: { id: { in: documents.map((document) => document.id) } },
          data: {
            verification_status: DocumentVerificationStatus.APPROVED,
            verification_notes: AUTO_APPROVED_NOTE,
          },
        });
        updatedDocuments += documents.length;

        if (milestoneId === null) {
          return;
        }

        const milestone = documents[0].milestone;
        if (!milestone) {
          return;
        }

        const isFinal =
          getBaseDocumentTypeFromMilestone(
            milestone.title,
            milestone.sequence,
          ) === PengabdianDocumentType.LAPORAN_AKHIR ||
          (await tx.pengabdianMilestones.count({
            where: {
              project_id: milestone.project_id,
              sequence: { gt: milestone.sequence },
            },
          })) === 0;

        if (
          isFinal ||
          milestone.status === PengabdianMilestoneStatus.COMPLETED
        ) {
          return;
        }

        const context = await tx.pengabdianDocuments.findUnique({
          where: { id: documents[0].id },
          include: {
            milestone: {
              select: {
                id: true,
                sequence: true,
                target_percentage: true,
                project_id: true,
              },
            },
            project: {
              select: {
                id: true,
                status: true,
                proposal: { select: { lead_researcher_id: true } },
              },
            },
          },
        });

        if (!context) {
          throw new Error(`Dokumen ID ${documents[0].id} tidak ditemukan.`);
        }

        await applyApprovalEffects(tx, context, new Date());
        completedMilestones += 1;
      });
    } catch (error) {
      failed += 1;
      console.error(
        `❌ Gagal memproses grup milestone ${milestoneId ?? "(tanpa milestone)"}:`,
        error,
      );
    }
  }

  console.log(
    `✅ Eksekusi selesai: ${updatedDocuments} dokumen APPROVED, ${completedMilestones} milestone COMPLETED, ${failed} grup gagal.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
