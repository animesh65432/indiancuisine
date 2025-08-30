import "dotenv/config"
import cors from "cors"
import express from "express"
import router from "./router/dish"


const app = express()

app.use(cors({ origin: ["https://annapurna-ai.tech", "http://localhost:5173"] }))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(router)


app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`)
})