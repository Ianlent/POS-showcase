import pool from "../db.js";
export const ServiceRepository = {
	async findAll(filters) {
		const { cursorValue, cursorId, limit, service_name } = filters;
		const params = [];
		let whereClause = [`is_deleted = FALSE`];

		if (service_name) {
			// Logic for DB-specific search formatting
			params.push(`%${service_name}%`);
			whereClause.push(
				`service_name_search ILIKE unaccent(lower($${params.length}))`,
			);
		}

		if (cursorValue && cursorId) {
			params.push(cursorValue, cursorId);
			const nameParam = `$${params.length - 1}`;
			const idParam = `$${params.length}`;

			// Row comparison logic: (name, id) > (last_name, last_id)
			whereClause.push(
				`(service_name, service_id) > (${nameParam}, ${idParam})`,
			);
		}

		params.push(limit);
		const limitParam = `$${params.length}`;

		const sql = `
            SELECT service_id, service_name, service_unit, service_price_per_unit
            FROM local_services
            WHERE ${whereClause.join(" AND ")}
            ORDER BY service_name COLLATE "vi-VN-x-icu" ASC, service_id ASC
			LIMIT ${limitParam};
        `;

		const result = await pool.query(sql, params);

		return result.rows;
	},

	async create(client, serviceData) {
		const mapping = {
			service_name: "service_name",
			service_unit: "service_unit",
			service_price_per_unit: "service_price_per_unit",
			is_whole_unit: "is_whole_unit",
		};

		let values = [];
		let insert_columns = [];
		let insert_values_placeholders = [];

		for (const [key, column] of Object.entries(mapping)) {
			if (serviceData[key] !== undefined) {
				values.push(serviceData[key]);
				insert_columns.push(column);
				insert_values_placeholders.push(`$${values.length}`);
			}
		}

		const query = `
            INSERT INTO local_services (${insert_columns.join(", ")})
            VALUES (${insert_values_placeholders.join(", ")})
            RETURNING service_id, service_name, service_unit, service_price_per_unit;
        `;
		const res = await client.query(query, values);
		return res.rows[0];
	},

	async update(client, id, updateData) {
		const setClauses = [];
		const values = [];

		// Map the JS object keys to SQL columns
		const mapping = {
			service_name: "service_name",
			service_unit: "service_unit",
			service_price_per_unit: "service_price_per_unit",
		};

		for (const [key, column] of Object.entries(mapping)) {
			if (updateData[key] !== undefined) {
				values.push(updateData[key]);
				setClauses.push(`${column} = $${values.length}`);
			}
		}

		if (setClauses.length === 0) {
			throw { type: "UNPROCESSABLE", message: "No fields to update" };
		}

		values.push(id);
		const idPlaceholder = `$${values.length}`;

		const sql = `
            UPDATE local_services
            SET ${setClauses.join(", ")}
            WHERE service_id = ${idPlaceholder} AND is_deleted = FALSE
            RETURNING service_id, service_name, service_unit, service_price_per_unit, is_whole_unit;
        `;

		const result = await client.query(sql, values);
		return result.rows[0];
	},

	async softDelete(id) {
		const query = `
            UPDATE local_services
            SET is_deleted = TRUE
            WHERE service_id = $1 AND is_deleted = FALSE RETURNING 1;
        `;
		const result = await pool.query(query, [id]);
		return result.rowCount > 0;
	},

	async fetchServicesAndLock(client, ids) {
		const query = `
            SELECT service_id, service_price_per_unit, is_whole_unit
			FROM local_services 
			WHERE service_id = ANY($1) AND is_deleted = FALSE FOR SHARE;
        `;
		const result = await client.query(query, [ids]);
		return result.rows;
	},
};
