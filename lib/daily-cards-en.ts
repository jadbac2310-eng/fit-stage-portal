// 日替わりの中身の英語版（2026-11-18、英語で使うスタッフ向け）。
// 日本語版（daily-cards.ts・daily-quote.ts）の訳ではなく、英語で自然に読める内容にしている。
// 選び方（日付・人で決まる）は日本語版と同じ考え方。格言は、出典のはっきりしたものと、ことわざ・FIT STAGE の言葉だけ。

import type { DailyQuote } from "./daily-quote";
import type { DailyTip, DailyFortune, Seasonal } from "./daily-cards";

const JST = 9 * 3600 * 1000;
const dayNumber = (now: Date | number = Date.now()) => Math.floor(((typeof now === "number" ? now : now.getTime()) + JST) / 86400000);
function mix(n: number): number {
  let h = n | 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return Math.abs(h);
}
function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return mix(h);
}

export const DAILY_QUOTES_EN: DailyQuote[] = [
  { by: "Ichiro Suzuki", text: "Piling up small things is the only way to get to extraordinary places.", note: "Twice a week for a year is what changes a body." },
  { by: "Ichiro Suzuki", text: "Preparation means removing everything that could become an excuse.", note: "Read last session's notes before you walk in." },
  { by: "Bruce Lee", text: "Be water, my friend.", note: "Adjust the plan to the client in front of you today." },
  { by: "Sun Tzu", text: "Know the enemy and know yourself, and you can fight a hundred battles without danger.", note: "Know the client's goal and your own limits." },
  { by: "Miyamoto Musashi", text: "Today is victory over yourself of yesterday.", note: "Compare clients with their past selves, not with others." },
  { by: "Confucius (Analects)", text: "To go too far is as bad as to fall short.", note: "More weight isn't always better coaching." },
  { by: "Japanese proverb", text: "Fall seven times, stand up eight.", note: "A client who came back after a month off is still on track." },
  { by: "Japanese proverb", text: "Even dust, when piled up, becomes a mountain.", note: "One rep, one session, one good habit." },
  { by: "Japanese proverb", text: "Three years sitting on a stone (and it gets warm).", note: "Results come to people who stay." },
  { by: "Japanese proverb", text: "Hurry, and take the long way round.", note: "Good form first. Speed comes later." },
  { by: "Japanese proverb", text: "One meeting, one chance (ichi-go ichi-e).", note: "Treat every session like it's the only one." },
  { by: "FIT STAGE", text: "A good session starts before the client walks in.", note: "Check the handover notes first." },
  { by: "FIT STAGE", text: "People don't quit the gym. They quit when nobody notices them.", note: "Say something specific about their progress today." },
  { by: "FIT STAGE", text: "Mark it done. Your pay and the invoice both wait for it.", note: "Finish your records before you go home." },
  { by: "FIT STAGE", text: "The best program is the one the client actually does.", note: "Simple and repeatable beats perfect." },
  { by: "FIT STAGE", text: "Ask one more question than you think you need.", note: "Pain, sleep, work stress — they all change today's plan." },
  { by: "FIT STAGE", text: "Book the next session before they leave.", note: "Momentum is easier to keep than to restart." },
  { by: "FIT STAGE", text: "Praise the effort, not just the number.", note: "Effort is the part they control." },
  { by: "FIT STAGE", text: "Clean room, clear head, better session.", note: "Reset the space after every client." },
  { by: "FIT STAGE", text: "Write it down so the next coach can pick it up.", note: "A good handover is a gift to your teammate." },
  { by: "FIT STAGE", text: "Small wins, said out loud, become big habits.", note: "Name one win before they leave." },
  { by: "FIT STAGE", text: "Be early. Being on time is already late.", note: "Five minutes to prepare changes the whole hour." },
  { by: "FIT STAGE", text: "Every trial lesson is someone's first brave step.", note: "Make it easy to come back." },
];

export function randomQuoteEn(exclude?: string): DailyQuote {
  const pool = exclude ? DAILY_QUOTES_EN.filter((q) => q.text !== exclude) : DAILY_QUOTES_EN;
  const list = pool.length > 0 ? pool : DAILY_QUOTES_EN;
  return list[Math.floor(Math.random() * list.length)];
}

export const DAILY_MISSIONS_EN: string[] = [
  "Tell one client exactly what got better since last month.",
  "Write a handover note for every session today.",
  "Ask one client about their sleep this week.",
  "Mark every finished session as done before you go home.",
  "Book the next session before each client leaves.",
  "Send a short message to a client you haven't seen in two weeks.",
  "Film one set and show the client their form.",
  "Teach one client a 5-minute routine for home.",
  "Ask one client what their goal is for next month.",
  "Check your schedule for tomorrow and confirm any gaps.",
  "Learn one new thing about a regular client.",
  "Finish five minutes early and tidy the room for the next coach.",
  "Use the client's name three times in the session.",
  "End each session with one clear win you say out loud.",
  "Ask one trial client what made them book today.",
];

export function missionOfTheDayEn(now: Date | number = Date.now()): string {
  return DAILY_MISSIONS_EN[(dayNumber(now) + 7) % DAILY_MISSIONS_EN.length];
}

