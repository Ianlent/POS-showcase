import responseHandler from "../../utils/response.handler.js";

// allowedRoles is an array
const authorizeRoles = (allowedRoles) => {
	return (req, res, next) => {
		const userRole = req.user?.user_role;
		if (!userRole || !allowedRoles.includes(userRole)) {
			throw {
				type: "FORBIDDEN",
				message: "Access denied",
			};
		}
		next();
	};
};

export default authorizeRoles;
