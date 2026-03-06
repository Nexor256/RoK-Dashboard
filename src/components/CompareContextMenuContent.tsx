import { ContextMenuContent, ContextMenuItem } from "@/components/ui/context-menu";
import { useCompare } from "@/hooks/useCompare";
import { GitCompareArrows, User, X } from "lucide-react";
import type { GovernorProfileGov } from "@/components/GovernorProfileCard";

interface Props {
  gov: GovernorProfileGov;
  onViewProfile: () => void;
}

export default function CompareContextMenuContent({ gov, onViewProfile }: Props) {
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const inCompare = isInCompare(gov.governor_id);

  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={onViewProfile} className="gap-2">
        <User className="h-3.5 w-3.5" /> View Profile
      </ContextMenuItem>
      {inCompare ? (
        <ContextMenuItem onClick={() => removeFromCompare(gov.governor_id!)} className="gap-2 text-destructive">
          <X className="h-3.5 w-3.5" /> Remove from Compare
        </ContextMenuItem>
      ) : (
        <ContextMenuItem onClick={() => addToCompare(gov)} className="gap-2">
          <GitCompareArrows className="h-3.5 w-3.5" /> Add to Compare
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  );
}
