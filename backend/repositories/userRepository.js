import pool from "../db.js";
export const UserRepository = {
	async findUserDataByIdAndLock(client, user_id) {
		const query = `
		SELECT user_role 
		FROM users 
		WHERE user_id = $1 AND is_deleted = FALSE AND user_status = 'active' FOR SHARE;`;
		const result = await client.query(query, [user_id]);
		return result.rows[0];
	},

	async findUserDataById(user_id) {
		const query = `
			SELECT
				user_id,
				user_name,
				user_role,
				user_phone,
				user_status
			FROM users
			WHERE user_id = $1 AND user_status = 'active' AND is_deleted = FALSE`;
		const result = await pool.query(query, [user_id]);
		return result.rows[0];
	},

	async fetchAllUsers(filters) {
		let where_clause = [`is_deleted = FALSE`];
		let order_criteria = ``;
		let params = [];
		const {
			user_phone,
			user_name,
			limit,
			cursorId,
			cursorValue,
			is_only_employee = false,
		} = filters;

		if (user_phone) {
			params.push(`${user_phone}%`);
			where_clause.push(`user_phone LIKE $${params.length}`);

			if (cursorValue && cursorId) {
				params.push(cursorValue, cursorId);
				where_clause.push(
					`(user_phone, user_id) > ($${params.length - 1}, $${params.length})`,
				);
			}

			order_criteria = `user_phone ASC, user_id ASC`;
		} else {
			if (user_name) {
				params.push(`%${user_name}%`);
				where_clause.push(
					`user_name_search ILIKE unaccent(lower($${params.length}))`,
				);
			}

			if (cursorValue && cursorId) {
				params.push(cursorValue, cursorId);
				where_clause.push(
					`(user_name COLLATE "vi-VN-x-icu", user_id) > ($${params.length - 1}, $${params.length})`,
				);
			}

			order_criteria = `user_name COLLATE "vi-VN-x-icu" ASC, user_id ASC`;
		}

		if (is_only_employee) {
			where_clause.push(`user_role = 'employee'`);
		}

		params.push(limit);
		const limitParam = `$${params.length}`;

		const sql = `
		SELECT
			user_id,
			user_name,
			user_role,
			user_phone,
			user_status
		FROM users
		WHERE ${where_clause.join(" AND ")}
		ORDER BY ${order_criteria}
		LIMIT ${limitParam};`;

		const result = await pool.query(sql, params);
		return result.rows;
	},

	async createNewUser(
		client,
		{ user_name, user_phone, password_hash, user_role },
	) {
		try {
			const result = await client.query(
				`INSERT INTO users (user_name, user_phone, password_hash, user_role)
					VALUES ($1, $2, $3, $4)
				RETURNING user_id, user_name, user_role, user_status, user_phone`,
				[user_name, user_phone, password_hash, user_role],
			);
			return result.rows[0];
		} catch (err) {
			switch (err.constraint) {
				case "unique_user_phone":
					throw {
						type: "CONFLICT",
						message: "User with same phone number already exists",
					};
					break;
				default:
					throw err;
			}
		}
	},

	async updateUser(id, updateData, is_only_employee = false) {
		try {
			const mapping = {
				user_name: "user_name",
				user_role: "user_role",
				user_phone: "user_phone",
				user_status: "user_status",
				password_hash: "password_hash",
			};
			let where_clause = [];
			let setClauses = [];
			let values = [];
			for (const [key, column] of Object.entries(mapping)) {
				let val = updateData[key];
				// Only update fields that are actually provided in updateData
				if (val !== undefined) {
					values.push(val);
					setClauses.push(`${column} = $${values.length}`);
				}
			}

			if (setClauses.length === 0) {
				throw {
					type: "BAD_REQUEST",
					message: "No fields to update",
				};
			}

			values.push(id);
			where_clause.push(`user_id = $${values.length}`);

			if (is_only_employee) {
				where_clause.push(`user_role = 'employee'`);
			}

			const sql = `
			UPDATE users SET ${setClauses.join(", ")}
			WHERE ${where_clause.join(" AND ")} AND is_deleted = FALSE
			RETURNING user_id, user_name, user_role, user_status, user_phone, updated_at
			`;

			const result = await pool.query(sql, values);
			return result.rows[0];
		} catch (err) {
			switch (err.constraint) {
				case "unique_user_phone":
					throw {
						type: "CONFLICT",
						message: "User with same phone number already exists",
					};
				default:
					throw err;
			}
		}
	},

	async softDelete(client, user_id, is_only_employee = false) {
		const query = `
		UPDATE users
		SET is_deleted = TRUE
		WHERE user_id = $1 ${is_only_employee ? "AND user_role = 'employee' " : ""}AND is_deleted = FALSE
		RETURNING 1`;
		const result = await client.query(query, [user_id]);
		return result.rowCount > 0;
	},
};
