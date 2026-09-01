import { body } from "express-validator";

// Validation rules for user login
export const loginValidation = [
	body("user_phone")
		.trim()
		.exists()
		.withMessage("Phone number is required")
		.isMobilePhone("vi-VN")
		.withMessage("Invalid phone number"),

	body("password").exists().withMessage("Password is required"),
];
