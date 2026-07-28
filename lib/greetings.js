import { localDayStr } from "./dates.js";

/** @typedef {{ text: string, emoji: string }} Quote */

/** @type {Quote[]} */
const MORNING_QUOTES = [
  { text: "Today's the day we pretend Monday didn't happen", emoji: "☕" },
  { text: "Your calendar is full but your soul is empty — classic", emoji: "📅" },
  { text: "Main character energy starts after the second coffee", emoji: "⚡" },
  { text: "We don't do hustle culture, we do impact culture", emoji: "🎯" },
  { text: "Small wins today beat big excuses tomorrow", emoji: "🏆" },
  { text: "The standup is short. The to-do list is not. Prioritize.", emoji: "📋" },
  { text: "Someone on this wall is going to crush it — might be you", emoji: "💪" },
  { text: "Reply-all season is over. Focus season is now.", emoji: "🔕" },
  { text: "You're not behind — you're just on your own timeline", emoji: "⏰" },
  { text: "One task done > ten tasks planned in your head", emoji: "✅" },
  { text: "The team that checks in together, wins together", emoji: "🤝" },
  { text: "Your future self is watching. Don't disappoint them before lunch.", emoji: "👀" },
  { text: "Inbox zero is a myth. Impact today is real.", emoji: "📬" },
  { text: "Be the person who actually closes the loop", emoji: "🔄" },
  { text: "Morning you is ambitious. Make afternoon you proud.", emoji: "🌅" },
  { text: "No meeting should need a meeting about the meeting", emoji: "🚫" },
  { text: "Ship something before lunch — even if it's just clarity", emoji: "🚀" },
  { text: "The wall doesn't lie. Neither should your task list.", emoji: "📊" },
  { text: "Teamwork makes the dream work. Also makes Slack quieter.", emoji: "💬" },
  { text: "You're already here. That's half the battle.", emoji: "🎖️" },
];

/** @type {Quote[]} */
const AFTERNOON_QUOTES = [
  { text: "Post-lunch slump? The wall accepts your completed tasks anyway", emoji: "😴" },
  { text: "This meeting could've been a task on the wall", emoji: "🎭" },
  { text: "3pm and still going — respect the grind (lightly)", emoji: "⏳" },
  { text: "Your 'quick question' is someone else's context switch. Be kind.", emoji: "🔀" },
  { text: "Deadline approaching like a DM you forgot to open", emoji: "📩" },
  { text: "Afternoon energy: 40% caffeine, 60% spite", emoji: "☕" },
  { text: "If it's not on the wall, did it even happen?", emoji: "🤔" },
  { text: "The team can see progress. No pressure. Okay, some pressure.", emoji: "👁️" },
  { text: "You're not procrastinating — you're strategically deferring", emoji: "🃏" },
  { text: "One more task before you 'just check Slack real quick'", emoji: "📱" },
  { text: "Collaboration is just shared accountability with extra steps", emoji: "🤝" },
  { text: "The afternoon is where morning plans go to get tested", emoji: "🧪" },
  { text: "Done is better than perfect. Posted is better than hidden.", emoji: "✨" },
  { text: "Your overdue tasks are judging you. Complete one. Show dominance.", emoji: "👊" },
  { text: "Team sync in 5 — make sure something's checked off first", emoji: "⏱️" },
  { text: "The wall rewards action, not intention. Just saying.", emoji: "🎯" },
  { text: "Half the day left. Full send on the important stuff.", emoji: "🔥" },
  { text: "Nobody knows you're struggling if you close a task. Coincidence?", emoji: "😏" },
  { text: "Afternoon motto: fewer tabs, more ticks", emoji: "✔️" },
  { text: "We're not burnt out, we're 'running warm'", emoji: "🌡️" },
];

/** @type {Quote[]} */
const EVENING_QUOTES = [
  { text: "Still here? The wall appreciates the dedication. Sort of.", emoji: "🌙" },
  { text: "After 5pm tasks hit different — mainly guilt", emoji: "😅" },
  { text: "Logging off is also a form of productivity", emoji: "🚪" },
  { text: "Your work will still be here tomorrow. Unfortunately.", emoji: "📦" },
  { text: "The team wall never sleeps. You should, though.", emoji: "💤" },
  { text: "One more task or one more episode — choose wisely", emoji: "📺" },
  { text: "Evening shift? Hero mode activated.", emoji: "🦸" },
  { text: "If you're still working, at least post what you did", emoji: "📝" },
  { text: "Tomorrow's problem is tomorrow's standup topic", emoji: "🌅" },
  { text: "The 'quick fix' at 8pm is never quick. We know.", emoji: "🔧" },
  { text: "Closing loops > opening new tabs at this hour", emoji: "🔄" },
  { text: "Your laptop is warm. Your willpower is warmer. Wrap up.", emoji: "🌡️" },
  { text: "Night owl or overcommitter? The wall doesn't judge. Much.", emoji: "🦉" },
  { text: "Send the update, close the laptop, touch grass (optional)", emoji: "🌿" },
  { text: "The best task you can complete right now might be 'log off'", emoji: "✅" },
  { text: "Still checking the wall? That's either passion or anxiety.", emoji: "👀" },
  { text: "Evening crew: we see you. We also see your overdue count.", emoji: "📊" },
  { text: "Rest is part of the sprint. Pretend it's agile.", emoji: "🧘" },
  { text: "You survived today. The wall has the receipts.", emoji: "🧾" },
  { text: "Last task of the day? Make it count. Or make it tomorrow.", emoji: "🎯" },
];

/** @type {Record<'morning' | 'afternoon' | 'evening', Quote[]>} */
const QUOTE_POOLS = {
  morning: MORNING_QUOTES,
  afternoon: AFTERNOON_QUOTES,
  evening: EVENING_QUOTES,
};

/**
 * Map local hour to greeting label.
 * @param {number} hour 0–23
 * @returns {'Good morning' | 'Good afternoon' | 'Good evening'}
 */
export function getGreetingLabel(hour) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Map local hour to quote time bucket.
 * Morning 5–12, afternoon 12–17, evening 17–5.
 * @param {number} hour 0–23
 * @returns {'morning' | 'afternoon' | 'evening'}
 */
export function getTimeBucket(hour) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

/**
 * Deterministic index for daily quote selection (stable per day + user + bucket).
 * @param {string} dateKey YYYY-MM-DD
 * @param {string|null} userId
 * @param {'morning' | 'afternoon' | 'evening'} bucket
 * @param {number} poolLength
 * @returns {number}
 */
export function dailyQuoteIndex(dateKey, userId, bucket, poolLength) {
  const seed = `${dateKey}:${userId ?? "guest"}:${bucket}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % poolLength;
}

/**
 * Build the time-of-day greeting line and a daily-stable quote.
 * @param {{ now?: Date, userName?: string|null, userId?: string|null }} opts
 * @returns {{ greeting: string, quote: string, emoji: string }}
 */
export function getDailyGreeting({ now = new Date(), userName = null, userId = null } = {}) {
  const hour = now.getHours();
  const label = getGreetingLabel(hour);
  const bucket = getTimeBucket(hour);
  const pool = QUOTE_POOLS[bucket];
  const dateKey = localDayStr(now);
  const index = dailyQuoteIndex(dateKey, userId, bucket, pool.length);
  const { text, emoji } = pool[index];

  const trimmedName = userName?.trim() || null;
  const greeting = trimmedName ? `${label}, ${trimmedName}` : `${label}, team`;

  return { greeting, quote: text, emoji };
}
