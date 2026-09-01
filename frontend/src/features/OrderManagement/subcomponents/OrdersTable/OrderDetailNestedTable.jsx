import { Table, Tag, Spin, Empty } from "antd";
import {
	UserOutlined,
	ShopOutlined,
	InfoCircleOutlined,
	CalendarOutlined,
} from "@ant-design/icons";
import { useGetOrderDetailsQuery } from "../../ordersApiSlice.js";

const OrderDetailNestedFragment = ({ id }) => {
	const { data, isLoading, isFetching } = useGetOrderDetailsQuery({
		order_id: id,
	});

	console.log(data);
	if (isLoading || isFetching)
		return (
			<div className="p-6 text-center">
				<Spin />
			</div>
		);
	if (!data)
		return (
			<div className="p-6">
				<Empty description="No details found" />
			</div>
		);

	const {
		customer,
		handler,
		closer,
		order_status,
		order_start_date,
		planned_pickup_date,
		payment_method,
		is_prepaid,
		paid_at,
		discount,
		discount_type,
		extra_cost,
		total_service_cost,
		total_cost,
		order_note,
		services,
	} = data;

	const formatCurrency = (val) =>
		new Intl.NumberFormat("vi-VN", {
			style: "currency",
			currency: "VND",
		}).format((val || 0) * 1000);

	const serviceColumns = [
		{
			title: "Service Name",
			dataIndex: "name",
			key: "name",
			render: (text) => (
				<span className="font-semibold text-slate-800 text-lg">
					{text}
				</span>
			),
		},
		{
			title: "Type",
			dataIndex: "type",
			key: "type",
			align: "center",
			render: (type) => (
				<Tag className="uppercase m-0 px-2 py-0.5">{type}</Tag>
			),
		},
		{
			title: "Units",
			dataIndex: "units",
			key: "units",
			align: "center",
			className: "text-slate-600 text-lg",
		},
		{
			title: "Unit Price",
			dataIndex: "price_per_unit",
			key: "price_per_unit",
			align: "right",
			render: (unit_price) => (
				<span className="font-mono text-slate-600 text-xl">
					{formatCurrency(unit_price)}
				</span>
			),
		},
		{
			title: "Total",
			dataIndex: "cost",
			key: "cost",
			align: "right",
			render: (total_cost) => (
				<span className="font-mono font-bold text-slate-900 text-2xl">
					{formatCurrency(total_cost)}
				</span>
			),
		},
	];

	return (
		<div className="bg-slate-50/80 p-5 border-y border-slate-200 space-y-6">
			{/* Top Grid: Customer, Handler/Closer, Timeline & Meta */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
				{/* Customer Section */}
				<section className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
					<div>
						<div className="flex items-center gap-2 mb-3 text-indigo-600 font-bold text-lg uppercase tracking-wider">
							<UserOutlined className="text-md" /> Customer Info
						</div>
						<div className="space-y-2.5 text-slate-700">
							<div className="flex justify-between border-b border-slate-50 pb-1.5">
								<span className="text-lg text-slate-400">
									Name
								</span>
								<span className="text-lg font-semibold text-slate-900">
									{customer?.name || "N/A"}
								</span>
							</div>
							<div className="flex justify-between border-b border-slate-50 pb-1.5">
								<span className="text-lg text-slate-400">
									Phone
								</span>
								<span className="font-mono text-lg">
									{customer?.phone || "N/A"}
								</span>
							</div>
							<div className="pt-1">
								<span className="text-slate-400 block text-lg mb-0.5">
									Delivery Address
								</span>
								<span className="text-slate-800 leading-relaxed text-lg">
									{customer?.address || "N/A"}
								</span>
							</div>
						</div>
					</div>
				</section>

				{/* Staff Section (Handler & Closer) */}
				<section className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4 flex flex-col justify-between">
					<div>
						<div className="flex items-center gap-2 mb-2 text-emerald-600 font-bold text-lg uppercase tracking-wider">
							<ShopOutlined className="" /> Assigned Handler
						</div>
						<div className="flex justify-between text-slate-700">
							<span className="text-lg font-semibold text-slate-900">
								{handler?.name || "N/A"}
							</span>
							<Tag
								color="default"
								className="m-0 uppercase px-2 py-0.5 text-sm"
							>
								{handler?.role || "Staff"}
							</Tag>
						</div>
					</div>

					{closer?.name && (
						<div className="border-t border-slate-100 pt-3">
							<div className="flex items-center gap-2 mb-1 text-slate-500 font-bold text-md uppercase tracking-wider">
								Closed By
							</div>
							<div className="flex justify-between text-slate-700">
								<span className="font-semibold text-slate-900 text-lg">
									{closer.name}
								</span>
								<span className="text-lg font-mono text-slate-500">
									{closer.phone}
								</span>
							</div>
						</div>
					)}

					<div className="border-t border-slate-100 pt-3 text-slate-500 text-xl flex items-center justify-between">
						<span className="">Status:</span>
						<span className="font-bold uppercase text-slate-900">
							{order_status}
						</span>
					</div>
				</section>

				{/* Timeline & Payment Meta */}
				<section className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
					<div>
						<div className="flex items-center gap-2 mb-3 text-blue-600 font-bold text-xl uppercase tracking-wider">
							<CalendarOutlined className="text-md" /> Timeline &
							Payment
						</div>
						<div className="space-y-2.5 text-sm text-slate-700">
							<div className="text-lg flex justify-between">
								<span className="text-slate-400">
									Ordered At:
								</span>
								<span className="text-slate-800">
									{order_start_date
										? new Date(
												order_start_date,
											).toLocaleString("vi-VN")
										: "N/A"}
								</span>
							</div>
							<div className="text-lg flex justify-between">
								<span className="text-slate-400">
									Planned Pickup:
								</span>
								<span className="font-semibold text-slate-800">
									{planned_pickup_date
										? new Date(
												planned_pickup_date,
											).toLocaleString("vi-VN")
										: "Not scheduled"}
								</span>
							</div>
							<div className="text-lg flex justify-between border-t border-slate-50 pt-2">
								<span className="text-slate-400">
									Payment Method:
								</span>
								<span className="font-semibold uppercase text-slate-800">
									{payment_method || "Unpaid"}
								</span>
							</div>
							<div className="text-lg flex justify-between items-center">
								<span className="text-slate-400">
									Payment State:
								</span>
								{is_prepaid ? (
									<Tag
										color="success"
										className="text-lg m-0 px-2 py-0.5"
									>
										Prepaid
									</Tag>
								) : paid_at ? (
									<Tag
										color="processing"
										className="text-lg m-0 px-2 py-0.5"
									>
										Paid
									</Tag>
								) : (
									<Tag
										color="warning"
										className="text-lg m-0 px-2 py-0.5"
									>
										Unpaid
									</Tag>
								)}
							</div>
						</div>
					</div>
				</section>
			</div>

			{/* Middle Row: Note & Cost Summary Calculation Bar */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
				{/* Note Block */}
				<div className="lg:col-span-2 bg-amber-50/60 p-4 rounded-lg border border-amber-100">
					<div className="flex items-center gap-2 mb-1.5 text-amber-700 font-bold text-lg uppercase tracking-wider">
						<InfoCircleOutlined className="text-sm" /> Order Note
					</div>
					<p className="text-md text-amber-900/90 italic m-0 leading-relaxed">
						{order_note ||
							"No specific instructions provided for this order."}
					</p>
				</div>

				{/* Calculation Breakdown */}
				<div className="space-y-2 text-lg text-slate-700 border-l lg:border-l-slate-100 lg:pl-4">
					<div className="flex justify-between text-xl font-bold">
						<span>Services Subtotal:</span>
						<span className="font-mono text-slate-800">
							{formatCurrency(total_service_cost)}
						</span>
					</div>
					<div className="flex justify-between">
						<span>Extra Cost:</span>
						<span className="font-mono text-emerald-600">
							+{formatCurrency(extra_cost)}
						</span>
					</div>
					<div className="flex justify-between">
						<span>Discount:</span>
						<span className="font-mono text-rose-500">
							-
							{discount_type === "percentage"
								? `${discount}%`
								: formatCurrency(discount)}
						</span>
					</div>
					<div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
						<span className="text-xl font-bold text-slate-900">
							Final Total:
						</span>
						<span className="text-xl font-black text-indigo-600 font-mono">
							{formatCurrency(total_cost)}
						</span>
					</div>
				</div>
			</div>

			{/* Services Table */}
			<div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white">
				<Table
					dataSource={services || []}
					rowKey="service_id"
					columns={serviceColumns}
					pagination={false}
					size="middle"
				/>
			</div>
		</div>
	);
};

export default OrderDetailNestedFragment;
