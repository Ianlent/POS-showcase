import responseHandler from "../utils/response.handler.js";
import { CustomerService } from "../services/customerService.js";
import handleCursor from "../utils/handleCursor.js";

export const getAllCustomers = async (req, res, next) => {
	try {
		const {
			next_page,
			customer_phone,
			customer_name,
			limit = 5,
		} = req.query;
		const { cursorValue, cursorId } = handleCursor.decodeCursor(next_page);
		const result = await CustomerService.fetchAllCustomers({
			customer_phone,
			customer_name,
			cursorValue,
			cursorId,
			limit,
		});

		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

export const createCustomer = async (req, res, next) => {
	const { idempotencyKey, clientId } = req;
	const userId = req.user.user_id;
	try {
		const { customer_name, customer_phone, customer_address, points } =
			req.body;
		const result = await CustomerService.createCustomer(
			userId,
			idempotencyKey,
			{
				customer_name,
				customer_phone,
				customer_address,
				points,
			},
			clientId,
		);

		return responseHandler.created(res, result);
	} catch (err) {
		next(err);
	}
};

export const updateCustomerByID = async (req, res, next) => {
	const { idempotencyKey, clientId } = req;
	const userId = req.user.user_id;
	try {
		const { id } = req.params;
		const {
			customer_name,
			customer_phone,
			customer_address,
			added_points,
		} = req.body;
		const result = await CustomerService.updateCustomer(
			userId,
			idempotencyKey,
			req.params.id,
			{
				customer_name,
				customer_phone,
				customer_address,
				added_points,
			},
			clientId,
		);
		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

export const deleteCustomerByID = async (req, res, next) => {
	const { clientId } = req;
	try {
		const { id } = req.params;
		await CustomerService.softDeleteCustomer(id, clientId);
		return responseHandler.noContent(res);
	} catch (err) {
		next(err);
	}
};
