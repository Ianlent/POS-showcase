import jwt from "jsonwebtoken";
import responseHandler from "../../utils/response.handler.js";

const authenticateAccessToken = (req, res, next) => {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

	if (!token) {
		throw {
			type: "UNAUTHORIZED",
			message: "No token provided",
		};
	}

	jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
		if (err) {
			throw {
				type: "UNAUTHORIZED",
				message: "Invalid token",
			};
		}

		req.user = user; // Attach decoded user to request
		next();
	});
};

export default authenticateAccessToken;
