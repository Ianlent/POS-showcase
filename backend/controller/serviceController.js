import { ServiceService } from "../services/serviceService.js";
import responseHandler from "../utils/response.handler.js";
import handleCursor from "../utils/handleCursor.js";

// GET all services with optional pagination
export const getAllServices = async (req, res, next) => {
	try {
		const { next_page, limit = 5, service_name } = req.query;
		const { cursorValue, cursorId } = handleCursor.decodeCursor(next_page);
		const services = await ServiceService.getServices({
			cursorId,
			cursorValue,
			limit,
			service_name,
		});
		return responseHandler.ok(res, services);
	} catch (err) {
		next(err);
	}
};

// CREATE a new service
export const createService = async (req, res, next) => {
	const { idempotencyKey, clientId } = req;
	try {
		const service = await ServiceService.createNewService(
			req.user.user_id,
			idempotencyKey,
			req.body,
			clientId,
		);
		return responseHandler.created(res, service);
	} catch (err) {
		next(err);
	}
};

// UPDATE a service by ID (partial)
export const updateServiceById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { service_name, service_unit, service_price_per_unit } = req.body;
		const { clientId } = req;

		const result = await ServiceService.updateService(
			id,
			{
				service_name,
				service_unit,
				service_price_per_unit,
			},
			clientId,
		);
		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

// DELETE (soft-delete) a service by ID
export const deleteServiceById = async (req, res, next) => {
	try {
		const { clientId } = req;
		const { id } = req.params;
		await ServiceService.removeService(id, clientId);
		return responseHandler.noContent(res);
	} catch (err) {
		next(err);
	}
};
