import { validationResult } from "express-validator";
import responseHandler from "../utils/response.handler.js";

export const handleValidationErrors = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw {
			type: "UNPROCESSABLE",
			message: "The request cannot be fulfilled due to bad syntax",
			details: errors.array(),
		};
	}
	next();
};
