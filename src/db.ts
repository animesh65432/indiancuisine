import { PrismaClient, CuisineType, DietType } from "@prisma/client";

const prisma = new PrismaClient();

export const validCuisineTypes = Object.values(CuisineType);
export const vaildDietTypes = Object.values(DietType)

export default prisma;
