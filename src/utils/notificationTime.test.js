import { formatNotificationTime } from "./notificationTime";

const now = new Date(2026, 8, 28, 15, 0);

test("today shows time only", () => {
  const label = formatNotificationTime(new Date(2026, 8, 28, 11, 2).toISOString(), now);
  expect(label).not.toMatch(/2026/);
  expect(label).toMatch(/11/);
});

test("other days show date with year and time", () => {
  const label = formatNotificationTime(new Date(2026, 8, 27, 11, 2).toISOString(), now);
  expect(label).toMatch(/^27 Sep 2026, /);
  expect(formatNotificationTime(new Date(2025, 8, 28, 11, 2).toISOString(), now)).toMatch(/^28 Sep 2025, /);
});

test("empty / invalid input", () => {
  expect(formatNotificationTime(null, now)).toBe("");
  expect(formatNotificationTime("nope", now)).toBe("");
});
