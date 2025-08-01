import { RequestHandler, Router } from "express"
import { getDishes, GetDietTypeDishes, GetIndianCuisineDishes, searchDishesByName } from "../controllers/dish"
import { rateLimiter } from "../ratelimiter"

const router = Router()

router.use(rateLimiter(15, 60000) as RequestHandler)
router.get("/GetDishes", getDishes)
router.get("/GetDietTypeDishes", GetDietTypeDishes)
router.get("/GetIndianCuisineDishes", GetIndianCuisineDishes)
router.get("/searchDishesByName", searchDishesByName)

export default router