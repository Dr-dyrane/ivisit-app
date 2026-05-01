import React from "react";
import { HelpSupportBoundary } from "../../../contexts/HelpSupportContext";
import HelpSupportScreen from "../../../screens/HelpSupportScreen";

export default function HelpSupport() {
  return (
    <HelpSupportBoundary>
      <HelpSupportScreen />
    </HelpSupportBoundary>
  );
}
