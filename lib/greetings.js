import { localDayStr } from "./dates.js";

/** @typedef {{ text: string, emoji: string }} Quote */

/** @type {Quote[]} */
const MORNING_QUOTES = [
  { text: "Today's plan: look busy until it's socially acceptable to log off", emoji: "🎭" },
  { text: "Your task list called. It's not mad, just disappointed. (It's lying.)", emoji: "📋" },
  { text: "Another standup where 'no blockers' means 'I'll suffer in silence'", emoji: "🎪" },
  { text: "Coffee first. Personality second. Tasks whenever.", emoji: "☕" },
  { text: "Main character energy starts after chai #2", emoji: "⚡" },
  { text: "Your calendar is a crime scene and you're somehow the suspect", emoji: "📅" },
  { text: "That 'quick sync' is a 45-minute TED talk waiting to happen", emoji: "📞" },
  { text: "You're not late — time is just being dramatic again", emoji: "⏰" },
  { text: "Reply-all is not a personality trait. Please stop.", emoji: "🔕" },
  { text: "Pretending to read Slack while making chai — valid morning ritual", emoji: "🫖" },
  { text: "Your 'focus time' block is currently being bullied by meetings", emoji: "🛡️" },
  { text: "Inbox zero is a fairy tale. Inbox survivable is the goal.", emoji: "📬" },
  { text: "The standup is short. Your to-do list filed for an extension.", emoji: "📋" },
  { text: "Someone said 'let's circle back' — today's villain origin story", emoji: "🔄" },
  { text: "Morning you is ambitious. Afternoon you is a whole different person.", emoji: "🌅" },
  { text: "Your laptop opened before your eyes fully did. Respect.", emoji: "💻" },
  { text: "'I'll start after this one meeting' — famous last words since 2019", emoji: "♾️" },
  { text: "Teamwork makes the dream work. Also makes fewer 'any updates?' pings.", emoji: "🤝" },
  { text: "You opened the task app instead of Instagram. Character development.", emoji: "📈" },
  { text: "Today's mood: aggressively optimistic with a side of mild dread", emoji: "😌" },
  { text: "Three meetings before lunch is not a schedule, it's a hostage situation", emoji: "🎬" },
  { text: "Your Slack status says 'available' — bold of you, honestly", emoji: "👻" },
  { text: "Hot take: one done task beats ten beautifully color-coded plans", emoji: "🎨" },
  { text: "Procrastination called in sick today. You're on your own.", emoji: "🤒" },
  { text: "Be the person who closes the loop — or at least the browser tab", emoji: "🔄" },
  { text: "Your 'I'll do it tomorrow' pipeline is impressive architecture", emoji: "🏗️" },
  { text: "Another calendar invite you accepted out of pure politeness", emoji: "📨" },
  { text: "The chai is hot. The priorities are lukewarm. Fix one task.", emoji: "🫖" },
  { text: "Standup pro tip: say something so nothing actually gets assigned", emoji: "🎤" },
  { text: "You're not behind — you're just on the scenic route", emoji: "🗺️" },
  { text: "Email subject 'Quick question' — we've been fooled before", emoji: "📧" },
  { text: "Morning productivity: 10% work, 90% convincing yourself to start", emoji: "🏁" },
  { text: "Your calendar blocked 'deep work' — meetings didn't get the memo", emoji: "📝" },
  { text: "Today's win condition: one task done before the lunch guilt hits", emoji: "✅" },
  { text: "The '5-minute favor' has never once taken 5 minutes in human history", emoji: "⏱️" },
  { text: "You showed up. That's more than your snooze button expected.", emoji: "⏰" },
  { text: "Reply-all season is over. Nobody attended the funeral.", emoji: "⚰️" },
  { text: "Ship something before lunch — even if it's just closing a tab", emoji: "🚀" },
  { text: "Monday's ghost still haunts your inbox — exorcise one email", emoji: "👻" },
  { text: "One task done > ten tasks planned during the standup", emoji: "🏆" },
];

