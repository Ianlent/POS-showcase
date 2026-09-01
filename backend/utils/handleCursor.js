const encodeCursor = (value, id) => {
	if (!value || !id) return null;
	// We use a delimiter that won't appear in UUIDs
	const str = `${value}|${id}`;
	return Buffer.from(str).toString("base64");
};

const decodeCursor = (token) => {
	if (!token) return { cursorValue: null, cursorId: null };
	const str = Buffer.from(token, "base64").toString("utf-8");
	const [cursorValue, cursorId] = str.split("|");
	return { cursorValue, cursorId };
};

export default { encodeCursor, decodeCursor };
