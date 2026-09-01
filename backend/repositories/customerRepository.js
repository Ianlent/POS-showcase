import pool from "../db.js";
export const CustomerRepository = {
	async lockCustomerById(client, id) {
		const query = `
			SELECT customer_id
			FROM customers
			WHERE customer_id = $1 AND is_deleted = FALSE FOR NO KEY UPDATE;`;
		const result = await client.query(query, [id]);
		return result.rows[0];
	},

	async getAllCustomers(filters) {
		let where_clause = [`is_deleted = FALSE`];
		let order_criteria = ``;
		let params = [];

		const { customer_phone, customer_name, cursorValue, cursorId, limit } =
			filters;

		if (customer_phone) {
			params.push(`${customer_phone}%`);
			where_clause.push(`customer_phone LIKE $${params.length}`);

			if (cursorValue && cursorId) {
				params.push(cursorValue, cursorId);
				where_clause.push(
					`(customer_phone, customer_id) > ($${params.length - 1}, $${params.length})`,
				);
			}
			order_criteria = `customer_phone COLLATE "C" ASC, customer_id ASC`;
		} else if (customer_name) {
			params.push(customer_name);
			where_clause.push(
				`customer_name_search % unaccent(lower($${params.length}))`,
			);

			if (cursorValue && cursorId) {
				params.push(cursorValue, cursorId);
				where_clause.push(
					`(similarity(customer_name_search, unaccent(lower($1))), customer_id) < ($${params.length - 1}, $${params.length})`,
				);
			}

			order_criteria = `sml DESC, customer_id DESC`;
		} else {
			if (cursorValue && cursorId) {
				params.push(cursorValue, cursorId);
				where_clause.push(
					`(customer_name COLLATE "vi-VN-x-icu", customer_id) > ($${params.length - 1}, $${params.length})`,
				);
			}

			order_criteria = `customer_name COLLATE "vi-VN-x-icu" ASC, customer_id ASC`;
		}

		params.push(limit);
		const limitParam = `$${params.length}`;

		const sql = `
		SELECT 
			customer_id, customer_name, customer_phone, customer_address, points
			${customer_name && !customer_phone ? ", similarity(customer_name_search, unaccent(lower($1))) AS sml" : ""}
		FROM customers
		WHERE ${where_clause.join(" AND ")}
		ORDER BY ${order_criteria}
		LIMIT ${limitParam};`;

		const result = await pool.query(sql, params);
		return result.rows;
	},

	async createCustomer(client, customerData) {
		try {
			const mapping = {
				customer_name: "customer_name",
				customer_phone: "customer_phone",
				customer_address: "customer_address",
				points: "points",
			};

			let insert_columns = [];
			let insert_values_placeholders = [];
			let values = [];

			for (const [key, column] of Object.entries(mapping)) {
				if (customerData[key] !== undefined) {
					values.push(customerData[key]);
					insert_columns.push(column);
					insert_values_placeholders.push(`$${values.length}`);
				}
			}

			const sql = `INSERT INTO customers (${insert_columns.join(", ")})
				VALUES (${insert_values_placeholders.join(", ")})
				RETURNING 
					customer_id, customer_name, customer_phone, customer_address, points`;
			const result = await client.query(sql, values);
			return result.rows[0];
		} catch (err) {
			switch (err.constraint) {
				case "unique_customer_phone":
					throw {
						type: "CONFLICT",
						message:
							"Customer with same phone number already exists",
					};
					break;
				default:
					throw err;
			}
		}
	},

	async updateCustomer(client, id, updateData) {
		try {
			const mapping = {
				customer_name: "customer_name",
				customer_phone: "customer_phone",
				customer_address: "customer_address",
				added_points: "points",
			};

			let setClauses = [];
			let values = [];

			for (const [key, column] of Object.entries(mapping)) {
				if (updateData[key] !== undefined) {
					let value = updateData[key];

					if (key === "customer_address" && value === "") {
						value = null;
					}

					values.push(value);

					let setValue = `${column} = $${values.length}`;

					if (key === "added_points") {
						setValue = `${column} = ${column} + $${values.length}`;
					}
					setClauses.push(setValue);
				}
			}

			if (setClauses.length === 0) {
				throw {
					type: "UNPROCESSABLE",
					message: "No fields to update",
				};
			}

			values.push(id);
			const idPlaceholder = `$${values.length}`;

			const sql = `
			UPDATE customers SET ${setClauses.join(", ")}
			WHERE customer_id = ${idPlaceholder} AND is_deleted = FALSE
			RETURNING customer_id, customer_name, customer_phone, customer_address, points
			`;

			const result = await client.query(sql, values);
			return result.rows[0];
		} catch (err) {
			switch (err.constraint) {
				case "unique_customer_phone":
					throw {
						type: "CONFLICT",
						message:
							"Customer with same phone number already exists",
					};
					break;
				case "check_min_point":
					throw {
						type: "UNPROCESSABLE",
						message:
							"Cannot subtract more points than currently available",
					};
					break;
				default:
					throw err;
			}
		}
	},

	async softDelete(client, id) {
		const sql = `
		UPDATE customers 
		SET is_deleted = TRUE
		WHERE customer_id = $1 AND is_deleted = FALSE RETURNING 1;`;
		const result = await client.query(sql, [id]);
		return result.rowCount > 0;
	},
};
