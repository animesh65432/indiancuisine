import { RequestHandler, Router } from "express"
import { getDishes, GetDietTypeDishes, GetDishes, searchDishes, GetDish } from "../controllers/dish"
import { rateLimiter } from "../ratelimiter"

const router = Router()

router.use(rateLimiter(35, 60000) as RequestHandler)
router.get("/GetDishes", getDishes)
router.get("/GetDietTypeDishes", GetDietTypeDishes)
router.get("/GetIndianCuisineDishes", GetDishes)
router.get("/searchDishes", searchDishes)
router.get("/GetDish", GetDish)

export default router