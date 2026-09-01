import express from "express";
import {
	getAllCustomers,
	createCustomer,
	updateCustomerByID,
	deleteCustomerByID,
} from "../controller/customerController.js";

//middleware /////////////////////////////////////////////////////////
import authorizeRoles from "../middleware/auth/authorizeRoles.js";
import {
	getCustomersValidation,
	createCustomerValidation,
	updateCustomerValidation,
	deleteCustomerValidation,
} from "../middleware/validators/customerValidator.js";
import { handleValidationErrors } from "../middleware/handleValidationErrors.js";
import { handleIdempotency } from "../middleware/handleIdempotency.js";
//////////////////////////////////////////////////////////////////////
const router = express.Router();

//get
router.get(
	"/",
	getCustomersValidation,
	handleValidationErrors,
	getAllCustomers,
);

// post
router.post(
	"/",
	handleIdempotency,
	createCustomerValidation,
	handleValidationErrors,
	createCustomer,
);

router.use(authorizeRoles(["admin", "manager"]));
// patch
router.patch(
	"/:id",
	handleIdempotency,
	updateCustomerValidation,
	handleValidationErrors,
	updateCustomerByID,
);

router.use(authorizeRoles(["admin"]));
// delete
router.delete(
	"/:id",
	deleteCustomerValidation,
	handleValidationErrors,
	deleteCustomerByID,
);

export default router;
