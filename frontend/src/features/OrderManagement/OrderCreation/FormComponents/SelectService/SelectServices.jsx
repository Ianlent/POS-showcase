import { Form, Button, InputNumber, Typography } from "antd";
import {
	PlusOutlined,
	DeleteOutlined,
	ShoppingCartOutlined,
	DollarOutlined,
} from "@ant-design/icons";
import ServiceItemSelector from "./ServiceItemSelector.jsx";
import { calc } from "antd/es/theme/internal.js";

const { Text } = Typography;

const SelectServices = ({ priceMap, onPriceDiscovered }) => {
	const servicesWatch = Form.useWatch("services") || [];
	const selectedIds = servicesWatch.map((s) => s?.service_id).filter(Boolean);

	return (
		<div className="h-[95%] flex flex-col justify-between">
			<div className="flex items-center gap-2 mb-4 shrink-0">
				<ShoppingCartOutlined className="text-indigo-500" />
				<Text className="font-bold text-slate-700 uppercase tracking-tight">
					Order Services
				</Text>
			</div>
			<Form.List
				name="services"
				rules={[
					{
						required: true,
						message: "Please add at least one service!",
					},
				]}
				/* Added flex-1 min-h-0 to contain the list */
				className="flex-1 min-h-0"
			>
				{(fields, { add, remove }) => (
					/* Added min-h-0 flex-1 */
					<div className="h-full min-h-0 flex flex-col justify-between">
						{/* Scrollable Container Wrapper */}
						<div className="flex-1 min-h-0 flex flex-col justify-between mb-4">
							{/* The actual scrollable list */}
							<div className="overflow-y-auto pr-1 flex-1 min-h-0 mb-4">
								{fields.map(({ key, name, ...restField }) => (
									<div
										key={key}
										className="relative bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-3 transition-all hover:border-indigo-300"
									>
										<div className="grid grid-cols-12 gap-4 items-center">
											<div className="col-span-12 md:col-span-6">
												<ServiceItemSelector
													name={name}
													restField={restField}
													selectedIds={selectedIds}
													onPriceDiscovered={
														onPriceDiscovered
													}
												/>
											</div>

											<div className="col-span-5 md:col-span-2">
												<Form.Item
													{...restField}
													name={[
														name,
														"number_of_unit",
													]}
													rules={[
														{
															required: true,
															message: "Required",
														},
													]}
													noStyle
												>
													<InputNumber
														min={1}
														size="large"
														className="w-full rounded-md"
														addonBefore={
															<span className="text-xs">
																QTY
															</span>
														}
													/>
												</Form.Item>
											</div>

											{/* ROW SUBTOTAL */}
											<div className="col-span-5 md:col-span-3 flex items-center justify-end h-10">
												<Form.Item
													noStyle
													shouldUpdate
												>
													{({ getFieldValue }) => {
														const serviceId =
															getFieldValue([
																"services",
																name,
																"service_id",
															]);
														const qty =
															getFieldValue([
																"services",
																name,
																"number_of_unit",
															]) || 0;
														const price =
															priceMap[
																serviceId
															] || 0;
														const subtotal =
															price * qty;

														return (
															<div className="text-right">
																<Text className="text-center text-2xl p-0 font-mono font-bold text-emerald-600">
																	{new Intl.NumberFormat(
																		"vi-VN",
																		{
																			style: "currency",
																			currency:
																				"VND",
																		},
																	).format(
																		subtotal *
																			1000,
																	)}
																</Text>
															</div>
														);
													}}
												</Form.Item>
											</div>

											<div className="col-span-2 md:col-span-1 flex justify-end">
												<Button
													type="text"
													size="large"
													className="text-slate-300 hover:text-red-500 hover:bg-red-50"
													onClick={() => remove(name)}
													icon={<DeleteOutlined />}
												/>
											</div>
										</div>
									</div>
								))}
							</div>

							{/* Add Button pinned below the scroll list */}
							<Button
								type="dashed"
								onClick={() => add({ number_of_unit: 1 })}
								block
								size="large"
								icon={<PlusOutlined />}
								className="h-12 border-2 border-indigo-100 text-indigo-500 hover:text-indigo-600 hover:border-indigo-300 rounded-xl shrink-0"
							>
								Add Service Line Item
							</Button>
						</div>

						{/* GRAND TOTAL SECTION (Pinned at bottom) */}
						<div className="bg-slate-900 p-4 rounded-xl flex justify-between items-center shadow-lg shadow-slate-200 shrink-0">
							<div className="flex items-center gap-2 text-white">
								<DollarOutlined className="text-emerald-400" />
								<Text className="text-white uppercase text-sm font-bold tracking-widest">
									Total Amount
								</Text>
							</div>
							<Form.Item
								noStyle
								shouldUpdate
							>
								{({ getFieldValue }) => {
									const services =
										getFieldValue("services") || [];
									const grandTotal = services.reduce(
										(acc, curr) => {
											const price =
												priceMap[curr?.service_id] || 0;
											const qty =
												curr?.number_of_unit || 0;
											return acc + price * qty;
										},
										0,
									);

									return (
										<Text className="text-2xl font-mono font-black text-white">
											{new Intl.NumberFormat("vi-VN", {
												style: "currency",
												currency: "VND",
											}).format(grandTotal * 1000)}
										</Text>
									);
								}}
							</Form.Item>
						</div>
					</div>
				)}
			</Form.List>
		</div>
	);
};

export default SelectServices;
