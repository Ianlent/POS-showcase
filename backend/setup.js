import "dotenv/config";
import pool from "./db.js";
import bcrypt from "bcrypt";

const saltRounds = 10;

const createAdmin = async () => {
	try {
		const admin = {
			user_name: "admin",
			user_role: "admin",
			phone_number: "0988888888",
			password: "password",
		};

		const salt = await bcrypt.genSalt(saltRounds);
		const password_hash = await bcrypt.hash(admin.password, salt);

		const result = await pool.query(
			`INSERT INTO users (user_name, user_role, user_phone, password_hash)
                VALUES ($1, $2, $3, $4)
			ON CONFLICT DO NOTHING
            RETURNING *`, // Shortened for clarity
			[
				admin.user_name,
				admin.user_role,
				admin.phone_number,
				password_hash,
			],
		);

		console.log("Admin created:", result.rows[0]);
		console.log("Login details:");
		console.log(
			`
{
	"user_phone": "${result.rows[0].user_phone}",
	"password": "${admin.password}"
}`,
		);
	} catch (err) {
		console.error("Error creating admin:", err.message);
	} finally {
		await pool.end();
	}
};

createAdmin();
