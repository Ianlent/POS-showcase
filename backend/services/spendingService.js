import pool from "../db.js";
import { spendingRepository } from "../repositories/spendingRepository.js";
import { IdempotencyRepository } from "../repositories/idempotencyRepository.js";
import handleCursor from "../utils/handleCursor.js";

export const SpendingService = {
	async getAll(filters) {
		const { start, end, limit, ...otherFilters } = filters;
		if (start && end && start > end) {
			throw {
				type: "UNPROCESSABLE",
				message: "Start date cannot be after end date.",
			};
		}

		const tickets = await spendingRepository.fetchAll({
			start,
			end,
			limit: parseInt(limit) + 1,
			...otherFilters,
		});

		const hasMore = tickets.length > limit;
		const results = hasMore ? tickets.slice(0, limit) : tickets;

		let nextPageToken = null;
		if (hasMore) {
			const lastItem = results[results.length - 1];
			const value = lastItem.ticket_date;
			nextPageToken = handleCursor.encodeCursor(
				value,
				lastItem.ticket_id,
			);
		}
		return { results, next_page: nextPageToken };
	},

	async create(ticketData, idempotencyKey, clientId) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			const { user_id } = ticketData;
			const result = await spendingRepository.createTicket(
				client,
				ticketData,
			);

			await IdempotencyRepository.updateSuccess(client, {
				key: idempotencyKey,
				userId: user_id,
				code: 201,
				body: { success: true, data: result },
			});
			await client.query("COMMIT");
			return result;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	},

	async update(id, ticketData, clientId) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			const result = await spendingRepository.updateTicket(
				client,
				id,
				ticketData,
			);
			if (!result) {
				throw { type: "NOT_FOUND", message: "Ticket not found" };
			}
			await client.query("COMMIT");
			return result;
		} catch (err) {
			await client.query("ROLLBACK");
			throw err;
		} finally {
			client.release();
		}
	},

	async remove(id, clientId) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			const deleted = await spendingRepository.softDelete(client, id);
			if (!deleted) {
				throw { type: "NOT_FOUND", message: "Ticket not found" };
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
