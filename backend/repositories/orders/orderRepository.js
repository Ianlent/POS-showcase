import pool from "../../db.js";
import { db_order_error_handle } from "./order_db_error.js";

export const OrderRepository = {
	async findAll(filters) {
		const { start, end, cursorId, cursorValue, limit, ...simpleFilter } =
			filters;
		let fields = [];
		let conditions = ["o.is_deleted = FALSE"];
		// Cursor logic (Database-specific)
		if (cursorId && cursorValue) {
			const isoDate = new Date(cursorValue).toISOString();
			fields.push(isoDate, cursorId);
			conditions.push(
				`(o.order_start_date, o.order_id) < ($${fields.length - 1}, $${fields.length})`,
			);
		}

		// Handle date ranges

		if (start) {
			const startIso = new Date(start).toISOString();
			fields.push(startIso);
			conditions.push(`o.order_start_date >= $${fields.length}`);
		}
		if (end) {
			const endIso = new Date(end).toISOString();
			fields.push(endIso);
			conditions.push(`o.order_start_date <= $${fields.length}`);
		}

		// Handle equal filters
		const mapping = {
			order_status: "o.order_status",
			customer_id: "o.customer_id",
			handler_id: "o.handler_id",
		};

		for (const [key, column] of Object.entries(mapping)) {
			if (simpleFilter[key]) {
				if (key === "order_status") {
					fields.push(simpleFilter[key].split(","));
					conditions.push(`o.order_status = ANY($${fields.length})`);
				} else {
					fields.push(simpleFilter[key]);
					conditions.push(`${column} = $${fields.length}`);
				}
			}
		}

		const criteria = conditions.join(" AND ");
		fields.push(limit || 5);
		const sql = `
			SELECT
                o.order_id,

				o.customer_id,
				o.handler_id,
				o.closed_by,
				
				o.order_status,

				o.order_start_date,
				o.order_end_date,
				o.planned_pickup_date,
				o.owed_due_date,
				
				o.total_cost,
				o.payment_method,
				o.is_prepaid,

                c.customer_name,
                c.customer_phone,
                u.user_name AS handler_name,
            	u.user_phone AS handler_phone,
				ub.user_name AS closed_by_name,
    			ub.user_phone AS closed_by_phone
            FROM local_orders o
			LEFT JOIN customers c ON o.customer_id = c.customer_id
			LEFT JOIN users u ON o.handler_id = u.user_id
			LEFT JOIN users ub ON o.closed_by = ub.user_id
			WHERE ${criteria}
			ORDER BY o.order_start_date DESC, o.order_id DESC
			LIMIT $${fields.length};
        `;
		const result = await pool.query(sql, fields);
		return result.rows;
	},

	async findDetailsById(id) {
		const sql = `
		SELECT 
			o.order_id,
			
			o.order_status,

			o.order_start_date,
			o.order_end_date,
			o.planned_pickup_date,
			o.owed_due_date,

			o.payment_method,
			o.is_prepaid,
			o.paid_at,

			o.extra_cost, 

			o.discount,
			o.discount_type,

			o.order_note,

			o.total_service_cost,
			o.total_cost,
			
			jsonb_build_object(
				'id', c.customer_id,
				'name', c.customer_name,
				'phone', c.customer_phone,
				'address', c.customer_address
			) AS customer,
			jsonb_build_object(
				'id', u.user_id,
				'name', u.user_name,
				'phone', u.user_phone,
				'role', u.user_role
			) AS handler,
			jsonb_build_object(
				'id', ub.user_id,
				'name', ub.user_name,
				'phone', ub.user_phone,
				'role', ub.user_role
			) AS closer,
			-- Aggregate services using JOIN and GROUP BY
			jsonb_agg(
				jsonb_build_object(
					'service_id', os.service_id,
					'name', s.service_name,
					'cost', os.line_item_cost,
					'units', os.number_of_unit,
					'type', s.service_unit,
					'price_per_unit', s.service_price_per_unit
				)
			) FILTER (WHERE os.order_id IS NOT NULL) AS services
		FROM local_orders o
		LEFT JOIN customers c ON o.customer_id = c.customer_id
		LEFT JOIN users u ON o.handler_id = u.user_id
		LEFT JOIN users ub ON o.closed_by = ub.user_id
		LEFT JOIN local_order_service os ON o.order_id = os.order_id
		LEFT JOIN local_services s ON os.service_id = s.service_id AND s.is_deleted = FALSE
		WHERE o.order_id = $1
		AND o.is_deleted = FALSE
		GROUP BY o.order_id, c.customer_id, u.user_id, ub.user_id;`;
		const result = await pool.query(sql, [id]);
		return result.rows[0];
	},

	async insertLineItems(client, orderId, ids, costs, units) {
		const query = `
            INSERT INTO local_order_service (order_id, service_id, line_item_cost, number_of_unit)
            SELECT $1, * FROM UNNEST($2::uuid[], $3::int[], $4::int[])
        `;

		await client.query(query, [orderId, ids, costs, units]);
	},

	async createOrder(client, orderId, orderData) {
		const mapping = {
			customer_id: "customer_id",
			handler_id: "handler_id",

			order_start_date: "order_start_date",
			planned_pickup_date: "planned_pickup_date",

			payment_method: "payment_method",
			is_prepaid: "is_prepaid",

			extra_cost: "extra_cost",

			discount: "discount",
			discount_type: "discount_type",

			order_note: "order_note",

			total_service_cost: "total_service_cost",
		};
		// Initialize with order_id
		const fields = ["order_id"];
		const values = [orderId];
		for (const [key, column] of Object.entries(mapping)) {
			let val = orderData[key];
			// Turn empty string into null for notes
			if (key === "order_note" && val === "") {
				val = null;
			}

			// Check if value exists and isn't undefined (allows 0, false, null or empty strings)
			if (val !== undefined) {
				fields.push(column);
				values.push(val);
			}
		}

		const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");

		const query = `
				INSERT INTO local_orders (${fields.join(", ")})
				VALUES (${placeholders})
				RETURNING order_id, order_status
			`;
		try {
			const res = await client.query(query, values);
			return res.rows[0];
		} catch (error) {
			db_order_error_handle(error);
		}
	},

	async fetchAndLockOrder(client, id) {
		const query = `
			SELECT * FROM local_orders
			WHERE order_id = $1 AND is_deleted = FALSE FOR NO KEY UPDATE;`;
		const res = await client.query(query, [id]);
		return res.rows[0];
	},

	async updateById(client, id, updateData) {
		const mapping = {
			customer_id: "customer_id",
			handler_id: "handler_id",
			closed_by: "closed_by",

			order_status: "order_status",

			order_start_date: "order_start_date",
			order_end_date: "order_end_date",
			planned_pickup_date: "planned_pickup_date",
			owed_due_date: "owed_due_date",

			payment_method: "payment_method",
			is_prepaid: "is_prepaid",
			paid_at: "paid_at",

			extra_cost: "extra_cost",

			discount: "discount",
			discount_type: "discount_type",

			order_note: "order_note",
		};

		let setClauses = [];
		let values = [];

		for (const [key, column] of Object.entries(mapping)) {
			let val = updateData[key];

			// Handle empty string to null for notes
			if (key === "order_note" && val === "") {
				val = null;
			}

			// Only for server side code, data from client side automatically gets validated for these columns to only be an ISO 8601 date
			if (
				(key === "paid_at" || key === "order_end_date") &&
				val === "now()"
			) {
				setClauses.push(`${column} = now()`);
				continue;
			}

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
		const idPlaceholder = `$${values.length}`;

		const sql = `
			UPDATE local_orders
			SET ${setClauses.join(", ")}
			WHERE order_id = ${idPlaceholder} AND is_deleted = FALSE
			RETURNING *
		`;
		try {
			const res = await client.query(sql, values);
			return res.rows[0];
		} catch (err) {
			db_order_error_handle(err);
		}
	},

	async softDeleteById(client, id) {
		const sql = `
			UPDATE local_orders
			SET is_deleted = TRUE
			WHERE order_id = $1 AND is_deleted = FALSE
			RETURNING 1
		`;
		const result = await client.query(sql, [id]);
		return result.rowCount > 0;
	},
};
