import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Sistem Informasi LPPM API",
      version: "1.0.0",
      description:
        "REST API untuk Sistem Informasi LPPM. Dokumentasi ini mencakup autentikasi, RBAC, manajemen user, dan profil dosen.",
    },
    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Local development server",
      },
      {
        url: "https://sip3m-be.vercel.app/api",
        description: "Production server",
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
        get: {
          tags: ["Users"],
          summary: "Get all users",
          description: `
Mengambil daftar seluruh user dalam sistem dengan dukungan filter dan pencarian.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM

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

      "/users/{id}": {
        get: {
          tags: ["Users"],
          summary: "Get user by ID",
          description: `
Mengambil detail user berdasarkan ID.

**Role akses:**
- ADMIN_LPPM
- STAFF_LPPM

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


      /** ================= DOSEN ================= */
      "/dosen/profile": {
        get: {
          tags: ["Dosen"],
          summary: "Get dosen profile",
          description: `
Mengambil profil dosen yang sedang login.

Role akses:
- DOSEN

Catatan:
- Dosen hanya dapat melihat data miliknya sendiri.
    `,
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Dosen profile",
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
                    },
                  },
                },
              },
            },
          },
        },
        patch: {
          tags: ["Dosen"],
          summary: "Update dosen profile",
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                example: {
                  name: "Dosen A Updated",
                  fakultas: "Teknik Informatika",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Profile updated",
              content: {
                "application/json": {
                  example: {
                    message: "Profile updated successfully.",
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
