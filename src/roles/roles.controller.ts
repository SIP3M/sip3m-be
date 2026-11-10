import { Request, Response } from "express";
import { HttpError } from "../common/errors/http-error";
import * as roleService from "./roles.service";

const handleError = (error: unknown, res: Response) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  console.error("[roles.controller]", error);
  return res.status(500).json({ message: "Terjadi kesalahan pada server." });
};

export const listRolesController = async (_req: Request, res: Response) => {
  try {
    const data = await roleService.listRoles();
    return res.status(200).json({ message: "Daftar role berhasil diambil.", data });
  } catch (error) {
    return handleError(error, res);
  }
};

export const getRoleByIdController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid." });
    const data = await roleService.getRoleById(id);
    return res.status(200).json({ message: "Role berhasil diambil.", data });
  } catch (error) {
    return handleError(error, res);
  }
};

export const createRoleController = async (req: Request, res: Response) => {
  try {
    const data = await roleService.createRole(req.body);
    return res.status(201).json({ message: "Role berhasil dibuat.", data });
  } catch (error) {
    return handleError(error, res);
  }
};

export const updateRoleController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid." });
    const data = await roleService.updateRole(id, req.body);
    return res.status(200).json({ message: "Role berhasil diperbarui.", data });
  } catch (error) {
    return handleError(error, res);
  }
};

export const deleteRoleController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid." });
    const data = await roleService.deleteRole(id);
    return res.status(200).json({ message: "Role berhasil dihapus.", data });
  } catch (error) {
    return handleError(error, res);
  }
};

export const listPermissionsController = async (_req: Request, res: Response) => {
  try {
    const data = await roleService.listPermissions();
    return res.status(200).json({ message: "Katalog izin berhasil diambil.", data });
  } catch (error) {
    return handleError(error, res);
  }
};

export const getRolePermissionsController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid." });
    const data = await roleService.getRolePermissions(id);
    return res.status(200).json({ message: "Matriks izin berhasil diambil.", data });
  } catch (error) {
    return handleError(error, res);
  }
};

export const updateRolePermissionsController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid." });
    const data = await roleService.updateRolePermissions(id, req.body);
    return res.status(200).json({ message: "Izin role berhasil disimpan.", data });
  } catch (error) {
    return handleError(error, res);
  }
};
