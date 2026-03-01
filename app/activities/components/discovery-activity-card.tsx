import { Activity } from "@/app/activities/types";
import styles from "@/app/activities/components/discovery-activity-card.module.css";

const cardColors = [
  "#cee9ee",
  "#5568af20",
  "#f3782620",
  "#cdd62940",
  "#ec176320",
];

const typeColorMap: Record<string, string> = {
  cafe: "#cee9ee",
  museum: "#5568af20",
  restaurant: "#f3782620",
  bar: "#ec176320",
  park: "#cdd62940",
};

function stableColorIndex(activityId: string) {
  let hash = 0;
  for (let i = 0; i < activityId.length; i += 1) {
    hash = (hash << 5) - hash + activityId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % cardColors.length;
}

function getCardColor(activity: Activity) {
  const mapped = typeColorMap[(activity.type ?? "").toLowerCase()];
  if (mapped) {
    return mapped;
  }

  return cardColors[stableColorIndex(activity.id)];
}

export default function DiscoveryActivityCard({
  activity,
  adding,
  onAddToVoting,
}: {
  activity: Activity;
  adding: boolean;
  onAddToVoting: (activityId: string) => void;
}) {
  const inVoting = activity.voting_phase;

  return (
    <article className={styles.card} style={{ backgroundColor: getCardColor(activity) }}>
      <h2 className={styles.title}>{activity.name}</h2>
      <p className={styles.meta}>
        {activity.area || "Unknown area"} • {activity.type || "other"}
      </p>
      <p className={styles.description}>{activity.description || "No description"}</p>

      <div className={styles.actions}>
        {activity.google_maps_link ? (
          <a
            href={activity.google_maps_link}
            target="_blank"
            rel="noreferrer"
            className={`${styles.button} ${styles.mapsButton}`}
          >
            Open Maps
          </a>
        ) : null}

        {inVoting ? (
          <button type="button" disabled className={`${styles.button} ${styles.disabledButton}`}>
            Already in Voting
          </button>
        ) : (
          <button
            type="button"
            disabled={adding}
            onClick={() => onAddToVoting(activity.id)}
            className={`${styles.button} ${adding ? styles.disabledButton : styles.addButton}`}
          >
            {adding ? "Adding..." : "Add to Voting"}
          </button>
        )}
      </div>
    </article>
  );
}
