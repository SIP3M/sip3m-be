import { SignOptions } from "jsonwebtoken";

export const getJwtSignOptions = (): SignOptions => {
  const expiresIn = process.env.JWT_EXPIRES_IN;

  if (!expiresIn) {
    return { expiresIn: "1d" };
  }

  // valid format example: 60, "1d", "2h", "30m"
  if (/^\d+$/.test(expiresIn)) {
    return { expiresIn: Number(expiresIn) };
  }

  if (/^\d+[smhd]$/.test(expiresIn)) {
    return { expiresIn: expiresIn as `${number}${"s" | "m" | "h" | "d"}` };
  }

  throw new Error("Invalid JWT_EXPIRES_IN format.");
};
