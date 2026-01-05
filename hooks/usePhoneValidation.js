"use client";

import { useState, useEffect } from "react";
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * usePhoneValidation
 *
 * Handles:
 * - Raw digit input
 * - As-you-type formatting
 * - True libphonenumber validation
 * - Safe E.164 prefilling
 *
 * @param {Object} country - Selected country (must include `code`)
 */
export default function usePhoneValidation(country) {
	const [rawInput, setRawInput] = useState(""); // digits only (national)
	const [formattedNumber, setFormattedNumber] = useState("");
	const [isValid, setIsValid] = useState(false);
	const [e164Format, setE164Format] = useState(null);

	useEffect(() => {
		if (!country || !rawInput) {
			resetDerived();
			return;
		}

		try {
			// Attempt to parse as full number first (handles E.164 or national)
			const parsed = parsePhoneNumberFromString(rawInput, country.code);

			if (parsed) {
				const nationalDigits = parsed.nationalNumber;
				const formatter = new AsYouType(country.code);

				const formatted = formatter.input(nationalDigits);
				setFormattedNumber(formatted);

				if (parsed.isValid()) {
					setIsValid(true);
					setE164Format(parsed.format("E.164"));
					return;
				}
			}

			// Fallback: format as national digits only
			const formatter = new AsYouType(country.code);
			setFormattedNumber(formatter.input(rawInput));

			setIsValid(false);
			setE164Format(null);
		} catch {
			setFormattedNumber(rawInput);
			setIsValid(false);
			setE164Format(null);
		}
	}, [rawInput, country]);

	const setFromE164 = (e164) => {
		if (!country || !e164) return;

		try {
			const parsed = parsePhoneNumberFromString(e164);
			if (parsed) {
				setRawInput(parsed.nationalNumber);
				setIsValid(parsed.isValid());
				setE164Format(parsed.isValid() ? parsed.format("E.164") : null);
			}
		} catch {
			resetAll();
		}
	};

	const clear = () => resetAll();

	const resetDerived = () => {
		setFormattedNumber("");
		setIsValid(false);
		setE164Format(null);
	};

	const resetAll = () => {
		setRawInput("");
		resetDerived();
	};

	return {
		rawInput,
		setRawInput,
		formattedNumber,
		isValid,
		e164Format,
		setFromE164, // 👈 important for prefilling
		clear,
	};
}
