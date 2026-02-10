import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Sistem Informasi LPPM API',
      version: '1.0.0',
      description:
        'REST API untuk Sistem Informasi LPPM. Dokumentasi ini mencakup autentikasi, RBAC, manajemen user, dan profil dosen.',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Local development server',
      },
      {
        url: 'https://sip3m-be.vercel.app/api',
        description: 'Production server',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Dosen A' },
            email: { type: 'string', example: 'dosen@kampus.ac.id' },
            nidn: { type: ['string', 'null'], example: '012345678' },
            fakultas: { type: ['string', 'null'], example: 'Teknik' },
            is_active: { type: 'boolean', example: true },
            roles: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 3 },
                roles: { type: 'string', example: 'DOSEN' },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      /** ================= AUTH ================= */
'/auth/register': {
  post: {
    tags: ['Auth'],
    summary: 'Register user',
    description: `
Endpoint untuk registrasi user baru.

**Role akses:**
- Public (tanpa login)

Catatan:
- Role default user adalah REVIEWER.
    `,
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            required: ['name', 'email', 'password'],
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              password: { type: 'string' },
              nidn: { type: 'string' },
              fakultas: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      201: {
        description: 'User registered successfully',
        content: {
          'application/json': {
            example: {
              message: 'User registered successfully.',
              data: {
                id: 4,
                name: 'Faqih Asyari',
                email: 'faqih@kampus.ac.id',
                nidn: '012732231',
                fakultas: 'Teknik',
                roles: {
                  id: 4,
                  roles: 'REVIEWER',
                },
                created_at: '2026-02-10T10:00:00.000Z',
              },
            },
          },
        },
      },
      409: {
        description: 'Email already exists',
        content: {
          'application/json': {
            example: {
              message: 'An account with this email address already exists.',
            },
          },
        },
      },
    },
  },
},


'/auth/login': {
  post: {
    tags: ['Auth'],
    summary: 'Login user',
    description: `
Endpoint untuk autentikasi user.

Role akses:
- Public (tanpa login)

Catatan:
- Menghasilkan JWT token untuk akses API lain.
    `,
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            required: ['email', 'password'],
            properties: {
              email: { type: 'string' },
              password: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Login successful',
        content: {
          'application/json': {
            example: {
              message: 'Login successful.',
              data: {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                user: {
                  id: 4,
                  name: 'Faqih Asyari',
                  email: 'faqih@kampus.ac.id',
                  nidn: '012732231',
                  fakultas: 'Teknik',
                  roles: {
                    id: 4,
                    roles: 'REVIEWER',
                  },
                },
              },
            },
          },
        },
      },
      401: {
        description: 'Invalid credentials',
        content: {
          'application/json': {
            example: {
              message: 'Invalid email or password.',
            },
          },
        },
      },
    },
  },
},


'/auth/me': {
  get: {
    tags: ['Auth'],
    summary: 'Get current logged-in user',
    description: `
Mengambil data user yang sedang login.

Role akses:
SEMUA ROLE (HARUS LOGIN)
    `,
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Current user',
        content: {
          'application/json': {
            example: {
              data: {
                id: 4,
                name: 'Faqih Asyari',
                email: 'faqih@kampus.ac.id',
                nidn: '012732231',
                fakultas: 'Teknik',
                roles: {
                  id: 4,
                  roles: 'REVIEWER',
                },
              },
            },
          },
        },
      },
      401: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            example: {
              message: 'Unauthorized.',
            },
          },
        },
      },
    },
  },
},


      /** ================= USERS ================= */
'/users': {
  get: {
    tags: ['Users'],
    summary: 'Get all users',
     description: `
Mengambil daftar seluruh user dalam sistem.

Role akses:
- ADMIN_LPPM
- STAFF_LPPM
    `,
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'List of users',
        content: {
          'application/json': {
            example: {
              data: [
                {
                  id: 1,
                  name: 'Admin LPPM',
                  email: 'admin@kampus.ac.id',
                  is_active: true,
                  roles: {
                    id: 1,
                    roles: 'ADMIN_LPPM',
                  },
                },
                {
                  id: 2,
                  name: 'Dosen A',
                  email: 'dosen@kampus.ac.id',
                  is_active: true,
                  roles: {
                    id: 3,
                    roles: 'DOSEN',
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


'/users/{id}': {
  get: {
    tags: ['Users'],
    summary: 'Get user by ID',
    description: `
Mengambil detail user berdasarkan ID.

Role akses:
- ADMIN_LPPM
- STAFF_LPPM
    `,
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'number' },
      },
    ],
    responses: {
      200: {
        description: 'User detail',
        content: {
          'application/json': {
            example: {
              data: {
                id: 3,
                name: 'Dosen A',
                email: 'dosen@kampus.ac.id',
                nidn: '012345678',
                fakultas: 'Teknik',
                is_active: true,
                roles: {
                  id: 3,
                  roles: 'DOSEN',
                },
              },
            },
          },
        },
      },
      404: {
        description: 'User not found',
        content: {
          'application/json': {
            example: {
              message: 'User not found.',
            },
          },
        },
      },
    },
  },
},


      '/users/{id}/role': {
        patch: {
          tags: ['Users'],
          summary: 'Update user role',
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
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'number' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  properties: {
                    roles: {
                      type: 'string',
                      enum: [
                        'ADMIN_LPPM',
                        'STAFF_LPPM',
                        'DOSEN',
                        'REVIEWER',
                        'PIHAK EKSTERNAL',
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'User role updated' },
            403: { description: 'Forbidden' },
          },
        },
      },

      '/users/{id}/status': {
        patch: {
          tags: ['Users'],
          summary: 'Update user active status',
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
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'number' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  properties: {
                    is_active: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'User status updated' },
          },
        },
      },

      /** ================= DOSEN ================= */
'/dosen/profile': {
  get: {
    tags: ['Dosen'],
    summary: 'Get dosen profile',
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
        description: 'Dosen profile',
        content: {
          'application/json': {
            example: {
              data: {
                id: 3,
                name: 'Dosen A',
                email: 'dosen@kampus.ac.id',
                nidn: '012345678',
                fakultas: 'Teknik',
                roles: 'DOSEN',
              },
            },
          },
        },
      },
    },
  },
  patch: {
    tags: ['Dosen'],
    summary: 'Update dosen profile',
    security: [{ bearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          example: {
            name: 'Dosen A Updated',
            fakultas: 'Teknik Informatika',
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Profile updated',
        content: {
          'application/json': {
            example: {
              message: 'Profile updated successfully.',
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
