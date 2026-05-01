import { useHelpSupport } from "../../contexts/HelpSupportContext";

export const useHelpSupportData = () => {
  const { faqs, tickets, loading, refresh, error, isReady } = useHelpSupport();
  return { faqs, tickets, loading, refresh, error, isReady };
};

export const useSubmitSupportTicket = () => {
  const { submitTicket } = useHelpSupport();
  return submitTicket;
};

export { useHelpSupport };

export default useHelpSupport;
