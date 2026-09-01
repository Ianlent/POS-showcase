import { body, param, query } from "express-validator";

export const getUsersValidation = [
	query("limit")
		.optional()
		.isInt({ gt: 0, max: 100 })
		.withMessage("Limit must be a positive integer no greater than 100")
		.toInt(),
];

// Validation rules for Manager creating a new employee (POST /users/employees)
export const createEmployeeValidation = [
	body("user_name")
		.trim()
		.exists({ values: "falsy" })
		.withMessage("Username is required")
		.isString()
		.withMessage("Username must be a string")
		.isLength({ min: 3, max: 50 })
		.withMessage("Username must be between 3 and 50 characters")
		.escape(),

	body("user_phone")
		.trim()
		.exists({ values: "falsy" })
		.withMessage("Phone number is required")
		.isMobilePhone("vi-VN")
		.withMessage("Invalid phone number"),

	body("password")
		.exists({ values: "falsy" })
		.withMessage("Password is required")
		.isLength({ min: 8 })
		.withMessage("Password must be at least 8 characters")
		.matches(/[A-Z]/)
		.withMessage("Password must contain at least one uppercase letter")
		.matches(/[0-9]/)
		.withMessage("Password must contain at least one number"),
];

// Validation rules for Manager updating an employee (PUT /users/employees/:id)
export const updateEmployeeValidation = [
	param("id")
		.exists({ values: "falsy" })
		.withMessage("User ID is required")
		.isUUID()
		.withMessage("Invalid unique identifier format"),

	body("user_name")
		.trim()
		.optional({ values: "falsy" })
		.isString()
		.withMessage("Username must be a string")
		.isLength({ min: 3, max: 50 })
		.withMessage("Username must be between 3 and 50 characters")
		.escape(),

	body("user_phone")
		.trim()
		.optional({ values: "falsy" })
		.isMobilePhone("vi-VN")
		.withMessage("Invalid phone number"),

	body("user_status")
		.trim()
		.optional({ values: "falsy" })
		.isIn(["active", "suspended"])
		.withMessage(
			"Invalid user status, must be either 'active' or 'suspended'",
		),
	,
];

// Validation rules for Admin creating a new user (POST /users)
export const createUserValidation = [
	body("user_name")
		.trim()
		.exists({ values: "falsy" })
		.withMessage("Username is required")
		.isString()
		.withMessage("Username must be a string")
		.isLength({ min: 3, max: 50 })
		.withMessage("Username must be between 3 and 50 characters")
		.escape(),

	body("user_phone")
		.trim()
		.exists({ values: "falsy" })
		.withMessage("Phone number is required")
		.isMobilePhone("vi-VN")
		.withMessage("Invalid phone number"),

	body("password")
		.exists({ values: "falsy" })
		.withMessage("Password is required")
		.isLength({ min: 8 })
		.withMessage("Password must be at least 8 characters")
		.matches(/[A-Z]/)
		.withMessage("Password must contain at least one uppercase letter")
		.matches(/[0-9]/)
		.withMessage("Password must contain at least one number"),

	body("user_role")
		.optional()
		.isIn(["employee", "manager", "admin"])
		.withMessage("Invalid user role"),
];

export const updateUserValidation = [
	param("id")
		.isUUID()
		.withMessage("Invalid unique identifier format for user ID"),

	body("user_name")
		.optional()
		.trim()
		.isString()
		.withMessage("Username must be a string")
		.isLength({ min: 3, max: 50 })
		.withMessage("Username must be between 3 and 50 characters")
		.escape(),

	body("user_phone")
		.optional()
		.trim()
		.isMobilePhone("vi-VN")
		.withMessage(
			"Invalid phone number, must be in international E.164 format or local format",
		),

	body("password")
		.optional()
		.isLength({ min: 8 })
		.withMessage("Password must be at least 8 characters")
		.matches(/[A-Z]/)
		.withMessage("Password must contain at least one uppercase letter")
		.matches(/[0-9]/)
		.withMessage("Password must contain at least one number"),

	body("user_role")
		.optional()
		.isIn(["employee", "manager", "admin"])
		.withMessage("Invalid user role"),

	body("user_status")
		.optional()
		.isIn(["active", "suspended"])
		.withMessage(
			"Invalid user status, must be either 'active' or 'suspended'",
		),
];

export const deleteUserValidation = [
	param("id")
		.isUUID()
		.withMessage("Invalid unique identifier format for user ID"),
];
