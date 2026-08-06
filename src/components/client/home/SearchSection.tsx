"use client";

import { SearchBar } from "@/components/client/home/SearchBar";
import { TimePillsRow, type TimeSelection } from "@/components/client/home/TimePillsRow";

export interface SearchSectionProps {
  onSearch: (query: string) => void;
  onSelectTime: (selection: TimeSelection) => void;
}

export function SearchSection({ onSearch, onSelectTime }: SearchSectionProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-6">
      <SearchBar onSearch={onSearch} />
      <TimePillsRow onSelect={onSelectTime} />
    </div>
  );
}