/** @type {Quote[]} */
const AFTERNOON_QUOTES = [
  { text: "This meeting could've been a Slack message. It wasn't. Tragedy.", emoji: "🎭" },
  { text: "Post-lunch slump? Your brain is on a union-mandated break", emoji: "😴" },
  { text: "3pm energy: 40% caffeine, 60% pure spite", emoji: "☕" },
  { text: "Your 'quick question' is someone else's 45-minute context switch", emoji: "🔀" },
  { text: "Deadline approaching like a DM you opened and forgot to reply to", emoji: "📩" },
  { text: "If it's not on the wall, did it happen or was it just a fever dream?", emoji: "🤔" },
  { text: "You're not procrastinating — you're strategically deferring. Fancy.", emoji: "🃏" },
  { text: "One more task before you 'just check Slack real quick' for 40 minutes", emoji: "📱" },
  { text: "Collaboration is just shared accountability with extra Zoom links", emoji: "🤝" },
  { text: "The afternoon is where morning plans go to get stress-tested", emoji: "🧪" },
  { text: "Done is better than perfect. Posted is better than 'almost done'.", emoji: "✨" },
  { text: "That '5-minute favor' is now a 45-minute personality test", emoji: "🎁" },
  { text: "Slack pinged. Your soul left the body. Totally normal.", emoji: "👻" },
  { text: "The meeting ended 10 minutes late. Use the rage productively.", emoji: "🔥" },
  { text: "Your 'almost done' task from Monday is still in its 'almost' era", emoji: "🎯" },
  { text: "Afternoon standup recap: you talked. Bold move.", emoji: "🎤" },
  { text: "'Can you hop on a quick call?' — the deadliest words after lunch", emoji: "☠️" },
  { text: "Your task list and your browser tabs are in a toxic relationship", emoji: "💔" },
  { text: "Post-lunch brain says nap. Spite says tick one thing off.", emoji: "🧠" },
  { text: "You've been 'about to start' for two hours. Commitment issues?", emoji: "🃏" },
  { text: "The thread has 47 replies. Your task has zero progress. Classic.", emoji: "🧵" },
  { text: "The 'I'll wrap this up after one more email' lie — a timeless classic", emoji: "📧" },
  { text: "Afternoon slump is real. So is the dopamine of checking a box.", emoji: "✅" },
  { text: "Your calendar says free. Your brain says 'free for what, exactly?'", emoji: "📆" },
  { text: "Three hours in meetings. Zero tasks posted. The ratio is art.", emoji: "⚖️" },
  { text: "Nobody knows you're struggling if you close a task. Coincidence? Maybe.", emoji: "😏" },
  { text: "Afternoon motto: fewer tabs, more ticks, same chaos", emoji: "✔️" },
  { text: "We're not burnt out, we're 'running warm' — like a laptop on your lap", emoji: "🌡️" },
  { text: "Half the day left. Full send on the one thing that actually matters.", emoji: "🔥" },
  { text: "Your 'I'll do it after this meeting' pipeline is a national monument", emoji: "🏛️" },
  { text: "That task you snoozed this morning? It's back. It always comes back.", emoji: "🔁" },
  { text: "Afternoon chai break: mandatory. Afternoon productivity: negotiable.", emoji: "🫖" },
  { text: "The 'just one more thing' at 3pm is why dinner is at 10pm", emoji: "🍽️" },
  { text: "Your Slack emoji reaction is not a deliverable. Just FYI.", emoji: "👍" },
  { text: "Someone on the wall closed three tasks. No pressure. Okay, tiny pressure.", emoji: "😬" },
  { text: "The afternoon is peak 'I'll start after this snack' energy", emoji: "🍪" },
  { text: "Context-switching so hard your brain needs a layover", emoji: "✈️" },
  { text: "Today's afternoon special: one task, hold the motivation", emoji: "🍽️" },
  { text: "Your to-do list and your energy levels are no longer on speaking terms", emoji: "💬" },
  { text: "Close one loop before the 4pm 'quick sync' ambush", emoji: "🔄" },
];

