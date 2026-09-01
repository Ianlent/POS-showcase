export function extractClientId(req, res, next) {
	req.clientId = req.headers["x-client-id"] || null;
	next();
}
