import { v7 as uuidv7 } from "uuid";
import pool from "../db.js";
import { OrderRepository } from "../repositories/orders/orderRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { CustomerRepository } from "../repositories/customerRepository.js";
import { ServiceRepository } from "../repositories/serviceRepository.js";
import { IdempotencyRepository } from "../repositories/idempotencyRepository.js";
import { orderHelper } from "./ServiceHelper/orderLogic.js";
import handleCursor from "../utils/handleCursor.js";

export const OrderService = {
	async fetchAllOrders(filters) {
		const { start, end, limit } = filters;
		// Business Logic Check
		if (start && end && new Date(start) > new Date(end)) {
			throw {
				type: "UNPROCESSABLE",
				message: "Start date cannot be after end date.",
			};
		}

		const orders = await OrderRepository.findAll({
			...filters,
			limit: parseInt(limit) + 1,
		});

		// Pagination Logic
		const hasMore = orders.length > limit;
		const results = hasMore ? orders.slice(0, limit) : orders;

		let nextPageToken = null;
		if (hasMore) {
			const lastItem = results[results.length - 1];
			const value = lastItem.order_start_date;
			nextPageToken = handleCursor.encodeCursor(
				value,
				lastItem.customer_id,
			);
		}

		return { results, next_page: nextPageToken };
	},

	async fetchDetailedOrderByID(id, requester) {
		const order = await OrderRepository.findDetailsById(id);
		if (!order) {
			throw { type: "NOT_FOUND", message: "Order not found" };
		} else if (
			order.handler.id !== requester.user_id &&
			requester.user_role !== "admin"
		) {
			throw {
				type: "FORBIDDEN",
				message: "You are not authorized to view this order",
			};
		}
		return order;
	},

	async fetchActiveOrders(filters, requester) {
		const { start, end, limit = 5 } = filters;
		// Business Logic Check
		if (start && end && new Date(start) > new Date(end)) {
			throw {
				type: "UNPROCESSABLE",
				message: "Start date cannot be after end date.",
			};
		}

		const orders = await OrderRepository.findAll({
			...filters,
			handlerId: requester.user_id,
			order_status: ["pending", "confirmed", "completed"],
			limit: parseInt(limit),
		});

		// Pagination Logic
		const lastItem = orders[orders.length - 1];
		const nextCursor = lastItem
			? { id: lastItem.order_id, date: lastItem.order_date }
			: null;

		return { orders, next_cursor: nextCursor };
	},

	async createOrder(requestingUser, orderData, idempotencyKey, clientId) {
		const client = await pool.connect();
		const creationHelpers = orderHelper.createOrderHelper;
		const creatorId = requestingUser.user_id;
		try {
			// Begin transaction
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			// Generate order id
			const orderId = uuidv7();
			const creatorRole = requestingUser.user_role;

			// Security check
			if (
				creatorRole === "employee" &&
				orderData.handler_id !== creatorId
			) {
				throw {
					type: "FORBIDDEN",
					message: "Access denied",
				};
			}

			// Create new customer is needed, then lock customer to prevent modification, return id on success
			orderData = await creationHelpers.handleCustomerCreationAndLocking(
				client,
				orderData,
			);

			// Acquire lock on handler to prevent modification mid transaction. Also check for existence of handler.
			await creationHelpers.lockHandlerAndCheckExistence(
				client,
				orderData,
			);

			// Check if there's service_id duplicates and lock to prevent modification mid transaction.
			// Also check for non existent services at the time the order is placed and stale pricing.
			await creationHelpers.checkServicesAndLock(
				client,
				orderData.services,
			);

			// creating line items to insert into local_order_service. Add total_service_cost to orderData.
			// line_items = [{service_id, line_item_cost(service_price_per_unit * number_of_unit), number_of_unit}]
			orderData = await creationHelpers.createLineItemsAndCalculateCost(
				client,
				orderId,
				orderData,
			);

			// Insert order into local_orders table
			const createdOrder = await OrderRepository.createOrder(
				client,
				orderId,
				orderData,
			);

			// Update user points
			if (orderData.points_used > 0 || orderData.points_earned > 0) {
				await creationHelpers.subtractCustomerPoints(
					client,
					orderData.customer_id,
					orderData,
				);
			}

			if (idempotencyKey) {
				await IdempotencyRepository.updateSuccess(client, {
					key: idempotencyKey,
					userId: creatorId,
					code: 201,
					body: { success: true, data: createdOrder },
				});
			}
			// Commit transaction
			await client.query("COMMIT");
			return createdOrder;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	},

	async updateStatus(
		id,
		order_status,
		updater,
		due_date = null,
		payment_method = null,
		clientId,
	) {
		const client = await pool.connect();
		const updateHelper = orderHelper.updateOrderHelper;
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			// 1. Check if order exists and is not deleted /////////////////////////////////////////
			const currOrder = await OrderRepository.fetchAndLockOrder(
				client,
				id,
			);

			if (!currOrder) {
				throw { type: "NOT_FOUND", message: "Order not found" };
			}

			const currStatus = currOrder.order_status;
			const currOwner = currOrder.handler_id;
			const isPrepaid = currOrder.is_prepaid;

			if (currStatus === order_status) {
				throw {
					type: "UNPROCESSABLE",
					message: `Order is already in ${order_status} status`,
				};
			}

			// 2. Handle metadata updates /////////////////////////////////////////////////
			const update_data = updateHelper.handleStatusUpdate(
				currStatus,
				order_status,
				isPrepaid,
				due_date,
				updater,
				payment_method,
			);

			// 3. Update order
			const result = await OrderRepository.updateById(
				client,
				id,
				update_data,
			);

			// Commit transaction
			await client.query("COMMIT");
			return result;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	},

	async updateById(id, updateData, requestingUser, idempotencyKey, clientId) {
		const client = await pool.connect();
		const requesterId = requestingUser.user_id;
		const updateHelper = orderHelper.updateOrderHelper;
		try {
			// Begin transaction
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			// Check if order exists and is not deleted
			const currOrder = await OrderRepository.fetchAndLockOrder(
				client,
				id,
			);

			if (!currOrder) {
				throw { type: "NOT_FOUND", message: "Order not found" };
			}

			// Create customer if required
			updateData = await updateHelper.handleAddNewCustomer(
				client,
				updateData,
			);

			// Update metadata when status is changed
			if (updateData.order_status) {
				const statusUpdatePayload = updateHelper.handleStatusUpdate(
					currOrder.order_status,
					updateData.order_status,
					currOrder.is_prepaid,
					updateData.owed_due_date,
					updateData.closed_by || requestingUser,
					updateData.payment_method,
				);
				updateData = { ...updateData, ...statusUpdatePayload };
			}

			// Check discount
			updateHelper.checkFixedDiscountValidity(currOrder, updateData);

			// Update order
			const result = await OrderRepository.updateById(
				client,
				id,
				updateData,
			);

			if (idempotencyKey) {
				await IdempotencyRepository.updateSuccess(client, {
					key: idempotencyKey,
					userId: requesterId,
					code: 200,
					body: { success: true, data: result },
				});
			}

			// Commit transaction
			await client.query("COMMIT");
			return result;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	},

	async removeOrder(id, requester, clientId) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			const deletedOrder = await OrderRepository.fetchAndLockOrder(
				client,
				id,
			);
			if (!deletedOrder) {
				throw { type: "NOT_FOUND", message: "Order not found" };
			}
			const orderHandler = deletedOrder.handler_id;
			const orderStatus = deletedOrder.order_status;
			if (
				requester.user_role === "employee" &&
				orderHandler !== requester.user_id
			) {
				throw {
					type: "FORBIDDEN",
					message: "You are not authorized to delete this order",
				};
			}

			const isClosed = ["completed", "cancelled"].includes(orderStatus);
			if (requester.user_role === "employee" && isClosed) {
				throw {
					type: "FORBIDDEN",
					message: "You are not authorized to delete this order",
				};
			}

			await OrderRepository.softDeleteById(client, id);
			await client.query("COMMIT");
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	},
};
