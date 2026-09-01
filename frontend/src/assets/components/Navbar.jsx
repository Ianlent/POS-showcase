import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faHouse,
	faUsersGear,
	faUsersViewfinder,
	faHandHoldingDollar,
	faArrowRightFromBracket,
	faListCheck,
	faCheckToSlot,
	faSquarePlus,
	faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { message } from "antd";
import { useDispatch } from "react-redux";
import { logout } from "../../features/auth/authSlice.js";

const Topbar = ({ user }) => {
	const [isOpen, setIsOpen] = useState(false);
	const location = useLocation();

	const barData = {
		admin: [
			{
				icon: faHouse,
				text: "Dashboard",
				linkTo: "dashboard",
				isActive:
					location.pathname === `/admin/${user?.user_id}/dashboard`,
			},
			{
				icon: faUsersGear,
				text: "Users Management",
				linkTo: "users-management",
				isActive:
					location.pathname ===
					`/admin/${user?.user_id}/users-management`,
			},
			{
				icon: faUsersViewfinder,
				text: "Customer Management",
				linkTo: "customer-management",
				isActive:
					location.pathname ===
					`/admin/${user?.user_id}/customer-management`,
			},
			{
				icon: faCheckToSlot,
				text: "Services Management",
				linkTo: "service-management",
				isActive:
					location.pathname ===
					`/admin/${user?.user_id}/service-management`,
			},
			{
				icon: faHandHoldingDollar,
				text: "Financial Management",
				linkTo: "financial-management",
				isActive:
					location.pathname ===
					`/admin/${user?.user_id}/financial-management`,
			},
			{
				icon: faListCheck,
				text: "Order Management",
				linkTo: "order-management",
				isActive:
					location.pathname ===
					`/admin/${user?.user_id}/order-management`,
			},
			{
				icon: faSquarePlus,
				text: "Create Orders",
				linkTo: "order-creation",
				isActive:
					location.pathname ===
					`/admin/${user?.user_id}/order-creation`,
			},
			{
				icon: faArrowRightFromBracket,
				text: "Logout",
				linkTo: "/logout",
			},
		],
	};

	const currentData = barData[user.user_role];

	return (
		<div
			className="w-full fixed top-0 left-0 z-50 bg-gradient-to-r from-[#091D34] via-[#0d2744] to-[#091D34] text-white shadow-xl border-b border-white/10 backdrop-blur-md"
			onMouseEnter={() => setIsOpen(true)}
			onMouseLeave={() => setIsOpen(false)}
		>
			{/* Main Top Bar Header */}
			<div className="h-16 px-6 flex items-center justify-between cursor-pointer">
				<div className="flex items-center space-x-2 text-sm text-slate-300 font-medium bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
					<span>Menu</span>
					<FontAwesomeIcon
						icon={faChevronDown}
						className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
					/>
				</div>
				<div className="flex items-center space-x-3">
					<span className="font-bold tracking-wider text-base bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
						{user.user_name
							? user.user_name.toUpperCase()
							: "PORTAL"}
					</span>
					<div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-extrabold text-sm shadow-inner tracking-wider">
						{user.user_name
							? user.user_name.charAt(0).toUpperCase()
							: "P"}
					</div>
				</div>
			</div>

			{/* Collapsible Dropdown Menu Content triggered on hover */}
			<div
				className={`transition-all duration-300 ease-in-out overflow-hidden bg-[#091D34]/95 backdrop-blur-xl border-t border-white/5 shadow-2xl ${isOpen ? "max-h-[85vh] py-4" : "max-h-0 py-0"}`}
			>
				<div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
					{currentData.map((item, index) => (
						<TopbarLink
							key={index}
							{...item}
							onClick={() => setIsOpen(false)}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

const TopbarLink = ({ icon, text, linkTo, isActive, onClick }) => {
	const navigate = useNavigate();
	const dispatch = useDispatch();

	const redirect = async () => {
		try {
			if (linkTo === "/logout") {
				dispatch(logout());
				window.location.replace("/login");
			} else {
				navigate(linkTo);
			}
			if (onClick) onClick();
		} catch (error) {
			message.error("An error occurred during navigation or logout.");
			console.error("Logout/Navigation error:", error);
		}
	};

	const isLogout = linkTo === "/logout";

	return (
		<div
			className={`cursor-pointer px-4 py-3 rounded-xl text-left transition-all duration-200 flex flex-row items-center whitespace-nowrap border border-transparent group ${
				isLogout
					? "bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400 hover:text-red-300 sm:col-span-full lg:col-span-1"
					: isActive
						? "bg-indigo-600/30 border-indigo-500/50 text-white shadow-md shadow-indigo-500/10"
						: "bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-slate-300 hover:text-white"
			}`}
			onClick={redirect}
		>
			<div
				className={`flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-colors ${isLogout ? "bg-red-500/20 text-red-400 group-hover:bg-red-500/30" : isActive ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-300 group-hover:bg-white/20 group-hover:text-white"}`}
			>
				<FontAwesomeIcon
					icon={icon}
					className="text-sm"
				/>
			</div>
			<span className="text-sm font-medium tracking-wide">{text}</span>
		</div>
	);
};

export default Topbar;
