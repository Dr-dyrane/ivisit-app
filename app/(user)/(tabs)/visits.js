import VisitsScreen from "../../../screens/VisitsScreen";

// Legacy compatibility only. New navigation must target
// `/(user)/(stacks)/visits`.
const LegacyVisitsTabBridge = () => <VisitsScreen />;

export default LegacyVisitsTabBridge;
