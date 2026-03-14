export interface AntiPatternPlaybook {
  id: string;
  name: string;
  layer: "structural" | "content";
  philosophy: string;
  coachingApproach: string;
  exampleQuestions: string[];
  suggestedActions: string[];
}

export const PLAYBOOKS: Record<string, AntiPatternPlaybook> = {
  "unmeasured-outcome": {
    id: "unmeasured-outcome",
    name: "Unmeasured Outcome",
    layer: "structural",
    philosophy: "In Cagan's empowered team model, teams own outcomes, not outputs. But you can't own an outcome if you haven't defined what success looks like. Without a measure, 'done' means 'we shipped it' — which is feature factory thinking.",
    coachingApproach: "Don't just say 'add a metric.' Push the PM to think about what behavior change they expect and how they would observe it in real user data. Challenge vanity metrics.",
    exampleQuestions: [
      "If this outcome succeeds, what would you see in user data a month from now?",
      "What is the concrete behavior change you could measure?",
      "How would you distinguish success from failure — what's the threshold?",
    ],
    suggestedActions: [
      "Define a concrete measure: [behavior] [direction] [target value] [timeframe]",
      "Ask the team: 'If this succeeds, what do we see in the data?'",
    ],
  },
  "output-only-goal": {
    id: "output-only-goal",
    name: "Output-Only Goal",
    layer: "structural",
    philosophy: "Cagan's core distinction: feature teams deliver outputs (features), empowered teams deliver outcomes (results). A goal with only delivery work and zero discovery means the team is executing a roadmap, not solving problems.",
    coachingApproach: "Challenge the assumption that building features equals progress. Ask what they know about the problem vs what they're assuming. Push for at least one discovery item per outcome.",
    exampleQuestions: [
      "What assumptions do you need to validate before building this?",
      "When did you last talk to users about this problem?",
      "If this feature doesn't work, how will you find out — before or after building?",
    ],
    suggestedActions: [
      "Add at least one discovery item for each outcome",
      "Conduct 3-5 user interviews before moving anything to the Ready column",
    ],
  },
  "shipped-not-learning": {
    id: "shipped-not-learning",
    name: "Shipped and Forgot",
    layer: "structural",
    philosophy: "Shipping is not success — learning is. Empowered teams measure the impact of what they ship. If you ship and don't check, you're a feature factory with a faster release cycle.",
    coachingApproach: "Don't blame the team — this is the most common anti-pattern. Ask what data they expected to see after launch and whether anyone is looking at it. Suggest moving items to measuring column as a visible signal.",
    exampleQuestions: [
      "Have you looked at the data since this was released?",
      "What did you expect to see in user data — and did it happen?",
      "Who on the team is responsible for tracking impact?",
    ],
    suggestedActions: [
      "Move shipped items to the measuring column and define what you're tracking",
      "Schedule 30 min with the team: 'What did we learn from the last release?'",
    ],
  },
  "orphan-work": {
    id: "orphan-work",
    name: "Orphan Work",
    layer: "structural",
    philosophy: "Work without a linked outcome is busy work. In Cagan's model, every initiative should trace back to a business result the team owns. Orphan items signal either a missing outcome or work that shouldn't be prioritized.",
    coachingApproach: "Don't assume orphan work is bad — it might reveal a missing outcome. Ask what problem it solves and whether there's an outcome it naturally belongs to.",
    exampleQuestions: [
      "What behavior changes as a result of this?",
      "Does this relate to an outcome that isn't on the board yet?",
      "If you didn't do this, what would happen — who suffers?",
    ],
    suggestedActions: [
      "Link to an existing outcome or create a new outcome this belongs to",
      "If this is tech debt, ask: 'What user problem gets worse if we don't fix this?'",
    ],
  },
  "scope-creep": {
    id: "scope-creep",
    name: "Scope Creep",
    layer: "structural",
    philosophy: "Focus is a strategic weapon. Cagan emphasizes that the best teams say no to most things. A goal with 8+ items means the team is trying to do everything.",
    coachingApproach: "Push for ruthless prioritization. Ask which 2-3 items would move the needle most. Suggest splitting the goal or deferring items.",
    exampleQuestions: [
      "If you could only do 3 of these, which would you pick?",
      "Is this one big goal or actually two separate ones?",
      "Which of these are must-have vs nice-to-have this quarter?",
    ],
    suggestedActions: [
      "Prioritize the 3 most important items and defer the rest to next quarter",
      "Consider splitting the goal into two more focused goals",
    ],
  },
  "stale-discovery": {
    id: "stale-discovery",
    name: "Stale Discovery",
    layer: "structural",
    philosophy: "Discovery that never starts is discovery theater. Writing 'user interviews' on a card is not the same as talking to users.",
    coachingApproach: "Challenge the team on whether they're doing real discovery or just planning to. Push for small, fast experiments.",
    exampleQuestions: [
      "When are you actually going to start this — this week?",
      "What's the smallest possible way to test this assumption?",
      "Can you talk to 3 users this week?",
    ],
    suggestedActions: [
      "Move to the discovering column and book the first interview this week",
      "Convert from broad research to a small experiment: 'This week I'll learn X'",
    ],
  },
  "no-discovery-board-wide": {
    id: "no-discovery-board-wide",
    name: "No Discovery (Board-wide)",
    layer: "structural",
    philosophy: "A board with zero discovery is the purest feature factory signal. The team is executing a predetermined roadmap with no learning loops.",
    coachingApproach: "Be direct: this board shows a team that ships but doesn't learn. Every outcome should have at least one discovery item.",
    exampleQuestions: [
      "How do you know you're building the right thing?",
      "What's the biggest assumption this plan rests on?",
      "When did you last talk to users?",
    ],
    suggestedActions: [
      "Add at least one discovery item for each outcome",
      "Start with the riskiest assumption: what could make this entire plan worthless?",
    ],
  },
  "discovery-delivery-ratio": {
    id: "discovery-delivery-ratio",
    name: "Low Discovery Ratio",
    layer: "structural",
    philosophy: "A healthy product team balances building with learning. Below 20% discovery means most effort goes to shipping without validating.",
    coachingApproach: "Show the ratio and challenge the team to add discovery for the riskiest bets.",
    exampleQuestions: [
      "Which of these delivery items are based on validated insights vs assumptions?",
      "If the budget tightened, which items would you cut — and is that decision based on data?",
    ],
    suggestedActions: [
      "Identify 2-3 high-risk delivery items and add a preceding discovery phase for each",
    ],
  },
  "bottleneck": {
    id: "bottleneck",
    name: "Workflow Bottleneck",
    layer: "structural",
    philosophy: "Flow matters. A pileup in one column signals a systemic problem.",
    coachingApproach: "Ask what's blocking progress. Is it a capacity issue, a dependency, or a prioritization problem?",
    exampleQuestions: [
      "Why aren't these items progressing — what's blocking them?",
      "Is there a dependency on another team or decision?",
    ],
    suggestedActions: [
      "Identify the blocker and raise it in the team's next standup/planning",
    ],
  },
  "empty-goal": {
    id: "empty-goal",
    name: "Empty Goal",
    layer: "structural",
    philosophy: "A goal without outcomes is a wish without a plan.",
    coachingApproach: "Ask what specific behavior changes would indicate progress toward this goal.",
    exampleQuestions: [
      "What behavior changes would indicate progress toward this goal?",
      "How would you break this into 1-3 concrete outcomes?",
    ],
    suggestedActions: [
      "Add 1-3 outcomes that describe measurable behavior changes",
    ],
  },
  "measuring-without-measure": {
    id: "measuring-without-measure",
    name: "Measuring Without a Measure",
    layer: "structural",
    philosophy: "Moving cards to 'measuring' without defining what you're measuring is process theater.",
    coachingApproach: "Point out the contradiction: you're in measuring mode but haven't defined the measure.",
    exampleQuestions: [
      "What specific data point are you tracking right now?",
      "How do you distinguish success from failure?",
    ],
    suggestedActions: [
      "Define the outcome's measure of success before continuing to measure",
    ],
  },
  "all-early-stage": {
    id: "all-early-stage",
    name: "Stalled Outcome",
    layer: "structural",
    philosophy: "If all items for an outcome are still in early stages, the outcome isn't progressing.",
    coachingApproach: "Ask if this is intentionally deferred or if something is blocking progress.",
    exampleQuestions: [
      "Is this intentionally deferred or is something blocking progress?",
      "What would be the first step to move this forward?",
    ],
    suggestedActions: [
      "Pick one item and make it active — what's the smallest first step?",
    ],
  },
  "unbalanced-outcomes": {
    id: "unbalanced-outcomes",
    name: "Unbalanced Outcomes",
    layer: "structural",
    philosophy: "When one outcome has many items and another has very few, it suggests poor decomposition or unclear priorities.",
    coachingApproach: "Ask whether the large outcome should be split, and whether the small one is truly important.",
    exampleQuestions: [
      "Is this large outcome actually one thing or should it be split?",
      "Is the small outcome missing items or is it already in good shape?",
    ],
    suggestedActions: [
      "Consider splitting the large outcome into two more focused ones",
    ],
  },
  // --- Layer 2 (content quality) playbooks ---
  "output-not-outcome": {
    id: "output-not-outcome",
    name: "Output Disguised as Outcome",
    layer: "content",
    philosophy: "The single most important distinction in product management. An outcome describes a change in human behavior. An output describes a thing you build.",
    coachingApproach: "Show the PM the difference by reframing their output as a behavior change.",
    exampleQuestions: [
      "If this succeeds perfectly, what would users do differently?",
      "This sounds like a feature — what's the behavior change behind it?",
    ],
    suggestedActions: [
      "Reframe the outcome: '[User segment] [does something] [measurably differently]'",
    ],
  },
  "weak-measure": {
    id: "weak-measure",
    name: "Weak or Vanity Measure",
    layer: "content",
    philosophy: "Vanity metrics (page views, signups) make you feel good but don't tell you if user behavior changed.",
    coachingApproach: "Challenge the measure: does it actually track the behavior change?",
    exampleQuestions: [
      "Does this actually measure the behavior change you want?",
      "Could this metric go up without anything actually improving?",
    ],
    suggestedActions: [
      "Switch to a metric that directly reflects the behavior change",
    ],
  },
  "measure-mismatch": {
    id: "measure-mismatch",
    name: "Measure Doesn't Match Outcome",
    layer: "content",
    philosophy: "A measure that doesn't track the stated outcome creates a disconnect between what you're building and what you're measuring.",
    coachingApproach: "Put the outcome statement and measure side by side. Ask if the measure would move even if the outcome isn't achieved.",
    exampleQuestions: [
      "If this metric improves, does it definitely mean the outcome is achieved?",
      "Could the metric improve even if users don't change their behavior?",
    ],
    suggestedActions: [
      "Switch to a metric that directly reflects the outcome's behavior change",
    ],
  },
  "assumption-risk": {
    id: "assumption-risk",
    name: "Untested Assumptions",
    layer: "content",
    philosophy: "Building before validating is the biggest waste in product development.",
    coachingApproach: "Ask what assumptions underlie the work. Push for identifying the riskiest one and testing it.",
    exampleQuestions: [
      "What's the biggest assumption behind this — and has it been tested?",
      "If this assumption is wrong, what happens?",
    ],
    suggestedActions: [
      "Identify the riskiest assumption and add a discovery item to test it",
    ],
  },
  "goal-framing": {
    id: "goal-framing",
    name: "Activity Goal (Not Outcome Goal)",
    layer: "content",
    philosophy: "A goal framed as an activity ('Launch X') rather than a business result ('Reduce churn to Y%') focuses the team on doing instead of achieving.",
    coachingApproach: "Reframe the goal from 'do X' to 'achieve Y by doing X'.",
    exampleQuestions: [
      "What's the business result you want — not what you plan to do?",
      "If the 'launch' succeeds but results don't change, is the goal achieved?",
    ],
    suggestedActions: [
      "Reframe the goal: '[Business metric] [direction] [target value] [timeframe]'",
    ],
  },
  "solution-as-problem": {
    id: "solution-as-problem",
    name: "Solution Without a Problem",
    layer: "content",
    philosophy: "Describing a solution without articulating the problem is classic output thinking.",
    coachingApproach: "Ask what problem this solves. If the PM can't articulate it, the item needs discovery.",
    exampleQuestions: [
      "What problem does this solve — and for whom?",
      "How do you know this is the right solution?",
    ],
    suggestedActions: [
      "Add the problem this solves to the description, or add a discovery item to validate the need",
    ],
  },
  "missing-who": {
    id: "missing-who",
    name: "Missing User Segment",
    layer: "content",
    philosophy: "An outcome that says 'users' without specifying which users is too vague to measure or design for.",
    coachingApproach: "Push for specificity. Which users? New vs returning? Power users vs casual?",
    exampleQuestions: [
      "Which users exactly — new, returning, a specific segment?",
      "When you say 'users', do you mean everyone or a specific group?",
    ],
    suggestedActions: [
      "Specify the outcome: '[Specific user segment] does [concrete thing]'",
    ],
  },
  "vague-goal": {
    id: "vague-goal",
    name: "Vague Goal",
    layer: "content",
    philosophy: "A goal like 'Improve user experience' gives the team no direction.",
    coachingApproach: "Push for specificity: which metric, by how much, by when?",
    exampleQuestions: [
      "What's the one number that tells you whether you succeeded?",
      "When you say 'improve', how much is enough?",
    ],
    suggestedActions: [
      "Make it specific: '[Metric] [direction] [target value] [timeframe]'",
    ],
  },
  "duplicate-intent": {
    id: "duplicate-intent",
    name: "Duplicate Intent",
    layer: "content",
    philosophy: "Multiple items or outcomes addressing the same thing create confusion about ownership and priority.",
    coachingApproach: "Point out the overlap and ask if they should be merged or differentiated.",
    exampleQuestions: [
      "These two seem to address the same thing — should they be merged?",
      "How do these differ concretely?",
    ],
    suggestedActions: [
      "Merge the overlapping items or clarify how they differ",
    ],
  },
  "timeframe-mismatch": {
    id: "timeframe-mismatch",
    name: "Timeframe Mismatch",
    layer: "content",
    philosophy: "When a goal has a short deadline but outcomes require long-term behavior change, expectations don't match reality.",
    coachingApproach: "Flag the mismatch and ask which should be adjusted.",
    exampleQuestions: [
      "Is this timeframe realistic for a change of this scope?",
      "Should you scale the goal or extend the timeframe?",
    ],
    suggestedActions: [
      "Check whether the timeframe aligns with the scope of the outcomes",
    ],
  },
  "discovery-quality": {
    id: "discovery-quality",
    name: "Low-Quality Discovery",
    layer: "content",
    philosophy: "A discovery item without a clear hypothesis or learning goal is just a vague 'research' task.",
    coachingApproach: "Push for a hypothesis: what do you expect to learn, and how will it change your decisions?",
    exampleQuestions: [
      "What's the one question you want answered?",
      "How will the result of this change what you build?",
    ],
    suggestedActions: [
      "Add a hypothesis to the description: 'We believe [X], and we'll test it by [method]'",
    ],
  },
  "weak-goal-metric": {
    id: "weak-goal-metric",
    name: "Weak Goal Metric",
    layer: "content",
    philosophy: "A goal metric that doesn't connect to measurable business outcomes is a vanity metric. 'Number of features shipped' or 'user satisfaction' without specifics gives the team no real target to aim for.",
    coachingApproach: "Challenge goal-level metrics: do they measure actual business impact or just activity? Push for leading indicators of real behavior change.",
    exampleQuestions: [
      "If this metric improves, does the business actually get better — or does it just feel that way?",
      "Could this metric rise without anyone's behavior changing?",
      "What's the one number whose movement tells you that you've succeeded?",
    ],
    suggestedActions: [
      "Replace the vanity metric with a behavior-based metric that reflects real change",
      "Ask: 'If this number goes up, what does it mean for our customers?'",
    ],
  },
  "statement-behavior-mismatch": {
    id: "statement-behavior-mismatch",
    name: "Statement-Behavior Mismatch",
    layer: "content",
    philosophy: "An outcome has two key fields: the statement (what we want to achieve) and the behavior change (how user behavior changes). When these tell different stories, the team has unclear intent — they don't know if they're building for a metric or a behavior.",
    coachingApproach: "Put the statement and behaviorChange side by side. If they describe different things, ask which one the team actually cares about.",
    exampleQuestions: [
      "The outcome statement and behavior change tell different stories — which one is right?",
      "If the behavior change happens, does the outcome statement also come true — or are they disconnected?",
      "Which one better describes what you're actually going for?",
    ],
    suggestedActions: [
      "Align the statement and behavior change — they should tell the same story from different angles",
      "If they conflict, pick one and adjust the other to match",
    ],
  },
  "misaligned-item": {
    id: "misaligned-item",
    name: "Misaligned Work Item",
    layer: "content",
    philosophy: "A work item should clearly contribute to its outcome's behavior change. If you can't draw a line from the item to the outcome, it's either under the wrong outcome or solving the wrong problem.",
    coachingApproach: "Ask how this specific item moves the outcome's behavior change forward. If the connection is weak, suggest relinking or reconsidering.",
    exampleQuestions: [
      "How does this work change user behavior in the way the outcome describes?",
      "If this item is completed, does the outcome's metric move — why?",
      "Is this under the right outcome or should it be linked to a different one?",
    ],
    suggestedActions: [
      "Check the chain: item -> outcome's behavior change. If the link is weak, consider relinking",
      "If the item doesn't clearly support any outcome, consider whether it's needed right now",
    ],
  },
  "no-metrics-goal": {
    id: "no-metrics-goal",
    name: "Goal Without Metrics",
    layer: "structural",
    philosophy: "A goal without any metrics is a wish. Without defining what success looks like, the team has no way to know if they're making progress or just staying busy.",
    coachingApproach: "Don't just say 'add metrics.' Help the PM think about what would actually change if this goal succeeds. Start from the business impact and work backward to a measurable indicator.",
    exampleQuestions: [
      "Six months from now, how will you know if you succeeded or not?",
      "If you could track only one number, what would it be?",
      "If you had to report to leadership, what number would you show?",
    ],
    suggestedActions: [
      "Define 1-2 metrics that reflect real progress, not activity",
      "Start by measuring the current state: what's the baseline you can set a target against?",
    ],
  },
  "impact-disconnected-goal": {
    id: "impact-disconnected-goal",
    name: "Impact-Disconnected Goal",
    layer: "content",
    philosophy: "A goal that doesn't connect to real business value — revenue, retention, cost, or competitive advantage — is a vanity goal. 'Improve onboarding' sounds specific but doesn't tell you what business impact it creates. The question is always: so what?",
    coachingApproach: "Ask the 'so what' question: if this goal succeeds, what happens to the business? Push for the value chain: goal → user behavior change → business impact. If the PM can't articulate the chain, the goal needs reframing.",
    exampleQuestions: [
      "If this goal succeeds, what changes in the business — revenue, retention, costs?",
      "Who benefits from this concretely — which user segment or stakeholder?",
      "What's the value chain: goal -> behavior change -> business impact?",
    ],
    suggestedActions: [
      "Add a value connection to the goal: '[Metric] improves because [user segment] [changes behavior]'",
      "Ask: 'If this succeeds, what do I tell leadership — why does this matter?'",
    ],
  },
  "goal-missing-baseline": {
    id: "goal-missing-baseline",
    name: "Goal Without Baseline",
    layer: "content",
    philosophy: "A goal with a metric but no baseline is unmeasurable in practice. 'Increase retention to 80%' means nothing if you don't know current retention. Without a baseline, you can't tell if you're moving the needle or standing still.",
    coachingApproach: "Ask what the current state is. If they don't know, that's the first thing to measure — and it's a discovery task, not a delivery task.",
    exampleQuestions: [
      "What's the current level of this metric — do you know?",
      "If you don't know the current level, how will you judge if the change is enough?",
      "Should the first step be measuring the current state before setting a target?",
    ],
    suggestedActions: [
      "Add the current level to the goal: '[Metric] current X -> target Y [timeframe]'",
      "If the current level is unknown, add a discovery item to measure it",
    ],
  },
  "goal-outcome-alignment": {
    id: "goal-outcome-alignment",
    name: "Goal-Outcome Misalignment",
    layer: "content",
    philosophy: "An outcome must ladder up to its parent goal — if the outcome doesn't move the goal's metrics, the team is solving the wrong problem.",
    coachingApproach: "Compare the outcome statement to the parent goal's intent and metrics. Ask whether achieving this outcome would actually move the goal forward.",
    exampleQuestions: [
      "If this outcome is achieved, do the goal's metrics move?",
      "How does this outcome connect to the goal — what's the chain?",
      "Can the goal succeed without this outcome — or fail despite it?",
    ],
    suggestedActions: [
      "Check the connection between outcome and goal metrics — explain how the outcome affects the goal",
      "If the connection is weak, consider moving the outcome under a more fitting goal",
    ],
  },
};

/** Get playbooks for a list of anti-pattern IDs. */
export function getPlaybooksForSignals(antiPatternIds: string[]): AntiPatternPlaybook[] {
  const unique = [...new Set(antiPatternIds)];
  return unique.map((id) => PLAYBOOKS[id]).filter(Boolean);
}

/** Format playbooks for prompt injection — only the relevant ones. */
export function formatPlaybooksForPrompt(playbooks: AntiPatternPlaybook[]): string {
  return playbooks
    .map(
      (p) =>
        `### ${p.name} (${p.id})\n**Why it matters:** ${p.philosophy}\n**Coaching approach:** ${p.coachingApproach}\n**Example questions:** ${p.exampleQuestions.map((q) => `\n- "${q}"`).join("")}\n**Suggested actions:** ${p.suggestedActions.map((a) => `\n- ${a}`).join("")}`
    )
    .join("\n\n");
}
