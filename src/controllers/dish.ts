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

        const redisKey = `DietTypeDishes:${diet}:${lan}:${currentPage}:${itemsPerPage}`;
        const cachedData = await redis.get<any>(redisKey);

        if (cachedData) {
            res.status(200).json(cachedData);
            return;
        }

        let alltotalItems = 0;
        let alldishes: {
            id: string;
            name: string;
            image_url: string;
            cuisine: $Enums.CuisineType;
            description: string;
            diet: $Enums.DietType;
            prep_time: string
        }[] = [];

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
            alldishes = dishes;
            alltotalItems = totalItems;
        } else {
            const [translationData, count] = await Promise.all([
                prisma.languagesDish.findMany({
                    where: {
                        language: lan as LanguageTypes,
                        Dish: {
                            diet: diet as DietType
                        }
                    },
                    select: {
                        name: true,
                        cuisine: true,
                        description: true,
                        prep_time: true,
                        Dish: {
                            select: {
                                id: true,
                                image_url: true,
                                diet: true
                            }
                        }
                    },
                    skip: skip,
                    take: itemsPerPage,
                    orderBy: { name: 'asc' }
                }),
                prisma.languagesDish.count({
                    where: {
                        language: lan as LanguageTypes,
                        Dish: {
                            diet: diet as DietType
                        }
                    }
                })
            ]);

            alldishes = translationData.map(translation => ({
                id: translation.Dish.id,
                name: translation.name,
                image_url: translation.Dish.image_url,
                cuisine: translation.cuisine as CuisineType,
                description: translation.description,
                diet: translation.Dish.diet,
                prep_time: translation.prep_time
            }));
            alltotalItems = count
        }

        const response = {
            dishes: alldishes,
            totalItems: alltotalItems,
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
        const { page = "0", limit = "30", diet, q, cuisine, lan = "en" } = req.query;
        const currentPage = parseInt(page as string, 10);
        const itemsPerPage = parseInt(limit as string, 10);
        const skip = currentPage * itemsPerPage;
        console.log(q, "queryname", lan)

        let alldishes: { id: string; name: string; image_url: string; cuisine: $Enums.CuisineType; description: string; diet: $Enums.DietType; prep_time: string }[] = [];
        let alltotalItems = 0;

        if (lan === "en") {
            const filters: any = {};
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

            alldishes = dishes;
            alltotalItems = totalItems;
        } else {

            const translationFilters: any = {
                language: lan as LanguageTypes,
            };

            // Search by name
            if (q) {
                translationFilters.name = {
                    contains: q,
                    mode: 'insensitive',
                };
            }

            // Cuisine filter
            if (cuisine) {
                translationFilters.cuisine = {
                    contains: cuisine,
                    mode: 'insensitive',
                };
            }

            // Diet filter (nested Dish)
            if (diet && diet !== "Any") {
                translationFilters.Dish = {
                    diet: diet as DietType,
                };
            }

            const [translationData, count] = await Promise.all([
                prisma.languagesDish.findMany({
                    where: translationFilters,   // ✅ now using all filters
                    select: {
                        name: true,
                        cuisine: true,
                        description: true,
                        prep_time: true,
                        Dish: {
                            select: {
                                id: true,
                                image_url: true,
                                diet: true,
                            },
                        },
                    },
                    skip,
                    take: itemsPerPage,
                    orderBy: { name: 'asc' },
                }),

                prisma.languagesDish.count({
                    where: translationFilters,
                }),
            ]);

            alldishes = translationData.map((translation) => ({
                id: translation.Dish.id,
                name: translation.name,
                image_url: translation.Dish.image_url,
                cuisine: translation.cuisine as CuisineType,
                description: translation.description,
                diet: translation.Dish.diet,
                prep_time: translation.prep_time,
            }));

            alltotalItems = count;

        }

        res.status(200).json({
            dishes: alldishes,
            totalItems: alltotalItems,
            currentPage: currentPage,
            totalPages: Math.ceil(alltotalItems / itemsPerPage)
        });
        return
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ message: "Failed to search dishes" });
        return
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
        const { q, lan = "en" } = req.query;

        if (!q || typeof q !== "string" || q.length < 3) {
            return res.status(400).json({ suggestions: [] });
        }


        const redisKey = `suggestions:${q}-${lan}`;
        const cachedSuggestions = await redis.get(redisKey);

        const sanitizedSearchTerm = escapeRegex(q.trim());

        if (cachedSuggestions) {
            res.status(200).json(cachedSuggestions);
            return;
        }

        let checkIsalreadyExists

        if (lan === "en") {
            checkIsalreadyExists = await prisma.dish.findFirst({
                where: {
                    name: {
                        equals: sanitizedSearchTerm,
                        mode: 'insensitive',
                    }
                }
            });
        }
        else {
            checkIsalreadyExists = await prisma.languagesDish.findFirst({
                where: {
                    name: {
                        equals: sanitizedSearchTerm,
                        mode: 'insensitive',
                    }
                }
            });
        }
        if (checkIsalreadyExists) {
            return res.status(200).json([{ name: checkIsalreadyExists.name }]);
        }
        let suggestions

        if (lan === "en") {
            suggestions = await prisma.dish.findMany({
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
        }
        else {
            suggestions = await prisma.languagesDish.findMany({
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
        }

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