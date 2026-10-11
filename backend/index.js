import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { startListener } from "./SSE_service/dbListener.js";

//middleware /////////////////////////////////////////////////////////
import authenticateAccessToken from "./middleware/auth/authenticateAccessToken.js";
import { extractClientId } from "./middleware/clientId.js";
import globalErrorHandler from "./utils/errorHandler.js";

//routes //////////////////////////////////
import events from "./routes/sse.js";
import auth from "./routes/auth.js";
import users from "./routes/users.js";
import customers from "./routes/customers.js";
import spendings from "./routes/spendings.js";
import services from "./routes/services.js";
import orders from "./routes/order.js";
///////////////////////////////////////////
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

//documentation
if (process.env.NODE_ENV !== "production") {
	const docsApp = express();
	const DOCS_PORT = process.env.DOCS_PORT || 8080;
	const swaggerUiAssetPath = path.join(__dirname, "docs");

	docsApp.use(cors());

	docsApp.use("/", express.static(swaggerUiAssetPath));
	docsApp.get("/swagger.yaml", (req, res) => {
		res.sendFile(path.join(__dirname, "swagger.yaml"));
	});

	docsApp.listen(DOCS_PORT, () => {
		console.log(`📖 Docs: http://localhost:${DOCS_PORT}`);
	});
}

// App
const app = express();
const APP_PORT = process.env.APP_PORT || 5000;

const allowedOrigins = [
	"http://localhost:5173",
	"http://127.0.0.1:5173",
	"http://localhost:3000",
	"http://127.0.0.1:3000",
];

app.use(
	cors({
		origin: function (origin, callback) {
			// Allow requests with no origin (like mobile apps or curl requests)
			if (!origin) return callback(null, true);

			if (allowedOrigins.indexOf(origin) !== -1) {
				callback(null, true);
			} else {
				callback(new Error("Not allowed by CORS"));
			}
		},
		credentials: true, // Allow cookies if needed
	}),
);

app.use(express.json());
app.use(extractClientId);

// SSE Endpoint for clients to subscribe
app.use("/api/events", events);

//Auth entry point
app.use("/auth", auth);

//protected routes
//authorization handled seperately in route for finer control
app.use(authenticateAccessToken);
app.use("/api/users", users);
app.use("/api/customers", customers);
app.use("/api/spendings", spendings);
app.use("/api/services", services);
app.use("/api/orders", orders);

//global error handler
app.use(globalErrorHandler);

app.listen(APP_PORT, () => {
	startListener();
	console.log(`Backend running on http://localhost:${APP_PORT}`);
});
