import pool from "../db.js";
import { CustomerRepository } from "../repositories/customerRepository.js";
import { IdempotencyRepository } from "../repositories/idempotencyRepository.js";
import handleCursor from "../utils/handleCursor.js";

export const CustomerService = {
	async fetchAllCustomers(filters) {
		const { customer_phone, customer_name, limit } = filters;
		const customers = await CustomerRepository.getAllCustomers({
			...filters,
			limit: parseInt(limit) + 1, // Fetch 1 extra to check if there is a next page
		});

		const hasMore = customers.length > limit;
		const results = hasMore ? customers.slice(0, limit) : customers;

		let nextPageToken = null;
		if (hasMore) {
			const lastItem = results[results.length - 1];
			let value = "";
			if (customer_phone) {
				value = lastItem.customer_phone;
			} else if (customer_name) {
				value = lastItem.sml;
			} else {
				value = lastItem.customer_name;
			}
			nextPageToken = handleCursor.encodeCursor(
				value,
				lastItem.customer_id,
			);
		}
		return { results, next_page: nextPageToken };
	},

	async createCustomer(creatorId, idempotencyKey, customerData, clientId) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			const result = await CustomerRepository.createCustomer(
				client,
				customerData,
			);

			await IdempotencyRepository.updateSuccess(client, {
				key: idempotencyKey,
				userId: creatorId,
				code: 201,
				body: { success: true, data: result },
			});
			await client.query("COMMIT");
			return result;
		} catch (err) {
			await client.query("ROLLBACK");
			throw err;
		} finally {
			client.release();
		}
	},

	async updateCustomer(
		updaterId,
		idempotencyKey,
		customerID,
		customerData,
		clientId,
	) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			const result = await CustomerRepository.updateCustomer(
				client,
				customerID,
				customerData,
			);

			if (!result) {
				throw {
					type: "NOT_FOUND",
					message: "Customer not found",
				};
			}

			await IdempotencyRepository.updateSuccess(client, {
				key: idempotencyKey,
				userId: updaterId,
				code: 200,
				body: { success: true, data: result },
			});

			await client.query("COMMIT");
			return result;
		} catch (err) {
			await client.query("ROLLBACK");
			throw err;
		} finally {
			client.release();
		}
	},

	async softDeleteCustomer(customerID, clientId) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);
			await client.query("COMMIT");
			const deleted = await CustomerRepository.softDelete(
				client,
				customerID,
			);
			if (!deleted) {
				throw {
					type: "NOT_FOUND",
					message: "Service not found",
				};
			}
			await client.query("COMMIT");
		} catch (err) {
			await client.query("ROLLBACK");
			throw err;
		} finally {
			client.release();
		}
	},
};
