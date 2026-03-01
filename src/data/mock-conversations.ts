export interface MockMessage {
  role: "ai" | "user";
  text: string;
}

export interface MockConversation {
  nudgeId: string;
  title: string;
  messages: MockMessage[];
}

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    nudgeId: "nudge-1",
    title: "Defining a measure of success",
    messages: [
      {
        role: "ai",
        text: "You want order accuracy to improve. What does 'improve' look like specifically — fewer wrong items, faster corrections, fewer complaints?",
      },
      {
        role: "user",
        text: "Fewer incorrect items in delivered orders",
      },
      {
        role: "ai",
        text: "That's more specific. Do you know the current rate of incorrect orders? A baseline helps set a meaningful target.",
      },
      {
        role: "user",
        text: "We think it's around 8%",
      },
      {
        role: "ai",
        text: "So a measure could be: 'Reduce incorrect item rate from 8% to under 4%.' Does that feel meaningful?",
      },
    ],
  },
  {
    nudgeId: "nudge-2",
    title: "Linking to an outcome",
    messages: [
      {
        role: "ai",
        text: "This crash fix isn't linked to an outcome. Is it related to one of your existing goals, or is it a standalone maintenance task?",
      },
      {
        role: "user",
        text: "It's affecting checkout on Android devices",
      },
      {
        role: "ai",
        text: "Then it might connect to 'New users complete their first order' — if checkout is crashing, that directly blocks the outcome. Want to link it there?",
      },
    ],
  },
  {
    nudgeId: "nudge-3",
    title: "Validating before building",
    messages: [
      {
        role: "ai",
        text: "You're moving 'Build new checkout flow' to Ready, but there's been no discovery work. What makes you confident this is the right solution?",
      },
      {
        role: "user",
        text: "Users have been complaining about checkout for months",
      },
      {
        role: "ai",
        text: "Complaints tell you there's a problem, but not necessarily that a full rebuild is the fix. Have you looked at where users actually drop off in the current flow?",
      },
      {
        role: "user",
        text: "Not specifically, no",
      },
      {
        role: "ai",
        text: "A quick funnel analysis might reveal the biggest friction point — it could be as simple as a confusing payment step rather than a full rebuild. Want to add a discovery step first?",
      },
    ],
  },
];
