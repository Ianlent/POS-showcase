import express from "express";
const router = express.Router();
import {
	getUsersValidation,
	createEmployeeValidation,
	updateEmployeeValidation,
	createUserValidation,
	updateUserValidation,
	deleteUserValidation,
} from "../middleware/validators/userValidator.js";
import { handleValidationErrors } from "../middleware/handleValidationErrors.js";
import {
	getSelfInfo,
	getAllUsers,
	createUser,
	updateUserByID,
	deleteUserByID,
} from "../controller/userControllers/userController.js";

import {
	getAllEmployees,
	createEmployee,
	updateEmployeeByID,
	deleteEmployeeByID,
} from "../controller/userControllers/employeesController.js";

//auth middleware
import authorizeRoles from "../middleware/auth/authorizeRoles.js";

//idempotency middleware
import { handleIdempotency } from "../middleware/handleIdempotency.js";

//public routes ///////////////////////////////////////////////
//GET
router.get("/self", getSelfInfo);

//management routes ////////////////////////////////////////////
router.use(authorizeRoles(["admin", "manager"]));

//GET
router.get(
	"/employees",
	getUsersValidation,
	handleValidationErrors,
	getAllEmployees,
);

//POST
router.post(
	"/employees",
	handleIdempotency,
	createEmployeeValidation,
	handleValidationErrors,
	createEmployee,
);
//PATCH
router.patch(
	"/employees/:id",
	updateEmployeeValidation,
	handleValidationErrors,
	updateEmployeeByID,
);

//DELETE
router.delete(
	"/employees/:id",
	deleteUserValidation,
	handleValidationErrors,
	deleteEmployeeByID,
);

//admin only routes ////////////////////////////////////////////////
router.use(authorizeRoles(["admin"]));

//GET
router.get("/", getUsersValidation, handleValidationErrors, getAllUsers);

//POST
router.post(
	"/",
	handleIdempotency,
	createUserValidation,
	handleValidationErrors,
	createUser,
);

//PATCH
router.patch(
	"/:id",
	updateUserValidation,
	handleValidationErrors,
	updateUserByID,
);

//DELETE
router.delete(
	"/:id",
	deleteUserValidation,
	handleValidationErrors,
	deleteUserByID,
);

export default router;
