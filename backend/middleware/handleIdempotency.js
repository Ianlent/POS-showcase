import crypto from "crypto";
import responseHandler from "../utils/response.handler.js";
import { validate as isValidUUID } from "uuid";
import { IdempotencyRepository } from "../repositories/idempotencyRepository.js";
import { type } from "os";

function generateRequestHash(req) {
	// Hash Method + Path + Body to ensure the intent is identical
	const data = JSON.stringify({
		method: req.method,
		path: req.path,
		body: req.body,
	});
	return crypto.createHash("sha256").update(data).digest("hex");
}

export const handleIdempotency = async (req, res, next) => {
	const key = req.headers["idempotency-key"];
	const userId = req.user.user_id;

	if (!key) {
		if (["POST", "PATCH"].includes(req.method)) {
			throw {
				type: "BAD_REQUEST",
				message: "Missing idempotency key",
			};
		}
		return next();
	}

	if (!isValidUUID(key)) {
		throw {
			type: "UNPROCESSABLE",
			message: "Invalid idempotency key",
		};
	}

	const hash = generateRequestHash(req);

	try {
		const record = await IdempotencyRepository.findOrCreateKey(
			key,
			userId,
			hash,
		);

		if (!record) {
			throw {
				type: "CONFLICT",
				message: "Request in progress or key locked",
			};
		}

		if (record.request_hash !== hash) {
			throw {
				type: "UNPROCESSABLE",
				message:
					"This key was previously used with a different request body",
				details: "Idempotency Key reuse error",
			};
		}

		if (record.status === "completed" || record.status === "failed") {
			return res.status(record.response_code).json(record.response_body);
		}

		// Attach key to request so the controller knows which record to update later
		req.idempotencyKey = key;
		next();
	} catch (err) {
		next(err);
	}
};
