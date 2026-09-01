import { UserService } from "../../services/userService.js";
import responseHandler from "../../utils/response.handler.js";
import handleCursor from "../../utils/handleCursor.js";
// public //////////////////////////////////////////////////

// Fetch self info
export const getSelfInfo = async (req, res, next) => {
	try {
		const id = req.user?.user_id;
		const result = await UserService.getUser(id);
		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

// admin ////////////////////////////////////////////////

// Fetch all users on the system
export const getAllUsers = async (req, res, next) => {
	try {
		const { user_phone, user_name, limit = 5, next_page } = req.query;
		const { cursorValue, cursorId } = handleCursor.decodeCursor(next_page);
		const result = await UserService.getAllUsers({
			user_phone,
			user_name,
			limit,
			cursorId,
			cursorValue,
		});
		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

// Create a new user (status defaults to 'active')
export const createUser = async (req, res, next) => {
	const { idempotencyKey, clientId } = req;
	const userId = req.user.user_id;
	try {
		const { user_name, user_phone, password, user_role } = req.body;
		const result = await UserService.createNewUser(
			userId,
			idempotencyKey,
			{
				user_name,
				user_phone,
				password,
				user_role,
			},
			clientId,
		);
		return responseHandler.created(res, result);
	} catch (err) {
		next(err);
	}
};

// Update existing user (optional password change)
export const updateUserByID = async (req, res, next) => {
	try {
		const { clientId } = req;
		const { id } = req.params;
		const { user_name, user_phone, user_role, user_status, password } =
			req.body;
		const result = await UserService.updateUser(
			id,
			{
				user_name,
				user_phone,
				user_role,
				user_status,
				password,
			},
			false,
			clientId,
		);
		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

// Soft-delete a user by setting is_deleted = TRUE
export const deleteUserByID = async (req, res) => {
	const { clientId } = req;
	try {
		const { id } = req.params;
		await UserService.removeUser(id, clientId);
		return responseHandler.noContent(res);
	} catch (err) {
		console.error(err.message);
		return responseHandler.error(res, "Internal Server Error");
	}
};
