import Image from "next/image";
import VoteButtons from "@/app/activities/components/vote-buttons";
import { Activity, VoteValue } from "@/app/activities/types";

const cardBackgrounds = [
  "bg-[var(--surface)]",
  "bg-[var(--aqua)]/50",
  "bg-[var(--light-purple)]/50",
  "bg-[var(--light-yellow)]/60",
];

const imagePool = [
  "/Images/260abeccdcf5ad846ff21cb11c2c76a3.jpg",
  "/Images/297fd76a81110b09aea52c1133adb0ce.jpg",
  "/Images/2ef98825d4abe9a62147db75dcec2459.jpg",
  "/Images/305a216481dfaaec10fd59cf1f667652.jpg",
  "/Images/43b315e9c3116a774ced243b39eab86a.jpg",
  "/Images/4824f2205ad7d5cf92ef4fb36639ddc8.jpg",
  "/Images/7c634bff27f5e04a54329f354f0c51cf.jpg",
  "/Images/825414db4ea9c231dabbcb37b1276361.jpg",
  "/Images/97ef7a532598d3567e53904a603cbb0b.jpg",
  "/Images/bfc5321d257815985ca2a241673416b3.jpg",
  "/Images/c91778c5a07c8f2a1df605655ef21f3f.jpg",
  "/Images/dbc8d0deba27f10fa3e1f27b565b5d51.jpg",
  "/Images/e6e405e9353b777ef64b2d52bbe92514.jpg",
];

function pickById(id: string, length: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash) % length;
}

export default function ActivityCard({
  activity,
  selectedVote,
  voteLoading,
  groupedVotes,
  onVote,
}: {
  activity: Activity;
  selectedVote?: VoteValue;
  voteLoading: boolean;
  groupedVotes: { yes: string[]; maybe: string[]; no: string[] };
  onVote: (vote: VoteValue) => void;
}) {
  const colorClass = cardBackgrounds[pickById(activity.id, cardBackgrounds.length)];
  const imageSrc = imagePool[pickById(activity.id, imagePool.length)];

  return (
    <article className={["overflow-hidden rounded-3xl border border-white/70 shadow-sm", colorClass].join(" ")}>
      <div className="relative h-40 w-full">
        <Image
          src={imageSrc}
          alt={activity.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 430px"
        />
      </div>

      <div className="grid gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--sky-blue)] px-3 py-1 text-xs font-semibold text-white">
            {activity.area || "Unknown area"}
          </span>
          <span className="rounded-full bg-[var(--light-purple)] px-3 py-1 text-xs font-semibold text-[var(--text-main)]">
            {activity.type || "other"}
          </span>
          {activity.booking_required && (
            <span className="rounded-full bg-[var(--electric-rose)] px-3 py-1 text-xs font-semibold text-white">
              booking required
            </span>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold leading-tight">{activity.name}</h2>
          {activity.description && (
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-soft)]">{activity.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/70 p-3 text-sm">
          <p>
            <span className="font-semibold">Duration:</span> {activity.duration ? `${activity.duration} min` : "N/A"}
          </p>
          <p>
            <span className="font-semibold">Price:</span> {activity.price || "N/A"}
          </p>
        </div>

        <VoteButtons selectedVote={selectedVote} disabled={voteLoading} onVote={onVote} />

        <div className="grid gap-2">
          {(["yes", "maybe", "no"] as VoteValue[]).map((voteType) => {
            const names = groupedVotes[voteType];
            if (names.length === 0) return null;

            return (
              <div key={voteType} className="rounded-2xl bg-white/75 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                  {voteType} ({names.length})
                </p>
                <p className="mt-1 text-sm text-[var(--text-main)]">{names.join(", ")}</p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 text-sm font-medium">
          {activity.booking_link && (
            <a
              href={activity.booking_link}
              target="_blank"
              rel="noreferrer"
              className="min-h-12 rounded-full bg-white px-4 py-3 text-[var(--text-main)]"
            >
              Booking Link
            </a>
          )}
          {activity.google_maps_link && (
            <a
              href={activity.google_maps_link}
              target="_blank"
              rel="noreferrer"
              className="min-h-12 rounded-full bg-white px-4 py-3 text-[var(--text-main)]"
            >
              Google Maps
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
