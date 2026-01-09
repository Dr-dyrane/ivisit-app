import { useState, useCallback, useEffect } from "react";
import { emergencyContactsService } from "../../services/emergencyContactsService";

export function useEmergencyContacts() {
	const [contacts, setContacts] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchContacts = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await emergencyContactsService.list();
			setContacts(data);
		} catch (err) {
			setError(err.message || "Failed to load emergency contacts");
		} finally {
			setIsLoading(false);
		}
	}, []);

	const addContact = useCallback(async (contact) => {
		setIsLoading(true);
		try {
			const newContact = await emergencyContactsService.create(contact);
			setContacts(prev => [...prev, newContact]);
			return newContact;
		} catch (err) {
			setError(err.message || "Failed to add contact");
			throw err;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const updateContact = useCallback(async (id, updates) => {
		setIsLoading(true);
		try {
			const updated = await emergencyContactsService.update(id, updates);
			setContacts(prev => prev.map(c => c.id === String(id) ? updated : c));
			return updated;
		} catch (err) {
			setError(err.message || "Failed to update contact");
			throw err;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const removeContact = useCallback(async (id) => {
		setIsLoading(true);
		try {
			await emergencyContactsService.remove(id);
			setContacts(prev => prev.filter(c => c.id !== String(id)));
		} catch (err) {
			setError(err.message || "Failed to remove contact");
			throw err;
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchContacts();
	}, [fetchContacts]);

	return {
		contacts,
		isLoading,
		error,
		refreshContacts: fetchContacts,
		addContact,
		updateContact,
		removeContact,
	};
}
