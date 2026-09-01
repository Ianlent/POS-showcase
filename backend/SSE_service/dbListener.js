import pg from "pg";
import dotenv from "dotenv";
import sseManager from "./sseManager.js";

dotenv.config();

const { Client } = pg;

const dbConfig = {
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	database: process.env.DB_NAME,
	options: `-c timezone=${process.env.TZ}`,
};

let listenClient = null;
let isReconnecting = false;

export async function startListener() {
	// Prevent concurrent reconnect loops
	if (isReconnecting) return;

	try {
		// 1. Create a fresh client instance every time
		listenClient = new Client(dbConfig);

		// 2. Attach connection error handler BEFORE connecting
		listenClient.on("error", async (err) => {
			console.error("Database listener error:", err.message);
			handleReconnect();
		});

		// 3. Handle notifications
		listenClient.on("notification", (msg) => {
			console.log(`Received on channel [${msg.channel}]:`, msg.payload);

			if (msg.payload) {
				try {
					const data = JSON.parse(msg.payload);
					// Expect payload structure: { senderId: "client_123", content: ... }
					const { senderId, ...content } = data;
					sseManager.broadcast(content, senderId);
				} catch (e) {
					console.log("Raw payload (not JSON):", msg.payload);
				}
			}
		});

		// 4. Connect and subscribe to channel(s)
		await listenClient.connect();
		console.log("Connected to PostgreSQL for LISTEN/NOTIFY.");

		await listenClient.query("LISTEN db_changes");
		isReconnecting = false; // Connection successful, reset state
	} catch (error) {
		console.error("Failed to connect listener:", error.message);
		handleReconnect(listenClient);
	}
}

async function handleReconnect() {
	if (isReconnecting) return;
	isReconnecting = true;

	console.log("Attempting to reconnect listener in 5 seconds...");

	// Safely clean up dead client
	if (listenClient) {
		listenClient.removeAllListeners(); // Prevent duplicate error callbacks
		try {
			await listenClient.end();
		} catch (e) {
			// Ignore cleanup errors on dead sockets
		}
	}

	setTimeout(() => {
		isReconnecting = false;
		startListener();
	}, 5000);
}
