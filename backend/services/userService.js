import pool from "../db.js";
import bcrypt from "bcrypt";
import { IdempotencyRepository } from "../repositories/idempotencyRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import handleCursor from "../utils/handleCursor.js";
const saltRounds = 10;

export const UserService = {
	async getUser(userId) {
		const user = await UserRepository.findUserDataById(userId);
		if (!user) {
			throw { type: "NOT_FOUND", message: "User not found" };
		}
		return user;
	},

	async getAllUsers(filters) {
		const {
			user_phone,
			user_name,
			limit,
			cursorId,
			cursorValue,
			is_only_employee = false,
		} = filters;
		const users = await UserRepository.fetchAllUsers({
			user_phone,
			user_name,
			cursorId,
			cursorValue,
			limit: parseInt(limit) + 1,
			is_only_employee,
		});

		const hasMore = users.length > limit;
		const results = hasMore ? users.slice(0, limit) : users;

		let nextPageToken = null;
		if (hasMore) {
			const lastItem = results[results.length - 1];
			const value = user_phone ? lastItem.user_phone : lastItem.user_name;
			nextPageToken = handleCursor.encodeCursor(value, lastItem.user_id);
		}
		return { results, next_page: nextPageToken };
	},

	async createNewUser(userId, idempotencyKey, newUserData, clientId) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			const { user_name, user_phone, user_role, password } = newUserData;
			// hashing password
			const salt = await bcrypt.genSalt(saltRounds);
			const password_hash = await bcrypt.hash(password, salt);

			// create new user
			const result = await UserRepository.createNewUser(client, {
				user_name,
				user_phone,
				password_hash,
				user_role,
			});

			// update idempotency status
			await IdempotencyRepository.updateSuccess(client, {
				key: idempotencyKey,
				userId,
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

	async updateUser(user_id, updateData, is_only_employee = false, clientId) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			if (!updateData || Object.keys(updateData).length === 0) {
				throw { type: "BAD_REQUEST", message: "No fields to update" };
			}
			const { user_name, user_phone, user_role, user_status, password } =
				updateData;
			// hashing password
			let password_hash = undefined;
			if (password) {
				const salt = await bcrypt.genSalt(saltRounds);
				password_hash = await bcrypt.hash(password, salt);
			}

			const updatedRecord = await UserRepository.updateUser(
				client,
				user_id,
				{
					user_name,
					user_phone,
					user_role,
					user_status,
					password_hash,
				},
				is_only_employee,
			);
			if (!updatedRecord) {
				throw { type: "NOT_FOUND", message: "User not found" };
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

	async removeUser(user_id, is_only_employee = false, clientId) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			await client.query(
				"SELECT set_config('app.current_client_id', $1, true)",
				[clientId || ""],
			);

			const deleted = await UserRepository.softDelete(
				client,
				user_id,
				is_only_employee,
			);
			if (!deleted) {
				throw {
					type: "NOT_FOUND",
					message: "User not found",
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
