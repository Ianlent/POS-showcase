import responseHandler from "../utils/response.handler.js";
import handleCursor from "../utils/handleCursor.js";
import { SpendingService } from "../services/spendingService.js";

export const getAllTickets = async (req, res, next) => {
	try {
		const { start, end, next_page, limit = 5, ...otherFilters } = req.query;
		const { cursorValue, cursorId } = handleCursor.decodeCursor(next_page);
		const result = await SpendingService.getAll({
			cursorId,
			cursorValue,
			limit,
			start,
			end,
			...otherFilters,
		});
		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

export const createTicket = async (req, res, next) => {
	try {
		const { clientId, user, idempotencyKey } = req;
		const user_id = user.user_id;
		const { amount, is_expense, reason, ticket_date } = req.body;
		const result = await SpendingService.create(
			{
				amount,
				is_expense,
				reason,
				ticket_date,
				user_id,
			},
			idempotencyKey,
		);
		return responseHandler.created(res, result);
	} catch (err) {
		next(err);
	}
};

export const updateTicketByID = async (req, res, next) => {
	try {
		const { clientId } = req;
		const { id } = req.params;
		const { amount, ticket_date, is_expense, reason } = req.body;
		const result = await SpendingService.update(
			id,
			{
				amount,
				ticket_date,
				is_expense,
				reason,
			},
			clientId,
		);

		return responseHandler.ok(res, result);
	} catch (err) {
		next(err);
	}
};

export const deleteTicketByID = async (req, res, next) => {
	const { clientId } = req;
	try {
		const { id } = req.params;
		await SpendingService.remove(id, clientId);
		return responseHandler.noContent(res);
	} catch (err) {
		next(err);
	}
};
