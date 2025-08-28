import { Request, Response } from "express"
import prisma from "../db"
import { $Enums, CuisineType, DietType, LanguageTypes } from "@prisma/client"
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
        const { page = "0", limit = "30", diet = "Vegetarian", lan = "en" } = req.query;

        if (typeof diet !== "string" || !diet) {
            res.status(400).json({ message: "Invalid diet type" });
            return;
        }

        const currentPage = parseInt(page as string, 10);
        const itemsPerPage = parseInt(limit as string, 10);
        const skip = currentPage * itemsPerPage;


        const redisKey = `DietTypeDishes:${diet}:${currentPage}:${itemsPerPage}`;
        // const cachedData = await redis.get<any>(redisKey);

        // if (cachedData) {
        //     res.status(200).json(cachedData);
        //     return;
        // }
        let alltotalItems = 0;
        let alldishes: { id: string; name: string; image_url: string; cuisine: $Enums.CuisineType; description: string; diet: $Enums.DietType; prep_time: string }[] = [];
        if (lan === "en") {
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
            alldishes = dishes
            alltotalItems = totalItems
        }
        else {
            const dishes = await prisma.$runCommandRaw({
                aggregate: 'Dish',
                pipeline: [
                    { $match: { diet: diet } },
                    {
                        $lookup: {
                            from: "LanguagesDish",
                            localField: "_id",
                            foreignField: "dishId",
                            as: "langs"
                        }
                    },
                    {
                        $addFields: {
                            lang: {
                                $arrayElemAt: [{
                                    $filter: {
                                        input: "$langs",
                                        as: "l",
                                        cond: { $eq: ["$$l.language", lan] }
                                    }
                                }, 0]
                            }
                        }
                    },
                    {
                        $project: {
                            id: { $toString: "$_id" },
                            name: { $ifNull: ["$lang.name", "$name"] },
                            image_url: 1,
                            cuisine: { $ifNull: ["$lang.cuisine", "$cuisine"] },
                            description: { $ifNull: ["$lang.description", "$description"] },
                            diet: 1,
                            prep_time: { $ifNull: ["$lang.prep_time", "$prep_time"] }
                        }

                    },
                    { $skip: skip },
                    { $limit: itemsPerPage }
                ],
                explain: false
            }) as any;
            const totalItemsAgg = await prisma.$runCommandRaw({
                aggregate: "Dish",
                pipeline: [
                    { $match: { diet: diet } },
                    {
                        $lookup: {
                            from: "LanguagesDish",
                            localField: "_id",
                            foreignField: "dishId",
                            as: "langs",
                        },
                    },
                    {
                        $addFields: {
                            lang: {
                                $arrayElemAt: [
                                    { $filter: { input: "$langs", as: "l", cond: { $eq: ["$$l.language", lan] } } },
                                    0,
                                ],
                            },
                        },
                    },
                    { $count: "totalItems" },
                ],
                explain: false,
            });
            alldishes = dishes?.cursor?.firstBatch || []
            const totalItemsArray = totalItemsAgg as unknown as { totalItems: number }[];
            alltotalItems = totalItemsArray[0]?.totalItems ?? 0;
        }

        const response = {
            dishes: alldishes,
            totalItems: alltotalItems
        };

        // await redis.set(redisKey, JSON.stringify(response), { ex: 300 });
        res.status(200).json(response);

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to fetch diet type dishes" });
    }
}

const searchDishes = async (req: Request, res: Response) => {
    try {
        const { page = "0", limit = "30", diet, q, cuisine, lan = "eng" } = req.query;
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

        if (diet && diet !== "Any") {
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
        const { id, lan = "en" } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ message: "Invalid dish Id" });
        }
        const redisKey = `dish:${id}-${lan}`;
        const cachedDish = await redis.get(redisKey);

        if (cachedDish) {
            res.status(200).json(cachedDish);
            return;
        }

        const checkIsalreadyExists = await prisma.dish.findUnique({
            where: { id }
        });

        if (!checkIsalreadyExists) {
            res.status(404).json({ message: "Dish not found" });
            return
        }

        let dish;

        if (lan !== "en") {
            const NonengLishdish = await prisma.languagesDish.findFirst({
                where: {
                    dishId: checkIsalreadyExists.id,
                    language: lan as LanguageTypes
                }
            })
            dish = NonengLishdish
        }

        const responsedish = {
            id: checkIsalreadyExists.id,
            name: dish?.name || checkIsalreadyExists.name,
            image_url: checkIsalreadyExists.image_url,
            cuisine: dish?.cuisine || checkIsalreadyExists.cuisine,
            description: dish?.description || checkIsalreadyExists.description,
            diet: checkIsalreadyExists.diet,
            prep_time: checkIsalreadyExists?.prep_time,
        }



        redis.set(redisKey, responsedish, { ex: 300 });

        res.status(200).json(responsedish);
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