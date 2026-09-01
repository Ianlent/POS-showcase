import { body, param, query } from "express-validator";

export const getServicesValidation = [
	query("limit")
		.optional()
		.isInt({ gt: 0, max: 100 })
		.withMessage("Limit must be a positive integer")
		.toInt(),
];
export const createServiceValidation = [
	body("service_name")
		.trim()
		.exists()
		.withMessage("Service name is required")
		.isString()
		.withMessage("Service name must be a string")
		.isLength({ min: 1, max: 50 })
		.withMessage("Service name must be 1-50 characters long")
		.escape(),

	body("service_unit")
		.trim()
		.exists()
		.withMessage("Service unit is required")
		.isString()
		.withMessage("Service unit must be a string")
		.isLength({ min: 1, max: 20 })
		.withMessage("Service unit must be 1-20 characters long")
		.escape(),

	body("service_price_per_unit")
		.exists()
		.withMessage("Price per unit is required")
		.isInt({ gt: 0 })
		.withMessage("Price per unit must be a positive integer"),
];

export const updateServiceValidation = [
	param("id")
		.isUUID()
		.withMessage("Invalid unique identifier format for service ID"),

	body("service_name")
		.trim()
		.optional()
		.isString()
		.withMessage("Service name must be a string")
		.isLength({ min: 1, max: 50 })
		.withMessage("Service name must be 1-50 characters long")
		.escape(),

	body("service_unit")
		.trim()
		.optional()
		.isString()
		.withMessage("Service unit must be a string")
		.isLength({ min: 1, max: 20 })
		.withMessage("Service unit must be 1-20 characters long")
		.escape(),

	body("service_price_per_unit")
		.optional()
		.isInt({ gt: 0 })
		.withMessage("Price per unit must be a positive integer")
		.toInt(),
];

export const deleteServiceValidation = [
	param("id")
		.isUUID()
		.withMessage("Invalid unique identifier format for service ID"),
];
