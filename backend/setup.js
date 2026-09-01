import "dotenv/config";
import pool from "./db.js";
import bcrypt from "bcrypt";

const saltRounds = 10;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createAdmin = async () => {
	const admin = {
		user_name: "admin",
		user_role: "admin",
		phone_number: "0988888888",
		password: "password",
	};

	let connected = false;
	let retries = 30; // Attempt for up to ~2.5 minutes while mockdata loads

	// 1. Wait until Postgres is fully initialized and accepting queries
	while (!connected && retries > 0) {
		try {
			// Query to check if connection works AND table exists
			const check = await pool.query(
				`SELECT to_regclass('public.users') AS exists;`,
			);

			if (check.rows[0].exists) {
				connected = true;
			} else {
				console.log(
					"Postgres connected, waiting for schema creation...",
				);
			}
		} catch (err) {
			console.log(
				`Waiting for database TCP connection... (${err.code || err.message})`,
			);
		}

		if (!connected) {
			retries--;
			await sleep(5000); // Retry every 5 seconds
		}
	}

	if (!connected) {
		console.error("Failed to connect to database after maximum retries.");
		process.exit(1);
	}

	// 2. Perform the admin insertion once DB is ready
	try {
		const salt = await bcrypt.genSalt(saltRounds);
		const password_hash = await bcrypt.hash(admin.password, salt);

		const result = await pool.query(
			`INSERT INTO users (user_name, user_role, user_phone, password_hash)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT DO NOTHING
             RETURNING *`,
			[
				admin.user_name,
				admin.user_role,
				admin.phone_number,
				password_hash,
			],
		);

		if (result.rows.length > 0) {
			console.log(
				"Admin user created successfully:",
				result.rows[0].user_name,
			);
		} else {
			console.log("Admin user already exists.");
		}
	} catch (err) {
		console.error("Error creating admin:", err.message);
	} finally {
		await pool.end();
	}
};

createAdmin();
