import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { apiSlice } from "../features/api/apiSlice";

const baseURL = import.meta.env.VITE_API_BASE_URL;

export function useSSESubscription(clientId) {
	const dispatch = useDispatch();

	useEffect(() => {
		if (!clientId) return;

		// SINGLE SSE Connection for the entire app
		const eventSource = new EventSource(
			`${baseURL}/api/events?clientId=${clientId}`,
		);

		eventSource.onopen = () => {
			console.log("SSE Stream successfully connected!");
		};

		eventSource.onmessage = (event) => {
			const message = JSON.parse(event.data);
			// message structure:
			// {tag: 'Customer', id: '019fd173-14aa-7492-af1d-88588ec9b03a', type: 'update'}
			if (message.type === "update") {
				dispatch(
					apiSlice.util.invalidateTags([
						{ type: message.tag, id: message.id },
					]),
				);
			} else {
				// handle creation of new objects
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
