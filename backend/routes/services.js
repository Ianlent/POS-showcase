import express from "express";

import { handleValidationErrors } from "../middleware/handleValidationErrors.js";
import {
	getAllServices,
	createService,
	updateServiceById,
	deleteServiceById,
} from "../controller/serviceController.js";
import {
	getServicesValidation,
	createServiceValidation,
	updateServiceValidation,
	deleteServiceValidation,
} from "../middleware/validators/serviceValidator.js";

// middleware /////////////////////////////////////////////////////////
import authorizeRoles from "../middleware/auth/authorizeRoles.js";
import { handleIdempotency } from "../middleware/handleIdempotency.js";
//////////////////////////////////////////////////////////////////////

const router = express.Router();

// GET all services (with optional pagination)
router.get("/", getServicesValidation, handleValidationErrors, getAllServices); // ?service_name=abc

// The following routes require privileges
router.use(authorizeRoles(["admin", "manager"]));

// POST create a new service
router.post(
	"/",
	handleIdempotency,
	createServiceValidation,
	handleValidationErrors,
	createService,
);

// PUT update a service by ID
router.patch(
	"/:id",
	updateServiceValidation,
	handleValidationErrors,
	updateServiceById,
);

// DELETE remove (soft-delete) a service by ID
router.delete(
	"/:id",
	deleteServiceValidation,
	handleValidationErrors,
	deleteServiceById,
);

export default router;
