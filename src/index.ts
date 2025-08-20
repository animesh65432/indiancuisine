import "dotenv/config"
import cors from "cors"
import express from "express"
import router from "./router/dish"

const app = express()



app.use(cors({ origin: "https://annapurna-ai.tech" }))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(router)

app.listen(3000, () => {
    console.log("Server is running on port 3000")
})

export default app