import axios from "axios";
import { Dish } from "../types";
import db from "../db"
import { LanguageTypes } from "@prisma/client";
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryRequest(fn: () => Promise<any>, retries = 10) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            return await fn();
        } catch (err: any) {
            if (err.response?.status === 403) {
                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`Rate limited. Retry attempt ${attempt + 1} in ${waitTime}ms`);
                await delay(waitTime);
                attempt++;
            } else {
                throw err;
            }
        }
    }
    throw new Error("Max retries reached");
}


async function translateField(text: string, lan: string) {
    const response = await retryRequest(() =>
        axios.post("https://admin.models.ai4bharat.org/inference/translate", {
            input: text,
            serviceId: "ai4bharat/indictrans--gpu-t4",
            sourceLanguage: "ur",
            targetLanguage: lan,
            task: "translation",
            track: true
        })
    );
    return response.data.output[0].target;
}

export async function fixlanguage(dish: Dish, lan: string) {
    try {
        dish.name = await translateField(dish.name, lan);
        dish.cuisine = await translateField(dish.cuisine, lan);
        dish.prep_time = await translateField(dish.prep_time, lan);
    } catch (err) {
        console.error("Error translating dish:", err);
    }
    return dish;
}


export async function fixarraylanguage(dishes: Dish[], lan: string) {
    const results: Dish[] = [];
    const limit = 5;
    let i = 0;

    async function worker() {
        while (i < dishes.length) {
            const index = i++;
            try {
                results[index] = await fixlanguage(dishes[index], lan);
                console.log(`Translated dish ${index + 1}/${dishes.length}`);
            } catch (err) {
                console.error(`Error translating dish ${index + 1}:`, err);
                results[index] = dishes[index];
            }
        }
    }


    await Promise.all(Array.from({ length: limit }, () => worker()));
    console.log(results)
    return results;
}

export async function fixlanguageobject(dish: Dish, lan: string) {
    dish.name = await translateField(dish.name, lan);
    dish.description = await translateField(dish.description, lan);
    return dish
}

async function translateDishToLanguage(dish: any, lang: LanguageTypes) {
    try {
        // ✅ check if already translated
        const existing = await db.languagesDish.findFirst({
            where: { dishId: dish.id, language: lang }
        });
        if (existing) {
            console.log(`⚠️ ${dish.name} already translated to ${lang}, skipping`);
            return existing;
        }

        // 🔄 translate
        const translatedName = await translateField(dish.name, lang);
        const translatedCuisine = await translateField(dish.cuisine, lang);
        const translatedDescription = await translateField(dish.description, lang);
        const translatedPrepTime = await translateField(dish.prep_time, lang);

        // 💾 save to LanguagesDish
        const langDish = await db.languagesDish.create({
            data: {
                name: translatedName,
                cuisine: translatedCuisine,
                description: translatedDescription,
                prep_time: translatedPrepTime,
                language: lang,
                dishId: dish.id
            }
        });

        console.log(`✅ Saved ${dish.name} in ${lang}`);
        return langDish;
    } catch (err) {
        console.error(`❌ Error translating ${dish.name} to ${lang}:`, err);
        return null;
    }
}

export async function translateDishToAllLanguages(dish: any) {
    const allLanguages = Object.values(LanguageTypes);

    const translations = [];
    for (const lang of allLanguages) {
        const result = await translateDishToLanguage(dish, lang);
        if (result) translations.push(result);
    }

    return translations;
}
