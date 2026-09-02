import pool from "../db.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/generateToken.js";
import responseHandler from "../utils/response.handler.js";

// Authenticate and login user
export const login = async (req, res, next) => {
	try {
		const { user_phone, password } = req.body;

		// Fetch user with active status and not deleted
		const result = await pool.query(
			`SELECT
				user_id,
				user_name,
				user_role,
				password_hash
			FROM users
			WHERE user_phone = $1
				AND is_deleted = FALSE
				AND user_status = 'active'`,
			[user_phone],
		);

		if (!result.rows.length) {
			throw {
				type: "UNAUTHORIZED",
				message: "Invalid credentials.",
			};
		}

		const user = result.rows[0];
		const match = await bcrypt.compare(password, user.password_hash);
		if (!match) {
			throw {
				type: "UNAUTHORIZED",
				message: "Invalid credentials.",
			};
		}

		// Generate JWT
		const token = generateToken({
			user_id: user.user_id,
			user_role: user.user_role,
		});

		// Strip out information
		delete user.password_hash;

		return responseHandler.ok(res, {
			user,
			token,
		});
	} catch (err) {
		next(err);
	}
};
