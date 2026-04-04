import { z } from "zod";

export const disburseProjectSchema = z.object({
  realized_amount: z
    .union([z.number(), z.string()])
    .transform((value) => Number(value))
    .pipe(
      z
        .number({ message: "realized_amount harus berupa angka." })
        .positive("realized_amount harus lebih dari 0."),
    ),
});

export type DisburseProjectBody = z.infer<typeof disburseProjectSchema>;
