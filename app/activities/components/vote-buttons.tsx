import { VoteValue } from "@/app/activities/types";

const votes: VoteValue[] = ["yes", "maybe", "no"];

const palette: Record<VoteValue, string> = {
  yes: "bg-[var(--lime)] text-[var(--text-main)]",
  maybe: "bg-[var(--light-purple)] text-[var(--text-main)]",
  no: "bg-[var(--light-yellow)] text-[var(--text-main)]",
};

export default function VoteButtons({
  selectedVote,
  disabled,
  onVote,
}: {
  selectedVote?: VoteValue;
  disabled: boolean;
  onVote: (vote: VoteValue) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {votes.map((vote) => {
        const isSelected = selectedVote === vote;

        return (
          <button
            key={vote}
            type="button"
            disabled={disabled}
            onClick={() => onVote(vote)}
            className={[
              "min-h-12 rounded-full border px-2 text-sm font-semibold capitalize transition",
              palette[vote],
              isSelected
                ? "border-[var(--text-main)] shadow-[inset_0_0_0_2px_var(--text-main)]"
                : "border-transparent",
              disabled ? "opacity-70" : "",
            ].join(" ")}
          >
            {vote}
          </button>
        );
      })}
    </div>
  );
}
