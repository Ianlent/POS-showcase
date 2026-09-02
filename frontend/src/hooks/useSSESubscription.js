import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { apiSlice } from "../features/api/apiSlice";

const baseURL = import.meta.env.VITE_API_BASE_URL || "";

export function useSSESubscription(clientId) {
	const dispatch = useDispatch();

	useEffect(() => {
		if (!clientId) return;

		// Ensure the endpoint path always starts with an absolute slash '/'
		const endpoint = `${baseURL.replace(/\/$/, "")}/api/events?clientId=${clientId}`;

		const eventSource = new EventSource(endpoint);

		eventSource.onopen = () => {
			console.log("SSE Stream successfully connected!");
		};

		eventSource.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (message.type === "update") {
				dispatch(
					apiSlice.util.invalidateTags([
						{ type: message.tag, id: message.id },
					]),
				);
			} else {
				dispatch(apiSlice.util.invalidateTags([message.tag]));
			}
		};

		eventSource.onerror = (err) => {
			console.error("SSE Error:", err);
		};

		return () => {
			console.log("Closing SSE connection");
			eventSource.close();
		};
	}, [clientId, dispatch]);
}
