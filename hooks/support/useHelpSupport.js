import { useHelpSupport } from "../../contexts/HelpSupportContext";

export const useHelpSupportData = () => {
  const { faqs, tickets, loading, refresh } = useHelpSupport();
  return { faqs, tickets, loading, refresh };
};

export const useSubmitSupportTicket = () => {
  const { submitTicket } = useHelpSupport();
  return submitTicket;
};
