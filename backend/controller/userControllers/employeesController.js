import { UserService } from "../../services/userService.js";
import responseHandler from "../../utils/response.handler.js";
import handleCursor from "../../utils/handleCursor.js";

export const getAllEmployees = async (req, res, next) => {
	try {
		const { user_phone, user_name, limit = 5, next_page } = req.query;
		const { cursorValue, cursorId } = handleCursor.decodeCursor(next_page);
		const result = await UserService.getAllUsers({
			user_phone,
			user_name,
			limit,
			cursorId,
			cursorValue,
			is_only_employee: true,
		});
		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

// Create a new employee (for managers)
export const createEmployee = async (req, res, next) => {
	const { idempotencyKey, clientId } = req;
	const userId = req.user.user_id;
	try {
		const { user_name, user_phone, password } = req.body;
		const newEmployee = await UserService.createNewUser(
			userId,
			idempotencyKey,
			{
				user_name,
				user_phone,
				password,
				user_role: "employee",
			},
			clientId,
		);
		return responseHandler.created(res, newEmployee);
	} catch (err) {
		next(err);
	}
};

// Update an employee (for managers)
export const updateEmployeeByID = async (req, res, next) => {
	const { clientId } = req;
	try {
		const { id } = req.params;
		const { user_name, user_phone, user_status } = req.body;

		const result = await UserService.updateUser(
			id,
			{
				user_name,
				user_phone,
				user_status,
			},
			true,
			clientId,
		);

		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

export const deleteEmployeeByID = async (req, res) => {
	const { clientId } = req;
	try {
		const { id } = req.params;
		await UserService.removeUser(id, true, clientId);
		return responseHandler.noContent(res);
	} catch (err) {
		console.error(err.message);
		return responseHandler.error(res, "Internal Server Error");
	}
};
