import { Router } from "express"
import { getDishes, GetDietTypeDishes, GetIndianCuisineDishes, searchDishesByName } from "../controllers/dish"

const router = Router()
router.get("/GetDishes", getDishes)
router.get("/GetDietTypeDishes", GetDietTypeDishes)
router.get("/GetIndianCuisineDishes", GetIndianCuisineDishes)
router.get("/searchDishesByName", searchDishesByName)

export default router