import { useEffect, useState } from "react";

// useEffect is correct here: this IS a timer side-effect with cleanup.
export default function useDebounce(value, delay = 300) {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);
		return () => clearTimeout(timer);
	}, [value, delay]);

	return debouncedValue;
}
