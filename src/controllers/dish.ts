import { Request, Response } from "express"
import prisma from "../db"
import { CuisineType, DietType } from "@prisma/client"

const getDishes = async (req: Request, res: Response) => {
    try {
        const { skip = 0, take = 10 } = req.query
        const dishes = await prisma.dish.findMany({
            skip: Number(skip),
            take: Number(take)
        })
        res.json(dishes)
        return
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch dishes" })
        return
    }
}

const GetIndianCuisineDishes = async (req: Request, res: Response) => {
    try {
        const { skip = 0, take = 10, cuisine = "Indian" } = req.query

        if (typeof cuisine !== "string") {
            res.status(400).json({ message: "Invalid cuisine type" });
            return
        }

        const dishes = await prisma.dish.findMany({
            where: {
                cuisine: cuisine as CuisineType
            },
            skip: Number(skip),
            take: Number(take)
        })
        res.json(dishes)
        return
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch Indian cuisine dishes" })
    }
}

const GetDietTypeDishes = async (req: Request, res: Response) => {
    try {
        const { skip = 0, take = 10, diet = "Vegetarian" } = req.query
        if (typeof diet !== "string") {
            res.status(400).json({ message: "Invalid diet type" })
            return
        }
        const dishes = await prisma.dish.findMany({
            where: {
                diet: diet as DietType
            },
            skip: Number(skip),
            take: Number(take)
        })
        res.json(dishes)
        return
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Failed to fetch diet type dishes" })
        return
    }
}

const searchDishesByName = async (req: Request, res: Response) => {
    try {
        const { q = "", diet, cuisine, skip = 0, take = 30 } = req.query;
        if (typeof q !== "string" || q.trim().length < 1) {
            return res.status(400).json({ message: "Invalid search query" });
        }
        const dishes = await prisma.dish.findMany({
            where: {
                name: {
                    contains: q,
                    mode: "insensitive"
                },
                ...(diet ? { diet: diet as DietType } : {}),
                ...(cuisine ? { cuisine: cuisine as CuisineType } : {})

            },
            skip: Number(skip),
            take: Number(take)
        });
        res.json(dishes);
        return
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ message: "Failed to search dishes" });
        return
    }
};

export { getDishes, GetDietTypeDishes, GetIndianCuisineDishes, searchDishesByName }