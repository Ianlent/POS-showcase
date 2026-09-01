import { Suspense, lazy } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import "./App.css";

//hook
import { useSSESubscription } from "./hooks/useSSESubscription.js";
import { useSelector } from "react-redux";

import Loading from "./assets/components/Loading.jsx";

// Protected Route Components
import ProtectedRoute from "./assets/components/ProtectedRoute.jsx";
import RedirectIfAuthenticated from "./assets/components/RedirectIfAuthenticated.jsx";

// Lazy Imports
const LoginPage = lazy(() => import("./features/auth/Login.jsx"));
const UnauthorizedPage = lazy(() => import("./assets/pages/Unauthorized.jsx"));
const NotFound = lazy(() => import("./assets/pages/NotFound.jsx"));

// Layouts
const Layout = lazy(() => import("./assets/components/Layout.jsx"));

// Admin Features
const AdminDashboard = lazy(() => import("./features/Dashboard/Dashboard.jsx"));
const UsersManagement = lazy(
	() => import("./features/UsersManagement/UsersManagement.jsx"),
);
const CustomerManagement = lazy(
	() => import("./features/CustomerManagement/CustomerManagement.jsx"),
);
const ServiceManagementPage = lazy(
	() => import("./features/ServiceManagement/ServiceManagement.jsx"),
);
const FinancialManagement = lazy(
	() => import("./features/FinancialManagement/FinancialManagement.jsx"),
);
const OrderHistory = lazy(
	() => import("./features/OrderManagement/OrderHistory/OrderHistory.jsx"),
);

const OrderCreation = lazy(
	() => import("./features/OrderManagement/OrderCreation/OrderCreation.jsx"),
);

const App = () => {
	const { clientId, user } = useSelector((state) => state.auth);

	// Safely extract user_id using optional chaining
	const user_id = user?.user_id;
	console.log(`Current Client ID: ${clientId}`);

	useSSESubscription(clientId);

	return (
		<Suspense fallback={<Loading />}>
			<Routes>
				{/* Public Routes - redirect authenticated users */}
				<Route
					path="/"
					element={
						<RedirectIfAuthenticated>
							<LoginPage />
						</RedirectIfAuthenticated>
					}
				/>
				<Route
					path="/login"
					element={
						<RedirectIfAuthenticated>
							<LoginPage />
						</RedirectIfAuthenticated>
					}
				/>

				{/* Admin Routes - Render only if user_id exists, otherwise skip to prevent errors */}
				{user_id && (
					<Route
						path={`/admin/${user_id}`}
						element={
							<ProtectedRoute allowedRoles={["admin"]}>
								<Layout />
							</ProtectedRoute>
						}
					>
						<Route
							index
							element={
								<Navigate
									to="dashboard"
									replace
								/>
							}
						/>
						<Route
							path="dashboard"
							element={<AdminDashboard />}
						/>
						<Route
							path="users-management"
							element={<UsersManagement />}
						/>
						<Route
							path="customer-management"
							element={<CustomerManagement />}
						/>
						<Route
							path="service-management"
							element={<ServiceManagementPage />}
						/>
						<Route
							path="financial-management"
							element={<FinancialManagement />}
						/>
						<Route
							path="order-management"
							element={<OrderHistory />}
						/>
						<Route
							path="order-creation"
							element={<OrderCreation />}
						/>
					</Route>
				)}

				{/* Employee Routes - Render only if user_id exists */}
				{user_id && (
					<Route
						path={`/employee/${user_id}`}
						element={
							<ProtectedRoute
								allowedRoles={["employee", "manager", "admin"]}
							>
								<Layout />
							</ProtectedRoute>
						}
					>
						<Route
							index
							element={
								<Navigate
									to="dashboard"
									replace
								/>
							}
						/>
					</Route>
				)}

				<Route
					path="/unauthorized"
					element={<UnauthorizedPage />}
				/>
				<Route
					path="*"
					element={<NotFound />}
				/>
			</Routes>
		</Suspense>
	);
};

export default App;
