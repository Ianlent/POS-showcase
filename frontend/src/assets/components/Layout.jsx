import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, Suspense } from "react";
import { useSelector } from "react-redux"; // To get user role for validation
import Loading from "./Loading.jsx";

import Navbar from "./Navbar.jsx";

const AdminLayout = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const user = useSelector((state) => state.auth.user); // Get user from Redux for role validation

	// Effect to handle initial redirection based on last visited path
	useEffect(() => {
		if (location.pathname === "/admin") {
			const lastVisitedAdminPath = localStorage.getItem(
				"lastVisitedAdminPath",
			);

			if (
				lastVisitedAdminPath &&
				lastVisitedAdminPath.startsWith("/admin/") &&
				user?.user_role === "admin"
			) {
				navigate(lastVisitedAdminPath, { replace: true });
			} else {
				navigate("/admin/dashboard", { replace: true });
			}
		}
	}, [location.pathname, navigate, user]);

	useEffect(() => {
		if (
			location.pathname.startsWith("/admin/") &&
			location.pathname !== "/admin"
		) {
			localStorage.setItem("lastVisitedAdminPath", location.pathname);
		}
	}, [location.pathname]);

	return (
		<div className="flex flex-col h-screen overflow-hidden">
			<Navbar user={user} />
			<div className="flex-1 pt-16 overflow-y-auto">
				<Suspense fallback={<Loading />}>
					<Outlet />
				</Suspense>
			</div>
		</div>
	);
};

export default AdminLayout;
