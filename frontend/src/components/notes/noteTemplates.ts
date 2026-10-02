export interface NoteTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  icon: string;
  content: (dateStr: string) => string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'soap',
    name: 'S.O.A.P. Study Method',
    badge: 'Popular',
    description: 'Scripture, Observation, Application, and Prayer inductive study format.',
    icon: 'BookOpen',
    content: (date) => `# 📖 S.O.A.P. Study: [Passage Reference]
*Date: ${date}* #soap #biblestudy

## 1. Scripture
> "Write or paste the scripture passage here..."
> — **[Book Chapter:Verse]**

## 2. Observation
- **What is happening in this text?**
- What words, commands, or theological themes are repeated?
- Who is speaking and who is the audience?

## 3. Application
- **How does this truth apply directly to my life today?**
- What attitude, habit, or relationship does God want to transform?
- What specific step of obedience will I take this week?
- [ ] Practice: 

## 4. Prayer
> Lord, thank You for Your Word. Help me to walk faithfully in this truth today...
`,
  },
  {
    id: 'sermon',
    name: 'Expository Sermon Notes',
    badge: 'Church',
    description: 'Structured sermon notes with speaker, passage, main points, and action steps.',
    icon: 'Mic',
    content: (date) => `# 🎙️ Sermon: [Sermon Title]
*Date: ${date}* #sermon #church

- **Speaker**: 
- **Passage**: 
- **Series**: 

---

## Big Idea / Central Truth
> Write the core thesis or gospel proposition of the message here.

## Expository Notes & Scripture References
### Point 1: 
- 
- Key Scripture: 

### Point 2: 
- 
- Key Scripture: 

### Point 3: 
- 
- Key Scripture: 

## 3 Key Takeaways
1. 
2. 
3. 

## Life Application & Weekly Obedience
- [ ] How will I live out this sermon between now and next Sunday?
- [ ] Someone I will share or pray with about this truth: 

## Closing Prayer
Lord, seal this Word in my heart so that I do not merely listen, but act upon Your truth.
`,
  },
  {
    id: 'inductive',
    name: 'Inductive Bible Study',
    badge: 'Deep Study',
    description: 'Exhaustive three-step method: Observation, Interpretation, and Application.',
    icon: 'Compass',
    content: (date) => `# 🔍 Inductive Study: [Book & Chapter]
*Date: ${date}* #inductive #exegesis

## Step 1: Observation (What does the text say?)
*Carefully read the text multiple times.*
- **Context & Author**: 
- **Key Repeated Words & Conjunctions**: 
- **Contrasts & Comparisons**: 
- **Tone & Mood**: 

## Step 2: Interpretation (What does the text mean?)
*Look at original meaning for the original audience.*
- **Historical-Cultural Background**: 
- **Theological Themes Revealed**: 
  - *About God / Christ / The Spirit*: 
  - *About Humanity / Sin*: 
  - *About Redemption / Grace*: 
- **Harmonizing Cross-References**: 
  - 

## Step 3: Application (How do I live it out?)
- **Praise**: What attribute of God moves me to worship?
- **Confession**: What sin or blind spot is exposed?
- **Action**: What specific command must I obey today?
- [ ] Immediate action step: 
`,
  },
  {
    id: 'word_study',
    name: 'Word & Character Study',
    badge: 'Original Languages',
    description: 'Study Hebrew and Greek terms, Strong’s concordance, and biblical theology.',
    icon: 'Scroll',
    content: (date) => `# 📜 Word Study: [Word / Concept]
*Date: ${date}* #wordstudy #original-languages

- **Original Word**: [Hebrew / Greek term]
- **Transliteration**: 
- **Strong's Number**: 
- **Primary Meaning / Lexicon Definition**: 

---

## Canonical Occurrences & Translation Nuances
- **Old Testament Usage**: 
- **New Testament Usage / Septuagint**: 

## Key Verses Where This Word Appears
> 

## Theological Significance
*What does this word illuminate about God's covenant, salvation, or holiness?*
- 

## Personal Reflection & Insight
> 
`,
  },
  {
    id: 'prayer_journal',
    name: 'Prayer & Gratitude Journal',
    badge: 'Devotional',
    description: 'Scripture anchor, adoration, confession, thanksgiving, and supplication (ACTS).',
    icon: 'Heart',
    content: (date) => `# 🙏 Prayer & Gratitude Journal
*Date: ${date}* #prayer #gratitude

## Scripture Anchor for Today
> "The LORD is my strength and my shield; in him my heart trusts, and I am helped."
> — **Psalm 28:7**

---

## 🌻 Adoration & Praise
*Worshiping God for who He is and what He has done:*
- 

## 🕊️ Thanksgiving
*Specific blessings, answered prayers, and mercies today:*
- [ ] 
- [ ] 
- [ ] 

## 💧 Confession & Surrender
*Laying down burdens, sins, and anxieties at the Cross:*
- 

## 🤲 Supplication & Intercession
*Prayers for family, church, community, and personal needs:*
- **Family & Loved Ones**: 
- **Spiritual Growth & Wisdom**: 
- **Those Hurting or Needing Christ**: 

## ✝️ Answered Prayers & Praises
- 
`,
  },
  {
    id: 'blank',
    name: 'Blank Study Canvas',
    badge: 'Freeform',
    description: 'A clean slate with quick tags and scripture placeholder ready for your thoughts.',
    icon: 'FileEdit',
    content: (date) => `# [Note Title]
*Date: ${date}* #study

Start typing your notes, reflections, or paste Scripture here...
`,
  },
];
