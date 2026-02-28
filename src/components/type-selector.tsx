"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TypeSelectorProps {
  types: string[];
  selectedType: string;
  newType: string;
  onSelectType: (value: string) => void;
  onNewTypeChange: (value: string) => void;
}

export function TypeSelector({
  types,
  selectedType,
  newType,
  onSelectType,
  onNewTypeChange,
}: TypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Transaction Type</Label>
      <div className="flex gap-2">
        <Select value={selectedType} onValueChange={onSelectType}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">-- Select --</SelectItem>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="flex-1"
          value={newType}
          onChange={(e) => onNewTypeChange(e.target.value)}
          placeholder="Or enter new type..."
        />
      </div>
      <p className="text-xs text-muted-foreground">
        If a new type is entered, it takes priority over the dropdown
      </p>
    </div>
  );
}
