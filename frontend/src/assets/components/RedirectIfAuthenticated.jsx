import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const RedirectIfAuthenticated = ({ children }) => {
	const { isAuthenticated, user } = useSelector((state) => state.auth);

	if (isAuthenticated && user) {
		const role = user.user_role;
		const user_id = user.user_id;
		let redirectPath = "/";
		if (role === "admin") {
			redirectPath =
				localStorage.getItem("lastVisitedAdminPath") ||
				`/admin/${user_id}/dashboard`;
		} else if (role === "employee" || role === "manager") {
			redirectPath = "/employee/dashboard";
		}

		return (
			<Navigate
				to={redirectPath}
				replace
			/>
		);
	}

	return <>{children}</>;
};

export default RedirectIfAuthenticated;
