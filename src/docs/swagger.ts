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
                      description: "File CV, maks 5 MB.",
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
              description: "Validasi data gagal atau file CV tidak diunggah",
              content: {
                "application/json": {
                  examples: {
                    noFile: { value: { message: "File CV wajib diunggah." } },
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
                    message: "Password salah. Silahkan coba lagi.",
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
                        "PIHAK EKSTERNAL",
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
              description: "Validasi gagal atau data duplikat",
              content: {
                "application/json": {
                  examples: {
                    roleNotFound: {
                      summary: "Role tidak ditemukan",
                      value: { message: "Role tidak ditemukan." },
                    },
                    emailDup: {
                      summary: "Email duplikat",
                      value: { message: "Email sudah digunakan." },
                    },
                    usernameDup: {
                      summary: "Username duplikat",
                      value: { message: "Username sudah digunakan." },
                    },
                    nidnDup: {
                      summary: "NIDN/NIP duplikat",
                      value: { message: "NIDN/NIP sudah digunakan." },
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
Mengambil daftar seluruh user dalam sistem dengan dukungan filter dan pencarian.

**Role akses:**
- ADMIN_LPPM

**Catatan:**
- Parameter \`status\` memfilter berdasarkan status verifikasi akun.
- Parameter \`role\` dikonversi ke UPPERCASE sebelum query (case-insensitive).
- Parameter \`search\` mencari di field \`name\` dan \`email\` secara case-insensitive.
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
              name: "role",
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
                      },
                    },
                    filteredByRole: {
                      summary: "Filter role=DOSEN",
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
                      nidn: "0123456789",
                      fakultas: "Teknik",
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
                        "PIHAK EKSTERNAL",
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
              description:
                "ID tidak valid, role tidak ditemukan, atau data duplikat",
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
                    emailDup: {
                      summary: "Email duplikat",
                      value: { message: "Email sudah digunakan." },
                    },
                    usernameDup: {
                      summary: "Username duplikat",
                      value: { message: "Username sudah digunakan." },
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
      },

      "/getAllProposals": {
        get: {
          tags: ["Proposal"],
          summary: "Ambil semua proposal",
          description: `
Endpoint untuk mengambil seluruh data proposal.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM
- REVIEWER
- REVIEWER_EKSTERNAL

**Catatan:**
- Mengembalikan semua proposal yang ada, diurutkan dari yang terbaru.
- Membutuhkan autentikasi JWT.
          `,
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Berhasil mengambil semua proposal",
              content: {
                "application/json": {
                  example: {
                    message: "Berhasil mengambil semua proposal.",
                    data: [
                      {
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
                      {
                        id: 2,
                        title: "Pengembangan IoT untuk Smart Campus",
                        lead_researcher_id: 4,
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
                          "Status proposal berhasil diubah dari UNDER_REVIEW ke ACCEPTED.",
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
          summary: "Assign 2 reviewer ke proposal",
          description: `
Endpoint untuk menugaskan 2 reviewer ke sebuah proposal.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM

**Catatan:**
- Proposal harus berstatus \`ADMIN_VERIFIED\` agar reviewer bisa ditugaskan.
- Harus mengirim tepat 2 ID reviewer, dan keduanya tidak boleh sama.
- Kedua ID harus merupakan user aktif dengan role REVIEWER atau REVIEWER_EKSTERNAL.
- Setelah berhasil:
  - Data reviewer disimpan ke tabel \`ProposalReviewers\`.
  - Status proposal otomatis berubah menjadi \`UNDER_REVIEW\`.
  - Notifikasi dikirim ke kedua reviewer dan pemilik proposal.
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
                      minItems: 2,
                      maxItems: 2,
                      description:
                        "Array berisi tepat 2 ID reviewer. Kedua ID tidak boleh sama.",
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
                      "Reviewer berhasil ditugaskan dan status proposal diubah menjadi UNDER_REVIEW.",
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
                          reviewerIds: ["Harus memilih tepat 2 reviewer."],
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
                            'Selamat! Proposal "Penelitian AI untuk Pertanian" telah diterima dan disetujui.',
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
