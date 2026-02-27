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
Mengambil daftar seluruh user dalam sistem.

Role akses:
- ADMIN_LPPM
- STAFF_LPPM
    `,
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "List of users",
              content: {
                "application/json": {
                  example: {
                    data: [
                      {
                        id: 1,
                        name: "Admin LPPM",
                        email: "admin@kampus.ac.id",
                        is_active: true,
                        roles: {
                          id: 1,
                          roles: "ADMIN_LPPM",
                        },
                      },
                      {
                        id: 2,
                        name: "Dosen A",
                        email: "dosen@kampus.ac.id",
                        is_active: true,
                        roles: {
                          id: 3,
                          roles: "DOSEN",
                        },
                      },
                    ],
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

Role akses:
- ADMIN_LPPM
- STAFF_LPPM
    `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          responses: {
            200: {
              description: "User detail",
              content: {
                "application/json": {
                  example: {
                    data: {
                      id: 3,
                      name: "Dosen A",
                      email: "dosen@kampus.ac.id",
                      nidn: "012345678",
                      fakultas: "Teknik",
                      is_active: true,
                      roles: {
                        id: 3,
                        roles: "DOSEN",
                      },
                    },
                  },
                },
              },
            },
            404: {
              description: "User not found",
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

      "/users/{id}/role": {
        patch: {
          tags: ["Users"],
          summary: "Update user role",
          description: `
Mengubah role user.

Role akses:
- ADMIN_LPPM

Catatan:
- Hanya admin yang dapat mengubah role user.
    `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  properties: {
                    roles: {
                      type: "string",
                      enum: [
                        "ADMIN_LPPM",
                        "STAFF_LPPM",
                        "DOSEN",
                        "REVIEWER",
                        "PIHAK EKSTERNAL",
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "User role updated" },
            403: { description: "Forbidden" },
          },
        },
      },

      "/users/{id}/status": {
        patch: {
          tags: ["Users"],
          summary: "Update user active status",
          description: `
Mengaktifkan / menonaktifkan user.

Role akses:
- ADMIN_LPPM

Catatan:
- Soft delete menggunakan field is_active.
    `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  properties: {
                    is_active: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "User status updated" },
          },
        },
      },

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
