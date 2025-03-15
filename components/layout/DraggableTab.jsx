import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";

const DraggableTab = ({ tabs, initialTab, onTabChange }) => {
	const [activeTab, setActiveTab] = useState(initialTab);

	return (
		<View
			className="flex-row items-center justify-center mb-4"
		>
				{tabs.map((tab) => (
					<TouchableOpacity
						key={tab}
						className={`flex-1 py-3.5 px-6 rounded-2xl ${
							activeTab === tab ? "bg-slate-100 shadow-lg" : "bg-transparent"
						}`}
						onPress={() => {
							setActiveTab(tab);
							onTabChange(tab);
						}}
					>
						<Text
							className={`text-center font-semibold capitalize ${
								activeTab === tab
									? "text-primary font-extrabold"
									: "text-gray-500"
							}`}
						>
							{tab}
						</Text>
					</TouchableOpacity>
				))}
		</View>
	);
};

export default DraggableTab;
