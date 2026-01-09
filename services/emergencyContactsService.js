import { database, StorageKeys } from "../database";

const normalizeString = (v) => (typeof v === "string" ? v.trim() : "");

const normalizeContact = (contact) => {
	const name = normalizeString(contact?.name);
	const relationship = normalizeString(contact?.relationship);
	const phone = normalizeString(contact?.phone);
	const email = normalizeString(contact?.email).toLowerCase();

	return {
		id: contact?.id ? String(contact.id) : `ec_${Date.now()}`,
		name,
		relationship,
		phone: phone.length > 0 ? phone : null,
		email: email.length > 0 ? email : null,
		createdAt: contact?.createdAt ? String(contact.createdAt) : new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
};

export const emergencyContactsService = {
	async list() {
		const items = await database.read(StorageKeys.EMERGENCY_CONTACTS, []);
		if (!Array.isArray(items)) return [];
		return items
			.filter((c) => c && typeof c === "object")
			.sort((a, b) => String(b?.updatedAt ?? "").localeCompare(String(a?.updatedAt ?? "")));
	},

	async create(contact) {
		const next = normalizeContact(contact);
		if (next.name.length < 2) {
			throw new Error("INVALID_INPUT|Name is required");
		}
		if (!next.phone && !next.email) {
			throw new Error("INVALID_INPUT|Phone or email is required");
		}
		await database.createOne(StorageKeys.EMERGENCY_CONTACTS, next);
		return next;
	},

	async update(id, updates) {
		const contactId = String(id);
		const current = await database.findOne(
			StorageKeys.EMERGENCY_CONTACTS,
			(c) => String(c?.id) === contactId
		);
		if (!current) throw new Error("NOT_FOUND|Contact not found");
		const merged = normalizeContact({ ...current, ...updates, id: contactId, createdAt: current.createdAt });
		if (merged.name.length < 2) {
			throw new Error("INVALID_INPUT|Name is required");
		}
		if (!merged.phone && !merged.email) {
			throw new Error("INVALID_INPUT|Phone or email is required");
		}
		await database.updateOne(
			StorageKeys.EMERGENCY_CONTACTS,
			(c) => String(c?.id) === contactId,
			merged
		);
		return merged;
	},

	async remove(id) {
		const contactId = String(id);
		await database.deleteOne(
			StorageKeys.EMERGENCY_CONTACTS,
			(c) => String(c?.id) === contactId
		);
		return true;
	},
};

