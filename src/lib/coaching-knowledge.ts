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
      "Jos tämä outcome onnistuu, mitä näet käyttäjädatassa kuukauden päästä?",
      "Mikä on se konkreettinen käyttäytymismuutos jonka voisit mitata?",
      "Mistä tiedät erottaa onnistumisen ja epäonnistumisen — mikä on raja-arvo?",
    ],
    suggestedActions: [
      "Määrittele konkreettinen mittari: [käyttäytyminen] [suunta] [tavoitearvo] [aikajänne]",
      "Kysy tiimiltä: 'Jos tämä onnistuu, mitä näemme datassa?'",
    ],
  },
  "output-only-goal": {
    id: "output-only-goal",
    name: "Output-Only Goal",
    layer: "structural",
    philosophy: "Cagan's core distinction: feature teams deliver outputs (features), empowered teams deliver outcomes (results). A goal with only delivery work and zero discovery means the team is executing a roadmap, not solving problems.",
    coachingApproach: "Challenge the assumption that building features equals progress. Ask what they know about the problem vs what they're assuming. Push for at least one discovery item per outcome.",
    exampleQuestions: [
      "Mitkä oletukset teidän pitää validoida ennen kuin rakennatte tämän?",
      "Milloin viimeksi puhuitte käyttäjien kanssa tästä ongelmasta?",
      "Jos tämä feature ei toimi, miten saatte sen selville — ennen vai jälkeen rakentamisen?",
    ],
    suggestedActions: [
      "Lisää vähintään yksi discovery-item jokaiselle outcomelle",
      "Tee 3-5 käyttäjähaastattelua ennen kuin siirrät mitään Ready-sarakkeeseen",
    ],
  },
  "shipped-not-learning": {
    id: "shipped-not-learning",
    name: "Shipped and Forgot",
    layer: "structural",
    philosophy: "Shipping is not success — learning is. Empowered teams measure the impact of what they ship. If you ship and don't check, you're a feature factory with a faster release cycle.",
    coachingApproach: "Don't blame the team — this is the most common anti-pattern. Ask what data they expected to see after launch and whether anyone is looking at it. Suggest moving items to measuring column as a visible signal.",
    exampleQuestions: [
      "Oletteko katsoneet dataa tämän julkaisun jälkeen?",
      "Mitä odotitte tapahtuvan käyttäjädatassa — ja tapahtuiko se?",
      "Kuka tiimistä on vastuussa vaikuttavuuden seurannasta?",
    ],
    suggestedActions: [
      "Siirrä shipped-itemit measuring-sarakkeeseen ja määrittele mitä seuraatte",
      "Varaa 30 min tiimin kanssa: 'Mitä opimme viime julkaisusta?'",
    ],
  },
  "orphan-work": {
    id: "orphan-work",
    name: "Orphan Work",
    layer: "structural",
    philosophy: "Work without a linked outcome is busy work. In Cagan's model, every initiative should trace back to a business result the team owns. Orphan items signal either a missing outcome or work that shouldn't be prioritized.",
    coachingApproach: "Don't assume orphan work is bad — it might reveal a missing outcome. Ask what problem it solves and whether there's an outcome it naturally belongs to.",
    exampleQuestions: [
      "Mikä käyttäytyminen muuttuu tämän myötä?",
      "Liittyykö tämä johonkin outcomeen jota ei vielä ole boardilla?",
      "Jos et tekisi tätä, mitä tapahtuisi — kuka kärsii?",
    ],
    suggestedActions: [
      "Linkitä olemassa olevaan outcomeen tai luo uusi outcome jolle tämä kuuluu",
      "Jos tämä on teknistä velkaa, kysy: 'Mikä käyttäjäongelma pahenee jos emme korjaa tätä?'",
    ],
  },
  "scope-creep": {
    id: "scope-creep",
    name: "Scope Creep",
    layer: "structural",
    philosophy: "Focus is a strategic weapon. Cagan emphasizes that the best teams say no to most things. A goal with 8+ items means the team is trying to do everything.",
    coachingApproach: "Push for ruthless prioritization. Ask which 2-3 items would move the needle most. Suggest splitting the goal or deferring items.",
    exampleQuestions: [
      "Jos saisitte tehdä vain 3 näistä, mitkä valitsisitte?",
      "Onko tämä yksi iso tavoite vai oikeasti kaksi erillistä?",
      "Mikä näistä on must-have vs nice-to-have tämän kvartaalin aikana?",
    ],
    suggestedActions: [
      "Priorisoi 3 tärkeintä itemiä ja siirrä loput seuraavaan kvartaaliin",
      "Harkitse tavoitteen jakamista kahdeksi fokusoidummaksi tavoitteeksi",
    ],
  },
  "stale-discovery": {
    id: "stale-discovery",
    name: "Stale Discovery",
    layer: "structural",
    philosophy: "Discovery that never starts is discovery theater. Writing 'user interviews' on a card is not the same as talking to users.",
    coachingApproach: "Challenge the team on whether they're doing real discovery or just planning to. Push for small, fast experiments.",
    exampleQuestions: [
      "Milloin aiotte oikeasti aloittaa tämän — tällä viikolla?",
      "Mikä on pienin mahdollinen tapa testata tätä oletusta?",
      "Voitteko puhua 3 käyttäjän kanssa tällä viikolla?",
    ],
    suggestedActions: [
      "Siirrä discovering-sarakkeeseen ja varaa ensimmäinen haastattelu tällä viikolla",
      "Muuta laajasta tutkimuksesta pieneksi kokeiluksi: 'Tällä viikolla opin X'",
    ],
  },
  "no-discovery-board-wide": {
    id: "no-discovery-board-wide",
    name: "No Discovery (Board-wide)",
    layer: "structural",
    philosophy: "A board with zero discovery is the purest feature factory signal. The team is executing a predetermined roadmap with no learning loops.",
    coachingApproach: "Be direct: this board shows a team that ships but doesn't learn. Every outcome should have at least one discovery item.",
    exampleQuestions: [
      "Mistä tiedätte että rakennatte oikeaa asiaa?",
      "Mikä on suurin oletus jonka varassa tämä suunnitelma lepää?",
      "Milloin viimeksi puhuitte käyttäjien kanssa?",
    ],
    suggestedActions: [
      "Lisää jokaiselle outcomelle vähintään yksi discovery-item",
      "Aloita riskein oletus: mikä voisi tehdä koko suunnitelman turhaksi?",
    ],
  },
  "discovery-delivery-ratio": {
    id: "discovery-delivery-ratio",
    name: "Low Discovery Ratio",
    layer: "structural",
    philosophy: "A healthy product team balances building with learning. Below 20% discovery means most effort goes to shipping without validating.",
    coachingApproach: "Show the ratio and challenge the team to add discovery for the riskiest bets.",
    exampleQuestions: [
      "Mitkä näistä delivery-itemeistä perustuvat validoituun tietoon vs oletuksiin?",
      "Jos budjetti kiristyisi, mitkä itemit leikkaisitte — ja perustuuko päätös dataan?",
    ],
    suggestedActions: [
      "Tunnista 2-3 riskialtista delivery-itemiä ja lisää niille edeltävä discovery-vaihe",
    ],
  },
  "bottleneck": {
    id: "bottleneck",
    name: "Workflow Bottleneck",
    layer: "structural",
    philosophy: "Flow matters. A pileup in one column signals a systemic problem.",
    coachingApproach: "Ask what's blocking progress. Is it a capacity issue, a dependency, or a prioritization problem?",
    exampleQuestions: [
      "Miksi nämä itemit eivät etene — mikä estää?",
      "Onko tässä riippuvuus toiseen tiimiin tai päätökseen?",
    ],
    suggestedActions: [
      "Tunnista blokkeri ja nosta se esiin tiimin seuraavassa standup/planningissa",
    ],
  },
  "empty-goal": {
    id: "empty-goal",
    name: "Empty Goal",
    layer: "structural",
    philosophy: "A goal without outcomes is a wish without a plan.",
    coachingApproach: "Ask what specific behavior changes would indicate progress toward this goal.",
    exampleQuestions: [
      "Mitkä käyttäytymismuutokset kertoisivat että tämä tavoite etenee?",
      "Miten jaat tämän 1-3 konkreettiseksi outcomeksi?",
    ],
    suggestedActions: [
      "Lisää 1-3 outcomea jotka kuvaavat mitattavia käyttäytymismuutoksia",
    ],
  },
  "measuring-without-measure": {
    id: "measuring-without-measure",
    name: "Measuring Without a Measure",
    layer: "structural",
    philosophy: "Moving cards to 'measuring' without defining what you're measuring is process theater.",
    coachingApproach: "Point out the contradiction: you're in measuring mode but haven't defined the measure.",
    exampleQuestions: [
      "Mitä konkreettista datapistettä seuraatte juuri nyt?",
      "Miten erotatte onnistumisen ja epäonnistumisen?",
    ],
    suggestedActions: [
      "Määrittele outcome'n measureOfSuccess ennen kuin jatkat mittaamista",
    ],
  },
  "all-early-stage": {
    id: "all-early-stage",
    name: "Stalled Outcome",
    layer: "structural",
    philosophy: "If all items for an outcome are still in early stages, the outcome isn't progressing.",
    coachingApproach: "Ask if this is intentionally deferred or if something is blocking progress.",
    exampleQuestions: [
      "Onko tämä tarkoituksella myöhemmäksi vai onko jotain joka estää etenemisen?",
      "Mikä olisi ensimmäinen askel joka siirtäisi tätä eteenpäin?",
    ],
    suggestedActions: [
      "Valitse yksi item ja siirrä se aktiiviseksi — mikä on pienin ensimmäinen askel?",
    ],
  },
  "unbalanced-outcomes": {
    id: "unbalanced-outcomes",
    name: "Unbalanced Outcomes",
    layer: "structural",
    philosophy: "When one outcome has many items and another has very few, it suggests poor decomposition or unclear priorities.",
    coachingApproach: "Ask whether the large outcome should be split, and whether the small one is truly important.",
    exampleQuestions: [
      "Onko tämä iso outcome oikeasti yksi vai pitäisikö se jakaa?",
      "Puuttuuko pieneltä outcomelta itemejä vai onko se jo hyvässä tilassa?",
    ],
    suggestedActions: [
      "Harkitse ison outcome'n jakamista kahdeksi fokusoidummaksi",
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
      "Jos tämä onnistuu täydellisesti, mitä käyttäjät tekevät eri tavalla?",
      "Tämä kuulostaa featurelta — mikä on sen taustalla oleva käyttäytymismuutos?",
    ],
    suggestedActions: [
      "Muotoile outcome uudelleen: '[Käyttäjäryhmä] [tekee asian] [mitattavasti eri tavalla]'",
    ],
  },
  "weak-measure": {
    id: "weak-measure",
    name: "Weak or Vanity Measure",
    layer: "content",
    philosophy: "Vanity metrics (page views, signups) make you feel good but don't tell you if user behavior changed.",
    coachingApproach: "Challenge the measure: does it actually track the behavior change?",
    exampleQuestions: [
      "Mittaako tämä oikeasti sitä käyttäytymismuutosta jonka haluatte?",
      "Voiko tämä mittari nousta ilman että mikään oikeasti paranee?",
    ],
    suggestedActions: [
      "Vaihda mittari sellaiseksi joka kertoo suoraan käyttäytymismuutoksesta",
    ],
  },
  "measure-mismatch": {
    id: "measure-mismatch",
    name: "Measure Doesn't Match Outcome",
    layer: "content",
    philosophy: "A measure that doesn't track the stated outcome creates a disconnect between what you're building and what you're measuring.",
    coachingApproach: "Put the outcome statement and measure side by side. Ask if the measure would move even if the outcome isn't achieved.",
    exampleQuestions: [
      "Jos tämä mittari nousee, tarkoittaako se varmasti että outcome toteutuu?",
      "Voiko mittari parantua vaikka käyttäjät eivät muuta käytöstään?",
    ],
    suggestedActions: [
      "Vaihda mittari sellaiseksi joka suoraan heijastaa outcome'n käyttäytymismuutosta",
    ],
  },
  "assumption-risk": {
    id: "assumption-risk",
    name: "Untested Assumptions",
    layer: "content",
    philosophy: "Building before validating is the biggest waste in product development.",
    coachingApproach: "Ask what assumptions underlie the work. Push for identifying the riskiest one and testing it.",
    exampleQuestions: [
      "Mikä on suurin oletus tämän takana — ja onko se testattu?",
      "Jos tämä oletus on väärä, mitä tapahtuu?",
    ],
    suggestedActions: [
      "Tunnista riskein oletus ja lisää discovery-item sen testaamiseen",
    ],
  },
  "goal-framing": {
    id: "goal-framing",
    name: "Activity Goal (Not Outcome Goal)",
    layer: "content",
    philosophy: "A goal framed as an activity ('Launch X') rather than a business result ('Reduce churn to Y%') focuses the team on doing instead of achieving.",
    coachingApproach: "Reframe the goal from 'do X' to 'achieve Y by doing X'.",
    exampleQuestions: [
      "Mikä on se liiketoimintatulos jonka haluatte — ei se mitä aiotte tehdä?",
      "Jos 'julkaiseminen' onnistuu mutta tulos ei muutu, onko tavoite saavutettu?",
    ],
    suggestedActions: [
      "Muotoile tavoite uudelleen: '[Liiketoimintamittari] [suunta] [tavoitearvo] [aikajänne]'",
    ],
  },
  "solution-as-problem": {
    id: "solution-as-problem",
    name: "Solution Without a Problem",
    layer: "content",
    philosophy: "Describing a solution without articulating the problem is classic output thinking.",
    coachingApproach: "Ask what problem this solves. If the PM can't articulate it, the item needs discovery.",
    exampleQuestions: [
      "Mikä ongelma tämä ratkaisee — ja kenelle?",
      "Mistä tiedätte että tämä on oikea ratkaisu?",
    ],
    suggestedActions: [
      "Lisää kuvaukseen ongelma jonka tämä ratkaisee, tai lisää discovery-item validoimaan tarpeen",
    ],
  },
  "missing-who": {
    id: "missing-who",
    name: "Missing User Segment",
    layer: "content",
    philosophy: "An outcome that says 'users' without specifying which users is too vague to measure or design for.",
    coachingApproach: "Push for specificity. Which users? New vs returning? Power users vs casual?",
    exampleQuestions: [
      "Ketkä käyttäjät tarkalleen — uudet, palaavat, tietty segmentti?",
      "Jos sanot 'käyttäjät', tarkoitatko kaikkia vai jotain tiettyä ryhmää?",
    ],
    suggestedActions: [
      "Tarkenna outcome: '[Tietty käyttäjäryhmä] tekee [konkreettisen asian]'",
    ],
  },
  "vague-goal": {
    id: "vague-goal",
    name: "Vague Goal",
    layer: "content",
    philosophy: "A goal like 'Improve user experience' gives the team no direction.",
    coachingApproach: "Push for specificity: which metric, by how much, by when?",
    exampleQuestions: [
      "Mikä on se yksi numero josta tiedätte onnistuitteko?",
      "Jos sanot 'parantaa', kuinka paljon on tarpeeksi?",
    ],
    suggestedActions: [
      "Tarkenna: '[Mittari] [suunta] [tavoitearvo] [aikajänne]'",
    ],
  },
  "duplicate-intent": {
    id: "duplicate-intent",
    name: "Duplicate Intent",
    layer: "content",
    philosophy: "Multiple items or outcomes addressing the same thing create confusion about ownership and priority.",
    coachingApproach: "Point out the overlap and ask if they should be merged or differentiated.",
    exampleQuestions: [
      "Nämä kaksi tuntuvat käsittelevän samaa asiaa — pitäisikö yhdistää?",
      "Miten nämä eroavat toisistaan konkreettisesti?",
    ],
    suggestedActions: [
      "Yhdistä päällekkäiset itemit tai selkeytä miten ne eroavat",
    ],
  },
  "timeframe-mismatch": {
    id: "timeframe-mismatch",
    name: "Timeframe Mismatch",
    layer: "content",
    philosophy: "When a goal has a short deadline but outcomes require long-term behavior change, expectations don't match reality.",
    coachingApproach: "Flag the mismatch and ask which should be adjusted.",
    exampleQuestions: [
      "Onko tämä aikajänne realistinen tämän laajuiselle muutokselle?",
      "Pitäisikö skaalata tavoite tai pidentää aikajännettä?",
    ],
    suggestedActions: [
      "Tarkista onko aikajänne linjassa outcomes'ien laajuuden kanssa",
    ],
  },
  "discovery-quality": {
    id: "discovery-quality",
    name: "Low-Quality Discovery",
    layer: "content",
    philosophy: "A discovery item without a clear hypothesis or learning goal is just a vague 'research' task.",
    coachingApproach: "Push for a hypothesis: what do you expect to learn, and how will it change your decisions?",
    exampleQuestions: [
      "Mikä on se yksi kysymys johon haluatte vastauksen?",
      "Miten tämän tulos muuttaa sitä mitä rakennatte?",
    ],
    suggestedActions: [
      "Lisää kuvaukseen hypoteesi: 'Uskomme että [X], ja testaamme sen [tavalla]'",
    ],
  },
  "weak-goal-metric": {
    id: "weak-goal-metric",
    name: "Weak Goal Metric",
    layer: "content",
    philosophy: "A goal metric that doesn't connect to measurable business outcomes is a vanity metric. 'Number of features shipped' or 'user satisfaction' without specifics gives the team no real target to aim for.",
    coachingApproach: "Challenge goal-level metrics: do they measure actual business impact or just activity? Push for leading indicators of real behavior change.",
    exampleQuestions: [
      "Jos tämä mittari paranee, parantuuko liiketoiminta oikeasti — vai tuntuuko vain siltä?",
      "Voiko tämä mittari nousta ilman että kenenkään käyttäytyminen muuttuu?",
      "Mikä on se yksi numero jonka liikkuminen kertoo että olette onnistuneet?",
    ],
    suggestedActions: [
      "Korvaa vanity-mittari käyttäytymispohjaisella mittarilla joka kertoo oikeasta muutoksesta",
      "Kysy: 'Jos tämä numero nousee, mitä se tarkoittaa asiakkaillemme?'",
    ],
  },
  "statement-behavior-mismatch": {
    id: "statement-behavior-mismatch",
    name: "Statement-Behavior Mismatch",
    layer: "content",
    philosophy: "An outcome has two key fields: the statement (what we want to achieve) and the behavior change (how user behavior changes). When these tell different stories, the team has unclear intent — they don't know if they're building for a metric or a behavior.",
    coachingApproach: "Put the statement and behaviorChange side by side. If they describe different things, ask which one the team actually cares about.",
    exampleQuestions: [
      "Outcome'n statement ja käyttäytymismuutos kertovat eri tarinaa — kumpi on oikea?",
      "Jos käyttäytymismuutos toteutuu, toteutuuko myös outcome'n statement — vai ovatko ne irrallisia?",
      "Kumpi kuvaa paremmin sitä mitä oikeasti tavoittelette?",
    ],
    suggestedActions: [
      "Yhdenmukaista statement ja behaviorChange — niiden pitäisi kertoa sama tarina eri näkökulmista",
      "Jos ne ovat ristiriidassa, valitse toinen ja muokkaa toista vastaamaan",
    ],
  },
  "misaligned-item": {
    id: "misaligned-item",
    name: "Misaligned Work Item",
    layer: "content",
    philosophy: "A work item should clearly contribute to its outcome's behavior change. If you can't draw a line from the item to the outcome, it's either under the wrong outcome or solving the wrong problem.",
    coachingApproach: "Ask how this specific item moves the outcome's behavior change forward. If the connection is weak, suggest relinking or reconsidering.",
    exampleQuestions: [
      "Miten tämä työ muuttaa käyttäjien käyttäytymistä outcome'n kuvaamalla tavalla?",
      "Jos tämä item valmistuu, liikkuuko outcome'n mittari — miksi?",
      "Onko tämä oikean outcome'n alla vai pitäisikö se linkittää toiseen?",
    ],
    suggestedActions: [
      "Tarkista yhteys: item → outcome'n behaviorChange. Jos ketju on heikko, harkitse uudelleenlinkitystä",
      "Jos item ei selvästi tue mitään outcomea, harkitse onko se tarpeellinen juuri nyt",
    ],
  },
  "goal-outcome-alignment": {
    id: "goal-outcome-alignment",
    name: "Goal-Outcome Misalignment",
    layer: "content",
    philosophy: "An outcome must ladder up to its parent goal — if the outcome doesn't move the goal's metrics, the team is solving the wrong problem.",
    coachingApproach: "Compare the outcome statement to the parent goal's intent and metrics. Ask whether achieving this outcome would actually move the goal forward.",
    exampleQuestions: [
      "Jos tämä outcome toteutuu, liikkuvatko tavoitteen mittarit?",
      "Miten tämä outcome kytkeytyy tavoitteeseen — mikä on ketju?",
      "Voiko tavoite onnistua ilman tätä outcomea — tai epäonnistua huolimatta siitä?",
    ],
    suggestedActions: [
      "Tarkista outcome'n ja tavoitteen mittareiden yhteys — kerro miten outcome vaikuttaa tavoitteeseen",
      "Jos yhteys on heikko, harkitse outcome'n siirtämistä oikeamman tavoitteen alle",
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
