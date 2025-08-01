import { Request, Response } from "express"
import prisma from "../db"
import { CuisineType, DietType } from "@prisma/client"
import { redis } from "../redis"

const getDishes = async (req: Request, res: Response) => {
    try {
        const { skip = 0, take = 10 } = req.query

        const redisKey = `dishes:${skip}:${take}`
        const cachedData = await redis.get<any>(redisKey)

        if (cachedData) {
            if (cachedData) {
                res.status(200).json(cachedData)
                return
            }
        }
        const dishes = await prisma.dish.findMany({
            skip: Number(skip),
            take: Number(take)
        })

        redis.set(redisKey, dishes, { ex: 300 })
        res.json(dishes)
        return
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch dishes" })
        return
    }
}

const GetIndianCuisineDishes = async (req: Request, res: Response) => {
    try {
        const { skip = "0", take = "10", cuisine = "Indian" } = req.query;

        if (typeof cuisine !== "string") {
            return res.status(400).json({ message: "Invalid cuisine type" });
        }

        const parsedSkip = parseInt(skip as string, 10);
        const parsedTake = parseInt(take as string, 10);

        if (isNaN(parsedSkip) || isNaN(parsedTake)) {
            return res.status(400).json({ message: "Skip and take must be valid numbers" });
        }

        const redisKey = `IndianCuisineDishes:${cuisine}:${parsedSkip}:${parsedTake}`;

        const cachedData = await redis.get(redisKey);
        if (cachedData) {
            res.status(200).json(cachedData);
            return;
        }

        const dishes = await prisma.dish.findMany({
            where: {
                cuisine: cuisine as CuisineType
            },
            skip: parsedSkip,
            take: parsedTake,
        });


        await redis.set(redisKey, JSON.stringify(dishes), { ex: 300 });

        res.status(200).json(dishes);
        return;
    } catch (error) {
        console.error("GetIndianCuisineDishes Error:", error);
        res.status(500).json({ message: "Failed to fetch Indian cuisine dishes" });
        return
    }
};

const GetDietTypeDishes = async (req: Request, res: Response) => {
    try {
        const { skip = 0, take = 10, diet = "Vegetarian" } = req.query
        if (typeof diet !== "string") {
            res.status(400).json({ message: "Invalid diet type" })
            return
        }

        const redisKey = `DietTypeDishes${diet}:${skip}:${take}`
        const cachedData = await redis.get<any>(redisKey)
        if (cachedData) {
            res.status(200).json(cachedData)
            return
        }

        const dishes = await prisma.dish.findMany({
            where: {
                diet: diet as DietType
            },
            skip: Number(skip),
            take: Number(take)
        })

        redis.set(redisKey, dishes, { ex: 300 })
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