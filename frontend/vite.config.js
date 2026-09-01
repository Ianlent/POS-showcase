import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss()
	]
	// server: {
	// 	host: true, // Listen on all local IPs within the container
	// 	port: 5173,
	// 	// watch: {
	// 	// usePolling: true, // Often required for Docker to pick up file changes on some filesystems
	// 	// },
	// 	hmr: {
	// 	clientPort: 5173, // Ensures the browser talks to the correct port for live updates
	// 	},
	// },
});