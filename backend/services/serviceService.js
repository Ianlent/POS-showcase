import pool from "../db.js";
import { ServiceRepository } from "../repositories/serviceRepository.js";
import { IdempotencyRepository } from "../repositories/idempotencyRepository.js";
import handleCursor from "../utils/handleCursor.js";

export const ServiceService = {
	async getServices(filters) {
		const { limit } = filters;
		const services = await ServiceRepository.findAll({
			...filters,
			limit: parseInt(limit) + 1,
		});
		// Pagination logic
		const hasMore = services.length > limit;
		const results = hasMore ? services.slice(0, limit) : services;

		let nextPageToken = null;
		if (hasMore) {
			const lastItem = results[results.length - 1];
			const value = lastItem.service_name;
			nextPageToken = handleCursor.encodeCursor(
				value,
				lastItem.service_id,
			);
		}
		return { results, next_page: nextPageToken };
	},

	async createNewService(userId, idempotencyKey, serviceData, clientId) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			// Step 1: Create the actual service
			const newService = await ServiceRepository.create(
				client,
				serviceData,
			);

			// Step 2: Handle idempotency logic
			if (idempotencyKey) {
				await IdempotencyRepository.updateSuccess(client, {
					key: idempotencyKey,
					userId: userId,
					code: 201,
					body: { success: true, data: newService },
				});
			}

			await client.query("COMMIT");
			return newService;
		} catch (err) {
			await client.query("ROLLBACK");
			throw err;
		} finally {
			client.release();
		}
	},

	async updateService(id, updateData, clientId) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			const updatedRecord = await ServiceRepository.update(
				client,
				id,
				updateData,
			);
			if (!updatedRecord) {
				throw {
					type: "NOT_FOUND",
					message: "Service not found",
				};
			}
			await client.query("COMMIT");
			return updatedRecord;
		} catch (err) {
			await client.query("ROLLBACK");
			throw err;
		} finally {
			client.release();
		}
	},

	async removeService(id, clientId) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			const deleted = await ServiceRepository.softDelete(client, id);
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
