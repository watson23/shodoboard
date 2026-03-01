import type { BoardState } from "@/types/board";

export const RAW_BACKLOG = `- Build new checkout flow
- Fix Android crash on payment screen
- Migrate to new payment SDK
- User interviews for onboarding drop-off
- Redesign restaurant listing page
- Improve search relevance
- Add promo code support
- Reduce load time on menu page
- Customer satisfaction survey
- Push notifications for delivery updates
- Real-time delivery tracking with ETA (shipped last month)
- In-app issue reporting (shipped, measuring results)
- Restaurant order confirmation step (in progress)`;

export const SEED_DATA: BoardState = {
  goals: [
    {
      id: "goal-1",
      statement: "Grow monthly active users by 30% this year",
      timeframe: "This year",
      metrics: ["Monthly active users", "New user signups", "First-order completion rate"],
      order: 0,
      collapsed: false,
    },
    {
      id: "goal-2",
      statement: "Reduce customer support tickets by 40%",
      timeframe: "This year",
      metrics: ["Support ticket volume", "Self-service resolution rate", "Average resolution time"],
      order: 1,
      collapsed: false,
    },
  ],
  outcomes: [
    {
      id: "outcome-1",
      goalId: "goal-1",
      statement: "New users complete their first order",
      behaviorChange: "Signups convert to paying customers within their first week",
      measureOfSuccess: "First-order rate > 60% within 7 days",
      order: 0,
      collapsed: false,
    },
    {
      id: "outcome-2",
      goalId: "goal-1",
      statement: "Users find what they want quickly",
      behaviorChange: "Users search and place an order without browsing multiple pages",
      measureOfSuccess: "Search-to-order rate > 25%",
      order: 1,
      collapsed: false,
    },
    {
      id: "outcome-3",
      goalId: "goal-2",
      statement: "Customers can resolve delivery issues themselves",
      behaviorChange: "Customers check delivery status and report issues without contacting support",
      measureOfSuccess: "Self-service resolution rate > 70%",
      order: 0,
      collapsed: false,
    },
    {
      id: "outcome-4",
      goalId: "goal-2",
      statement: "Order accuracy improves",
      behaviorChange: "Restaurants confirm order details before preparation",
      measureOfSuccess: "",
      order: 1,
      collapsed: false,
    },
  ],
  items: [
    // Outcome 1: New users complete their first order
    {
      id: "item-1",
      outcomeId: "outcome-1",
      title: "User interviews for onboarding drop-off",
      description: "Interview 5-8 users who signed up but never ordered to understand blockers",
      type: "discovery",
      column: "discovering",
      order: 0,
    },
    {
      id: "item-2",
      outcomeId: "outcome-1",
      title: "Build new checkout flow",
      description: "Redesign the checkout experience to reduce friction and increase completion",
      type: "delivery",
      column: "ready",
      order: 1,
    },
    {
      id: "item-3",
      outcomeId: "outcome-1",
      title: "Add promo code support",
      description: "Allow new users to apply promotional codes during checkout",
      type: "delivery",
      column: "ready",
      order: 2,
    },
    // Outcome 2: Users find what they want quickly
    {
      id: "item-4",
      outcomeId: "outcome-2",
      title: "Redesign restaurant listing page",
      description: "Improve the restaurant browsing experience with better filtering and layout",
      type: "delivery",
      column: "opportunities",
      order: 0,
    },
    {
      id: "item-5",
      outcomeId: "outcome-2",
      title: "Improve search relevance",
      description: "Tune search algorithm to better match user intent with restaurant and menu results",
      type: "delivery",
      column: "opportunities",
      order: 1,
    },
    // Outcome 3: Customers can resolve delivery issues themselves
    {
      id: "item-6",
      outcomeId: "outcome-3",
      title: "Real-time delivery tracking with ETA",
      description: "Live map view with estimated delivery time, shipped last month",
      type: "delivery",
      column: "shipped",
      order: 0,
    },
    {
      id: "item-7",
      outcomeId: "outcome-3",
      title: "In-app issue reporting",
      description: "Self-service flow for reporting delivery issues without calling support",
      type: "delivery",
      column: "measuring",
      order: 1,
    },
    // Outcome 4: Order accuracy improves
    {
      id: "item-8",
      outcomeId: "outcome-4",
      title: "Restaurant order confirmation step",
      description: "Add a confirmation step where restaurants verify order details before preparing",
      type: "delivery",
      column: "building",
      order: 0,
    },
    // Unlinked items
    {
      id: "item-9",
      outcomeId: null,
      title: "Migrate to new payment SDK",
      description: "Replace legacy payment integration with new SDK for better reliability",
      type: "delivery",
      column: "opportunities",
      order: 0,
    },
    {
      id: "item-10",
      outcomeId: null,
      title: "Fix Android crash on payment screen",
      description: "Critical crash affecting Android users during payment, needs urgent fix",
      type: "delivery",
      column: "building",
      order: 1,
    },
    {
      id: "item-11",
      outcomeId: null,
      title: "Reduce load time on menu page",
      description: "Menu page takes 4+ seconds to load, optimize images and API calls",
      type: "delivery",
      column: "opportunities",
      order: 2,
    },
    {
      id: "item-12",
      outcomeId: null,
      title: "Push notifications for delivery updates",
      description: "Send push notifications for order status changes and delivery updates",
      type: "delivery",
      column: "opportunities",
      order: 3,
    },
    {
      id: "item-13",
      outcomeId: null,
      title: "Customer satisfaction survey",
      description: "Post-delivery survey to measure customer satisfaction and identify pain points",
      type: "discovery",
      column: "opportunities",
      order: 4,
    },
  ],
  nudges: [
    {
      id: "nudge-1",
      targetType: "outcome",
      targetId: "outcome-4",
      tier: "visible",
      message: "No measure of success yet.",
      question: "How would you know this worked?",
      status: "active",
    },
    {
      id: "nudge-2",
      targetType: "item",
      targetId: "item-10",
      tier: "quiet",
      message: "Not linked to an outcome.",
      question: "Does this connect to a goal?",
      status: "active",
    },
    {
      id: "nudge-3",
      targetType: "item",
      targetId: "item-2",
      tier: "quiet",
      message: "Moving to Ready without discovery.",
      question: "Are you confident in the problem?",
      status: "active",
    },
    {
      id: "nudge-4",
      targetType: "item",
      targetId: "item-5",
      tier: "visible",
      message: "No discovery work for search relevance.",
      question: "Do you know what users are actually searching for?",
      status: "active",
    },
    {
      id: "nudge-5",
      targetType: "item",
      targetId: "item-9",
      tier: "quiet",
      message: "This is a technical task with no linked outcome.",
      question: "What user behavior does this improve?",
      status: "active",
    },
    {
      id: "nudge-6",
      targetType: "outcome",
      targetId: "outcome-3",
      tier: "visible",
      message: "Two shipped items but no learning yet.",
      question: "What have you learned from the data so far?",
      status: "active",
    },
  ],
  discoveryPrompts: [
    {
      id: "dp-1",
      itemId: "item-1",
      text: "What assumptions are you making about user behavior?",
      checked: false,
    },
    {
      id: "dp-2",
      itemId: "item-1",
      text: "Who could you talk to — 3-5 users or stakeholders?",
      checked: false,
    },
    {
      id: "dp-3",
      itemId: "item-1",
      text: "Is there existing data that shows this is a real problem?",
      checked: false,
    },
    {
      id: "dp-4",
      itemId: "item-1",
      text: "What's the smallest experiment to test this?",
      checked: false,
    },
  ],
};
