export interface ScriptStep {
  role: "ai" | "user";
  text: string;
  delay: number; // ms before showing this message
}

export const INTAKE_SCRIPT: ScriptStep[] = [
  {
    role: "ai",
    text: "I see 13 items here. Looks like a food delivery product — I can see references to restaurants, menus, and delivery tracking.\n\nLet me look for patterns... I notice a few clusters: several items around checkout and payments, a couple about search and discovery, some about customer support, and a few standalone tasks.\n\nBefore I organize these — what's the business trying to achieve right now? What are the top priorities?",
    delay: 1200,
  },
  {
    role: "user",
    text: "We need to grow our user base and also reduce the load on customer support — it's killing us.",
    delay: 0,
  },
  {
    role: "ai",
    text: "So two main goals: grow users and reduce support load. Let me map your items to those.\n\nFor user growth — the checkout, onboarding, and search items seem related. For support — the tracking, issue reporting, and order accuracy items.\n\nDoes this split feel right?",
    delay: 1000,
  },
  {
    role: "user",
    text: "Yes, that makes sense. The checkout stuff is really about getting new users to complete their first order.",
    delay: 0,
  },
  {
    role: "ai",
    text: "That's a great reframe. So the outcome isn't \"build new checkout\" — it's \"new users complete their first order.\"\n\nDo you know what the current first-order rate is? That would help set a target.",
    delay: 800,
  },
  {
    role: "user",
    text: "We think about 40% of signups never order. So maybe we want 60% completing within the first week.",
    delay: 0,
  },
  {
    role: "ai",
    text: "Good — \"First-order rate above 60% within 7 days\" is a clear measure.\n\nNow, I notice you have \"User interviews for onboarding drop-off\" in here. That's discovery work — understanding the problem before building solutions. The checkout redesign and promo codes are delivery work. Having both is healthy.\n\nLet me structure the rest...",
    delay: 1500,
  },
  {
    role: "ai",
    text: "Here's what I've put together:\n\nTwo business goals, four outcomes, your items mapped to them, and a few items I couldn't confidently link to an outcome — those go in \"Unlinked\" for now.\n\nOne thing I noticed: \"Order accuracy improves\" doesn't have a measure of success yet. That's something to think about.\n\nReady to see your board?",
    delay: 2000,
  },
  {
    role: "user",
    text: "Let's see it!",
    delay: 0,
  },
];
