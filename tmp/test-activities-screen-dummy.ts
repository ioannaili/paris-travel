import assert from "node:assert/strict";
import { buildActivitiesScreenResponse, type ActivityRow, type VoteRow } from "@/lib/activities-screen";

function testGroupedVotes() {
  const profile = { id: "user-1", name: "Eva" };

  const activities: ActivityRow[] = [
    {
      id: "act-1",
      name: "Louvre Museum",
      description: "Art museum",
      area: "Louvre Area",
      type: "museum",
      duration: 180,
      price: "22 EUR",
      booking_required: true,
      booking_link: "https://www.louvre.fr",
      google_maps_link: "https://maps.google.com/?q=Louvre+Museum",
      source_type: "manual",
      popularity: 11,
      voting_phase: false,
      latitude: 48.8606,
      longitude: 2.3376,
      created_at: "2026-03-01T12:00:00.000Z",
    },
    {
      id: "act-2",
      name: "Canal Walk",
      description: "Sunset walk",
      area: "Canal Saint Martin",
      type: "neighborhood walk",
      duration: 90,
      price: "Free",
      booking_required: false,
      booking_link: null,
      google_maps_link: "https://maps.google.com/?q=Canal+Saint+Martin",
      source_type: "reddit",
      popularity: 6,
      voting_phase: false,
      latitude: 48.8721,
      longitude: 2.3632,
      created_at: "2026-03-01T13:00:00.000Z",
    },
  ];

  const votes: VoteRow[] = [
    { activity_id: "act-1", user_id: "u1", vote: "yes", users: { name: "Eva" } },
    { activity_id: "act-1", user_id: "u2", vote: "maybe", users: { name: "Ioanna" } },
    { activity_id: "act-1", user_id: "u3", vote: "no", users: { name: "Marilena" } },
    { activity_id: "act-2", user_id: "u4", vote: "yes", users: [{ name: "Katerina" }] },
  ];

  const result = buildActivitiesScreenResponse({
    profile,
    users: [
      { id: "u1", name: "Eva" },
      { id: "u2", name: "Ioanna" },
      { id: "u3", name: "Marilena" },
      { id: "u4", name: "Katerina" },
    ],
    fallbackUser: { id: "user-1", name: "Eva" },
    activities,
    votes,
  });

  assert.equal(result.user.id, "user-1");
  assert.equal(result.user.name, "Eva");
  assert.equal(result.activities.length, 2);

  const first = result.activities.find((activity) => activity.id === "act-1");
  assert.ok(first);
  assert.deepEqual(first.votes.yes.map((entry) => entry.name), ["Eva"]);
  assert.deepEqual(first.votes.maybe.map((entry) => entry.name), ["Ioanna"]);
  assert.deepEqual(first.votes.no.map((entry) => entry.name), ["Marilena"]);

  const second = result.activities.find((activity) => activity.id === "act-2");
  assert.ok(second);
  assert.deepEqual(second.votes.yes.map((entry) => entry.name), ["Katerina"]);
  assert.deepEqual(second.votes.maybe, []);
  assert.deepEqual(second.votes.no, []);
}

function testEmptyActivitiesState() {
  const result = buildActivitiesScreenResponse({
    profile: { id: "user-9", name: "Charoula" },
    users: [{ id: "user-9", name: "Charoula" }],
    activities: [],
    votes: [
      { activity_id: "act-missing", user_id: "u1", vote: "yes", users: { name: "Eva" } },
    ],
  });

  assert.equal(result.user.id, "user-9");
  assert.equal(result.user.name, "Charoula");
  assert.deepEqual(result.activities, []);
}

testGroupedVotes();
testEmptyActivitiesState();

console.log("Dummy data tests passed for activities-screen payload builder.");
