import responseHandler from "../utils/response.handler.js";
import sseManager from "./sseManager.js";

export const handleSubscribeClients = async (req, res, next) => {
	try {
		// Client provides its own ID
		const clientId = req.query.clientId;

		if (!clientId) {
			throw {
				type: "BAD_REQUEST",
				message: "clientId query param is required",
			};
		}

		// Set standard SSE headers
		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.flushHeaders();

		// Send initial client identifier back to client
		res.write(
			`data: ${JSON.stringify({ type: "CONNECTED", clientId })}\n\n`,
		);

		sseManager.addClient(clientId, res);

		// Clean up when client disconnects
		req.on("close", () => {
			res.end();
			sseManager.removeClient(clientId);
		});
	} catch (err) {
		next(err);
	}
};
