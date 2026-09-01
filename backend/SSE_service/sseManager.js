const clients = new Map(); // Store active response objects: clientId -> res

const transformPayload = (data) => {
	const TAG_MAP = {
		customers: "Customer",
		users: "User",
		local_services: "Service",
		local_orders: "Order",
		local_spending_tickets: "Spending",
	};

	const EVENT_MAP = {
		UPDATE: "update",
		INSERT: "create",
	};
	const tagType = TAG_MAP[data.table];
	const eventType = EVENT_MAP[data.action];
	if (!tagType) return null;

	return {
		type: eventType,
		tag: tagType,
		id: data.row_id,
	};
};

const addClient = (clientId, res) => {
	clients.set(clientId, res);
	console.log(
		`Client connected to SSE: ${clientId} (Total: ${clients.size})`,
	);
};

const removeClient = (clientId) => {
	clients.delete(clientId);
	console.log(
		`Client disconnected from SSE: ${clientId} (Total: ${clients.size})`,
	);
};

const broadcast = (data, excludeClientId = null) => {
	// payload structure:
	// data: {
	// action: "UPDATE",
	// row_id: "019fd173-14aa-7492-af1d-88588ec9b03a",
	// table: "customers",
	// }
	const transformedData = transformPayload(data);

	const payload = `data: ${JSON.stringify(transformedData)}\n\n`;
	for (const [id, res] of clients.entries()) {
		if (id === excludeClientId) continue; // Skip sender

		res.write(payload);
	}
};

export default { addClient, removeClient, broadcast };
