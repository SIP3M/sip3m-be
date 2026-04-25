import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Sistem Informasi LPPM API",
      version: "1.0.0",
      description:
        "REST API untuk Sistem Informasi LPPM (SIP3M). Dokumentasi ini mencakup autentikasi (register, login, OAuth Google), RBAC (Role-Based Access Control), manajemen user, profil dosen, manajemen proposal penelitian (CRUD, submit, review, status workflow), dan notifikasi.",
    },
    servers: [
      {
        url: "https://sip3m-be.vercel.app/api",
        description: "Production server",
      },
      {
        url: "http://localhost:3000/api",
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "number", example: 1 },
            name: { type: "string", example: "Dosen A" },
            email: { type: "string", example: "dosen@kampus.ac.id" },
            nidn: { type: ["string", "null"], example: "012345678" },
            fakultas: { type: ["string", "null"], example: "Teknik" },
            is_active: { type: "boolean", example: true },
            roles: {
              type: "object",
              properties: {
                id: { type: "number", example: 3 },
                roles: { type: "string", example: "DOSEN" },
              },
            },
          },
        },
        Proposal: {
          type: "object",
          properties: {
            id: { type: "number", example: 1 },
            title: { type: "string", example: "Penelitian AI untuk Pertanian" },
            lead_researcher_id: { type: "number", example: 3 },
            faculty: { type: ["string", "null"], example: "Teknik" },
            skema: { type: ["string", "null"], example: "Penelitian Dasar" },
            funding_request_amount: {
              type: ["number", "null"],
              example: 15000000,
            },
            status: {
              type: "string",
              enum: [
                "DRAFT",
                "SUBMITTED",
                "ADMIN_VERIFIED",
                "UNDER_REVIEW",
                "REVISION",
                "ACCEPTED",
                "REJECTED",
              ],
              example: "SUBMITTED",
            },
            proposal_file_path: {
              type: ["string", "null"],
              example:
                "https://storage.example.com/proposals/3_1234567890_proposal.pdf",
            },
            rab_file_path: {
              type: ["string", "null"],
              example: "https://storage.example.com/rabs/3_1234567890_rab.pdf",
            },
            submitted_at: {
              type: ["string", "null"],
              format: "date-time",
              example: "2026-03-07T10:00:00.000Z",
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2026-03-07T09:00:00.000Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2026-03-07T10:00:00.000Z",
            },
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "number", example: 1 },
            user_id: { type: "number", example: 3 },
            title: {
              type: "string",
              example: "Proposal Terverifikasi",
            },
            message: {
              type: "string",
              example:
                'Proposal "Penelitian AI" telah diverifikasi oleh Admin LPPM.',
            },
            is_read: { type: "boolean", example: false },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2026-03-08T10:00:00.000Z",
            },
          },
        },
        ProposalReview: {
          type: "object",
          properties: {
            id: { type: "number", example: 1 },
            proposal_id: { type: "number", example: 1 },
            reviewer_id: { type: "number", example: 5 },
            status: {
              type: "string",
              enum: [
                "ADMIN_VERIFIED",
                "UNDER_REVIEW",
                "REVISION",
                "ACCEPTED",
                "REJECTED",
              ],
              example: "ACCEPTED",
            },
            notes: {
              type: ["string", "null"],
              example: "Proposal sudah memenuhi semua kriteria.",
            },
            score_perumusan: {
              type: ["number", "null"],
              example: 85,
              description: "Skor aspek perumusan masalah (0-100).",
            },
            score_tinjauan: {
              type: ["number", "null"],
              example: 80,
              description: "Skor aspek tinjauan pustaka (0-100).",
            },
            score_metode: {
              type: ["number", "null"],
              example: 88,
              description: "Skor aspek metode penelitian/pengabdian (0-100).",
            },
            score_anggaran: {
              type: ["number", "null"],
              example: 82,
              description: "Skor aspek anggaran (0-100).",
            },
            score_luaran: {
              type: ["number", "null"],
              example: 90,
              description: "Skor aspek luaran (0-100).",
            },
            total_score: {
              type: ["number", "null"],
              example: 425,
              description:
                "Total skor dari seluruh komponen penilaian (penjumlahan).",
            },
            kekuatan_proposal: {
              type: ["string", "null"],
              example:
                "Topik relevan, rumusan jelas, dan metode cukup kuat untuk menjawab tujuan.",
            },
            kelemahan_proposal: {
              type: ["string", "null"],
              example:
                "Rencana mitigasi risiko masih perlu dirinci lebih operasional.",
            },
            rekomendasi_akhir: {
              type: ["string", "null"],
              maxLength: 50,
              example:
                "Layak didanai dengan revisi minor pada bagian metodologi.",
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2026-03-08T11:00:00.000Z",
            },
            reviewer: {
              type: "object",
              properties: {
                id: { type: "number", example: 5 },
                name: { type: "string", example: "Reviewer A" },
                email: {
                  type: "string",
                  example: "reviewer@kampus.ac.id",
                },
              },
            },
          },
        },
        PengabdianProject: {
          type: "object",
          properties: {
            id: { type: "number", example: 1 },
            proposal_id: { type: "number", example: 12 },
            project_code: { type: ["string", "null"], example: "PENG-2026-12" },
            title: {
              type: ["string", "null"],
              example: "Analisis Dampak Lingkungan Limbah Pabrik Gula",
            },
            summary: {
              type: ["string", "null"],
              example:
                "Fokus pada mitigasi pencemaran sungai melalui kajian lapangan dan intervensi komunitas.",
            },
            start_date: {
              type: ["string", "null"],
              format: "date-time",
              example: "2026-04-01T00:00:00.000Z",
            },
            end_date: {
              type: ["string", "null"],
              format: "date-time",
              example: "2026-11-30T00:00:00.000Z",
            },
            overall_progress: { type: "number", example: 75 },
            status: {
              type: "string",
              enum: ["PENDING", "SEDANG_BERJALAN", "SELESAI"],
              example: "SEDANG_BERJALAN",
            },
            is_archived: { type: "boolean", example: false },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2026-03-21T10:20:00.000Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2026-03-22T12:00:00.000Z",
            },
            proposal: {
              type: "object",
              properties: {
                id: { type: "number", example: 12 },
                title: {
                  type: "string",
                  example: "Analisis Dampak Lingkungan Limbah Pabrik Gula",
                },
                status: {
                  type: "string",
                  enum: [
                    "DRAFT",
                    "SUBMITTED",
                    "ADMIN_VERIFIED",
                    "UNDER_REVIEW",
                    "REVISION",
                    "ACCEPTED",
                    "REJECTED",
                  ],
                  example: "ACCEPTED",
                },
                lead_researcher_id: { type: "number", example: 3 },
                created_at: {
                  type: ["string", "null"],
                  format: "date-time",
                  example: "2026-03-15T09:00:00.000Z",
                },
                updated_at: {
                  type: ["string", "null"],
                  format: "date-time",
                  example: "2026-03-20T08:30:00.000Z",
                },
              },
            },
          },
        },
        PengabdianDocumentUploader: {
          type: "object",
          properties: {
            id: { type: "number", example: 3 },
            name: { type: "string", example: "Dr. Budi Santoso" },
            email: {
              type: "string",
              format: "email",
              example: "budi@kampus.ac.id",
            },
          },
        },
        PengabdianDocument: {
          type: "object",
          properties: {
            id: { type: "number", example: 10 },
            project_id: { type: "number", example: 1 },
            milestone_id: { type: ["number", "null"], example: null },
            title: {
              type: ["string", "null"],
              example: "Laporan Kemajuan Tahap 1.pdf",
            },
            file_path: {
              type: "string",
              example:
                "pengabdian/1/1711234567890-Laporan_Kemajuan_Tahap_1.pdf",
            },
            file_size: { type: ["number", "null"], example: 2456780 },
            mime_type: {
              type: ["string", "null"],
              example: "application/pdf",
            },
            document_type: {
              type: "string",
              enum: [
                "DOKUMEN_KONTRAK",
                "LAPORAN_KEMAJUAN_1",
                "LAPORAN_KEMAJUAN_2",
                "LAPORAN_AKHIR",
                "LOGBOOK_KEGIATAN",
                "BUKTI_PENGGUNAAN_ANGGARAN",
                "LAINNYA",
              ],
              example: "LAPORAN_KEMAJUAN_1",
            },
            verification_status: {
              type: "string",
              enum: ["DRAFT", "PENDING", "APPROVED", "REJECTED"],
              example: "PENDING",
            },
            verification_notes: {
              type: ["string", "null"],
              example: "Dokumen sudah sesuai format pelaporan.",
            },
            uploaded_at: {
              type: "string",
              format: "date-time",
              example: "2026-03-23T09:12:00.000Z",
            },
            uploader: {
              $ref: "#/components/schemas/PengabdianDocumentUploader",
            },
          },
        },
        PengabdianMilestone: {
          type: "object",
          properties: {
            id: { type: "number", example: 1 },
            project_id: { type: "number", example: 1 },
            sequence: { type: "number", example: 2 },
            title: { type: "string", example: "Laporan Kemajuan 1" },
            target_percentage: { type: "number", example: 30 },
            status: {
              type: "string",
              enum: ["PENDING", "ONGOING", "COMPLETED"],
              example: "COMPLETED",
              description:
                "PENDING = belum dimulai, ONGOING = dokumen sudah diupload sebagai draft, COMPLETED = dokumen final sudah disubmit.",
            },
          },
        },
        PengabdianProjectWithMilestones: {
          type: "object",
          description:
            "Data proyek pengabdian beserta daftar milestones yang sudah diurutkan dari sequence terendah ke tertinggi (untuk timeline kiri ke kanan).",
          properties: {
            id: { type: "number", example: 1 },
            proposal_id: { type: "number", example: 12 },
            project_code: { type: ["string", "null"], example: "PENG-2026-12" },
            title: {
              type: ["string", "null"],
              example: "Analisis Dampak Lingkungan Limbah Pabrik Gula",
            },
            summary: {
              type: ["string", "null"],
              example: "Fokus pada mitigasi pencemaran sungai.",
            },
            start_date: {
              type: ["string", "null"],
              format: "date-time",
              example: "2026-04-01T00:00:00.000Z",
            },
            end_date: {
              type: ["string", "null"],
              format: "date-time",
              example: "2026-11-30T00:00:00.000Z",
            },
            overall_progress: {
              type: "number",
              example: 30,
              description:
                "Persentase kemajuan proyek. Diperbarui otomatis ke target_percentage milestone yang baru saja diselesaikan.",
            },
            status: {
              type: "string",
              enum: ["PENDING", "SEDANG_BERJALAN", "SELESAI"],
              example: "SEDANG_BERJALAN",
            },
            is_archived: { type: "boolean", example: false },
            realized_amount: { type: ["number", "null"], example: 5000000 },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2026-03-21T10:20:00.000Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2026-03-22T12:00:00.000Z",
            },
            proposal: {
              type: "object",
              properties: {
                id: { type: "number", example: 12 },
                lead_researcher_id: { type: "number", example: 3 },
              },
            },
            milestones: {
              type: "array",
              description:
                "Milestone diurutkan berdasarkan sequence ASC. Frontend merender dari kiri (sequence 1) ke kanan (sequence 4).",
              items: { $ref: "#/components/schemas/PengabdianMilestone" },
              example: [
                {
                  id: 1,
                  sequence: 1,
                  title: "Tanda Tangan Kontrak",
                  target_percentage: 0,
                  status: "COMPLETED",
                },
                {
                  id: 2,
                  sequence: 2,
                  title: "Laporan Kemajuan 1",
                  target_percentage: 30,
                  status: "ONGOING",
                },
                {
                  id: 3,
                  sequence: 3,
                  title: "Laporan Kemajuan 3",
                  target_percentage: 70,
                  status: "PENDING",
                },
                {
                  id: 4,
                  sequence: 4,
                  title: "Laporan Akhir",
                  target_percentage: 100,
                  status: "PENDING",
                },
              ],
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      /** ================= AUTH ================= */
      "/auth/register/dosen": {
        post: {
          tags: ["Auth"],
          summary: "Register Dosen",
          description: `
Endpoint untuk registrasi user dengan role **DOSEN**.

**Role akses:**
- Public (tanpa login)

**Catatan:**
- Setelah registrasi, akun berstatus \`is_active: false\` dan harus diverifikasi oleh Admin LPPM terlebih dahulu sebelum bisa login.
- Field \`nidn\`, \`username\`, dan \`email\` harus unik.
    `,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: [
                    "name",
                    "tempat_lahir",
                    "tanggal_lahir",
                    "jenis_kelamin",
                    "nomor_hp",
                    "email",
                    "nidn",
                    "fakultas",
                    "program_studi",
                    "username",
                    "password",
                    "konfirmasi_password",
                  ],
                  properties: {
                    name: {
                      type: "string",
                      example: "Budi Santoso",
                      description: "Nama lengkap, min 3 karakter.",
                    },
                    tempat_lahir: { type: "string", example: "Jakarta" },
                    tanggal_lahir: {
                      type: "string",
                      format: "date",
                      example: "1985-06-15",
                      description: "Format YYYY-MM-DD.",
                    },
                    jenis_kelamin: {
                      type: "string",
                      enum: ["Laki-laki", "Perempuan"],
                      example: "Laki-laki",
                    },
                    alamat: {
                      type: "string",
                      example: "Jl. Merdeka No. 1, Jakarta",
                      description: "Opsional, maks 500 karakter.",
                    },
                    nomor_hp: { type: "string", example: "081234567890" },
                    email: {
                      type: "string",
                      format: "email",
                      example: "budi@kampus.ac.id",
                    },
                    nidn: {
                      type: "string",
                      example: "0123456789",
                      description: "NIDN atau NIP dosen.",
                    },
                    fakultas: { type: "string", example: "Teknik" },
                    program_studi: {
                      type: "string",
                      example: "Teknik Informatika",
                    },
                    username: {
                      type: "string",
                      example: "budi_santoso",
                      description:
                        "Min 3 karakter, hanya huruf, angka, dan underscore.",
                    },
                    password: {
                      type: "string",
                      format: "password",
                      example: "password123",
                      description: "Min 8 karakter.",
                    },
                    konfirmasi_password: {
                      type: "string",
                      format: "password",
                      example: "password123",
                      description: "Harus sama dengan password.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Registrasi dosen berhasil",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Registrasi Dosen berhasil. Akun Anda sedang menunggu verifikasi oleh Admin.",
                    data: {
                      id: 5,
                      name: "Budi Santoso",
                      email: "budi@kampus.ac.id",
                      username: "budi_santoso",
                      nidn: "0123456789",
                      roles: {
                        id: 3,
                        roles: "DOSEN",
                      },
                      is_active: false,
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi data gagal",
              content: {
                "application/json": {
                  example: {
                    message: "Validasi data gagal.",
                    errors: {
                      email: ["Email format tidak valid."],
                      konfirmasi_password: [
                        "Password dan konfirmasi password harus sama.",
                      ],
                    },
                  },
                },
              },
            },
            409: {
              description: "Username / Email / NIDN sudah digunakan",
              content: {
                "application/json": {
                  examples: {
                    username: {
                      value: { message: "Username sudah digunakan." },
                    },
                    email: { value: { message: "Email sudah digunakan." } },
                    nidn: { value: { message: "NIDN sudah digunakan." } },
                  },
                },
              },
            },
          },
        },
      },

      "/auth/register/reviewer": {
        post: {
          tags: ["Auth"],
          summary: "Register Reviewer Eksternal",
          description: `
Endpoint untuk registrasi user dengan role **REVIEWER_EKSTERNAL**.

**Role akses:**
- Public (tanpa login)

**Catatan:**
- Request menggunakan **multipart/form-data** karena terdapat upload file CV.
- File CV maksimal **5 MB**.
- Format file CV yang diperbolehkan: **PDF, DOC, DOCX**.
- File CV disimpan di bucket **lppm_documents** pada folder **cv/**.
- Setelah registrasi, akun berstatus \`is_active: false\` dan harus diverifikasi oleh Admin LPPM.
- \`username\` dan \`email\` harus unik.
    `,
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  required: [
                    "name",
                    "email",
                    "nomor_hp",
                    "instansi",
                    "bidang_keahlian",
                    "pengalaman_review",
                    "cv",
                    "username",
                    "password",
                    "konfirmasi_password",
                  ],
                  properties: {
                    name: {
                      type: "string",
                      example: "Dr. Rina Wijaya",
                      description: "Nama lengkap, min 3 karakter.",
                    },
                    email: {
                      type: "string",
                      format: "email",
                      example: "rina@instansi.org",
                    },
                    nomor_hp: { type: "string", example: "082345678901" },
                    instansi: {
                      type: "string",
                      example: "Universitas Indonesia",
                    },
                    bidang_keahlian: {
                      type: "string",
                      example: "Kecerdasan Buatan",
                    },
                    pengalaman_review: {
                      type: "string",
                      example:
                        "Pernah mereview 15 proposal penelitian nasional sejak 2018.",
                      description: "Maks 1000 karakter.",
                    },
                    cv: {
                      type: "string",
                      format: "binary",
                      description:
                        "File CV wajib. Format: PDF/DOC/DOCX, ukuran maksimal 5 MB.",
                    },
                    username: {
                      type: "string",
                      example: "rina_wijaya",
                      description:
                        "Min 3 karakter, hanya huruf, angka, dan underscore.",
                    },
                    password: {
                      type: "string",
                      format: "password",
                      example: "password123",
                      description: "Min 8 karakter.",
                    },
                    konfirmasi_password: {
                      type: "string",
                      format: "password",
                      example: "password123",
                      description: "Harus sama dengan password.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Registrasi reviewer eksternal berhasil",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Registrasi Reviewer Eksternal berhasil. Akun Anda sedang menunggu verifikasi oleh Admin LPPM.",
                    data: {
                      id: 6,
                      name: "Dr. Rina Wijaya",
                      email: "rina@instansi.org",
                      username: "rina_wijaya",
                      roles: {
                        id: 5,
                        roles: "REVIEWER_EKSTERNAL",
                      },
                      is_active: false,
                    },
                  },
                },
              },
            },
            400: {
              description:
                "Validasi data gagal, file CV tidak diunggah, format file tidak valid, atau ukuran file melebihi batas",
              content: {
                "application/json": {
                  examples: {
                    noFile: { value: { message: "File CV wajib diunggah." } },
                    invalidFileFormat: {
                      value: {
                        message:
                          "Format file CV tidak didukung. Hanya PDF, DOC, atau DOCX yang diperbolehkan.",
                      },
                    },
                    fileTooLarge: {
                      value: {
                        message: "Ukuran file CV maksimal 5 MB.",
                      },
                    },
                    validationFail: {
                      value: {
                        message: "Validasi data gagal!",
                        errors: {
                          email: ["Email format tidak valid."],
                          konfirmasi_password: [
                            "Password dan konfirmasi password harus sama.",
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
            409: {
              description: "Username / Email sudah digunakan",
              content: {
                "application/json": {
                  examples: {
                    username: {
                      value: { message: "Username sudah digunakan." },
                    },
                    email: { value: { message: "Email sudah digunakan." } },
                  },
                },
              },
            },
          },
        },
      },

      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login user",
          description: `
Endpoint untuk autentikasi user.

**Role akses:**
- Public (tanpa login)

**Catatan:**
- \`identifier\` bisa berupa **email** atau **NIDN/NIP**.
- Menghasilkan JWT token untuk akses API lain.
- Jika \`remember_me: true\`, token berlaku selama **7 hari**. Jika tidak, token berlaku **1 hari**.
- Akun yang belum diverifikasi Admin LPPM tidak dapat login (\`is_active: false\`).
    `,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["identifier", "password"],
                  properties: {
                    identifier: {
                      type: "string",
                      example: "budi@kampus.ac.id",
                      description: "Email atau NIDN/NIP.",
                    },
                    password: {
                      type: "string",
                      format: "password",
                      example: "password123",
                    },
                    remember_me: {
                      type: "boolean",
                      example: false,
                      description: "Opsional. Jika true, token berlaku 7 hari.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Login berhasil",
              content: {
                "application/json": {
                  example: {
                    message: "Login berhasil.",
                    data: {
                      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                      user: {
                        id: 5,
                        name: "Budi Santoso",
                        email: "budi@kampus.ac.id",
                        nidn: "0123456789",
                        fakultas: "Teknik",
                        roles: {
                          id: 3,
                          roles: "DOSEN",
                        },
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: "Password salah",
              content: {
                "application/json": {
                  example: {
                    message: "Invalid Credentials.",
                  },
                },
              },
            },
            403: {
              description: "Akun belum diverifikasi",
              content: {
                "application/json": {
                  example: {
                    message: "Akun Anda belum diverifikasi oleh Admin LPPM.",
                  },
                },
              },
            },
            404: {
              description: "User tidak ditemukan",
              content: {
                "application/json": {
                  example: {
                    message:
                      "User tidak ditemukan. Silahkan daftar terlebih dahulu.",
                  },
                },
              },
            },
          },
        },
      },

      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current logged-in user",
          description: `
Mengambil data user yang sedang login berdasarkan JWT token.

**Role akses:**
- SEMUA ROLE (HARUS LOGIN)

**Catatan:**
- Field yang ditampilkan bervariasi sesuai role. Dosen memiliki field \`nidn\`, \`fakultas\`, \`program_studi\`. Reviewer Eksternal memiliki field \`instansi\`, \`bidang_keahlian\`, \`pengalaman_review\`.
    `,
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Data user yang sedang login",
              content: {
                "application/json": {
                  examples: {
                    dosen: {
                      summary: "Contoh response untuk role DOSEN",
                      value: {
                        data: {
                          id: 5,
                          name: "Budi Santoso",
                          username: "budi_santoso",
                          email: "budi@kampus.ac.id",
                          nomor_hp: "081234567890",
                          is_active: true,
                          roles: { id: 3, roles: "DOSEN" },
                          nidn: "0123456789",
                          fakultas: "Teknik",
                          program_studi: "Teknik Informatika",
                          instansi: null,
                          bidang_keahlian: null,
                          pengalaman_review: null,
                        },
                      },
                    },
                    reviewer_eksternal: {
                      summary: "Contoh response untuk role REVIEWER_EKSTERNAL",
                      value: {
                        data: {
                          id: 6,
                          name: "Dr. Rina Wijaya",
                          username: "rina_wijaya",
                          email: "rina@instansi.org",
                          nomor_hp: "082345678901",
                          is_active: true,
                          roles: { id: 5, roles: "REVIEWER_EKSTERNAL" },
                          nidn: null,
                          fakultas: null,
                          program_studi: null,
                          instansi: "Universitas Indonesia",
                          bidang_keahlian: "Kecerdasan Buatan",
                          pengalaman_review:
                            "Pernah mereview 15 proposal penelitian nasional sejak 2018.",
                        },
                      },
                    },
                  },
                },
              },
            },
            401: {
              description:
                "Unauthorized - token tidak valid atau tidak dikirim",
              content: {
                "application/json": {
                  example: {
                    message: "Unauthorized.",
                  },
                },
              },
            },
            404: {
              description: "User tidak ditemukan",
              content: {
                "application/json": {
                  example: {
                    message: "User not found.",
                  },
                },
              },
            },
          },
        },
      },

      "/auth/oauth/google": {
        get: {
          tags: ["Auth"],
          summary: "Login dengan Google (OAuth)",
          description: `
Endpoint untuk autentikasi via Google OAuth.

**Role akses:**
- Public (tanpa login)

Catatan:
- Endpoint ini akan me-redirect browser ke halaman login Google.
- Setelah autentikasi berhasil, user akan diarahkan kembali dengan JWT access token.
- Gunakan link ini langsung di browser atau sebagai redirect URL pada frontend.
    `,
          security: [],
          responses: {
            302: {
              description: "Redirect ke halaman Google OAuth",
              headers: {
                Location: {
                  description: "URL Google OAuth untuk autentikasi",
                  schema: {
                    type: "string",
                    example:
                      "https://google-oauth-teal.vercel.app/api/auth/google",
                  },
                },
              },
            },
          },
        },
      },

      "/users": {
        post: {
          tags: ["Users"],
          summary: "Create user",
          description: `
Membuat user baru dengan role apapun.

**Role akses:**
- ADMIN_LPPM

**Catatan:**
- Field \`email\`, \`username\`, dan \`nidn_nip\` harus unik.
- Password otomatis di-hash sebelum disimpan.
- \`is_active\` default \`true\` jika tidak dikirim.
    `,
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["name", "email", "password", "roles"],
                  properties: {
                    name: {
                      type: "string",
                      example: "Budi Santoso",
                      description: "Min 3 karakter.",
                    },
                    email: {
                      type: "string",
                      format: "email",
                      example: "budi@kampus.ac.id",
                    },
                    username: {
                      type: "string",
                      example: "budi_santoso",
                      description: "Opsional, min 3 karakter.",
                    },
                    password: {
                      type: "string",
                      format: "password",
                      example: "password123",
                      description: "Min 6 karakter.",
                    },
                    roles: {
                      type: "string",
                      description: "Nama role (case-insensitive).",
                      enum: [
                        "ADMIN_LPPM",
                        "STAFF_LPPM",
                        "DOSEN",
                        "REVIEWER",
                        "REVIEWER_EKSTERNAL",
                      ],
                      example: "DOSEN",
                    },
                    nidn_nip: {
                      type: "string",
                      example: "0123456789",
                      description: "Opsional.",
                    },
                    fakultas: {
                      type: "string",
                      example: "Teknik",
                      description: "Opsional.",
                    },
                    program_studi: {
                      type: "string",
                      example: "Teknik Informatika",
                      description: "Opsional.",
                    },
                    tempat_lahir: {
                      type: "string",
                      example: "Jakarta",
                      description: "Opsional.",
                    },
                    tanggal_lahir: {
                      type: "string",
                      format: "date",
                      example: "1985-06-15",
                      description: "Opsional. Format YYYY-MM-DD.",
                    },
                    jenis_kelamin: {
                      type: "string",
                      enum: ["Laki-laki", "Perempuan"],
                      example: "Laki-laki",
                      description: "Opsional.",
                    },
                    alamat: {
                      type: "string",
                      example: "Jl. Merdeka No. 1",
                      description: "Opsional.",
                    },
                    nomor_hp: {
                      type: "string",
                      example: "081234567890",
                      description: "Opsional.",
                    },
                    is_active: {
                      type: "boolean",
                      example: true,
                      description: "Opsional. Default true.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "User berhasil dibuat",
              content: {
                "application/json": {
                  example: {
                    message: "User berhasil dibuat.",
                    data: {
                      id: 10,
                      name: "Budi Santoso",
                      email: "budi@kampus.ac.id",
                      username: "budi_santoso",
                      nidn: "0123456789",
                      fakultas: "Teknik",
                      is_active: true,
                      created_at: "2026-03-02T08:00:00.000Z",
                      roles: { id: 3, roles: "DOSEN" },
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi gagal atau role tidak ditemukan",
              content: {
                "application/json": {
                  examples: {
                    roleNotFound: {
                      summary: "Role tidak ditemukan",
                      value: { message: "Role tidak ditemukan." },
                    },
                  },
                },
              },
            },
            409: {
              description:
                "Conflict — data unik sudah digunakan (hasil pengecekan DB)",
              content: {
                "application/json": {
                  examples: {
                    emailDup: {
                      summary: "Email duplikat",
                      value: {
                        message: "Email sudah digunakan.",
                        error: {
                          code: "UNIQUE_CONSTRAINT",
                          field: "email",
                        },
                      },
                    },
                    usernameDup: {
                      summary: "Username duplikat",
                      value: {
                        message: "Username sudah digunakan.",
                        error: {
                          code: "UNIQUE_CONSTRAINT",
                          field: "username",
                        },
                      },
                    },
                    nidnDup: {
                      summary: "NIDN/NIP duplikat",
                      value: {
                        message: "NIDN/NIP sudah digunakan.",
                        error: {
                          code: "UNIQUE_CONSTRAINT",
                          field: "nidn_nip",
                        },
                      },
                    },
                  },
                },
              },
            },
            401: {
              description:
                "Unauthorized — token tidak valid atau tidak dikirim",
              content: {
                "application/json": { example: { message: "Unauthorized." } },
              },
            },
            403: {
              description: "Forbidden — bukan ADMIN_LPPM",
              content: {
                "application/json": { example: { message: "Forbidden." } },
              },
            },
          },
        },
        get: {
          tags: ["Users"],
          summary: "Get all users",
          description: `
      Mengambil daftar seluruh user dalam sistem dengan dukungan filter, pencarian, dan pagination.

**Role akses:**
- ADMIN_LPPM

**Catatan:**
- Parameter \`status\` memfilter berdasarkan status verifikasi akun.
      - Parameter \`roles\` dikonversi ke UPPERCASE sebelum query (case-insensitive).
- Parameter \`search\` mencari di field \`name\` dan \`email\` secara case-insensitive.
      - Parameter \`page\` default ke \`1\`.
      - Jumlah data per halaman selalu \`5\`.
- Hasil diurutkan berdasarkan \`created_at\` terbaru (descending).
    `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "status",
              in: "query",
              required: false,
              description:
                "Filter berdasarkan status akun. `pending` = belum diverifikasi, `active` = sudah aktif.",
              schema: {
                type: "string",
                enum: ["pending", "active"],
                example: "pending",
              },
            },
            {
              name: "roles",
              in: "query",
              required: false,
              description:
                "Filter berdasarkan nama role. Contoh: `dosen`, `REVIEWER_EKSTERNAL`.",
              schema: {
                type: "string",
                example: "DOSEN",
              },
            },
            {
              name: "page",
              in: "query",
              required: false,
              description:
                "Nomor halaman. Harus bilangan bulat >= 1. Default: 1.",
              schema: {
                type: "integer",
                minimum: 1,
                example: 1,
              },
            },
            {
              name: "search",
              in: "query",
              required: false,
              description: "Cari user berdasarkan nama atau email.",
              schema: {
                type: "string",
                example: "budi",
              },
            },
          ],
          responses: {
            200: {
              description: "Daftar user berhasil diambil",
              content: {
                "application/json": {
                  examples: {
                    allUsers: {
                      summary: "Semua user tanpa filter",
                      value: {
                        data: [
                          {
                            id: 1,
                            name: "Admin LPPM",
                            email: "admin@kampus.ac.id",
                            nidn: null,
                            fakultas: null,
                            is_active: true,
                            created_at: "2025-01-01T00:00:00.000Z",
                            roles: { id: 1, roles: "ADMIN_LPPM" },
                          },
                          {
                            id: 5,
                            name: "Budi Santoso",
                            email: "budi@kampus.ac.id",
                            nidn: "0123456789",
                            fakultas: "Teknik",
                            is_active: true,
                            created_at: "2025-06-10T08:00:00.000Z",
                            roles: { id: 3, roles: "DOSEN" },
                          },
                        ],
                        pagination: {
                          page: 1,
                          per_page: 5,
                          total_items: 12,
                          total_pages: 3,
                        },
                      },
                    },
                    filteredByPending: {
                      summary: "Filter status=pending",
                      value: {
                        data: [
                          {
                            id: 5,
                            name: "Budi Santoso",
                            email: "budi@kampus.ac.id",
                            nidn: "0123456789",
                            fakultas: "Teknik",
                            is_active: false,
                            created_at: "2025-06-10T08:00:00.000Z",
                            roles: { id: 3, roles: "DOSEN" },
                          },
                        ],
                        pagination: {
                          page: 1,
                          per_page: 5,
                          total_items: 1,
                          total_pages: 1,
                        },
                      },
                    },
                    filteredByRole: {
                      summary: "Filter roles=DOSEN",
                      value: {
                        data: [
                          {
                            id: 5,
                            name: "Budi Santoso",
                            email: "budi@kampus.ac.id",
                            nidn: "0123456789",
                            fakultas: "Teknik",
                            is_active: true,
                            created_at: "2025-06-10T08:00:00.000Z",
                            roles: { id: 3, roles: "DOSEN" },
                          },
                        ],
                        pagination: {
                          page: 1,
                          per_page: 5,
                          total_items: 1,
                          total_pages: 1,
                        },
                      },
                    },
                    searchResult: {
                      summary: "Search berdasarkan nama/email",
                      value: {
                        data: [
                          {
                            id: 5,
                            name: "Budi Santoso",
                            email: "budi@kampus.ac.id",
                            nidn: "0123456789",
                            fakultas: "Teknik",
                            is_active: true,
                            created_at: "2025-06-10T08:00:00.000Z",
                            roles: { id: 3, roles: "DOSEN" },
                          },
                        ],
                        pagination: {
                          page: 1,
                          per_page: 5,
                          total_items: 1,
                          total_pages: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Query parameter tidak valid",
              content: {
                "application/json": {
                  example: {
                    message: "Parameter page harus berupa angka bulat >= 1.",
                  },
                },
              },
            },
            401: {
              description:
                "Unauthorized — token tidak valid atau tidak dikirim",
              content: {
                "application/json": {
                  example: { message: "Unauthorized." },
                },
              },
            },
            403: {
              description: "Forbidden — role tidak memiliki akses",
              content: {
                "application/json": {
                  example: { message: "Forbidden." },
                },
              },
            },
          },
        },
      },

      "/users/reviewers": {
        get: {
          tags: ["Users"],
          summary: "Get list reviewer (untuk dropdown)",
          description: `
Mengambil daftar user yang memiliki role **REVIEWER** atau **REVIEWER_EKSTERNAL** dan berstatus aktif.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM

**Catatan:**
- Endpoint ini digunakan untuk mengisi dropdown pemilihan reviewer di frontend.
- Hanya mengembalikan field \`id\`, \`name\`, dan \`email\` agar payload ringan.
- Diurutkan berdasarkan \`name\` ascending.
          `,
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Daftar reviewer berhasil diambil",
              content: {
                "application/json": {
                  example: {
                    data: [
                      {
                        id: 4,
                        name: "Reviewer A",
                        email: "reviewer@kampus.ac.id",
                      },
                      {
                        id: 6,
                        name: "Reviewer Eksternal B",
                        email: "eksternal@mitra.ac.id",
                      },
                    ],
                  },
                },
              },
            },
            401: {
              description:
                "Unauthorized — token tidak valid atau tidak dikirim",
              content: {
                "application/json": {
                  example: { message: "Unauthorized." },
                },
              },
            },
            403: {
              description: "Forbidden — bukan ADMIN_LPPM atau STAFF_LPPM",
              content: {
                "application/json": {
                  example: {
                    message:
                      "You do not have permission to access this resource.",
                  },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan saat mengambil daftar reviewer.",
                  },
                },
              },
            },
          },
        },
      },

      "/users/{id}": {
        get: {
          tags: ["Users"],
          summary: "Get user by ID",
          description: `
Mengambil detail user berdasarkan ID.

**Role akses:**
- ADMIN_LPPM

**Catatan:**
- \`id\` harus berupa angka valid, jika bukan akan mengembalikan 400.
    `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID user (harus angka).",
              schema: { type: "number", example: 5 },
            },
          ],
          responses: {
            200: {
              description: "Detail user berhasil diambil",
              content: {
                "application/json": {
                  example: {
                    data: {
                      id: 5,
                      name: "Budi Santoso",
                      email: "budi@kampus.ac.id",
                      username: "budi_santoso",
                      nidn: "0123456789",
                      fakultas: "Teknik",
                      program_studi: "Teknik Informatika",
                      tempat_lahir: "Jakarta",
                      tanggal_lahir: "1985-06-15T00:00:00.000Z",
                      jenis_kelamin: "Laki-laki",
                      alamat: "Jl. Merdeka No. 1",
                      nomor_hp: "081234567890",
                      is_active: true,
                      created_at: "2025-06-10T08:00:00.000Z",
                      updated_at: "2026-01-15T10:30:00.000Z",
                      roles: { id: 3, roles: "DOSEN" },
                    },
                  },
                },
              },
            },
            400: {
              description: "ID tidak valid",
              content: {
                "application/json": {
                  example: { message: "Invalid user id." },
                },
              },
            },
            401: {
              description:
                "Unauthorized — token tidak valid atau tidak dikirim",
              content: {
                "application/json": {
                  example: { message: "Unauthorized." },
                },
              },
            },
            403: {
              description: "Forbidden — role tidak memiliki akses",
              content: {
                "application/json": {
                  example: { message: "Forbidden." },
                },
              },
            },
            404: {
              description: "User tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "User not found." },
                },
              },
            },
          },
        },
        put: {
          tags: ["Users"],
          summary: "Update user",
          description: `
Memperbarui data user berdasarkan ID.

**Role akses:**
- ADMIN_LPPM

**Catatan:**
- Semua field bersifat opsional (partial update).
- Jika \`password\` dikirim, akan otomatis di-hash ulang.
- Jika \`roles\` dikirim, role user akan diganti.
- Field \`email\`, \`username\`, dan \`nidn_nip\` dicek keunikannya terhadap user lain.
    `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID user (harus angka).",
              schema: { type: "number", example: 5 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  properties: {
                    name: {
                      type: "string",
                      example: "Budi Santoso Updated",
                      description: "Opsional, min 3 karakter.",
                    },
                    email: {
                      type: "string",
                      format: "email",
                      example: "budi.baru@kampus.ac.id",
                      description: "Opsional.",
                    },
                    username: {
                      type: "string",
                      example: "budi_baru",
                      description: "Opsional, min 3 karakter.",
                    },
                    password: {
                      type: "string",
                      format: "password",
                      example: "newpassword123",
                      description: "Opsional. Min 6 karakter.",
                    },
                    roles: {
                      type: "string",
                      enum: [
                        "ADMIN_LPPM",
                        "STAFF_LPPM",
                        "DOSEN",
                        "REVIEWER",
                        "REVIEWER_EKSTERNAL",
                      ],
                      example: "STAFF_LPPM",
                      description: "Opsional. Ganti role user.",
                    },
                    nidn_nip: {
                      type: "string",
                      example: "0123456789",
                      description: "Opsional.",
                    },
                    fakultas: {
                      type: "string",
                      example: "Teknik",
                      description: "Opsional.",
                    },
                    program_studi: {
                      type: "string",
                      example: "Teknik Informatika",
                      description: "Opsional.",
                    },
                    tempat_lahir: {
                      type: "string",
                      example: "Jakarta",
                      description: "Opsional.",
                    },
                    tanggal_lahir: {
                      type: "string",
                      format: "date",
                      example: "1985-06-15",
                      description: "Opsional. Format YYYY-MM-DD.",
                    },
                    jenis_kelamin: {
                      type: "string",
                      enum: ["Laki-laki", "Perempuan"],
                      example: "Laki-laki",
                      description: "Opsional.",
                    },
                    alamat: {
                      type: "string",
                      example: "Jl. Merdeka No. 1",
                      description: "Opsional.",
                    },
                    nomor_hp: {
                      type: "string",
                      example: "081234567890",
                      description: "Opsional.",
                    },
                    is_active: {
                      type: "boolean",
                      example: true,
                      description: "Opsional.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "User berhasil diperbarui",
              content: {
                "application/json": {
                  example: {
                    message: "User berhasil diperbarui.",
                    data: {
                      id: 5,
                      name: "Budi Santoso Updated",
                      email: "budi.baru@kampus.ac.id",
                      username: "budi_baru",
                      nidn: "0123456789",
                      fakultas: "Teknik",
                      is_active: true,
                      created_at: "2025-06-10T08:00:00.000Z",
                      updated_at: "2026-03-02T10:00:00.000Z",
                      roles: { id: 3, roles: "DOSEN" },
                    },
                  },
                },
              },
            },
            400: {
              description: "ID tidak valid atau role tidak ditemukan",
              content: {
                "application/json": {
                  examples: {
                    invalidId: {
                      summary: "ID bukan angka",
                      value: { message: "Invalid user id." },
                    },
                    roleNotFound: {
                      summary: "Role tidak ada",
                      value: { message: "Role tidak ditemukan." },
                    },
                  },
                },
              },
            },
            409: {
              description:
                "Conflict — data unik sudah digunakan (hasil pengecekan DB)",
              content: {
                "application/json": {
                  examples: {
                    emailDup: {
                      summary: "Email duplikat",
                      value: {
                        message: "Email sudah digunakan.",
                        error: {
                          code: "UNIQUE_CONSTRAINT",
                          field: "email",
                        },
                      },
                    },
                    usernameDup: {
                      summary: "Username duplikat",
                      value: {
                        message: "Username sudah digunakan.",
                        error: {
                          code: "UNIQUE_CONSTRAINT",
                          field: "username",
                        },
                      },
                    },
                    nidnDup: {
                      summary: "NIDN/NIP duplikat",
                      value: {
                        message: "NIDN/NIP sudah digunakan.",
                        error: {
                          code: "UNIQUE_CONSTRAINT",
                          field: "nidn_nip",
                        },
                      },
                    },
                  },
                },
              },
            },
            401: {
              description:
                "Unauthorized — token tidak valid atau tidak dikirim",
              content: {
                "application/json": { example: { message: "Unauthorized." } },
              },
            },
            403: {
              description: "Forbidden — bukan ADMIN_LPPM",
              content: {
                "application/json": { example: { message: "Forbidden." } },
              },
            },
            404: {
              description: "User tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "User tidak ditemukan." },
                },
              },
            },
          },
        },
        delete: {
          tags: ["Users"],
          summary: "Delete user",
          description: `
Menghapus user secara permanen berdasarkan ID.

**Role akses:**
- ADMIN_LPPM

**Catatan:**
- Penghapusan bersifat **permanent** (hard delete).
- \`id\` harus berupa angka valid.
    `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID user (harus angka).",
              schema: { type: "number", example: 5 },
            },
          ],
          responses: {
            200: {
              description: "User berhasil dihapus",
              content: {
                "application/json": {
                  example: { message: "User berhasil dihapus." },
                },
              },
            },
            400: {
              description: "ID tidak valid",
              content: {
                "application/json": {
                  example: { message: "Invalid user id." },
                },
              },
            },
            401: {
              description:
                "Unauthorized — token tidak valid atau tidak dikirim",
              content: {
                "application/json": { example: { message: "Unauthorized." } },
              },
            },
            403: {
              description: "Forbidden — bukan ADMIN_LPPM",
              content: {
                "application/json": { example: { message: "Forbidden." } },
              },
            },
            404: {
              description: "User tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "User tidak ditemukan." },
                },
              },
            },
          },
        },
      },

      "/users/{id}/role": {
        patch: {
          tags: ["Users"],
          summary: "Update user role",
          description: `
Mengubah role user berdasarkan ID.

**Role akses:**
- ADMIN_LPPM

**Catatan:**
- \`id\` harus berupa angka valid.
- Field \`role\` harus sesuai dengan nama role yang ada di database.
- Jika role tidak ditemukan di database, akan mengembalikan 400.
    `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID user (harus angka).",
              schema: { type: "number", example: 5 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["role"],
                  properties: {
                    role: {
                      type: "string",
                      description: "Nama role yang ingin di-assign ke user.",
                      enum: [
                        "ADMIN_LPPM",
                        "STAFF_LPPM",
                        "DOSEN",
                        "REVIEWER_INTERNAL",
                        "REVIEWER_EKSTERNAL",
                      ],
                      example: "DOSEN",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Role user berhasil diubah",
              content: {
                "application/json": {
                  example: {
                    message: "User role updated successfully.",
                    data: {
                      id: 5,
                      name: "Budi Santoso",
                      email: "budi@kampus.ac.id",
                      nidn: "0123456789",
                      fakultas: "Teknik",
                      roles: { id: 3, roles: "DOSEN" },
                    },
                  },
                },
              },
            },
            400: {
              description: "ID tidak valid atau role tidak ditemukan",
              content: {
                "application/json": {
                  examples: {
                    invalidId: {
                      summary: "ID bukan angka",
                      value: { message: "Invalid user id." },
                    },
                    roleNotFound: {
                      summary: "Role tidak ada di database",
                      value: { message: "Role not found." },
                    },
                  },
                },
              },
            },
            401: {
              description:
                "Unauthorized — token tidak valid atau tidak dikirim",
              content: {
                "application/json": {
                  example: { message: "Unauthorized." },
                },
              },
            },
            403: {
              description: "Forbidden — bukan ADMIN_LPPM",
              content: {
                "application/json": {
                  example: { message: "Forbidden." },
                },
              },
            },
            404: {
              description: "User tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "User not found." },
                },
              },
            },
          },
        },
      },

      "/users/{id}/status": {
        patch: {
          tags: ["Users"],
          summary: "Update user active status",
          description: `
Mengaktifkan atau menonaktifkan akun user berdasarkan ID.

**Role akses:**
- ADMIN_LPPM

**Catatan:**
- Menggunakan soft-delete via field \`is_active\`.
- \`is_active: true\` → akun aktif (user bisa login).
- \`is_active: false\` → akun dinonaktifkan (user tidak bisa login).
- \`id\` harus berupa angka valid.
    `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID user (harus angka).",
              schema: { type: "number", example: 5 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["is_active"],
                  properties: {
                    is_active: {
                      type: "boolean",
                      description:
                        "Status aktif user. true = aktif, false = nonaktif.",
                      example: true,
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Status user berhasil diubah",
              content: {
                "application/json": {
                  examples: {
                    activated: {
                      summary: "Akun diaktifkan",
                      value: {
                        message: "User status updated successfully.",
                        data: {
                          id: 5,
                          name: "Budi Santoso",
                          email: "budi@kampus.ac.id",
                          nidn: "0123456789",
                          fakultas: "Teknik",
                          is_active: true,
                          roles: { id: 3, roles: "DOSEN" },
                        },
                      },
                    },
                    deactivated: {
                      summary: "Akun dinonaktifkan",
                      value: {
                        message: "User status updated successfully.",
                        data: {
                          id: 5,
                          name: "Budi Santoso",
                          email: "budi@kampus.ac.id",
                          nidn: "0123456789",
                          fakultas: "Teknik",
                          is_active: false,
                          roles: { id: 3, roles: "DOSEN" },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "ID tidak valid",
              content: {
                "application/json": {
                  example: { message: "Invalid user id." },
                },
              },
            },
            401: {
              description:
                "Unauthorized — token tidak valid atau tidak dikirim",
              content: {
                "application/json": {
                  example: { message: "Unauthorized." },
                },
              },
            },
            403: {
              description: "Forbidden — bukan ADMIN_LPPM",
              content: {
                "application/json": {
                  example: { message: "Forbidden." },
                },
              },
            },
            404: {
              description: "User tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "User not found." },
                },
              },
            },
          },
        },
      },

      /** ================= PROPOSAL ================= */
      "/proposals": {
        post: {
          tags: ["Proposal"],
          summary: "Buat proposal baru",
          description: `
Endpoint untuk membuat proposal penelitian baru.

**Role akses:**
- DOSEN

**Catatan:**
- Request menggunakan **multipart/form-data** karena terdapat upload file proposal dan RAB.
- Jika \`is_draft: true\`, file tidak wajib diunggah. Data disimpan sebagai draf.
- Jika \`is_draft: false\` (submit), file **proposal** dan **RAB** wajib diunggah.
- Field \`funding_request_amount\` menerima string atau number, akan dikonversi ke number.
          `,
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  required: ["title"],
                  properties: {
                    title: {
                      type: "string",
                      example: "Penelitian AI untuk Pertanian",
                      description:
                        "Judul proposal, min 5 karakter, maks 255 karakter.",
                    },
                    faculty: {
                      type: "string",
                      example: "Teknik",
                      description: "Opsional, maks 100 karakter.",
                    },
                    skema: {
                      type: "string",
                      example: "Penelitian Dasar",
                      description: "Opsional, maks 100 karakter.",
                    },
                    funding_request_amount: {
                      type: "number",
                      example: 15000000,
                      description: "Jumlah pendanaan yang diminta. Default 0.",
                    },
                    is_draft: {
                      type: "boolean",
                      example: false,
                      description:
                        "Jika true, disimpan sebagai draf. Default false.",
                    },
                    proposal_file: {
                      type: "string",
                      format: "binary",
                      description: "File proposal. Wajib jika bukan draf.",
                    },
                    rab_file: {
                      type: "string",
                      format: "binary",
                      description: "File RAB. Wajib jika bukan draf.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Proposal berhasil dibuat / Draf berhasil disimpan",
              content: {
                "application/json": {
                  examples: {
                    submitted: {
                      summary: "Proposal berhasil dikirim",
                      value: {
                        message: "Proposal berhasil dikirim.",
                        data: {
                          id: 1,
                          title: "Penelitian AI untuk Pertanian",
                          lead_researcher_id: 3,
                          faculty: "Teknik",
                          skema: "Penelitian Dasar",
                          funding_request_amount: 15000000,
                          status: "SUBMITTED",
                          proposal_file_path:
                            "https://storage.example.com/proposals/3_1234567890_proposal.pdf",
                          rab_file_path:
                            "https://storage.example.com/rabs/3_1234567890_rab.pdf",
                          submitted_at: "2026-03-07T10:00:00.000Z",
                          created_at: "2026-03-07T09:00:00.000Z",
                          updated_at: "2026-03-07T10:00:00.000Z",
                        },
                      },
                    },
                    draft: {
                      summary: "Draf berhasil disimpan",
                      value: {
                        message: "Draf berhasil disimpan.",
                        data: {
                          id: 2,
                          title: "Penelitian AI untuk Pertanian",
                          lead_researcher_id: 3,
                          faculty: "Teknik",
                          skema: "Penelitian Dasar",
                          funding_request_amount: 15000000,
                          status: "DRAFT",
                          proposal_file_path: null,
                          rab_file_path: null,
                          submitted_at: null,
                          created_at: "2026-03-07T09:00:00.000Z",
                          updated_at: "2026-03-07T09:00:00.000Z",
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi gagal atau file wajib tidak diunggah",
              content: {
                "application/json": {
                  examples: {
                    validationFail: {
                      summary: "Validasi data gagal",
                      value: {
                        message: "Validasi data gagal.",
                        errors: {
                          title: ["Judul proposal minimal 5 karakter."],
                        },
                      },
                    },
                    fileMissing: {
                      summary: "File wajib tidak diunggah saat submit",
                      value: {
                        message:
                          "File Proposal dan RAB wajib diunggah untuk melakukan Submit.",
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description: "Forbidden — role tidak memiliki akses",
              content: {
                "application/json": {
                  example: { message: "Forbidden: insufficient role" },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat menyimpan proposal.",
                  },
                },
              },
            },
          },
        },
        get: {
          tags: ["Proposal"],
          summary: "Ambil daftar proposal (pagination)",
          description: `
Endpoint untuk mengambil daftar proposal dengan pagination.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM
- REVIEWER
- REVIEWER_EKSTERNAL

**Catatan:**
- Jumlah data per halaman tetap **5 data**.
- Gunakan query \`page\` untuk berpindah halaman.
- Gunakan query \`search\` untuk mencari berdasarkan judul, skema, fakultas, nama dosen, atau NIDN/NIP.
- Gunakan query \`status\` untuk filter status proposal (misalnya \`ADMIN_VERIFIED\` saat proses assign reviewer).
- Membutuhkan autentikasi JWT.
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 1,
                default: 1,
              },
              description: "Nomor halaman (default 1).",
            },
            {
              name: "search",
              in: "query",
              required: false,
              schema: {
                type: "string",
                example: "dosen a",
              },
              description:
                "Kata kunci pencarian untuk judul, skema, fakultas, nama dosen, atau NIDN/NIP.",
            },
            {
              name: "status",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: [
                  "DRAFT",
                  "SUBMITTED",
                  "ADMIN_VERIFIED",
                  "UNDER_REVIEW",
                  "REVISION",
                  "ACCEPTED",
                  "REJECTED",
                ],
                example: "ADMIN_VERIFIED",
              },
              description: "Filter berdasarkan status proposal.",
            },
          ],
          responses: {
            200: {
              description: "Berhasil mengambil daftar proposal",
              content: {
                "application/json": {
                  example: {
                    message: "Berhasil mengambil daftar proposal.",
                    data: [
                      {
                        id: 1,
                        title: "Penelitian AI untuk Pertanian",
                        lead_researcher_id: 3,
                        user: {
                          name: "Dosen A",
                          nidn_nip: "0123456789",
                        },
                        faculty: "Teknik",
                        skema: "Penelitian Dasar",
                        funding_request_amount: 15000000,
                        status: "SUBMITTED",
                        proposal_file_path:
                          "https://storage.example.com/proposals/3_1234567890_proposal.pdf",
                        rab_file_path:
                          "https://storage.example.com/rabs/3_1234567890_rab.pdf",
                        submitted_at: "2026-03-07T10:00:00.000Z",
                        created_at: "2026-03-07T09:00:00.000Z",
                        updated_at: "2026-03-07T10:00:00.000Z",
                      },
                    ],
                    meta: {
                      totalData: 12,
                      totalPages: 3,
                      currentPage: 1,
                      limit: 5,
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi query gagal",
              content: {
                "application/json": {
                  example: {
                    message: "Validasi query gagal.",
                    errors: {
                      page: ["page minimal 1."],
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description: "Forbidden — role tidak memiliki akses",
              content: {
                "application/json": {
                  example: { message: "Forbidden: insufficient role" },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat mengambil data proposal.",
                  },
                },
              },
            },
          },
        },
      },

      "/getAllProposals": {
        get: {
          deprecated: true,
          tags: ["Proposal"],
          summary:
            "[Deprecated] Ambil daftar proposal (gunakan GET /proposals)",
          description: `
Endpoint untuk mengambil daftar proposal dengan pagination.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM
- REVIEWER
- REVIEWER_EKSTERNAL

**Catatan:**
- Jumlah data per halaman tetap **5 data**.
- Gunakan query \`page\` untuk berpindah halaman.
- Gunakan query \`search\` untuk mencari berdasarkan judul, skema, fakultas, nama dosen, atau NIDN/NIP.
- Gunakan query \`status\` untuk filter status proposal (misalnya \`ADMIN_VERIFIED\` saat proses assign reviewer).
- Membutuhkan autentikasi JWT.
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 1,
                default: 1,
              },
              description: "Nomor halaman (default 1).",
            },
            {
              name: "search",
              in: "query",
              required: false,
              schema: {
                type: "string",
                example: "dosen a",
              },
              description:
                "Kata kunci pencarian untuk judul, skema, fakultas, nama dosen, atau NIDN/NIP.",
            },
            {
              name: "status",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: [
                  "DRAFT",
                  "SUBMITTED",
                  "ADMIN_VERIFIED",
                  "UNDER_REVIEW",
                  "REVISION",
                  "ACCEPTED",
                  "REJECTED",
                ],
                example: "ADMIN_VERIFIED",
              },
              description: "Filter berdasarkan status proposal.",
            },
          ],
          responses: {
            200: {
              description: "Berhasil mengambil daftar proposal",
              content: {
                "application/json": {
                  example: {
                    message: "Berhasil mengambil daftar proposal.",
                    data: [
                      {
                        id: 1,
                        title: "Penelitian AI untuk Pertanian",
                        lead_researcher_id: 3,
                        user: {
                          name: "Dosen A",
                          nidn_nip: "0123456789",
                        },
                        faculty: "Teknik",
                        skema: "Penelitian Dasar",
                        funding_request_amount: 15000000,
                        status: "SUBMITTED",
                        proposal_file_path:
                          "https://storage.example.com/proposals/3_1234567890_proposal.pdf",
                        rab_file_path:
                          "https://storage.example.com/rabs/3_1234567890_rab.pdf",
                        submitted_at: "2026-03-07T10:00:00.000Z",
                        created_at: "2026-03-07T09:00:00.000Z",
                        updated_at: "2026-03-07T10:00:00.000Z",
                      },
                      {
                        id: 2,
                        title: "Pengembangan IoT untuk Smart Campus",
                        lead_researcher_id: 4,
                        user: {
                          name: "Dosen B",
                          nidn_nip: "9876543210",
                        },
                        faculty: "MIPA",
                        skema: "Penelitian Terapan",
                        funding_request_amount: 20000000,
                        status: "DRAFT",
                        proposal_file_path: null,
                        rab_file_path: null,
                        submitted_at: null,
                        created_at: "2026-03-06T08:00:00.000Z",
                        updated_at: "2026-03-06T08:00:00.000Z",
                      },
                    ],
                    meta: {
                      totalData: 12,
                      totalPages: 3,
                      currentPage: 1,
                      limit: 5,
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi query gagal",
              content: {
                "application/json": {
                  example: {
                    message: "Validasi query gagal.",
                    errors: {
                      page: ["page minimal 1."],
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description: "Forbidden — role tidak memiliki akses",
              content: {
                "application/json": {
                  example: { message: "Forbidden: insufficient role" },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat mengambil data proposal.",
                  },
                },
              },
            },
          },
        },
      },

      "/proposals/me": {
        get: {
          tags: ["Proposal"],
          summary: "Ambil daftar proposal milik dosen yang login",
          description: `
Endpoint untuk mengambil daftar proposal milik user yang sedang login (role DOSEN).

**Role akses:**
- DOSEN

**Catatan:**
- Jumlah data per halaman tetap **5 data**.
- Gunakan query \`page\` untuk pagination.
- Gunakan query \`search\` untuk pencarian berdasarkan judul, skema, atau fakultas.
- Gunakan query \`status\` untuk filter status proposal milik dosen.
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 1,
                default: 1,
              },
              description: "Nomor halaman (default 1).",
            },
            {
              name: "search",
              in: "query",
              required: false,
              schema: {
                type: "string",
                example: "ai",
              },
              description: "Pencarian untuk judul, skema, atau fakultas.",
            },
            {
              name: "status",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: [
                  "DRAFT",
                  "SUBMITTED",
                  "ADMIN_VERIFIED",
                  "UNDER_REVIEW",
                  "REVISION",
                  "ACCEPTED",
                  "REJECTED",
                ],
                example: "DRAFT",
              },
              description: "Filter berdasarkan status proposal.",
            },
          ],
          responses: {
            200: {
              description: "Berhasil mengambil daftar proposal saya",
              content: {
                "application/json": {
                  example: {
                    message: "Berhasil mengambil daftar proposal saya.",
                    data: [
                      {
                        id: 1,
                        title: "Penelitian AI untuk Pertanian",
                        lead_researcher_id: 3,
                        user: {
                          name: "Dosen A",
                          nidn_nip: "0123456789",
                        },
                        faculty: "Teknik",
                        skema: "Penelitian Dasar",
                        funding_request_amount: 15000000,
                        status: "DRAFT",
                        proposal_file_path: null,
                        rab_file_path: null,
                        submitted_at: null,
                        created_at: "2026-03-07T09:00:00.000Z",
                        updated_at: "2026-03-07T09:00:00.000Z",
                      },
                    ],
                    meta: {
                      totalData: 4,
                      totalPages: 1,
                      currentPage: 1,
                      limit: 5,
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi query gagal",
              content: {
                "application/json": {
                  example: {
                    message: "Validasi query gagal.",
                    errors: {
                      page: ["page minimal 1."],
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description: "Forbidden — role tidak memiliki akses",
              content: {
                "application/json": {
                  example: { message: "Forbidden: insufficient role" },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat mengambil data proposal saya.",
                  },
                },
              },
            },
          },
        },
      },

      "/proposals/assigned": {
        get: {
          tags: ["Proposal"],
          summary: "Ambil daftar tugas proposal reviewer yang login",
          description: `
Endpoint untuk mengambil daftar proposal yang **ditugaskan** ke reviewer yang sedang login.

**Role akses:**
- REVIEWER
- REVIEWER_EKSTERNAL

**Catatan:**
- Jumlah data per halaman tetap **5 data**.
- Secara default hanya menampilkan proposal dengan status \`UNDER_REVIEW\`.
- Query \`status\` bisa dipakai jika perlu melihat assignment pada status lain.
- Data cocok untuk kebutuhan tabel FE reviewer (judul penelitian/proposal, file proposal, file RAB, peneliti).
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 1,
                default: 1,
              },
              description: "Nomor halaman (default 1).",
            },
            {
              name: "search",
              in: "query",
              required: false,
              schema: {
                type: "string",
                example: "ai",
              },
              description:
                "Pencarian untuk judul, skema, fakultas, nama dosen, atau NIDN/NIP.",
            },
            {
              name: "status",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: [
                  "DRAFT",
                  "SUBMITTED",
                  "ADMIN_VERIFIED",
                  "UNDER_REVIEW",
                  "REVISION",
                  "ACCEPTED",
                  "REJECTED",
                ],
                example: "UNDER_REVIEW",
              },
              description:
                "Filter status proposal. Jika tidak dikirim, default `UNDER_REVIEW`.",
            },
          ],
          responses: {
            200: {
              description: "Berhasil mengambil daftar tugas proposal reviewer",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Berhasil mengambil daftar proposal tugas reviewer.",
                    data: [
                      {
                        id: 21,
                        title: "Penelitian AI untuk Pertanian",
                        lead_researcher_id: 3,
                        user: {
                          name: "Dosen A",
                          nidn_nip: "0123456789",
                        },
                        faculty: "Teknik",
                        skema: "Penelitian Dasar",
                        funding_request_amount: 15000000,
                        status: "UNDER_REVIEW",
                        proposal_file_path:
                          "https://storage.example.com/proposals/3_1234567890_proposal.pdf",
                        rab_file_path:
                          "https://storage.example.com/rabs/3_1234567890_rab.pdf",
                        submitted_at: "2026-03-07T10:00:00.000Z",
                        assigned_at: "2026-03-08T09:30:00.000Z",
                        created_at: "2026-03-07T09:00:00.000Z",
                        updated_at: "2026-03-08T09:35:00.000Z",
                      },
                    ],
                    meta: {
                      totalData: 4,
                      totalPages: 1,
                      currentPage: 1,
                      limit: 5,
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi query gagal",
              content: {
                "application/json": {
                  example: {
                    message: "Validasi query gagal.",
                    errors: {
                      page: ["page minimal 1."],
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description: "Forbidden — role tidak memiliki akses",
              content: {
                "application/json": {
                  example: { message: "Forbidden: insufficient role" },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat mengambil data tugas proposal reviewer.",
                  },
                },
              },
            },
          },
        },
      },

      "/proposals/{id}": {
        get: {
          tags: ["Proposal"],
          summary: "Ambil proposal berdasarkan ID",
          description: `
Endpoint untuk mengambil detail satu proposal berdasarkan ID.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM
- REVIEWER

**Catatan:**
- Parameter \`id\` harus berupa angka valid.
- Jika proposal tidak ditemukan, mengembalikan 404.
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID proposal",
              schema: {
                type: "integer",
                example: 1,
              },
            },
          ],
          responses: {
            200: {
              description: "Berhasil mengambil proposal",
              content: {
                "application/json": {
                  example: {
                    message: "Berhasil mengambil proposal.",
                    data: {
                      id: 1,
                      title: "Penelitian AI untuk Pertanian",
                      lead_researcher_id: 3,
                      user: {
                        name: "Dosen A",
                        nidn_nip: "0123456789",
                      },
                      faculty: "Teknik",
                      skema: "Penelitian Dasar",
                      funding_request_amount: 15000000,
                      status: "SUBMITTED",
                      proposal_file_path:
                        "https://storage.example.com/proposals/3_1234567890_proposal.pdf",
                      rab_file_path:
                        "https://storage.example.com/rabs/3_1234567890_rab.pdf",
                      submitted_at: "2026-03-07T10:00:00.000Z",
                      created_at: "2026-03-07T09:00:00.000Z",
                      updated_at: "2026-03-07T10:00:00.000Z",
                    },
                  },
                },
              },
            },
            400: {
              description: "ID proposal tidak valid",
              content: {
                "application/json": {
                  example: { message: "ID proposal tidak valid." },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description: "Forbidden — role tidak memiliki akses",
              content: {
                "application/json": {
                  example: { message: "Forbidden: insufficient role" },
                },
              },
            },
            404: {
              description: "Proposal tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "Proposal tidak ditemukan." },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat mengambil data proposal.",
                  },
                },
              },
            },
          },
        },
        put: {
          tags: ["Proposal"],
          summary: "Edit proposal",
          description: `
Endpoint untuk mengedit proposal yang sudah ada.

**Role akses:**
- DOSEN

**Catatan:**
- Hanya **lead researcher** (pemilik proposal) yang dapat mengedit.
- Hanya proposal dengan status **DRAFT** yang dapat diedit.
- Request menggunakan **multipart/form-data** karena terdapat upload file.
- Semua field bersifat opsional (partial update).
- Jika \`is_draft: false\`, file proposal dan RAB wajib tersedia (bisa file lama atau baru).
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID proposal",
              schema: { type: "integer", example: 1 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  properties: {
                    title: {
                      type: "string",
                      example: "Penelitian AI untuk Pertanian (Revisi)",
                      description:
                        "Opsional, min 5 karakter, maks 255 karakter.",
                    },
                    faculty: {
                      type: "string",
                      example: "Teknik",
                      description: "Opsional, maks 100 karakter.",
                    },
                    skema: {
                      type: "string",
                      example: "Penelitian Dasar",
                      description: "Opsional, maks 100 karakter.",
                    },
                    funding_request_amount: {
                      type: "number",
                      example: 20000000,
                      description: "Opsional. Jumlah pendanaan yang diminta.",
                    },
                    is_draft: {
                      type: "boolean",
                      example: true,
                      description:
                        "Opsional. Jika false, proposal langsung disubmit.",
                    },
                    proposal_file: {
                      type: "string",
                      format: "binary",
                      description: "File proposal baru (opsional).",
                    },
                    rab_file: {
                      type: "string",
                      format: "binary",
                      description: "File RAB baru (opsional).",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Proposal berhasil diperbarui",
              content: {
                "application/json": {
                  examples: {
                    updated: {
                      summary: "Proposal diperbarui (tetap draft)",
                      value: {
                        message: "Proposal berhasil diperbarui.",
                        data: {
                          id: 1,
                          title: "Penelitian AI untuk Pertanian (Revisi)",
                          lead_researcher_id: 3,
                          faculty: "Teknik",
                          skema: "Penelitian Dasar",
                          funding_request_amount: 20000000,
                          status: "DRAFT",
                          proposal_file_path: null,
                          rab_file_path: null,
                          submitted_at: null,
                          created_at: "2026-03-07T09:00:00.000Z",
                          updated_at: "2026-03-08T10:00:00.000Z",
                          file_info: {
                            proposal_file: {
                              previous_path:
                                "https://storage.example.com/proposals/3_1234567890_proposal_lama.pdf",
                              previous_name: "3_1234567890_proposal_lama.pdf",
                              current_path:
                                "https://storage.example.com/proposals/3_1234567890_proposal_lama.pdf",
                              current_name: "3_1234567890_proposal_lama.pdf",
                              replaced: false,
                            },
                            rab_file: {
                              previous_path:
                                "https://storage.example.com/rabs/3_1234567890_rab_lama.pdf",
                              previous_name: "3_1234567890_rab_lama.pdf",
                              current_path:
                                "https://storage.example.com/rabs/3_1234567890_rab_lama.pdf",
                              current_name: "3_1234567890_rab_lama.pdf",
                              replaced: false,
                            },
                          },
                        },
                      },
                    },
                    updatedAndSubmitted: {
                      summary: "Proposal diperbarui dan disubmit",
                      value: {
                        message: "Proposal berhasil diperbarui dan dikirim.",
                        data: {
                          id: 1,
                          title: "Penelitian AI untuk Pertanian (Revisi)",
                          lead_researcher_id: 3,
                          faculty: "Teknik",
                          skema: "Penelitian Dasar",
                          funding_request_amount: 20000000,
                          status: "SUBMITTED",
                          proposal_file_path:
                            "https://storage.example.com/proposals/3_1234567890_proposal.pdf",
                          rab_file_path:
                            "https://storage.example.com/rabs/3_1234567890_rab.pdf",
                          submitted_at: "2026-03-08T10:00:00.000Z",
                          created_at: "2026-03-07T09:00:00.000Z",
                          updated_at: "2026-03-08T10:00:00.000Z",
                          file_info: {
                            proposal_file: {
                              previous_path:
                                "https://storage.example.com/proposals/3_1234567890_proposal_lama.pdf",
                              previous_name: "3_1234567890_proposal_lama.pdf",
                              current_path:
                                "https://storage.example.com/proposals/3_1234567890_proposal.pdf",
                              current_name: "3_1234567890_proposal.pdf",
                              replaced: true,
                            },
                            rab_file: {
                              previous_path:
                                "https://storage.example.com/rabs/3_1234567890_rab_lama.pdf",
                              previous_name: "3_1234567890_rab_lama.pdf",
                              current_path:
                                "https://storage.example.com/rabs/3_1234567890_rab.pdf",
                              current_name: "3_1234567890_rab.pdf",
                              replaced: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description:
                "Validasi gagal, status bukan DRAFT, atau file wajib tidak tersedia",
              content: {
                "application/json": {
                  examples: {
                    validationFail: {
                      summary: "Validasi data gagal",
                      value: {
                        message: "Validasi data gagal.",
                        errors: {
                          title: ["Judul proposal minimal 5 karakter."],
                        },
                      },
                    },
                    notDraft: {
                      summary: "Proposal bukan DRAFT",
                      value: {
                        message:
                          "Hanya proposal dengan status DRAFT yang dapat diedit.",
                      },
                    },
                    fileMissing: {
                      summary: "File wajib tidak tersedia saat submit",
                      value: {
                        message:
                          "File Proposal dan RAB wajib diunggah untuk melakukan Submit.",
                      },
                    },
                    invalidId: {
                      summary: "ID tidak valid",
                      value: { message: "ID proposal tidak valid." },
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description:
                "Forbidden — bukan pemilik proposal atau role tidak sesuai",
              content: {
                "application/json": {
                  examples: {
                    notOwner: {
                      summary: "Bukan pemilik proposal",
                      value: {
                        message:
                          "Anda tidak memiliki izin untuk mengedit proposal ini.",
                      },
                    },
                    insufficientRole: {
                      summary: "Role tidak memiliki akses",
                      value: {
                        message: "Forbidden: insufficient role",
                      },
                    },
                  },
                },
              },
            },
            404: {
              description: "Proposal tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "Proposal tidak ditemukan." },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat mengedit proposal.",
                  },
                },
              },
            },
          },
        },
        delete: {
          tags: ["Proposal"],
          summary: "Hapus proposal",
          description: `
Endpoint untuk menghapus proposal.

**Role akses:**
- DOSEN

**Catatan:**
- Hanya **lead researcher** (pemilik proposal) yang dapat menghapus.
- Hanya proposal dengan status **DRAFT** yang dapat dihapus.
- Penghapusan bersifat **permanent** (hard delete).
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID proposal",
              schema: { type: "integer", example: 1 },
            },
          ],
          responses: {
            200: {
              description: "Proposal berhasil dihapus",
              content: {
                "application/json": {
                  example: { message: "Proposal berhasil dihapus." },
                },
              },
            },
            400: {
              description: "ID tidak valid atau proposal bukan status DRAFT",
              content: {
                "application/json": {
                  examples: {
                    invalidId: {
                      summary: "ID tidak valid",
                      value: { message: "ID proposal tidak valid." },
                    },
                    notDraft: {
                      summary: "Proposal bukan DRAFT",
                      value: {
                        message:
                          "Hanya proposal dengan status DRAFT yang dapat dihapus.",
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description: "Forbidden — bukan pemilik proposal",
              content: {
                "application/json": {
                  examples: {
                    notOwner: {
                      summary: "Bukan pemilik proposal",
                      value: {
                        message:
                          "Anda tidak memiliki izin untuk menghapus proposal ini.",
                      },
                    },
                    insufficientRole: {
                      summary: "Role tidak memiliki akses",
                      value: {
                        message: "Forbidden: insufficient role",
                      },
                    },
                  },
                },
              },
            },
            404: {
              description: "Proposal tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "Proposal tidak ditemukan." },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat menghapus proposal.",
                  },
                },
              },
            },
          },
        },
      },

      "/proposals/{id}/submit": {
        patch: {
          tags: ["Proposal"],
          summary: "Submit proposal",
          description: `
Endpoint untuk mengirim (submit) proposal ke pihak Admin/Reviewer.

**Role akses:**
- DOSEN

**Catatan:**
- Hanya **lead researcher** (pemilik proposal) yang dapat mengirim.
- Hanya proposal dengan status **DRAFT** atau **REVISION** yang dapat disubmit.
- File **proposal** dan **RAB** harus sudah diunggah sebelum submit.
- Status akan berubah menjadi \`SUBMITTED\`.
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID proposal",
              schema: { type: "integer", example: 1 },
            },
          ],
          responses: {
            200: {
              description: "Proposal berhasil disubmit",
              content: {
                "application/json": {
                  example: {
                    message: "Proposal berhasil disubmit.",
                    data: {
                      id: 1,
                      title: "Penelitian AI untuk Pertanian",
                      lead_researcher_id: 3,
                      faculty: "Teknik",
                      skema: "Penelitian Dasar",
                      funding_request_amount: 15000000,
                      status: "SUBMITTED",
                      proposal_file_path:
                        "https://storage.example.com/proposals/3_1234567890_proposal.pdf",
                      rab_file_path:
                        "https://storage.example.com/rabs/3_1234567890_rab.pdf",
                      submitted_at: "2026-03-08T10:00:00.000Z",
                      created_at: "2026-03-07T09:00:00.000Z",
                      updated_at: "2026-03-08T10:00:00.000Z",
                    },
                  },
                },
              },
            },
            400: {
              description:
                "ID tidak valid, status tidak sesuai, atau file belum diunggah",
              content: {
                "application/json": {
                  examples: {
                    invalidId: {
                      summary: "ID tidak valid",
                      value: { message: "ID proposal tidak valid." },
                    },
                    wrongStatus: {
                      summary: "Status tidak memungkinkan submit",
                      value: {
                        message:
                          "Hanya proposal dengan status DRAFT atau REVISION yang dapat disubmit.",
                      },
                    },
                    fileMissing: {
                      summary: "File belum diunggah",
                      value: {
                        message:
                          "File Proposal dan RAB wajib diunggah sebelum melakukan Submit.",
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description: "Forbidden — bukan pemilik proposal",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Anda tidak memiliki izin untuk mengirim proposal ini.",
                  },
                },
              },
            },
            404: {
              description: "Proposal tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "Proposal tidak ditemukan." },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat mengirim proposal.",
                  },
                },
              },
            },
          },
        },
      },

      "/proposals/{id}/status": {
        patch: {
          tags: ["Proposal"],
          summary: "Update status proposal",
          description: `
Endpoint untuk mengubah status proposal oleh Admin atau Reviewer.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM
- REVIEWER
- REVIEWER_EKSTERNAL

**Transisi status yang diperbolehkan:**

| Role | Dari Status | Ke Status |
|------|-------------|------------|
| ADMIN_LPPM / STAFF_LPPM | SUBMITTED | ADMIN_VERIFIED, REJECTED |
| REVIEWER / REVIEWER_EKSTERNAL | ADMIN_VERIFIED | UNDER_REVIEW |
| REVIEWER / REVIEWER_EKSTERNAL | UNDER_REVIEW | ACCEPTED, REJECTED, REVISION |

**Catatan:**
- Setiap perubahan status akan mencatat riwayat review di tabel \`ProposalReviews\`.
- Notifikasi otomatis akan dikirim ke lead researcher.
- **Otomatisasi ACCEPTED:** Jika status diubah menjadi \`ACCEPTED\`, sistem akan otomatis membuat record di tabel \`PengabdianProjects\` (status: \`PENDING\`, disbursement: \`MENUNGGU_PERSETUJUAN\`) dan membuat 4 tahapan milestone default (\`Penandatanganan Kontrak\`, \`Laporan Kemajuan 1 & 2\`, \`Laporan Akhir\`).
- Field \`notes\` bersifat opsional, maks 500 karakter.
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID proposal",
              schema: { type: "integer", example: 1 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["status"],
                  properties: {
                    status: {
                      type: "string",
                      enum: [
                        "ADMIN_VERIFIED",
                        "UNDER_REVIEW",
                        "REVISION",
                        "ACCEPTED",
                        "REJECTED",
                      ],
                      example: "ADMIN_VERIFIED",
                      description:
                        "Status baru. Harus sesuai transisi yang diperbolehkan berdasarkan role.",
                    },
                    notes: {
                      type: "string",
                      example:
                        "Proposal sudah memenuhi persyaratan administratif.",
                      description:
                        "Opsional. Catatan reviewer, maks 500 karakter.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Status proposal berhasil diubah",
              content: {
                "application/json": {
                  examples: {
                    adminVerified: {
                      summary: "Admin verifikasi proposal",
                      value: {
                        message:
                          "Status proposal berhasil diubah dari SUBMITTED ke ADMIN_VERIFIED.",
                        data: {
                          id: 1,
                          title: "Penelitian AI untuk Pertanian",
                          lead_researcher_id: 3,
                          faculty: "Teknik",
                          skema: "Penelitian Dasar",
                          funding_request_amount: 15000000,
                          status: "ADMIN_VERIFIED",
                          proposal_file_path:
                            "https://storage.example.com/proposals/3_1234567890_proposal.pdf",
                          rab_file_path:
                            "https://storage.example.com/rabs/3_1234567890_rab.pdf",
                          submitted_at: "2026-03-07T10:00:00.000Z",
                          created_at: "2026-03-07T09:00:00.000Z",
                          updated_at: "2026-03-08T11:00:00.000Z",
                        },
                      },
                    },
                    accepted: {
                      summary: "Reviewer menerima proposal",
                      value: {
                        message:
                          "Status proposal berhasil diubah dari UNDER_REVIEW ke ACCEPTED. Proyek pengabdian dan milestone telah dibuat otomatis.",
                        data: {
                          id: 1,
                          title: "Penelitian AI untuk Pertanian",
                          lead_researcher_id: 3,
                          faculty: "Teknik",
                          skema: "Penelitian Dasar",
                          funding_request_amount: 15000000,
                          status: "ACCEPTED",
                          proposal_file_path:
                            "https://storage.example.com/proposals/3_1234567890_proposal.pdf",
                          rab_file_path:
                            "https://storage.example.com/rabs/3_1234567890_rab.pdf",
                          submitted_at: "2026-03-07T10:00:00.000Z",
                          created_at: "2026-03-07T09:00:00.000Z",
                          updated_at: "2026-03-08T14:00:00.000Z",
                        },
                      },
                    },
                    revision: {
                      summary: "Reviewer meminta revisi",
                      value: {
                        message:
                          "Status proposal berhasil diubah dari UNDER_REVIEW ke REVISION.",
                        data: {
                          id: 1,
                          title: "Penelitian AI untuk Pertanian",
                          lead_researcher_id: 3,
                          status: "REVISION",
                          updated_at: "2026-03-08T14:00:00.000Z",
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description:
                "Validasi gagal atau transisi status tidak diperbolehkan",
              content: {
                "application/json": {
                  examples: {
                    invalidId: {
                      summary: "ID tidak valid",
                      value: { message: "ID proposal tidak valid." },
                    },
                    validationFail: {
                      summary: "Validasi data gagal",
                      value: {
                        message: "Validasi data gagal.",
                        errors: {
                          status: [
                            "Status tidak valid. Status yang diperbolehkan: ADMIN_VERIFIED, UNDER_REVIEW, REVISION, ACCEPTED, REJECTED.",
                          ],
                        },
                      },
                    },
                    invalidTransition: {
                      summary: "Transisi status tidak diperbolehkan",
                      value: {
                        message:
                          "Tidak dapat mengubah status dari SUBMITTED ke ACCEPTED dengan role REVIEWER.",
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description:
                "Forbidden — role tidak memiliki izin mengubah status",
              content: {
                "application/json": {
                  examples: {
                    noPermission: {
                      summary: "Role tidak punya izin",
                      value: {
                        message:
                          "Role Anda tidak memiliki izin untuk mengubah status proposal.",
                      },
                    },
                    insufficientRole: {
                      summary: "Role tidak memiliki akses endpoint",
                      value: {
                        message: "Forbidden: insufficient role",
                      },
                    },
                  },
                },
              },
            },
            404: {
              description: "Proposal tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "Proposal tidak ditemukan." },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat mengubah status proposal.",
                  },
                },
              },
            },
          },
        },
      },

      "/proposals/{id}/evaluate": {
        put: {
          tags: ["Proposal"],
          summary: "Simpan draft / submit penilaian proposal oleh reviewer",
          description: `
Endpoint untuk reviewer melakukan penilaian proposal.

**Role akses:**
- REVIEWER
- REVIEWER_EKSTERNAL

**Mode penilaian:**
- 'is_draft: true' → simpan draft (boleh parsial, tidak mengubah status proposal).
- 'is_draft: false' → submit final (semua field penilaian wajib, status proposal berubah sesuai keputusan reviewer).

**Keputusan submit yang diperbolehkan:**
- ACCEPTED (Memicu pembuatan Proyek Pengabdian & Milestone otomatis)
- REJECTED
- REVISION
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID proposal",
              schema: { type: "integer", example: 1 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      required: ["is_draft"],
                      properties: {
                        is_draft: {
                          type: "boolean",
                          enum: [true],
                          example: true,
                        },
                        status: {
                          type: "string",
                          enum: ["ACCEPTED", "REJECTED", "REVISION"],
                          example: "REVISION",
                        },
                        score_perumusan: {
                          type: "number",
                          minimum: 0,
                          maximum: 100,
                          example: 80,
                        },
                        score_tinjauan: {
                          type: "number",
                          minimum: 0,
                          maximum: 100,
                          example: 78,
                        },
                        score_metode: {
                          type: "number",
                          minimum: 0,
                          maximum: 100,
                          example: 82,
                        },
                        score_anggaran: {
                          type: "number",
                          minimum: 0,
                          maximum: 100,
                          example: 76,
                        },
                        score_luaran: {
                          type: "number",
                          minimum: 0,
                          maximum: 100,
                          example: 84,
                        },
                        kekuatan_proposal: {
                          type: "string",
                          example:
                            "Topik relevan dan rancangan kegiatan cukup sistematis.",
                        },
                        kelemahan_proposal: {
                          type: "string",
                          example:
                            "Bagian rencana evaluasi luaran perlu diperjelas.",
                        },
                        rekomendasi_akhir: {
                          type: "string",
                          maxLength: 50,
                          example: "Revisi minor sebelum pendanaan.",
                        },
                        notes: {
                          type: "string",
                          example: "Draft awal penilaian reviewer.",
                        },
                      },
                    },
                    {
                      type: "object",
                      required: [
                        "is_draft",
                        "status",
                        "score_perumusan",
                        "score_tinjauan",
                        "score_metode",
                        "score_anggaran",
                        "score_luaran",
                        "kekuatan_proposal",
                        "kelemahan_proposal",
                        "rekomendasi_akhir",
                      ],
                      properties: {
                        is_draft: {
                          type: "boolean",
                          enum: [false],
                          example: false,
                        },
                        status: {
                          type: "string",
                          enum: ["ACCEPTED", "REJECTED", "REVISION"],
                          example: "ACCEPTED",
                        },
                        score_perumusan: {
                          type: "number",
                          minimum: 0,
                          maximum: 100,
                          example: 90,
                        },
                        score_tinjauan: {
                          type: "number",
                          minimum: 0,
                          maximum: 100,
                          example: 88,
                        },
                        score_metode: {
                          type: "number",
                          minimum: 0,
                          maximum: 100,
                          example: 92,
                        },
                        score_anggaran: {
                          type: "number",
                          minimum: 0,
                          maximum: 100,
                          example: 85,
                        },
                        score_luaran: {
                          type: "number",
                          minimum: 0,
                          maximum: 100,
                          example: 89,
                        },
                        kekuatan_proposal: {
                          type: "string",
                          example:
                            "Kebaruan topik kuat, metodologi jelas, dan luaran terukur.",
                        },
                        kelemahan_proposal: {
                          type: "string",
                          example:
                            "Timeline implementasi perlu penajaman pada fase akhir.",
                        },
                        rekomendasi_akhir: {
                          type: "string",
                          maxLength: 50,
                          example: "Layak didanai.",
                        },
                        notes: {
                          type: "string",
                          example: "Secara keseluruhan proposal sangat baik.",
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          responses: {
            200: {
              description:
                "Draft berhasil disimpan atau penilaian berhasil disubmit",
              content: {
                "application/json": {
                  examples: {
                    draftSaved: {
                      summary: "Simpan draft penilaian",
                      value: {
                        message: "Draft penilaian berhasil disimpan.",
                        data: {
                          id: 10,
                          proposal_id: 1,
                          reviewer_id: 5,
                          status: "UNDER_REVIEW",
                          notes: "Draft awal penilaian reviewer.",
                          score_perumusan: 80,
                          score_tinjauan: 78,
                          score_metode: 82,
                          score_anggaran: 76,
                          score_luaran: 84,
                          total_score: 400,
                          kekuatan_proposal:
                            "Topik relevan dan rancangan kegiatan cukup sistematis.",
                          kelemahan_proposal:
                            "Bagian rencana evaluasi luaran perlu diperjelas.",
                          rekomendasi_akhir: "Revisi minor sebelum pendanaan.",
                          created_at: "2026-03-10T09:00:00.000Z",
                        },
                      },
                    },
                    submitted: {
                      summary: "Submit penilaian final",
                      value: {
                        message: "Penilaian proposal berhasil disubmit.",
                        data: {
                          review: {
                            id: 10,
                            proposal_id: 1,
                            reviewer_id: 5,
                            status: "ACCEPTED",
                            notes: "Secara keseluruhan proposal sangat baik.",
                            score_perumusan: 90,
                            score_tinjauan: 88,
                            score_metode: 92,
                            score_anggaran: 85,
                            score_luaran: 89,
                            total_score: 444,
                            kekuatan_proposal:
                              "Kebaruan topik kuat, metodologi jelas, dan luaran terukur.",
                            kelemahan_proposal:
                              "Timeline implementasi perlu penajaman pada fase akhir.",
                            rekomendasi_akhir: "Layak didanai.",
                            created_at: "2026-03-10T09:00:00.000Z",
                          },
                          proposal: {
                            id: 1,
                            title: "Penelitian AI untuk Pertanian",
                            lead_researcher_id: 3,
                            faculty: "Teknik",
                            skema: "Penelitian Dasar",
                            funding_request_amount: 15000000,
                            status: "ACCEPTED",
                            proposal_file_path:
                              "https://storage.example.com/proposals/3_1234567890_proposal.pdf",
                            rab_file_path:
                              "https://storage.example.com/rabs/3_1234567890_rab.pdf",
                            submitted_at: "2026-03-07T10:00:00.000Z",
                            created_at: "2026-03-07T09:00:00.000Z",
                            updated_at: "2026-03-10T10:00:00.000Z",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description:
                "ID tidak valid, validasi gagal, atau status proposal belum dapat direview",
              content: {
                "application/json": {
                  examples: {
                    invalidId: {
                      summary: "ID proposal tidak valid",
                      value: { message: "ID proposal tidak valid." },
                    },
                    validationFail: {
                      summary: "Validasi body gagal",
                      value: {
                        message: "Validasi data gagal.",
                        errors: {
                          status: [
                            "Status hasil review tidak valid. Pilihan: ACCEPTED, REJECTED, REVISION.",
                          ],
                        },
                      },
                    },
                    proposalStateInvalid: {
                      summary: "Proposal belum bisa submit review",
                      value: {
                        message:
                          "Proposal belum dapat disubmit review. Status saat ini: ADMIN_VERIFIED.",
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description:
                "Forbidden — reviewer tidak ditugaskan atau role tidak memiliki akses",
              content: {
                "application/json": {
                  examples: {
                    notAssigned: {
                      summary: "Reviewer tidak ditugaskan",
                      value: {
                        message:
                          "Anda tidak ditugaskan untuk mereview proposal ini.",
                      },
                    },
                    insufficientRole: {
                      summary: "Role tidak memiliki akses endpoint",
                      value: { message: "Forbidden: insufficient role" },
                    },
                  },
                },
              },
            },
            404: {
              description: "Proposal tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "Proposal tidak ditemukan." },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat menilai proposal.",
                  },
                },
              },
            },
          },
        },
      },

      "/proposals/{id}/reviews": {
        get: {
          tags: ["Proposal"],
          summary: "Ambil riwayat review proposal",
          description: `
Endpoint untuk mengambil riwayat review sebuah proposal.

**Role akses:**
- DOSEN
- ADMIN_LPPM
- STAFF_LPPM
- REVIEWER
- REVIEWER_EKSTERNAL

**Catatan:**
- Mengembalikan daftar semua review yang pernah dilakukan terhadap proposal tersebut.
- Diurutkan berdasarkan \`created_at\` ascending (paling lama di atas).
- Menyertakan informasi reviewer (id, name, email).
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID proposal",
              schema: { type: "integer", example: 1 },
            },
          ],
          responses: {
            200: {
              description: "Berhasil mengambil riwayat review",
              content: {
                "application/json": {
                  example: {
                    message: "Berhasil mengambil riwayat review.",
                    data: [
                      {
                        id: 1,
                        proposal_id: 1,
                        reviewer_id: 2,
                        status: "ADMIN_VERIFIED",
                        notes:
                          "Proposal sudah memenuhi persyaratan administratif.",
                        score_perumusan: null,
                        score_tinjauan: null,
                        score_metode: null,
                        score_anggaran: null,
                        score_luaran: null,
                        total_score: null,
                        kekuatan_proposal: null,
                        kelemahan_proposal: null,
                        rekomendasi_akhir: null,
                        created_at: "2026-03-08T11:00:00.000Z",
                        reviewer: {
                          id: 2,
                          name: "Admin LPPM",
                          email: "admin@kampus.ac.id",
                        },
                      },
                      {
                        id: 2,
                        proposal_id: 1,
                        reviewer_id: 5,
                        status: "UNDER_REVIEW",
                        notes: "",
                        score_perumusan: 80,
                        score_tinjauan: 78,
                        score_metode: 82,
                        score_anggaran: 76,
                        score_luaran: 84,
                        total_score: 400,
                        kekuatan_proposal:
                          "Topik relevan dan rancangan kegiatan cukup sistematis.",
                        kelemahan_proposal:
                          "Bagian rencana evaluasi luaran perlu diperjelas.",
                        rekomendasi_akhir: "Revisi minor sebelum pendanaan.",
                        created_at: "2026-03-08T14:00:00.000Z",
                        reviewer: {
                          id: 5,
                          name: "Reviewer A",
                          email: "reviewer@kampus.ac.id",
                        },
                      },
                      {
                        id: 3,
                        proposal_id: 1,
                        reviewer_id: 5,
                        status: "ACCEPTED",
                        notes:
                          "Proposal sudah memenuhi semua kriteria penilaian.",
                        score_perumusan: 90,
                        score_tinjauan: 88,
                        score_metode: 92,
                        score_anggaran: 85,
                        score_luaran: 89,
                        total_score: 444,
                        kekuatan_proposal:
                          "Kebaruan topik kuat, metodologi jelas, dan luaran terukur.",
                        kelemahan_proposal:
                          "Timeline implementasi perlu penajaman pada fase akhir.",
                        rekomendasi_akhir: "Layak didanai.",
                        created_at: "2026-03-09T10:00:00.000Z",
                        reviewer: {
                          id: 5,
                          name: "Reviewer A",
                          email: "reviewer@kampus.ac.id",
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: {
              description: "ID proposal tidak valid",
              content: {
                "application/json": {
                  example: { message: "ID proposal tidak valid." },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description: "Forbidden — role tidak memiliki akses",
              content: {
                "application/json": {
                  example: { message: "Forbidden: insufficient role" },
                },
              },
            },
            404: {
              description: "Proposal tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "Proposal tidak ditemukan." },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat mengambil riwayat review.",
                  },
                },
              },
            },
          },
        },
      },

      /** ================= ASSIGN REVIEWERS ================= */
      "/proposals/{id}/assign-reviewers": {
        post: {
          tags: ["Proposal"],
          summary: "Assign 1-2 reviewer ke proposal",
          description: `
Endpoint untuk menugaskan 1 atau 2 reviewer ke sebuah proposal.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM

**Catatan:**
- Proposal harus berstatus \`ADMIN_VERIFIED\` agar reviewer bisa ditugaskan.
- Harus mengirim minimal 1 dan maksimal 2 ID reviewer.
- Jika mengirim 2 ID, keduanya tidak boleh sama.
- Seluruh ID harus merupakan user aktif dengan role REVIEWER atau REVIEWER_EKSTERNAL.
- Setelah berhasil:
  - Data reviewer disimpan ke tabel \`ProposalReviewers\`.
  - Status proposal otomatis berubah menjadi \`UNDER_REVIEW\`.
  - Notifikasi dikirim ke reviewer yang ditugaskan dan pemilik proposal.
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID proposal yang akan di-assign reviewer",
              schema: { type: "integer", example: 1 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["reviewerIds"],
                  properties: {
                    reviewerIds: {
                      type: "array",
                      items: { type: "number" },
                      minItems: 1,
                      maxItems: 2,
                      description:
                        "Array berisi 1 sampai 2 ID reviewer. ID reviewer tidak boleh sama.",
                      example: [4, 6],
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description:
                "Reviewer berhasil ditugaskan, status proposal menjadi UNDER_REVIEW",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Reviewer berhasil ditugaskan (1-2 reviewer) dan status proposal diubah menjadi UNDER_REVIEW.",
                    data: {
                      id: 1,
                      title: "Penelitian AI untuk Pertanian",
                      lead_researcher_id: 3,
                      faculty: "Teknik",
                      skema: "Penelitian Dasar",
                      funding_request_amount: 15000000,
                      status: "UNDER_REVIEW",
                      proposal_file_path:
                        "https://storage.example.com/proposals/3_proposal.pdf",
                      rab_file_path:
                        "https://storage.example.com/rabs/3_rab.pdf",
                      submitted_at: "2026-03-07T10:00:00.000Z",
                      created_at: "2026-03-07T09:00:00.000Z",
                      updated_at: "2026-03-10T08:00:00.000Z",
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi gagal atau status proposal tidak sesuai",
              content: {
                "application/json": {
                  examples: {
                    validationError: {
                      summary: "Validasi Zod gagal",
                      value: {
                        message: "Validasi data gagal.",
                        errors: {
                          reviewerIds: ["Minimal memilih 1 reviewer."],
                        },
                      },
                    },
                    duplicateIds: {
                      summary: "ID reviewer sama",
                      value: {
                        message: "Validasi data gagal.",
                        errors: {
                          reviewerIds: ["ID reviewer tidak boleh sama."],
                        },
                      },
                    },
                    wrongStatus: {
                      summary: "Status proposal bukan ADMIN_VERIFIED",
                      value: {
                        message:
                          "Reviewer hanya dapat ditugaskan pada proposal berstatus ADMIN_VERIFIED. Status saat ini: SUBMITTED.",
                      },
                    },
                    invalidReviewer: {
                      summary: "Reviewer ID tidak valid",
                      value: {
                        message:
                          "Reviewer dengan ID 99 tidak ditemukan atau bukan reviewer.",
                      },
                    },
                    invalidId: {
                      summary: "ID proposal tidak valid",
                      value: { message: "ID proposal tidak valid." },
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description: "Forbidden — bukan ADMIN_LPPM atau STAFF_LPPM",
              content: {
                "application/json": {
                  example: {
                    message:
                      "You do not have permission to access this resource.",
                  },
                },
              },
            },
            404: {
              description: "Proposal tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "Proposal tidak ditemukan." },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat menugaskan reviewer.",
                  },
                },
              },
            },
          },
        },
      },

      /** ================= DOSEN ================= */
      "/dosen/profile": {
        get: {
          tags: ["Dosen"],
          summary: "Get dosen profile",
          description: `
Mengambil profil dosen yang sedang login.

**Role akses:**
- DOSEN

**Catatan:**
- Dosen hanya dapat melihat data miliknya sendiri.
- Data yang dikembalikan: id, name, email, nidn, fakultas, roles, created_at.
          `,
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Profil dosen berhasil diambil",
              content: {
                "application/json": {
                  example: {
                    data: {
                      id: 3,
                      name: "Dosen A",
                      email: "dosen@kampus.ac.id",
                      nidn: "012345678",
                      fakultas: "Teknik",
                      roles: "DOSEN",
                      created_at: "2025-06-10T08:00:00.000Z",
                    },
                  },
                },
              },
            },
            401: {
              description:
                "Unauthorized — token tidak valid atau tidak dikirim",
              content: {
                "application/json": {
                  example: { message: "Unauthorized." },
                },
              },
            },
            403: {
              description: "Forbidden — bukan role DOSEN",
              content: {
                "application/json": {
                  example: { message: "Forbidden: insufficient role" },
                },
              },
            },
            404: {
              description: "User tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "User not found." },
                },
              },
            },
          },
        },
        patch: {
          tags: ["Dosen"],
          summary: "Update dosen profile",
          description: `
Memperbarui profil dosen yang sedang login.

**Role akses:**
- DOSEN

**Catatan:**
- Dosen hanya dapat memperbarui data miliknya sendiri.
- Semua field bersifat opsional (partial update).
- Field yang dapat diubah: \`name\`, \`nidn\`, \`fakultas\`.
          `,
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  properties: {
                    name: {
                      type: "string",
                      example: "Dosen A Updated",
                      description: "Nama lengkap dosen.",
                    },
                    nidn: {
                      type: "string",
                      example: "012345679",
                      description: "NIDN atau NIP dosen.",
                    },
                    fakultas: {
                      type: "string",
                      example: "Teknik Informatika",
                      description: "Nama fakultas.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Profil berhasil diperbarui",
              content: {
                "application/json": {
                  example: {
                    message: "Profile updated successfully.",
                    data: {
                      id: 3,
                      name: "Dosen A Updated",
                      email: "dosen@kampus.ac.id",
                      nidn: "012345679",
                      fakultas: "Teknik Informatika",
                      roles: "DOSEN",
                    },
                  },
                },
              },
            },
            401: {
              description:
                "Unauthorized — token tidak valid atau tidak dikirim",
              content: {
                "application/json": {
                  example: { message: "Unauthorized." },
                },
              },
            },
            403: {
              description: "Forbidden — bukan role DOSEN",
              content: {
                "application/json": {
                  example: { message: "Forbidden: insufficient role" },
                },
              },
            },
            404: {
              description: "User tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "User not found." },
                },
              },
            },
          },
        },
      },

      /** ================= PENGABDIAN ================= */
      "/pengabdian/proposals/{proposalId}/project": {
        post: {
          tags: ["Pengabdian"],
          summary: "Buat proyek pengabdian dari proposal",
          description: `
Membuat entitas proyek pengabdian dari proposal yang sudah disetujui.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM

**Catatan:**
- Proposal harus berstatus \`ACCEPTED\`.
- Satu proposal hanya boleh memiliki satu proyek pengabdian.
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "proposalId",
              in: "path",
              required: true,
              schema: { type: "integer", minimum: 1, example: 12 },
              description: "ID proposal yang akan dijadikan proyek pengabdian.",
            },
          ],
          responses: {
            201: {
              description: "Proyek pengabdian berhasil dibuat",
              content: {
                "application/json": {
                  example: {
                    message: "Proyek pengabdian berhasil dibuat.",
                    data: {
                      id: 1,
                      proposal_id: 12,
                      project_code: "PENG-2026-12",
                      title: "Analisis Dampak Lingkungan Limbah Pabrik Gula",
                      status: "PENDING",
                      is_archived: false,
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi gagal atau proposal belum ACCEPTED",
              content: {
                "application/json": {
                  examples: {
                    invalidParam: {
                      value: {
                        message: "Validasi parameter gagal.",
                        errors: { proposalId: ["ID harus berupa angka."] },
                      },
                    },
                    invalidStatus: {
                      value: {
                        message:
                          "Proyek pengabdian hanya dapat dibuat untuk proposal berstatus ACCEPTED.",
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": { example: { message: "Unauthorized" } },
              },
            },
            403: {
              description: "Forbidden — role tidak memiliki akses",
            },
            404: {
              description: "Proposal tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "Proposal tidak ditemukan." },
                },
              },
            },
            409: {
              description: "Proyek untuk proposal tersebut sudah ada",
              content: {
                "application/json": {
                  example: {
                    message: "Proyek pengabdian untuk proposal ini sudah ada.",
                  },
                },
              },
            },
          },
        },
        get: {
          tags: ["Pengabdian"],
          summary: "Ambil proyek pengabdian berdasarkan proposal",
          description: `
Mengambil detail proyek pengabdian dari ID proposal tertentu.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM
- DOSEN
- REVIEWER
- REVIEWER_EKSTERNAL
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "proposalId",
              in: "path",
              required: true,
              schema: { type: "integer", minimum: 1, example: 12 },
            },
          ],
          responses: {
            200: {
              description: "Data proyek berhasil diambil",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      data: { $ref: "#/components/schemas/PengabdianProject" },
                    },
                  },
                },
              },
            },
            400: { description: "Validasi parameter gagal" },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
            404: {
              description: "Proyek pengabdian belum tersedia",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Proyek pengabdian untuk proposal ini belum tersedia.",
                  },
                },
              },
            },
          },
        },
      },

      "/pengabdian": {
        get: {
          tags: ["Pengabdian"],
          summary: "Ambil daftar proyek pengabdian (paginated)",
          description: `
Mengambil daftar proyek pengabdian dengan dukungan pagination dan filter.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM
- DOSEN
- REVIEWER
- REVIEWER_EKSTERNAL

**Catatan performa & akses data:**
- Data list hanya mengambil field penting (tanpa over-fetching field teks panjang).
- Untuk role DOSEN, data otomatis difilter hanya proyek miliknya (berdasarkan \`proposal.lead_researcher_id\`).
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, default: 1, example: 1 },
              description: "Nomor halaman.",
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, default: 5, example: 5 },
              description: "Jumlah data per halaman.",
            },
            {
              name: "search",
              in: "query",
              required: false,
              schema: { type: "string", example: "PENG-2026" },
              description: "Pencarian berdasarkan title atau project_code.",
            },
            {
              name: "is_archived",
              in: "query",
              required: false,
              schema: { type: "boolean", default: false, example: false },
              description: "Filter status arsip proyek.",
            },
          ],
          responses: {
            200: {
              description: "Berhasil mengambil daftar proyek pengabdian",
              content: {
                "application/json": {
                  example: {
                    message: "Berhasil mengambil daftar proyek pengabdian.",
                    data: [
                      {
                        id: 1,
                        project_code: "PENG-2026-12",
                        title: "Analisis Dampak Lingkungan Limbah Pabrik Gula",
                        status: "SEDANG_BERJALAN",
                        is_archived: false,
                        realized_amount: 0,
                        created_at: "2026-04-01T00:00:00.000Z",
                        proposal: {
                          id: 12,
                          lead_researcher_id: 3,
                        },
                      },
                    ],
                    meta: {
                      totalData: 17,
                      totalPages: 4,
                      currentPage: 1,
                      limit: 5,
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi query gagal",
              content: {
                "application/json": {
                  example: {
                    message: "Validasi query gagal.",
                    errors: {
                      page: ["page minimal 1."],
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
          },
        },
      },

      "/pengabdian/projects/{projectId}/status": {
        patch: {
          tags: ["Pengabdian"],
          summary: "Update status proyek pengabdian",
          description: `
Memperbarui status proyek pengabdian sesuai aturan transisi workflow.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM

**Aturan transisi:**
- \`PENDING -> SEDANG_BERJALAN\`
- \`SEDANG_BERJALAN -> SELESAI\`
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "projectId",
              in: "path",
              required: true,
              schema: { type: "integer", minimum: 1, example: 1 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: {
                    status: {
                      type: "string",
                      enum: ["PENDING", "SEDANG_BERJALAN", "SELESAI"],
                      example: "SEDANG_BERJALAN",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Status proyek berhasil diperbarui",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Status proyek pengabdian berhasil diubah dari PENDING ke SEDANG_BERJALAN.",
                    data: {
                      id: 1,
                      status: "SEDANG_BERJALAN",
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi gagal atau transisi status tidak valid",
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
            404: { description: "Proyek pengabdian tidak ditemukan" },
          },
        },
      },

      "/pengabdian/projects/{projectId}/details": {
        patch: {
          tags: ["Pengabdian"],
          summary: "Update detail proyek pengabdian",
          description: `
Memperbarui detail proyek pengabdian (ringkasan dan periode pelaksanaan).

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "projectId",
              in: "path",
              required: true,
              schema: { type: "integer", minimum: 1, example: 1 },
            },
          ],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    summary: {
                      type: "string",
                      example:
                        "Program pengabdian difokuskan pada peningkatan kualitas lingkungan sungai.",
                    },
                    start_date: {
                      type: "string",
                      format: "date-time",
                      example: "2026-04-01T00:00:00.000Z",
                    },
                    end_date: {
                      type: "string",
                      format: "date-time",
                      example: "2026-11-30T00:00:00.000Z",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Detail proyek berhasil diperbarui",
              content: {
                "application/json": {
                  example: {
                    message: "Detail proyek pengabdian berhasil diperbarui.",
                    data: {
                      id: 1,
                      summary:
                        "Program pengabdian difokuskan pada peningkatan kualitas lingkungan sungai.",
                      start_date: "2026-04-01T00:00:00.000Z",
                      end_date: "2026-11-30T00:00:00.000Z",
                    },
                  },
                },
              },
            },
            400: { description: "ID proyek atau format tanggal tidak valid" },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
            404: { description: "Proyek pengabdian tidak ditemukan" },
          },
        },
      },

      "/pengabdian/{id}/archive": {
        patch: {
          tags: ["Pengabdian"],
          summary: "Arsipkan proyek pengabdian",
          description: `
Mengarsipkan proyek pengabdian dengan mengubah flag \`is_archived\` menjadi \`true\`.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer", minimum: 1, example: 1 },
            },
          ],
          responses: {
            200: {
              description: "Proyek berhasil diarsipkan",
              content: {
                "application/json": {
                  example: {
                    message: "Proyek pengabdian berhasil diarsipkan.",
                    data: {
                      id: 1,
                      is_archived: true,
                    },
                  },
                },
              },
            },
            400: { description: "ID proyek tidak valid" },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
            404: { description: "Proyek pengabdian tidak ditemukan" },
          },
        },
      },

      /** ================= PENGABDIAN EXPORT ================= */
      "/pengabdian/export/excel": {
        get: {
          tags: ["Pengabdian Export"],
          summary: "Export rekapitulasi pengabdian ke Excel",
          description: `
Mengunduh file **Excel (.xlsx)** berisi rekapitulasi data pengabdian.

**Kolom file Excel:**
- No
- Kode Proyek
- Judul
- Ketua Peneliti
- Dana Disetujui
- Status
- Progress (%)

**Sumber data:**
- \`PengabdianProjects\`
- relasi \`proposal\` (\`funding_request_amount\`)
- relasi \`proposal.user\` (nama ketua peneliti)

**Role akses:**
- ADMIN_LPPM
          `,
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "File Excel berhasil dibuat",
              content: {
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                  {
                    schema: {
                      type: "string",
                      format: "binary",
                    },
                  },
              },
              headers: {
                "Content-Disposition": {
                  description:
                    'Header attachment untuk download file (contoh: attachment; filename="Rekap_Pengabdian.xlsx")',
                  schema: {
                    type: "string",
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: {
              description: "Forbidden — hanya ADMIN_LPPM",
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message: "Terjadi kesalahan pada server saat export Excel.",
                  },
                },
              },
            },
          },
        },
      },

      "/pengabdian/export/pdf": {
        get: {
          tags: ["Pengabdian Export"],
          summary: "Export rekapitulasi pengabdian ke PDF",
          description: `
Mengunduh file **PDF** berisi rekapitulasi sederhana data pengabdian.

Format isi PDF berupa daftar per proyek, mencakup:
- Judul
- Kode Proyek
- Ketua Peneliti
- Dana Disetujui
- Status
- Progress

**Role akses:**
- ADMIN_LPPM
          `,
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "File PDF berhasil dibuat",
              content: {
                "application/pdf": {
                  schema: {
                    type: "string",
                    format: "binary",
                  },
                },
              },
              headers: {
                "Content-Disposition": {
                  description:
                    'Header attachment untuk download file (contoh: attachment; filename="Rekap_Pengabdian.pdf")',
                  schema: {
                    type: "string",
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: {
              description: "Forbidden — hanya ADMIN_LPPM",
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message: "Terjadi kesalahan pada server saat export PDF.",
                  },
                },
              },
            },
          },
        },
      },

      /** ================= PENGABDIAN DOCUMENTS ================= */
      "/pengabdian-documents/upload": {
        post: {
          tags: ["Pengabdian Documents"],
          summary: "Upload dokumen milestone (context-aware, multi-file)",
          description: `
Upload dokumen pengabdian berbasis **milestone** menggunakan **multipart/form-data**.

**Role akses:**
- Semua role terautentikasi (wajib login)

**Konsep context-aware upload:**
- Frontend mengirim \`projectId\`, \`milestoneId\`, \`isDraft\`, dan file per field.
- Sistem menentukan \`document_type\` otomatis berdasarkan field upload:
  - \`laporan\` => mengikuti konteks milestone (kemajuan 1 / kemajuan 2 / akhir)
  - \`logbook\` => \`LOGBOOK_KEGIATAN\`
  - \`anggaran\` => \`BUKTI_PENGGUNAAN_ANGGARAN\`

**Field file yang didukung (max 1/file tiap field):**
- \`laporan\`
- \`logbook\`
- \`anggaran\`

**Ketentuan file:**
- Format: PDF, DOCX, XLSX, ZIP
- MIME type: 
  - \`application/pdf\`
  - \`application/vnd.openxmlformats-officedocument.wordprocessingml.document\`
  - \`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\`
  - \`application/zip\`
  - \`application/x-zip-compressed\`
- Ukuran maksimal **10 MB** per file

**Catatan implementasi:**
- File disimpan ke Supabase Storage bucket \`lppm_documents\`.
- Metadata disimpan ke tabel \`PengabdianDocuments\`.
- Path upload: \`pengabdian/{projectId}/milestone_{milestoneId}/{timestamp}-{filename}\`
          `,
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["projectId", "milestoneId"],
                  properties: {
                    projectId: {
                      type: "integer",
                      minimum: 1,
                      example: 1,
                    },
                    milestoneId: {
                      type: "integer",
                      minimum: 1,
                      example: 2,
                    },
                    isDraft: {
                      type: "boolean",
                      example: true,
                      description:
                        "Jika true, dokumen disimpan dengan status DRAFT. Jika false/omit, status awal PENDING.",
                    },
                    laporan: {
                      type: "string",
                      format: "binary",
                      description:
                        "File laporan utama milestone (opsional, max 1 file).",
                    },
                    logbook: {
                      type: "string",
                      format: "binary",
                      description:
                        "File logbook kegiatan (opsional, max 1 file).",
                    },
                    anggaran: {
                      type: "string",
                      format: "binary",
                      description:
                        "File bukti penggunaan anggaran (opsional, max 1 file).",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Dokumen milestone berhasil diunggah",
              content: {
                "application/json": {
                  example: {
                    message: "Dokumen milestone berhasil diunggah.",
                    data: [
                      {
                        id: 101,
                        project_id: 1,
                        milestone_id: 2,
                        document_type: "LAPORAN_KEMAJUAN_2",
                        title: "Laporan Tahap 2.docx",
                        file_path:
                          "pengabdian/1/milestone_2/1711234567000-Laporan_Tahap_2.docx",
                        file_size: 845321,
                        mime_type:
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        verification_status: "DRAFT",
                        verification_notes: null,
                        uploaded_by: 3,
                        uploaded_at: "2026-03-23T09:12:00.000Z",
                        public_url:
                          "https://<supabase>/storage/v1/object/public/lppm_documents/pengabdian/1/milestone_2/1711234567000-Laporan_Tahap_2.docx",
                        upload_field: "laporan",
                      },
                      {
                        id: 102,
                        project_id: 1,
                        milestone_id: 2,
                        document_type: "LOGBOOK_KEGIATAN",
                        title: "Logbook Minggu 3.pdf",
                        file_path:
                          "pengabdian/1/milestone_2/1711234568000-Logbook_Minggu_3.pdf",
                        file_size: 221003,
                        mime_type: "application/pdf",
                        verification_status: "DRAFT",
                        verification_notes: null,
                        uploaded_by: 3,
                        uploaded_at: "2026-03-23T09:12:00.000Z",
                        public_url:
                          "https://<supabase>/storage/v1/object/public/lppm_documents/pengabdian/1/milestone_2/1711234568000-Logbook_Minggu_3.pdf",
                        upload_field: "logbook",
                      },
                    ],
                  },
                },
              },
            },
            400: {
              description: "Validasi input/file gagal",
              content: {
                "application/json": {
                  examples: {
                    invalidPayload: {
                      value: {
                        message: "milestoneId wajib diisi.",
                      },
                    },
                    noFiles: {
                      value: {
                        message:
                          "Minimal satu file wajib diunggah (laporan, logbook, atau anggaran).",
                      },
                    },
                    invalidFileType: {
                      value: {
                        message:
                          "File type tidak didukung. Format yang diperbolehkan: PDF, DOCX, XLSX, ZIP. Anda mengunggah: image/png",
                      },
                    },
                    fileTooLarge: {
                      value: {
                        message: "Ukuran file terlalu besar. Maksimal 10 MB.",
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized." },
                },
              },
            },
            404: {
              description: "Project pengabdian tidak ditemukan",
              content: {
                "application/json": {
                  example: {
                    message: "Proyek pengabdian dengan ID 1 tidak ditemukan.",
                  },
                },
              },
            },
            500: { description: "Internal server error" },
          },
        },
      },

      "/pengabdian-documents/{projectId}": {
        get: {
          tags: ["Pengabdian Documents"],
          summary: "Ambil semua dokumen berdasarkan project ID",
          description: `
Mengambil daftar dokumen laporan pengabdian berdasarkan \`projectId\`.

**Role akses:**
- Semua role terautentikasi (wajib login)
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "projectId",
              in: "path",
              required: true,
              schema: { type: "integer", minimum: 1, example: 1 },
              description: "ID project pengabdian.",
            },
          ],
          responses: {
            200: {
              description: "Berhasil mengambil daftar dokumen project",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: {
                        type: "string",
                        example: "Dokumen berhasil diambil.",
                      },
                      data: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/PengabdianDocument",
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Parameter projectId tidak valid",
              content: {
                "application/json": {
                  example: { message: "projectId harus berupa angka positif." },
                },
              },
            },
            401: { description: "Unauthorized" },
            404: {
              description: "Project pengabdian tidak ditemukan",
              content: {
                "application/json": {
                  example: {
                    message: "Proyek pengabdian dengan ID 1 tidak ditemukan.",
                  },
                },
              },
            },
            500: { description: "Internal server error" },
          },
        },
      },

      "/pengabdian-documents/{documentId}/verify": {
        patch: {
          tags: ["Pengabdian Documents"],
          summary: "Verifikasi dokumen pengabdian",
          description: `
Memperbarui status verifikasi dokumen dan catatan verifikator.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM

**Status yang tersedia saat ini:**
- DRAFT
- PENDING
- APPROVED
- REJECTED
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "documentId",
              in: "path",
              required: true,
              schema: { type: "integer", minimum: 1, example: 10 },
              description: "ID dokumen pengabdian.",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: {
                    status: {
                      type: "string",
                      enum: ["DRAFT", "PENDING", "APPROVED", "REJECTED"],
                      example: "APPROVED",
                    },
                    notes: {
                      type: "string",
                      maxLength: 1000,
                      example: "Dokumen sudah sesuai format pelaporan.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Verifikasi dokumen berhasil diperbarui",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Dokumen berhasil diverifikasi dengan status APPROVED.",
                    data: {
                      id: 10,
                      verification_status: "APPROVED",
                      verification_notes:
                        "Dokumen sudah sesuai format pelaporan.",
                    },
                  },
                },
              },
            },
            400: {
              description: "Input tidak valid",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Status tidak valid. Status yang diperbolehkan: DRAFT, PENDING, APPROVED, REJECTED.",
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: {
              description: "Forbidden — hanya ADMIN_LPPM atau STAFF_LPPM",
            },
            404: {
              description: "Dokumen tidak ditemukan",
              content: {
                "application/json": {
                  example: {
                    message: "Dokumen dengan ID 10 tidak ditemukan.",
                  },
                },
              },
            },
            500: { description: "Internal server error" },
          },
        },
      },

      "/pengabdian-documents/{documentId}": {
        delete: {
          tags: ["Pengabdian Documents"],
          summary: "Hapus dokumen pengabdian",
          description: `
Menghapus dokumen dari Supabase Storage dan metadata di database.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM

**Aturan bisnis:**
- Dokumen dengan status \`APPROVED\` tidak dapat dihapus.
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "documentId",
              in: "path",
              required: true,
              schema: { type: "integer", minimum: 1, example: 10 },
              description: "ID dokumen pengabdian.",
            },
          ],
          responses: {
            200: {
              description: "Dokumen berhasil dihapus",
              content: {
                "application/json": {
                  example: {
                    message: "Dokumen berhasil dihapus.",
                    id: 10,
                  },
                },
              },
            },
            400: {
              description:
                "Dokumen sudah APPROVED sehingga tidak boleh dihapus",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Dokumen yang sudah disetujui tidak dapat dihapus.",
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: {
              description: "Forbidden — hanya ADMIN_LPPM atau STAFF_LPPM",
            },
            404: {
              description: "Dokumen tidak ditemukan",
              content: {
                "application/json": {
                  example: {
                    message: "Dokumen dengan ID 10 tidak ditemukan.",
                  },
                },
              },
            },
            500: { description: "Internal server error" },
          },
        },
      },

      /** ================= FINANCE ================= */
      "/finances/summary": {
        get: {
          tags: ["Finance"],
          summary: "Ambil ringkasan anggaran hibah",
          description: `
Mengambil ringkasan keuangan global dari sistem pengabdian.

**Perhitungan:**
- \`total_anggaran_hibah\` = total \`funding_request_amount\` proposal yang sudah memiliki project pengabdian.
- \`dana_terserap\` = total \`realized_amount\` pada project dengan status pencairan \`TERCAIRKAN\`.
- \`sisa_anggaran\` = \`total_anggaran_hibah - dana_terserap\`.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM
          `,
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Ringkasan anggaran berhasil diambil",
              content: {
                "application/json": {
                  example: {
                    message: "Ringkasan anggaran berhasil diambil.",
                    data: {
                      total_anggaran_hibah: 250000000,
                      dana_terserap: 120000000,
                      sisa_anggaran: 130000000,
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: {
              description: "Forbidden — hanya ADMIN_LPPM atau STAFF_LPPM",
            },
            500: { description: "Internal server error" },
          },
        },
      },

      "/finances/projects": {
        get: {
          tags: ["Finance"],
          summary: "Ambil daftar proyek keuangan",
          description: `
Mengambil daftar proyek pengabdian beserta data keuangan dan relasi proposal/peneliti.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM
          `,
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Daftar proyek keuangan berhasil diambil",
              content: {
                "application/json": {
                  example: {
                    message: "Daftar proyek keuangan berhasil diambil.",
                    data: [
                      {
                        id: 7,
                        proposal_id: 12,
                        project_code: "PENG-2026-12",
                        title: "Pemberdayaan UMKM Berbasis Digital",
                        disbursement_status: "MENUNGGU_PERSETUJUAN",
                        realized_amount: 0,
                        disbursed_at: null,
                        status: "SEDANG_BERJALAN",
                        created_at: "2026-04-01T08:00:00.000Z",
                        updated_at: "2026-04-01T08:00:00.000Z",
                        proposal: {
                          id: 12,
                          title: "Pemberdayaan UMKM Berbasis Digital",
                          funding_request_amount: 75000000,
                          user: {
                            id: 3,
                            name: "Budi Santoso",
                            email: "budi@kampus.ac.id",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: {
              description: "Forbidden — hanya ADMIN_LPPM atau STAFF_LPPM",
            },
            500: { description: "Internal server error" },
          },
        },
      },

      "/finances/projects/{id}/disburse": {
        patch: {
          tags: ["Finance"],
          summary: "Cairkan dana proyek",
          description: `
Mencairkan dana proyek pengabdian.

**Role akses:**
- ADMIN_LPPM

**Aksi yang dilakukan:**
- set \`disbursement_status\` menjadi \`TERCAIRKAN\`
- set \`realized_amount\` dari input admin
- set \`disbursed_at\` otomatis ke waktu saat ini
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer", minimum: 1, example: 7 },
              description: "ID project pengabdian.",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["realized_amount"],
                  properties: {
                    realized_amount: {
                      type: "number",
                      minimum: 1,
                      example: 50000000,
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Dana proyek berhasil dicairkan",
              content: {
                "application/json": {
                  example: {
                    message: "Dana proyek berhasil dicairkan.",
                    data: {
                      id: 7,
                      disbursement_status: "TERCAIRKAN",
                      realized_amount: 50000000,
                      disbursed_at: "2026-04-04T09:00:00.000Z",
                      proposal: {
                        id: 12,
                        title: "Pemberdayaan UMKM Berbasis Digital",
                        funding_request_amount: 75000000,
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi gagal atau nominal melebihi pagu",
              content: {
                "application/json": {
                  examples: {
                    invalidId: {
                      summary: "ID path tidak valid",
                      value: {
                        message: "id harus berupa angka bulat positif.",
                      },
                    },
                    zodValidation: {
                      summary: "Body tidak valid",
                      value: {
                        message: "Validation failed.",
                        errors: [
                          {
                            field: "realized_amount",
                            message: "realized_amount harus lebih dari 0.",
                          },
                        ],
                      },
                    },
                    overBudget: {
                      summary: "Nominal melebihi pagu proposal",
                      value: {
                        message:
                          "realized_amount melebihi funding_request_amount.",
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: {
              description: "Forbidden — hanya ADMIN_LPPM",
            },
            404: {
              description: "Proyek tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "Proyek pengabdian tidak ditemukan." },
                },
              },
            },
            500: { description: "Internal server error" },
          },
        },
      },

      /** ================= DASHBOARD ================= */
      "/dashboard/admin": {
        get: {
          tags: ["Dashboard"],
          summary: "Ambil data dashboard Admin LPPM",
          description: `
Mengambil data dashboard khusus **ADMIN_LPPM** untuk kebutuhan tampilan ringkasan statistik.

Struktur data mencakup:
- **summaryCards**: total proposal, dosen aktif, proposal disetujui, menunggu review.
- **statusChart**: distribusi jumlah proposal berdasarkan status.
- **kategoriChart**: distribusi jumlah proposal berdasarkan skema.
- **trendBulanan**: jumlah proposal per bulan dalam 6 bulan terakhir.
          `,
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Data dashboard berhasil diambil",
              content: {
                "application/json": {
                  example: {
                    message: "Success",
                    data: {
                      summaryCards: {
                        totalProposal: 42,
                        dosenAktif: 18,
                        proposalDisetujui: 11,
                        menungguReview: 9,
                      },
                      statusChart: [
                        { status: "DRAFT", jumlah: 6 },
                        { status: "SUBMITTED", jumlah: 8 },
                        { status: "ADMIN_VERIFIED", jumlah: 5 },
                        { status: "UNDER_REVIEW", jumlah: 4 },
                        { status: "REVISION", jumlah: 3 },
                        { status: "ACCEPTED", jumlah: 11 },
                        { status: "REJECTED", jumlah: 5 },
                      ],
                      kategoriChart: [
                        { skema: "Penelitian Dasar", jumlah: 17 },
                        { skema: "Penelitian Terapan", jumlah: 14 },
                        { skema: "Tanpa Skema", jumlah: 11 },
                      ],
                      trendBulanan: [
                        { bulan: "Nov", jumlah: 3 },
                        { bulan: "Des", jumlah: 5 },
                        { bulan: "Jan", jumlah: 7 },
                        { bulan: "Feb", jumlah: 6 },
                        { bulan: "Mar", jumlah: 9 },
                        { bulan: "Apr", jumlah: 4 },
                      ],
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized." },
                },
              },
            },
            403: {
              description: "Forbidden — hanya ADMIN_LPPM",
              content: {
                "application/json": {
                  example: {
                    message:
                      "You do not have permission to access this resource.",
                  },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat mengambil data dashboard.",
                  },
                },
              },
            },
          },
        },
      },

      /** ================= MONITORING PROYEK ================= */
      "/monitoring/projects": {
        get: {
          tags: ["Monitoring"],
          summary: "Ambil daftar monitoring proyek + summary",
          description: `
Mengambil data monitoring proyek untuk dashboard admin, meliputi:
- Ringkasan total proyek aktif, selesai, dan terlambat.
- Daftar proyek terpaginated dengan progress dan status kalkulasi.

**Role akses:**
- ADMIN_LPPM

**Catatan:**
- Jumlah data per halaman tetap **5**.
- Parameter \`search\` mencari berdasarkan judul proyek atau nama peneliti.
- Parameter \`statusFilter\` memfilter status proyek pengabdian.
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 1,
                default: 1,
              },
              description: "Nomor halaman (default: 1).",
            },
            {
              name: "search",
              in: "query",
              required: false,
              schema: {
                type: "string",
                example: "budi",
              },
              description: "Pencarian judul proyek atau nama peneliti.",
            },
            {
              name: "statusFilter",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: ["PENDING", "SEDANG_BERJALAN", "SELESAI"],
                example: "SEDANG_BERJALAN",
              },
              description: "Filter berdasarkan status proyek pengabdian.",
            },
          ],
          responses: {
            200: {
              description: "Data monitoring proyek berhasil diambil",
              content: {
                "application/json": {
                  example: {
                    message: "Success",
                    data: {
                      summary: {
                        total_aktif: 12,
                        total_selesai: 5,
                        total_terlambat: 3,
                      },
                      data: [
                        {
                          id: 7,
                          project_code: "PENG-2026-07",
                          title: "Pemberdayaan UMKM Berbasis Digital",
                          status: "SEDANG_BERJALAN",
                          created_at: "2026-04-01T08:00:00.000Z",
                          user: {
                            name: "Budi Santoso",
                          },
                          progress_percentage: 50,
                          milestone_berikutnya: "Laporan Kemajuan 2",
                          calculated_status: "ON TRACK",
                        },
                        {
                          id: 8,
                          project_code: "PENG-2026-08",
                          title: "Pengolahan Sampah Organik Berkelanjutan",
                          status: "PENDING",
                          created_at: "2026-03-20T08:00:00.000Z",
                          user: {
                            name: "Rina Wulandari",
                          },
                          progress_percentage: 25,
                          milestone_berikutnya: "Laporan Kemajuan 1",
                          calculated_status: "DELAYED",
                        },
                      ],
                      meta: {
                        totalData: 17,
                        totalPages: 4,
                        currentPage: 1,
                        limit: 5,
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi query gagal",
              content: {
                "application/json": {
                  examples: {
                    invalidPage: {
                      value: {
                        message: "Query page harus berupa angka bulat >= 1.",
                      },
                    },
                    invalidStatusFilter: {
                      value: {
                        message:
                          "statusFilter tidak valid. Gunakan salah satu: PENDING, SEDANG_BERJALAN, SELESAI.",
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized." },
                },
              },
            },
            403: {
              description: "Forbidden — hanya ADMIN_LPPM",
              content: {
                "application/json": {
                  example: {
                    message:
                      "You do not have permission to access this resource.",
                  },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat mengambil monitoring proyek.",
                  },
                },
              },
            },
          },
        },
      },

      "/monitoring/projects/{id}": {
        get: {
          tags: ["Monitoring"],
          summary: "Ambil detail monitoring proyek",
          description: `
Mengambil detail monitoring satu proyek berdasarkan ID.

**Role akses:**
- ADMIN_LPPM

**Catatan:**
- Menyertakan data peneliti, milestones, dan dokumen.
- Field \`calculated_status\` dihitung otomatis (\`COMPLETED\`, \`DELAYED\`, \`ON TRACK\`).
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID proyek monitoring.",
              schema: {
                type: "integer",
                minimum: 1,
                example: 7,
              },
            },
          ],
          responses: {
            200: {
              description: "Detail proyek berhasil diambil",
              content: {
                "application/json": {
                  example: {
                    message: "Success",
                    data: {
                      id: 7,
                      proposal_id: 12,
                      project_code: "PENG-2026-07",
                      title: "Pemberdayaan UMKM Berbasis Digital",
                      summary:
                        "Program pengabdian untuk peningkatan literasi digital UMKM desa.",
                      start_date: "2026-04-01T00:00:00.000Z",
                      end_date: "2026-11-30T00:00:00.000Z",
                      overall_progress: 50,
                      status: "SEDANG_BERJALAN",
                      is_archived: false,
                      created_at: "2026-04-01T08:00:00.000Z",
                      updated_at: "2026-04-10T08:00:00.000Z",
                      disbursement_status: "MENUNGGU_PERSETUJUAN",
                      realized_amount: 0,
                      disbursed_at: null,
                      user: {
                        name: "Budi Santoso",
                        nidn_nip: "0123456789",
                      },
                      progress_percentage: 50,
                      milestone_berikutnya: "Laporan Kemajuan 2",
                      calculated_status: "ON TRACK",
                      milestones: [
                        {
                          id: 21,
                          project_id: 7,
                          title: "Laporan Kemajuan 1",
                          description: null,
                          sequence: 2,
                          target_percentage: 30,
                          due_date: "2026-06-01T00:00:00.000Z",
                          status: "COMPLETED",
                          completed_at: "2026-05-28T10:00:00.000Z",
                          created_at: "2026-04-01T08:30:00.000Z",
                          updated_at: "2026-05-28T10:00:00.000Z",
                        },
                        {
                          id: 22,
                          project_id: 7,
                          title: "Laporan Kemajuan 2",
                          description: null,
                          sequence: 3,
                          target_percentage: 70,
                          due_date: "2026-08-01T00:00:00.000Z",
                          status: "PENDING",
                          completed_at: null,
                          created_at: "2026-04-01T08:30:00.000Z",
                          updated_at: "2026-04-01T08:30:00.000Z",
                        },
                      ],
                      documents: [
                        {
                          id: 91,
                          project_id: 7,
                          milestone_id: 21,
                          document_type: "LAPORAN_KEMAJUAN_1",
                          title: "Laporan Tahap 1.pdf",
                          file_path:
                            "pengabdian/7/milestone_21/1711234567000-Laporan_Tahap_1.pdf",
                          file_size: 231122,
                          mime_type: "application/pdf",
                          verification_status: "APPROVED",
                          verification_notes: "Dokumen valid.",
                          uploaded_by: 3,
                          uploaded_at: "2026-05-28T11:00:00.000Z",
                        },
                      ],
                    },
                  },
                },
              },
            },
            400: {
              description: "ID proyek tidak valid",
              content: {
                "application/json": {
                  example: { message: "ID proyek tidak valid." },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized." },
                },
              },
            },
            403: {
              description: "Forbidden — hanya ADMIN_LPPM",
              content: {
                "application/json": {
                  example: {
                    message:
                      "You do not have permission to access this resource.",
                  },
                },
              },
            },
            404: {
              description: "Proyek tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "Proyek tidak ditemukan." },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat mengambil detail proyek.",
                  },
                },
              },
            },
          },
        },
      },

      /** ================= PUBLIC REPOSITORY ================= */
      "/public/repository/pengabdian": {
        get: {
          tags: ["Public Repository"],
          summary: "Ambil repository pengabdian publik",
          description: `
Endpoint publik untuk mengambil daftar project pengabdian yang:
- status project sudah \`SELESAI\`
- memiliki dokumen \`LAPORAN_AKHIR\` dengan verifikasi \`APPROVED\`

Endpoint ini **tidak memerlukan autentikasi**.
          `,
          parameters: [
            {
              name: "page",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 1,
                default: 1,
              },
              description: "Nomor halaman (default 1).",
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 1,
                default: 5,
              },
              description: "Jumlah data per halaman (default 5).",
            },
            {
              name: "search",
              in: "query",
              required: false,
              schema: {
                type: "string",
              },
              description: "Pencarian berdasarkan judul project.",
            },
          ],
          responses: {
            200: {
              description: "Repository pengabdian publik berhasil diambil",
              content: {
                "application/json": {
                  example: {
                    message: "Berhasil mengambil repository pengabdian publik.",
                    data: [
                      {
                        id: 10,
                        title: "Pemberdayaan UMKM Berbasis Digital",
                        project_code: "PENG-2026-10",
                        created_at: "2026-04-01T08:00:00.000Z",
                        proposal: {
                          id: 25,
                          lead_researcher_id: 7,
                          user: {
                            id: 7,
                            name: "Dosen Pengabdi",
                            email: "dosen@kampus.ac.id",
                          },
                        },
                        documents: [
                          {
                            id: 77,
                            file_path:
                              "pengabdian/10/milestone_5/laporan-akhir.pdf",
                            uploaded_at: "2026-10-01T09:00:00.000Z",
                            public_url:
                              "https://<supabase>/storage/v1/object/public/lppm_documents/pengabdian/10/milestone_5/laporan-akhir.pdf",
                          },
                        ],
                      },
                    ],
                    meta: {
                      totalData: 18,
                      totalPages: 4,
                      currentPage: 1,
                      limit: 5,
                    },
                  },
                },
              },
            },
            400: {
              description: "Validasi query gagal",
              content: {
                "application/json": {
                  example: {
                    message: "Validasi query gagal.",
                    errors: {
                      page: ["page minimal 1."],
                    },
                  },
                },
              },
            },
            500: { description: "Internal server error" },
          },
        },
      },

      /** ================= PENGABDIAN PROJECTS ================= */
      "/pengabdian/projects": {
        get: {
          tags: ["Pengabdian"],
          summary: "Ambil daftar proyek pengabdian (Proyek Saya)",
          description: `
Endpoint untuk mengambil daftar proyek pengabdian.

**Role akses:**
- **DOSEN**: Hanya menampilkan proyek milik sendiri (filter otomatis via \`lead_researcher_id\`).
- **ADMIN_LPPM / STAFF_LPPM**: Menampilkan semua proyek.

**Catatan:**
- Response menyertakan field \`milestones\` yang diurutkan \`sequence: asc\` agar Frontend dapat me-render **progress bar** dan **timeline milestone** dari kiri ke kanan.
- \`overall_progress\` pada project merepresentasikan persentase kemajuan terkini (dihitung dari milestone terakhir yang diselesaikan).
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, default: 1 },
              description: "Nomor halaman (default: 1).",
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, default: 10 },
              description: "Jumlah data per halaman (default: 10).",
            },
            {
              name: "search",
              in: "query",
              required: false,
              schema: { type: "string", example: "limbah" },
              description: "Pencarian berdasarkan judul atau kode proyek.",
            },
            {
              name: "is_archived",
              in: "query",
              required: false,
              schema: { type: "boolean", example: false },
              description: "Filter proyek yang diarsipkan (true) atau aktif (false).",
            },
          ],
          responses: {
            200: {
              description: "Daftar proyek pengabdian berhasil diambil",
              content: {
                "application/json": {
                  example: {
                    data: [
                      {
                        id: 1,
                        proposal_id: 12,
                        project_code: "PENG-2026-12",
                        title: "Analisis Dampak Lingkungan Limbah Pabrik Gula",
                        status: "SEDANG_BERJALAN",
                        overall_progress: 30,
                        is_archived: false,
                        realized_amount: null,
                        created_at: "2026-03-21T10:20:00.000Z",
                        proposal: { id: 12, lead_researcher_id: 3 },
                        milestones: [
                          {
                            id: 1,
                            sequence: 1,
                            title: "Tanda Tangan Kontrak",
                            target_percentage: 0,
                            status: "COMPLETED",
                          },
                          {
                            id: 2,
                            sequence: 2,
                            title: "Laporan Kemajuan 1",
                            target_percentage: 30,
                            status: "ONGOING",
                          },
                          {
                            id: 3,
                            sequence: 3,
                            title: "Laporan Kemajuan 3",
                            target_percentage: 70,
                            status: "PENDING",
                          },
                          {
                            id: 4,
                            sequence: 4,
                            title: "Laporan Akhir",
                            target_percentage: 100,
                            status: "PENDING",
                          },
                        ],
                      },
                    ],
                    meta: {
                      totalData: 1,
                      totalPages: 1,
                      currentPage: 1,
                      limit: 10,
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized — token tidak valid atau tidak dikirim",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            500: { description: "Internal server error" },
          },
        },
      },

      "/pengabdian/projects/{projectId}/milestones/{milestoneId}/documents": {
        post: {
          tags: ["Pengabdian"],
          summary: "Upload dokumen untuk milestone tertentu",
          description: `
Endpoint untuk mengunggah satu atau lebih dokumen terkait sebuah milestone proyek pengabdian.

**Role akses:**
- **DOSEN** (pemilik proyek)

**Logika otomatis setelah upload berhasil:**
- Jika \`is_draft = false\` (submit final):
  - Status milestone diubah menjadi **COMPLETED**.
  - \`overall_progress\` proyek ditimpa dengan \`target_percentage\` milestone tersebut.
  - Kedua update dilakukan secara atomik via \`prisma.$transaction\`.
- Jika \`is_draft = true\` (simpan draft):
  - Status milestone diubah menjadi **ONGOING** (progress bar sudah bisa dirender).

**Field upload (multipart/form-data):**
- \`laporan\`: File laporan utama (PDF). Wajib.
- \`logbook\`: File logbook kegiatan (PDF). Opsional.
- \`anggaran\`: File bukti penggunaan anggaran (PDF). Opsional.
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "projectId",
              in: "path",
              required: true,
              schema: { type: "integer", example: 1 },
              description: "ID proyek pengabdian.",
            },
            {
              name: "milestoneId",
              in: "path",
              required: true,
              schema: { type: "integer", example: 2 },
              description: "ID milestone yang akan diupload dokumennya.",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  required: ["laporan"],
                  properties: {
                    laporan: {
                      type: "string",
                      format: "binary",
                      description: "File laporan utama (PDF, wajib).",
                    },
                    logbook: {
                      type: "string",
                      format: "binary",
                      description: "File logbook kegiatan (PDF, opsional).",
                    },
                    anggaran: {
                      type: "string",
                      format: "binary",
                      description:
                        "File bukti penggunaan anggaran (PDF, opsional).",
                    },
                    is_draft: {
                      type: "boolean",
                      example: false,
                      description:
                        "Jika true → status milestone menjadi ONGOING. Jika false → COMPLETED dan overall_progress diperbarui.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Dokumen berhasil diunggah dan milestone diperbarui",
              content: {
                "application/json": {
                  example: {
                    message: "Dokumen milestone berhasil diunggah.",
                    data: [
                      {
                        id: 15,
                        project_id: 1,
                        milestone_id: 2,
                        document_type: "LAPORAN_KEMAJUAN_1",
                        title: "Laporan_Kemajuan_1.pdf",
                        file_path:
                          "pengabdian/1/milestone_2/1714000000000-Laporan_Kemajuan_1.pdf",
                        file_size: 1234567,
                        mime_type: "application/pdf",
                        verification_status: "PENDING",
                        uploaded_by: 3,
                        public_url:
                          "https://storage.supabase.co/lppm_documents/pengabdian/1/milestone_2/1714000000000-Laporan_Kemajuan_1.pdf",
                        upload_field: "laporan",
                      },
                    ],
                    milestone_update: {
                      id: 2,
                      status: "COMPLETED",
                      project_overall_progress: 30,
                    },
                  },
                },
              },
            },
            400: {
              description: "Tidak ada file yang diunggah",
              content: {
                "application/json": {
                  example: { message: "Minimal satu file harus diunggah." },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            404: {
              description: "Project atau milestone tidak ditemukan",
              content: {
                "application/json": {
                  examples: {
                    projectNotFound: {
                      value: {
                        message:
                          "Proyek pengabdian dengan ID 99 tidak ditemukan.",
                      },
                    },
                    milestoneNotFound: {
                      value: {
                        message:
                          "Milestone dengan ID 5 tidak ditemukan pada proyek 1.",
                      },
                    },
                  },
                },
              },
            },
            500: { description: "Internal server error" },
          },
        },
      },

      /** ================= NOTIFICATIONS ================= */
      "/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "Ambil semua notifikasi user",
          description: `
Endpoint untuk mengambil semua notifikasi milik user yang sedang login.

**Role akses:**
- SEMUA ROLE (HARUS LOGIN)

**Catatan:**
- Mengembalikan semua notifikasi user, diurutkan dari yang terbaru.
- Menyertakan jumlah notifikasi yang belum dibaca (\`unread_count\`).
          `,
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Berhasil mengambil notifikasi",
              content: {
                "application/json": {
                  example: {
                    message: "Berhasil mengambil notifikasi.",
                    data: {
                      unread_count: 2,
                      notifications: [
                        {
                          id: 3,
                          user_id: 3,
                          title: "Proposal Diterima 🎉",
                          message:
                            'Selamat! Proposal "Penelitian AI untuk Pertanian" telah diterima dan disetujui. Proyek pengabdian Anda telah dibuat secara otomatis.',
                          is_read: false,
                          created_at: "2026-03-09T10:00:00.000Z",
                        },
                        {
                          id: 2,
                          user_id: 3,
                          title: "Proposal Sedang Ditinjau",
                          message:
                            'Proposal "Penelitian AI untuk Pertanian" sedang dalam proses peninjauan oleh Reviewer.',
                          is_read: false,
                          created_at: "2026-03-08T14:00:00.000Z",
                        },
                        {
                          id: 1,
                          user_id: 3,
                          title: "Proposal Terverifikasi",
                          message:
                            'Proposal "Penelitian AI untuk Pertanian" telah diverifikasi oleh Admin LPPM dan siap untuk ditinjau oleh Reviewer.',
                          is_read: true,
                          created_at: "2026-03-08T11:00:00.000Z",
                        },
                      ],
                    },
                  },
                },
              },
            },
            401: {
              description:
                "Unauthorized — token tidak valid atau tidak dikirim",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat mengambil notifikasi.",
                  },
                },
              },
            },
          },
        },
      },

      "/notifications/{id}/read": {
        patch: {
          tags: ["Notifications"],
          summary: "Tandai notifikasi sebagai dibaca",
          description: `
Endpoint untuk menandai satu notifikasi sebagai telah dibaca.

**Role akses:**
- SEMUA ROLE (HARUS LOGIN)

**Catatan:**
- User hanya dapat menandai notifikasi miliknya sendiri.
- Jika notifikasi sudah dibaca, akan mengembalikan data tanpa perubahan.
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "ID notifikasi",
              schema: { type: "integer", example: 1 },
            },
          ],
          responses: {
            200: {
              description: "Notifikasi berhasil ditandai sebagai dibaca",
              content: {
                "application/json": {
                  example: {
                    message: "Notifikasi berhasil ditandai sebagai dibaca.",
                    data: {
                      id: 1,
                      user_id: 3,
                      title: "Proposal Terverifikasi",
                      message:
                        'Proposal "Penelitian AI untuk Pertanian" telah diverifikasi oleh Admin LPPM dan siap untuk ditinjau oleh Reviewer.',
                      is_read: true,
                      created_at: "2026-03-08T11:00:00.000Z",
                    },
                  },
                },
              },
            },
            400: {
              description: "ID notifikasi tidak valid",
              content: {
                "application/json": {
                  example: { message: "ID notifikasi tidak valid." },
                },
              },
            },
            401: {
              description:
                "Unauthorized — token tidak valid atau tidak dikirim",
              content: {
                "application/json": {
                  example: { message: "Unauthorized" },
                },
              },
            },
            403: {
              description:
                "Forbidden — notifikasi bukan milik user yang sedang login",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Anda tidak memiliki izin untuk mengakses notifikasi ini.",
                  },
                },
              },
            },
            404: {
              description: "Notifikasi tidak ditemukan",
              content: {
                "application/json": {
                  example: { message: "Notifikasi tidak ditemukan." },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": {
                  example: {
                    message:
                      "Terjadi kesalahan pada server saat memperbarui notifikasi.",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
});
