import pool from "../db.js";
export const IdempotencyRepository = {
	async findOrCreateKey(key, userId, req_hash) {
		const query = `
		INSERT INTO idempotency_keys (idempotency_key, user_id, request_hash, status, locked_at)
		VALUES ($1, $2, $3, 'started', CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, idempotency_key) 
		DO
			UPDATE SET
				locked_at = EXCLUDED.locked_at,
				fence_token = idempotency_keys.fence_token + 1
			WHERE 
				idempotency_keys.status = 'started' 
				AND idempotency_keys.locked_at < (CURRENT_TIMESTAMP - INTERVAL '5 seconds')
		RETURNING *;
        `;
		const { rows } = await pool.query(query, [key, userId, req_hash]);
		return rows[0];
	},
	async updateSuccess(client, { key, userId, code, body, fence_token }) {
		const query = `
            UPDATE idempotency_keys
            SET status = 'completed', response_code = $1, response_body = $2
            WHERE idempotency_key = $3 AND user_id = $4 AND fence_token = $5
        `;
		const result = await client.query(query, [
			code,
			body,
			key,
			userId,
			fence_token,
		]);

		if (result.rowCount === 0) {
			throw {
				type: "CONFLICT",
				message: "Idempotency lock stolen due to execution delay",
			};
		}
	},
	async updateFailed({ key, userId, code, body, fence_token }) {
		const query = `
			UPDATE idempotency_keys
			SET status = 'failed', response_code = $1, response_body = $2
			WHERE idempotency_key = $3 AND user_id = $4 AND fence_token = $5
		`;
		await pool.query(query, [code, body, key, userId, fence_token]);
	},
	async clear(userId, key) {
		const query = `DELETE FROM idempotency_keys WHERE user_id = $1 AND idempotency_key = $2`;
		await pool.query(query, [userId, key]);
	},
};
