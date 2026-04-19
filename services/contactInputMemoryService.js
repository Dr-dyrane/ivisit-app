import { database, StorageKeys } from "../database";

const MAX_HISTORY_ITEMS = 3;

const normalizeEmail = (value) =>
	String(value || "").trim().toLowerCase();

const normalizePhone = (value) => {
	const normalized = String(value || "")
		.trim()
		.replace(/[^\d+]/g, "")
		.replace(/(?!^)\+/g, "");
	return normalized;
};

const isEmailUsable = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isPhoneUsable = (value) => value.replace(/\D/g, "").length >= 7;

const dedupeAndLimit = (items, nextValue) => {
	const nextItems = [
		nextValue,
		...(Array.isArray(items) ? items : []),
	]
		.map((item) => String(item || "").trim())
		.filter(Boolean);
	return Array.from(new Set(nextItems)).slice(0, MAX_HISTORY_ITEMS);
};

const readMemory = async () => {
	const stored = await database.read(StorageKeys.CONTACT_INPUT_MEMORY, {});
	return stored && typeof stored === "object" ? stored : {};
};

const writeMemory = async (memory) => {
	await database.write(StorageKeys.CONTACT_INPUT_MEMORY, {
		...memory,
		updatedAt: new Date().toISOString(),
	});
};

export const contactInputMemoryService = {
	async getMemory() {
		const memory = await readMemory();
		return {
			lastEmail: normalizeEmail(memory.lastEmail),
			lastPhone: normalizePhone(memory.lastPhone),
			emails: Array.isArray(memory.emails) ? memory.emails.map(normalizeEmail).filter(Boolean) : [],
			phones: Array.isArray(memory.phones) ? memory.phones.map(normalizePhone).filter(Boolean) : [],
		};
	},

	async rememberEmail(value) {
		const email = normalizeEmail(value);
		if (!isEmailUsable(email)) return null;
		const memory = await readMemory();
		await writeMemory({
			...memory,
			lastEmail: email,
			emails: dedupeAndLimit(memory.emails, email),
		});
		return email;
	},

	async rememberPhone(value) {
		const phone = normalizePhone(value);
		if (!isPhoneUsable(phone)) return null;
		const memory = await readMemory();
		await writeMemory({
			...memory,
			lastPhone: phone,
			phones: dedupeAndLimit(memory.phones, phone),
		});
		return phone;
	},

	async forgetEmail() {
		const memory = await readMemory();
		await writeMemory({
			...memory,
			lastEmail: "",
			emails: [],
		});
	},

	async forgetPhone() {
		const memory = await readMemory();
		await writeMemory({
			...memory,
			lastPhone: "",
			phones: [],
		});
	},
};

export default contactInputMemoryService;
