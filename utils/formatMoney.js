const DEFAULT_CURRENCY = "USD";

export function normalizeCurrencyCode(currency, fallback = DEFAULT_CURRENCY) {
	const normalized =
		typeof currency === "string" ? currency.trim().toUpperCase() : "";
	return /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
}

export function resolveMoneyCurrency(...candidates) {
	for (const candidate of candidates) {
		const normalized = normalizeCurrencyCode(candidate, "");
		if (normalized) return normalized;
	}
	return DEFAULT_CURRENCY;
}

export function getCurrencySymbol(currency = DEFAULT_CURRENCY, locale, fallback = "$") {
	const resolvedCurrency = normalizeCurrencyCode(currency);

	try {
		const parts = new Intl.NumberFormat(locale, {
			style: "currency",
			currency: resolvedCurrency,
			currencyDisplay: "narrowSymbol",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).formatToParts(0);
		const symbol = parts.find((part) => part.type === "currency")?.value?.trim();
		return symbol || fallback;
	} catch (_error) {
		return fallback;
	}
}

export function toMoneyNumber(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const normalized = value.replace(/,/g, "");
		const match = normalized.match(/-?\d+(?:\.\d+)?/);
		if (!match) return null;
		const parsed = Number(match[0]);
		return Number.isFinite(parsed) ? parsed : null;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export function formatMoney(value, options = {}) {
	const {
		currency = DEFAULT_CURRENCY,
		fallback = null,
		preserveText = true,
		minimumFractionDigits = 2,
		maximumFractionDigits = 2,
		currencyDisplay = "narrowSymbol",
		locale,
		absolute = false,
	} = options;
	const numeric = toMoneyNumber(value);

	if (numeric == null) {
		const text = typeof value === "string" ? value.trim() : "";
		if (preserveText && text) return text;
		return fallback;
	}

	const resolvedCurrency = normalizeCurrencyCode(currency);
	const amount = absolute ? Math.abs(numeric) : numeric;

	try {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency: resolvedCurrency,
			currencyDisplay,
			minimumFractionDigits,
			maximumFractionDigits,
		}).format(amount);
	} catch (_error) {
		return `${resolvedCurrency} ${amount.toFixed(maximumFractionDigits)}`;
	}
}

export function formatMoneyFromRecord(value, record, options = {}) {
	return formatMoney(value, {
		...options,
		currency: resolveMoneyCurrency(
			options.currency,
			record?.currency,
			record?.display_currency,
			record?.wallet_currency,
			record?.walletCurrency,
			record?.payment_currency,
			record?.paymentCurrency,
		),
	});
}
