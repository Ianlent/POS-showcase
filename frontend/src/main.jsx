import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./app/store.js";

// Import StyleProvider from the official antd sub-package
import { StyleProvider } from "@ant-design/cssinjs";
import { ConfigProvider } from "antd";

import App from "./App.jsx";
import "./index.css";

const root = createRoot(document.getElementById("root"));
root.render(
	<React.StrictMode>
		<Provider store={store}>
			<StyleProvider layer>
				<ConfigProvider
					theme={{
						token: {
							// Base body font size (Default is 14px)
							fontSize: 16,

							// Headings
							fontSizeHeading1: 38,
							fontSizeHeading2: 30,
							fontSizeHeading3: 24,
							fontSizeHeading4: 20,
							fontSizeHeading5: 18,

							// AntD Control sizes (Buttons, Inputs, Selects)
							fontSizeSM: 14,
							fontSizeLG: 18,
							controlHeight: 40, // Increases default input/button height to match larger text
						},
						components: {
							Tabs: {
								titleFontSize: 16,
							},
							Form: {
								labelFontSize: 15,
							},
							Button: {
								contentFontSize: 16,
							},
						},
					}}
				>
					<BrowserRouter>
						<App />
					</BrowserRouter>
				</ConfigProvider>
			</StyleProvider>
		</Provider>
	</React.StrictMode>,
);
