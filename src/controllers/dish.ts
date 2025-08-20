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

const GetDishes = async (req: Request, res: Response) => {
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
        const { page = "0", limit = "30", diet = "Vegetarian" } = req.query;

        if (typeof diet !== "string" || !diet) {
            res.status(400).json({ message: "Invalid diet type" });
            return;
        }

        const currentPage = parseInt(page as string, 10);
        const itemsPerPage = parseInt(limit as string, 10);
        const skip = currentPage * itemsPerPage;


        const redisKey = `DietTypeDishes:${diet}:${currentPage}:${itemsPerPage}`;
        const cachedData = await redis.get<any>(redisKey);

        if (cachedData) {
            res.status(200).json(cachedData);
            return;
        }

        const [dishes, totalItems] = await Promise.all([
            prisma.dish.findMany({
                where: { diet: diet as DietType },
                skip: skip,
                take: itemsPerPage,
                orderBy: { name: 'asc' }
            }),
            prisma.dish.count({
                where: { diet: diet as DietType }
            })
        ]);

        const response = {
            dishes,
            totalItems
        };

        await redis.set(redisKey, JSON.stringify(response), { ex: 300 });
        res.status(200).json(response);

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to fetch diet type dishes" });
    }
}

const searchDishes = async (req: Request, res: Response) => {
    try {
        const { page = "0", limit = "30", diet, q, cuisine } = req.query;
        const currentPage = parseInt(page as string, 10);
        const itemsPerPage = parseInt(limit as string, 10);
        const skip = currentPage * itemsPerPage;

        const filters: any = {
            name: {
                contains: q,
                mode: 'insensitive',
            }
        };

        if (q) {
            filters.name = {
                contains: q as string,
                mode: 'insensitive',
            };
        }

        if (diet && diet !== "any") {
            filters.diet = diet;
        }

        if (cuisine) {
            filters.cuisine = cuisine;
        }

        const [dishes, totalItems] = await Promise.all([
            prisma.dish.findMany({
                where: filters,
                skip: skip,
                take: itemsPerPage,
                orderBy: { name: 'asc' }
            }),
            prisma.dish.count({
                where: filters
            })
        ]);

        res.status(200).json({ dishes, totalItems });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ message: "Failed to search dishes" });
    }
};

const GetDish = async (req: Request, res: Response) => {
    try {
        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ message: "Invalid dish Id" });
        }
        const redisKey = `dish:${id}`;
        const cachedDish = await redis.get(redisKey);

        if (cachedDish) {
            res.status(200).json(cachedDish);
            return;
        }

        const dish = await prisma.dish.findUnique({
            where: { id }
        });

        if (!dish) {
            return res.status(404).json({ message: "Dish not found" });
        }

        redis.set(redisKey, dish, { ex: 300 });

        res.status(200).json(dish);
        return
    } catch (error) {
        console.error("GetDish error:", error);
        res.status(500).json({ message: "Failed to fetch dish" });
        return
    }
};

function escapeRegex(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


const GetSuggestions = async (req: Request, res: Response) => {
    try {
        const { q } = req.query;

        if (!q || typeof q !== "string" || q.length < 3) {
            return res.status(400).json({ suggestions: [] });
        }

        const redisKey = `suggestions:${q}`;
        const cachedSuggestions = await redis.get(redisKey);

        const sanitizedSearchTerm = escapeRegex(q.trim());

        if (cachedSuggestions) {
            res.status(200).json(cachedSuggestions);
            return;
        }

        const checkIsalreadyExists = await prisma.dish.findFirst({
            where: {
                name: {
                    equals: sanitizedSearchTerm,
                    mode: 'insensitive',
                }
            }
        });
        if (checkIsalreadyExists) {
            return res.status(200).json([{ name: checkIsalreadyExists.name }]);
        }

        const suggestions = await prisma.dish.findMany({
            where: {
                name: {
                    contains: sanitizedSearchTerm,
                    mode: 'insensitive',
                }
            },
            take: 10,
            select: {
                name: true
            }
        });

        redis.set(redisKey, suggestions, { ex: 300 });

        res.status(200).json(suggestions);
        return;
    }
    catch (error) {
        console.log("GetSuggestions error:", error);
        res.status(500).json({ suggestions: [] });
        return
    }
}
export { getDishes, GetDietTypeDishes, GetDishes, searchDishes, GetDish, GetSuggestions };