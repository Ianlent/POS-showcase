import { Select, Space, Typography, Badge } from 'antd';

const { Text } = Typography;
const TicketTypeSelector = ({ onSearchChange }) => {
	const handleChange = (value) => {
		if (value === 0) {
			value = undefined;
		};
		onSearchChange('is_expense', value);
	};
	return (
		<Select
			defaultValue={0}
			style={{ width: 160 }}
			size="large"
			onChange={handleChange}
			popupClassName="rounded-xl shadow-xl"
			options={[
				{
					value: 0,
					label: <Text className="text-slate-600 font-medium">All Types</Text>
				},
				{
					value: true,
					label: (
						<Space>
							<Badge status="error" />
							<Text className="text-slate-600 font-medium">Expenses</Text>
						</Space>
					)
				},
				{
					value: false,
					label: (
						<Space>
							<Badge status="success" />
							<Text className="text-slate-600 font-medium">Income</Text>
						</Space>
					)
				},
			]}
		/>
	);
}

export default TicketTypeSelector;