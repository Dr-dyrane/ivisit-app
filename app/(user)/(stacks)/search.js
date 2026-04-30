import React from "react";
import SearchScreen from "../../../screens/SearchScreen";
import { SearchBoundary } from "../../../contexts/SearchContext";

export default function Search() {
  return (
    <SearchBoundary>
      <SearchScreen />
    </SearchBoundary>
  );
}
