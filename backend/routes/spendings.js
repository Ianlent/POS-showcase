import express from "express";

import { handleValidationErrors } from "../middleware/handleValidationErrors.js";
import {
	getAllTickets,
	createTicket,
	updateTicketByID,
	deleteTicketByID,
} from "../controller/spendingsController.js";
import {
	getTicketsValidation,
	createTicketValidation,
	updateTicketValidation,
	deleteTicketValidation,
} from "../middleware/validators/spendingsValidator.js";

//auth middleware /////////////////////////////////////////////////////////
import authorizeRoles from "../middleware/auth/authorizeRoles.js";
//////////////////////////////////////////////////////////////////////
import { handleIdempotency } from "../middleware/handleIdempotency.js";

const router = express.Router();

// POST
router.post(
	"/",
	handleIdempotency,
	createTicketValidation,
	handleValidationErrors,
	createTicket,
);

// GET
router.use(authorizeRoles(["admin", "manager"]));
router.get("/", getTicketsValidation, handleValidationErrors, getAllTickets); //?start=2025-04-01&end=2025-04-30

//admin only routes
router.use(authorizeRoles(["admin"]));
// PUT
router.patch(
	"/:id",
	updateTicketValidation,
	handleValidationErrors,
	updateTicketByID,
);

// DELETE
router.delete(
	"/:id",
	deleteTicketValidation,
	handleValidationErrors,
	deleteTicketByID,
);

export default router;
