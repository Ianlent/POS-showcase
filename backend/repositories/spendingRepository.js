import pool from "../db.js";

export const spendingRepository = {
	async fetchAll(filters) {
		const { cursorValue, cursorId, start, end, limit, ...otherFilters } =
			filters;

		let params = [];
		let whereClause = [`t.is_deleted = FALSE`];

		const mapping = {
			creator_id: "t.creator_id",
			is_expense: "t.is_expense",
		};

		for (const [key, column] of Object.entries(mapping)) {
			if (otherFilters[key] !== undefined) {
				params.push(otherFilters[key]);
				whereClause.push(`${column} = $${params.length}`);
			}
		}

		if (cursorValue && cursorId) {
			const cleanCursorValue = new Date(cursorValue).toISOString();
			params.push(cleanCursorValue, cursorId);
			whereClause.push(
				`(t.ticket_date, t.ticket_id) < ($${params.length - 1}, $${params.length})`,
			);
		}

		if (start) {
			const startIso = new Date(start).toISOString();
			params.push(startIso);
			whereClause.push(`t.ticket_date >= $${params.length}`);
		}

		if (end) {
			const endIso = new Date(end).toISOString();
			params.push(endIso);
			whereClause.push(`t.ticket_date <= $${params.length}`);
		}

		params.push(limit);
		const limitParam = `$${params.length}`;

		const sql = `
			SELECT
				t.ticket_id,
				t.amount,
				t.is_expense,
				t.reason,
				t.ticket_date,
				t.created_at,
				u.user_name,
				u.user_phone
			FROM local_spending_tickets t
			LEFT JOIN users u ON t.creator_id = u.user_id
			WHERE ${whereClause.join(" AND ")}
			ORDER BY ticket_date DESC, ticket_id DESC
			LIMIT ${limitParam}
		`;
		const result = await pool.query(sql, params);
		return result.rows;
	},

	async createTicket(client, ticketData) {
		let params = [];
		let insert_columns = [];
		let values_placeholders = [];

		const mapping = {
			user_id: "creator_id",
			amount: "amount",
			is_expense: "is_expense",
			reason: "reason",
			ticket_date: "ticket_date",
		};
		for (const [key, column] of Object.entries(mapping)) {
			if (ticketData[key] !== undefined) {
				let value = ticketData[key];
				if (key === "ticket_date") {
					value = new Date(value).toISOString();
				}

				params.push(value);
				insert_columns.push(column);
				values_placeholders.push(`$${params.length}`);
			}
		}

		const sql = `
		INSERT INTO local_spending_tickets (${insert_columns.join(", ")})
		VALUES (${values_placeholders.join(", ")})
		RETURNING ticket_id, creator_id, amount, is_expense, reason, ticket_date
		`;
		try {
			const result = await client.query(sql, params);
			return result.rows[0];
		} catch (err) {
			throw err;
		}
	},

	async updateTicket(client, id, updatedTicketData) {
		let setClause = [];
		let params = [];

		const mapping = {
			amount: "amount",
			is_expense: "is_expense",
			reason: "reason",
			ticket_date: "ticket_date",
		};

		for (const [key, column] of Object.entries(mapping)) {
			if (updatedTicketData[key] !== undefined) {
				let value = updatedTicketData[key];
				if (key === "ticket_date") {
					value = new Date(value).toISOString();
				}

				if (key === "reason" && value === "") {
					value = null;
				}

				params.push(value);
				setClause.push(`${column} = $${params.length}`);
			}
		}

		if (setClause.length === 0) {
			throw { type: "UNPROCESSABLE", message: "No fields to update" };
		}

		params.push(id);
		const idPlaceholder = `$${params.length}`;

		const sql = `
		UPDATE local_spending_tickets SET ${setClause.join(", ")}
		WHERE ticket_id = ${idPlaceholder} AND is_deleted = FALSE
		RETURNING ticket_id, creator_id, amount, ticket_date, is_expense, reason
		`;
		const result = await client.query(sql, params);
		return result.rows[0];
	},

	async softDelete(client, id) {
		const query = `
		UPDATE local_spending_tickets
		SET is_deleted = TRUE
		WHERE ticket_id = $1 AND is_deleted = FALSE RETURNING 1;`;

		const result = await client.query(query, [id]);
		return result.rowCount > 0;
	},
};