/** @type {Quote[]} */
const EVENING_QUOTES = [
  { text: "Still here? Your laptop thinks you're married now", emoji: "💍" },
  { text: "After 5pm tasks hit different — mainly because you forgot lunch", emoji: "😅" },
  { text: "Logging off is also a form of productivity. Controversial, but true.", emoji: "🚪" },
  { text: "Your work will still be here tomorrow. Unfortunately for both of you.", emoji: "📦" },
  { text: "One more task or one more episode — choose your fighter", emoji: "📺" },
  { text: "Evening shift? Hero mode or denial mode — hard to tell", emoji: "🦸" },
  { text: "If you're still working, at least post what you did for the plot", emoji: "📝" },
  { text: "Tomorrow's problem is tomorrow's standup topic. You're welcome.", emoji: "🌅" },
  { text: "The 'quick fix' at 8pm is never quick. It's a law of physics.", emoji: "🔧" },
  { text: "Closing loops > opening new tabs at this hour. Trust the process.", emoji: "🔄" },
  { text: "Your laptop is warm. Your dinner is cold. The math checks out.", emoji: "🌡️" },
  { text: "Night owl or overcommitter? The wall doesn't care. Go home.", emoji: "🦉" },
  { text: "Send the update, close the laptop, touch grass (optional but recommended)", emoji: "🌿" },
  { text: "The best task you can complete right now might be 'log off'", emoji: "✅" },
  { text: "Still checking the wall? That's either passion or poor boundaries.", emoji: "👀" },
  { text: "Rest is part of the sprint. Pretend it's agile. Nobody will check.", emoji: "🧘" },
  { text: "You survived today. The wall has the receipts if you want credit.", emoji: "🧾" },
  { text: "Last task of the day? Make it count. Or make it tomorrow's problem.", emoji: "🎯" },
  { text: "Still here at this hour? Your work-life balance sent a strongly worded email.", emoji: "📵" },
  { text: "The Slack thread can wait until tomorrow. Your sanity cannot.", emoji: "🧘" },
  { text: "One more 'quick fix' and you'll be here until midnight. Classic.", emoji: "🔧" },
  { text: "Your laptop light is the only sunset you're getting today", emoji: "🌅" },
  { text: "Evening overtime without posting a task is just suffering with extra steps", emoji: "😩" },
  { text: "The wall will still be here tomorrow. Unlike your energy reserves.", emoji: "🔋" },
  { text: "Closing one task before logoff > heroic 11pm Slack messages", emoji: "🏆" },
  { text: "You're not 'passionate' — you're avoiding the log-off button. Same vibe.", emoji: "🎡" },
  { text: "That task you meant to finish 'by EOD' is having a laugh about it", emoji: "😂" },
  { text: "Night shift energy is just daytime procrastination with better lighting", emoji: "💡" },
  { text: "Your team logged off. You're still here. Are you okay?", emoji: "🚪" },
  { text: "The 'I'll send an update in the morning' draft is not an update", emoji: "📝" },
  { text: "Evening motto: close loops, not browser tabs", emoji: "🔄" },
  { text: "Tomorrow-you hates today-you for staying late without finishing anything", emoji: "😠" },
  { text: "One last Slack check? That's how you got here. We don't judge. Much.", emoji: "📱" },
  { text: "Hero mode is posting your last win, then actually leaving", emoji: "🦸" },
  { text: "Your dinner is cold. Your tasks are colder. Wrap up.", emoji: "🍽️" },
  { text: "Burnout is not a badge. Log off and touch something that isn't a keyboard.", emoji: "⌨️" },
  { text: "The chai is cold. The day is done. Act accordingly.", emoji: "🫖" },
  { text: "Evening productivity: 20% work, 80% negotiating with yourself to leave", emoji: "🤝" },
  { text: "Your 'one last thing' has entered its third hour. Impressive stamina.", emoji: "⏳" },
  { text: "Log off. The tasks will gossip about you either way.", emoji: "💬" },
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
 * FNV-1a 32-bit hash for stable string → integer mapping.
 * @param {string} str
 * @returns {number} unsigned 32-bit integer
 */
export function fnv1aHash(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Build a composite seed string from viewer identity fields.
 * @param {{ viewerSeed?: string|null, userId?: string|null, email?: string|null, memberId?: string|null }} identity
 * @returns {string}
 */
export function buildQuoteSeed({ viewerSeed = null, userId = null, email = null, memberId = null } = {}) {
  const primary = viewerSeed ?? userId ?? "guest";
  return [primary, email ?? "", memberId ?? ""].join(":");
}

/**
 * Deterministic index for daily quote selection (stable per day + viewer + bucket).
 * @param {string} dateKey YYYY-MM-DD
 * @param {'morning' | 'afternoon' | 'evening'} bucket
 * @param {number} poolLength
 * @param {{ viewerSeed?: string|null, userId?: string|null, email?: string|null, memberId?: string|null }} [identity]
 * @returns {number}
 */
export function dailyQuoteIndex(dateKey, bucket, poolLength, identity = {}) {
  const identitySeed = buildQuoteSeed(identity);
  const seed = `${dateKey}:${identitySeed}:${bucket}`;
  return fnv1aHash(seed) % poolLength;
}

/**
 * Build the time-of-day greeting line and a daily-stable quote.
 * @param {{ now?: Date, userName?: string|null, userId?: string|null, email?: string|null, memberId?: string|null, viewerSeed?: string|null }} opts
 * @returns {{ greeting: string, quote: string, emoji: string }}
 */
export function getDailyGreeting({
  now = new Date(),
  userName = null,
  userId = null,
  email = null,
  memberId = null,
  viewerSeed = null,
} = {}) {
  const hour = now.getHours();
  const label = getGreetingLabel(hour);
  const bucket = getTimeBucket(hour);
  const pool = QUOTE_POOLS[bucket];
  const dateKey = localDayStr(now);
  const index = dailyQuoteIndex(dateKey, bucket, pool.length, {
    viewerSeed,
    userId,
    email,
    memberId,
  });
  const { text, emoji } = pool[index];

  const trimmedName = userName?.trim() || null;
  const greeting = trimmedName ? `${label}, ${trimmedName}` : `${label}, team`;

  return { greeting, quote: text, emoji };
}
