import { useDispatch, useSelector } from "react-redux";
import { Tabs, Empty, Button } from "antd";
import { PlusOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import OrderFormWindow from "./OrderFormWindow.jsx";
import { setActiveKey, addTab, removeTab } from "../orderTabsSlice.js";

const OrderCreationTabManager = () => {
	const dispatch = useDispatch();
	const { activeKey, tabs } = useSelector((state) => state.orderTabs);

	const handleEdit = (targetKey, action) => {
		if (action === "add") {
			dispatch(addTab());
		} else {
			dispatch(removeTab(targetKey));
		}
	};

	const tabItems = tabs.map((tab) => ({
		label: tab.label,
		key: tab.id,
		closable: true,
		children: (
			<OrderFormWindow
				tabId={tab.id}
				onClose={() => dispatch(removeTab(tab.id))}
			/>
		),
	}));

	const renderEmptyState = () => (
		<div className="h-full w-full flex items-center justify-center bg-slate-50 border-l border-slate-200">
			<Empty
				image={
					<div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl">
						<ShoppingCartOutlined />
					</div>
				}
				imageStyle={{ height: 60 }}
				description={
					<div className="space-y-1">
						<p className="text-base font-medium text-slate-700">
							No open orders
						</p>
						<p className="text-sm text-slate-400">
							Create a new order tab to start processing
							transactions.
						</p>
					</div>
				}
			>
				<Button
					type="primary"
					icon={<PlusOutlined />}
					onClick={() => dispatch(addTab())}
					size="large"
					className="bg-indigo-600 hover:bg-indigo-700 mt-2 rounded-xl"
				>
					Create New Order
				</Button>
			</Empty>
		</div>
	);

	return (
		<div className="h-full w-full bg-slate-100 flex">
			{tabs.length > 0 ? (
				<Tabs
					tabPosition="left"
					type="editable-card"
					activeKey={activeKey}
					onChange={(key) => dispatch(setActiveKey(key))}
					onEdit={handleEdit}
					items={tabItems}
					size="large"
					className="h-full w-full [&_.ant-tabs-content-holder]:h-full [&_.ant-tabs-content]:h-full [&_.ant-tabs-tabpane]:h-full"
				/>
			) : (
				<div className="flex h-full w-full">
					<div className="w-12 border-r border-slate-200 bg-white flex flex-col items-center pt-3">
						<Button
							type="text"
							icon={<PlusOutlined />}
							onClick={() => dispatch(addTab())}
							title="Create Order"
							className="text-slate-500 hover:text-indigo-600"
						/>
					</div>
					<div className="flex-1 h-full">{renderEmptyState()}</div>
				</div>
			)}
		</div>
	);
};

export default OrderCreationTabManager;
