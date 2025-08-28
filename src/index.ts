import "dotenv/config"
import cors from "cors"
import express from "express"
import router from "./router/dish"
// import { translateDishToAllLanguages } from "./utils/index"
// import db from "./db"

const app = express()

app.use(cors({ origin: ["https://annapurna-ai.tech", "http://localhost:5173"] }))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(router)

// async function main() {
//     const dishes = await db.dish.findMany();

//     for (const dish of dishes) {
//         console.log(`🌐 Translating dish: ${dish.name}`);
//         const translations = await translateDishToAllLanguages(dish);
//         console.log(
//             `✅ ${dish.name} translated into ${translations.length} languages`
//         );
//     }
// }

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`)
})
export default app