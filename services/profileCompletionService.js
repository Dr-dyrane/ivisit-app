import { database, StorageKeys } from "../database";

export const profileCompletionService = {
	async getDraft() {
		return await database.read(StorageKeys.PROFILE_COMPLETION_DRAFT, null);
	},

	async saveDraft(draft) {
		const safeDraft =
			draft && typeof draft === "object"
				? {
						fullName:
							typeof draft.fullName === "string" ? draft.fullName : "",
						username:
							typeof draft.username === "string" ? draft.username : "",
				  }
				: { fullName: "", username: "" };

		await database.write(StorageKeys.PROFILE_COMPLETION_DRAFT, safeDraft);
		return safeDraft;
	},

	async clearDraft() {
		await database.delete(StorageKeys.PROFILE_COMPLETION_DRAFT);
		return true;
	},
};

