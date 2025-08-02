import { RequestHandler, Router } from "express"
import { getDishes, GetDietTypeDishes, GetDishes, searchDishes, GetDish, GetSuggestions } from "../controllers/dish"
import { rateLimiter } from "../ratelimiter"

const router = Router()

router.get("/GetDishes", rateLimiter(35, 60000) as RequestHandler, getDishes)
router.get("/GetDietTypeDishes", rateLimiter(35, 60000) as RequestHandler, GetDietTypeDishes)
router.get("/GetIndianCuisineDishes", rateLimiter(35, 60000) as RequestHandler, GetDishes)
router.get("/searchDishes", rateLimiter(35, 60000) as RequestHandler, searchDishes)
router.get("/GetDish", rateLimiter(35, 60000) as RequestHandler, GetDish)
router.get("/GetSuggestions", GetSuggestions)

export default router