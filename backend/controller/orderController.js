import { OrderService } from "../services/orderService.js";
import responseHandler from "../utils/response.handler.js";
import handleCursor from "../utils/handleCursor.js";

export const getAllOrders = async (req, res, next) => {
	try {
		const { next_page, limit = 5 } = req.query;
		const { cursorValue, cursorId } = handleCursor.decodeCursor(next_page);
		const result = await OrderService.fetchAllOrders({
			cursorId,
			cursorValue,
			limit,
			...req.query,
		});
		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};
export const getOrderDetailsById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const requester = req.user;
		const result = await OrderService.fetchDetailedOrderByID(id, requester);
		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

export const getActiveOrders = async (req, res, next) => {
	try {
		const { next_page, limit = 5 } = req.query;
		const { cursorValue, cursorId } = handleCursor.decodeCursor(next_page);
		const result = await OrderService.fetchActiveOrders(
			{
				cursorId,
				cursorValue,
				limit,
				...req.query,
			},
			req.user,
		);
		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

export const createOrder = async (req, res, next) => {
	const { idempotencyKey, clientId } = req;
	const requestingUser = req.user;
	const {
		customer_id,
		customerInfo, // Object: { customer_name, customer_phone, customer_address, points } to create new customer
		handler_id = requestingUser.user_id,
		order_start_date,
		planned_pickup_date,
		points_used = 0,
		points_earned = 0,
		extra_cost = 0,
		discount = 0,
		discount_type,
		order_note = null,
		services, // Array of object: [{ service_id, service_price_per_unit, number_of_unit }]
	} = req.body;
	try {
		const result = await OrderService.createOrder(
			req.user,
			{
				customer_id,
				customerInfo,
				handler_id,
				order_start_date,
				planned_pickup_date,
				points_used,
				points_earned,
				extra_cost,
				discount,
				discount_type,
				order_note,
				services,
			},
			idempotencyKey,
			clientId,
		);
		return responseHandler.created(res, result);
	} catch (err) {
		next(err);
	}
};

export const updateOrderStatus = async (req, res, next) => {
	const { clientId, user } = req;
	const { id } = req.params;
	const { order_status, owed_due_date, payment_method } = req.body;
	try {
		const result = await OrderService.updateStatus(
			id,
			order_status,
			user,
			owed_due_date,
			payment_method,
			clientId,
		);
		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

export const updateOrderByID = async (req, res, next) => {
	const { id } = req.params;
	const { idempotencyKey, clientId, user } = req;
	try {
		const result = await OrderService.updateById(
			id,
			req.body,
			user,
			idempotencyKey,
			clientId,
		);
		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

export const deleteOrder = async (req, res, next) => {
	const { id } = req.params;
	const { clientId, user } = req;
	try {
		await OrderService.removeOrder(id, user, clientId);
		return responseHandler.noContent(res);
	} catch (err) {
		next(err);
	}
};