export const DAILY_TIPS_EN: DailyTip[] = [
  { title: "Protein spread", body: "Spreading protein across meals (about 20–40 g each) supports muscle better than one big serving." },
  { title: "Sleep and recovery", body: "Short sleep raises hunger hormones and lowers training quality. Ask about sleep before adding load." },
  { title: "Walking counts", body: "Daily steps add up to more energy use than most people's workouts. Encourage a walk after meals." },
  { title: "Warm-up", body: "A few light sets of the first exercise is often the best warm-up — specific and quick." },
  { title: "Progress, not perfection", body: "Adding one rep or a little weight each week is real progress. Track it so clients can see it." },
  { title: "Hydration", body: "Thirst and fatigue are easy to mix up. Remind clients to drink water, especially in summer." },
  { title: "Rest between sets", body: "For strength, longer rests (2–3 minutes) usually allow better sets than rushing." },
  { title: "Posture breaks", body: "For desk workers, a short movement break every hour helps more than one long stretch at night." },
  { title: "Soreness", body: "Muscle soreness isn't a sign of a good workout. Consistency matters more than feeling wrecked." },
  { title: "Breathing", body: "Exhale on the effort and avoid holding the breath for long with older or new clients." },
];

export function tipOfTheDayEn(now: Date | number = Date.now()): DailyTip {
  return DAILY_TIPS_EN[(dayNumber(now) + 3) % DAILY_TIPS_EN.length];
}

const FORTUNE_LEVELS_EN: { level: string; emoji: string; message: string }[] = [
  { level: "Excellent", emoji: "🎊", message: "Your suggestions land today. Ask the bold question." },
  { level: "Excellent", emoji: "🎊", message: "Your energy carries the room. Lead from the front." },
  { level: "Great", emoji: "🌞", message: "Back to basics is your strongest move today." },
  { level: "Great", emoji: "🌞", message: "Someone you messaged will reply." },
  { level: "Good", emoji: "🍀", message: "Do small things carefully. They pay off today." },
  { level: "Good", emoji: "🍀", message: "A good day to try a new exercise." },
  { level: "Fair", emoji: "☁️", message: "No rush. Stick with the usual weight." },
  { level: "Fair", emoji: "☁️", message: "Listening works better than talking today." },
  { level: "Growing", emoji: "🌱", message: "If it doesn't go well, no worries. It helps tomorrow." },
  { level: "Growing", emoji: "🌱", message: "Just getting prepared is enough today." },
];
const LUCKY_ITEMS_EN = ["Squats", "Deadlifts", "Planks", "Push-ups", "Lunges", "Rows", "Hip thrusts", "Farmer's carry", "Stretching", "A long walk", "Kettlebell swings", "Glute bridges"];

export function fortuneOfTheDayEn(now: Date | number = Date.now(), memberId?: string): DailyFortune {
  const day = dayNumber(now);
  return {
    ...FORTUNE_LEVELS_EN[hashOf(`${memberId ?? "-"}:${day}`) % FORTUNE_LEVELS_EN.length],
    item: LUCKY_ITEMS_EN[hashOf(`item:${memberId ?? "-"}:${day}`) % LUCKY_ITEMS_EN.length],
  };
}

export function seasonalEn(now: Date | number = Date.now()): Seasonal | null {
  const t = typeof now === "number" ? now : now.getTime();
  const d = new Date(t + JST);
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const dow = d.getUTCDay();
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), m, 0)).getUTCDate();
  const md = `${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (md === "01-01") return { emoji: "🎍", text: "Happy New Year! Let's make it a great one." };
  if (m === 1 && day <= 3) return { emoji: "🎍", text: "New Year holidays — a perfect time to ask clients about this year's goal." };
  if (md === "12-31") return { emoji: "🎍", text: "Thanks for a great year. See you next year!" };
  if (m === 12 && day >= 29) return { emoji: "🎍", text: "End of the year — tell clients one thing that changed for them." };
  if (md === "12-24" || md === "12-25") return { emoji: "🎄", text: "Merry Christmas. Anyone training today is serious." };
  if (md === "10-31") return { emoji: "🎃", text: "Happy Halloween. Watch the candy." };
  if (md === "02-14") return { emoji: "🍫", text: "Valentine's Day. Burn the chocolate off with squats." };
  if (m === 4 && day <= 10) return { emoji: "🌸", text: "New fiscal year in Japan — lots of \"this year for sure\" people." };
  if (m === 7 || m === 8) return { emoji: "☀️", text: "It's hot. Remind everyone to drink water." };
  if (m === 1 && day >= 4 && day <= 15) return { emoji: "💪", text: "January is the busiest gym month. Be kind to first-timers." };
  if (day === 1) return { emoji: "🚀", text: "A new month starts. Is your schedule filling up?" };
  if (day === lastDay) return { emoji: "🏁", text: "Last day of the month. Make sure every session is marked done." };
  if (dow === 5) return { emoji: "🙌", text: "It's Friday. Great work this week." };
  if (dow === 1) return { emoji: "☕️", text: "Monday. Take a quick look at this week's schedule." };
  return null;
}

export function greetingEn(now: Date | number = Date.now()): string {
  const h = new Date((typeof now === "number" ? now : now.getTime()) + JST).getUTCHours();
  if (h < 5) return "Working late — thank you";
  if (h < 11) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Great work today";
  return "Good evening";
}
