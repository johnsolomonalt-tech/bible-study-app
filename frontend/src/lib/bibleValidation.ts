import { CANONICAL_BOOKS } from './bibleReferences';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Inappropriate, harmful, profane, or malicious patterns
const INAPPROPRIATE_PATTERNS = [
  // Profanity & vulgarity
  /\b(fuck|shit|bitch|asshole|bastard|dick|pussy|cock|cunt|slut|whore)\b/i,
  // Hate speech & slurs
  /\b(nigger|nigga|faggot|kike|chink|spic|retard)\b/i,
  // Explicit sexual / NSFW
  /\b(porn|pornography|hentai|erotic|sex position|nude|naked|blowjob|masturbat)\b/i,
  // Harm, weapons, terrorism, illegal
  /\b(how to (make|build) (a )?(bomb|explosive|weapon|gun)|mass shooting|suicide method|kill yourself)\b/i,
  // Malicious hacking
  /\b(ddos attack|sql injection payload|exploit vulnerability|ransomware|malware script|steal password)\b/i,
];

// Secular domains that are explicitly unrelated to Bible study (unless combined with biblical context)
const UNRELATED_PATTERNS = [
  // Programming & tech code
  /\b(write (a |an )?(python|javascript|typescript|html|css|java|c\+\+|rust|php|sql|bash|ruby|go|swift) (code|script|program|app|bot|scraper)?|python (script|code|scraper)|javascript code|react component|docker container|npm install|debug this error|git push|fix this bug|regex for)\b/i,
  // Crypto & day trading
  /\b(bitcoin price|ethereum prediction|crypto trading|forex signals|buy calls|stock market options|memecoin)\b/i,
  // Sports & pop culture
  /\b(who won the (super bowl|world cup|champions league|nba finals)|nfl scores|premier league standings|celebrity gossip|taylor swift tour|video game cheat|fortnite vbucks)\b/i,
  // Cooking recipes & everyday secular errands
  /\b(recipe for|baking instructions|flight booking|hotel reservation|weather forecast|horoscope|zodiac sign)\b/i,
];

// Theological concepts, biblical figures, doctrines, and religious study terms
const BIBLICAL_TOPICS_REGEX = new RegExp(
  '\\b(' + [
    // God / Trinity / Christ
    'god', 'lord', 'yahweh', 'jehovah', 'jesus', 'christ', 'yeshua', 'messiah', 'holy spirit', 'father', 'son of god', 'son of man', 'creator', 'savior', 'redeemer', 'trinity',
    // Bible / Scripture terms
    'bible', 'biblical', 'scripture', 'scriptural', 'gospel', 'testament', 'chapter', 'verse', 'passage', 'epistle', 'torah', 'tanakh', 'pentateuch', 'septuagint', 'dead sea scrolls', 'apocrypha',
    // Major Biblical Figures
    'moses', 'abraham', 'isaac', 'jacob', 'israel', 'israelites', 'joseph', 'noah', 'adam', 'eve', 'david', 'solomon', 'elijah', 'elisha', 'isaiah', 'jeremiah', 'ezekiel', 'daniel', 'jonah', 'job',
    'peter', 'paul', 'john the baptist', 'mary', 'martha', 'lazarus', 'judas', 'thomas', 'stephen', 'philip', 'timothy', 'titus', 'barnabas', 'silas', 'luke', 'mark', 'matthew',
    'pharaoh', 'caesar', 'pilate', 'herod', 'goliath', 'samson', 'delilah', 'gideon', 'samuel', 'saul', 'esther', 'ruth', 'boaz', 'sarah', 'rebekah', 'rachel',
    'apostle', 'apostles', 'disciple', 'disciples', 'prophet', 'prophets', 'patriarch', 'pharisee', 'pharisees', 'sadducee', 'sadducees', 'gentile', 'gentiles', 'samaritan',
    // Core Doctrines & Theology
    'theology', 'theological', 'doctrine', 'doctrinal', 'covenant', 'grace', 'faith', 'salvation', 'redemption', 'atonement', 'propitiation', 'repentance', 'sin', 'sins', 'sinful', 'forgiveness',
    'resurrection', 'cross', 'crucifixion', 'ascension', 'second coming', 'parousia', 'eternal life', 'heaven', 'hell', 'judgment', 'sheol',
    'justification', 'sanctification', 'glorification', 'righteousness', 'holiness', 'holy', 'creation', 'the fall', 'incarnation', 'sovereignty', 'providence', 'predestination', 'election', 'regeneration',
    // Church & Spiritual Life
    'church', 'body of christ', 'discipleship', 'worship', 'prayer', 'prayers', 'fasting', 'baptism', 'baptize', 'communion', "lord's supper", 'eucharist', 'sabbath', 'fellowship', 'ministry', 'evangelism', 'missions', 'pastor', 'elder', 'deacon',
    'commandment', 'commandments', 'beatitude', 'beatitudes', 'parable', 'parables', 'miracle', 'miracles', 'prophecy', 'prophecies', 'apocalyptic', 'revelation', 'wisdom', 'proverb', 'proverbs', 'sermon on the mount',
    'fruit of the spirit', 'armor of god', 'spiritual warfare', 'peace', 'joy', 'patience', 'agape', 'charity', 'humility', 'mercy', 'hope', 'righteous', 'obedience', 'temptation', 'deliverance', 'blessing',
    'christian', 'christians', 'christianity', 'godly', 'spiritual', 'piety', 'devotion', 'devotional', 'exegesis', 'hermeneutics', 'homiletics', 'apologetics',
    // Locations & History
    'jerusalem', 'zion', 'judea', 'galilee', 'nazareth', 'bethlehem', 'egypt', 'babylon', 'assyria', 'rome', 'corinth', 'ephesus', 'galatia', 'philippi', 'colossae', 'thessalonica', 'antioch',
    'temple', 'tabernacle', 'ark of the covenant', 'passover', 'pentecost', 'exodus', 'exile', 'wilderness'
  ].join('|') + ')\\b',
  'i'
);

// Verse notation pattern like "3:16", "8:28-30", "ch 1 v 2"
const VERSE_CITATION_REGEX = /\b(\d{1,3}:\d{1,3}(-\d{1,3})?|ch(apter)?\.?\s*\d+|v(erse)?\.?\s*\d+)\b/i;

export function validateBiblePrompt(
  prompt: string,
  mode: 'generate' | 'expand' | 'synthesize' = 'generate'
): ValidationResult {
  const trimmed = prompt.trim();

  // 1. Empty check
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Please enter a topic, question, or scripture reference.',
    };
  }

  // 2. Inappropriate / harmful check (checked across all modes)
  for (const pattern of INAPPROPRIATE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        error: 'This prompt is not appropriate for biblical study. Please enter a respectful theological or scripture topic.',
      };
    }
  }

  // 3. For 'expand' and 'synthesize' modes:
  // The user is operating on existing biblical cards on their canvas.
  if (mode === 'expand' || mode === 'synthesize') {
    // Block blatantly off-topic requests (e.g. asking to write python code or sports scores)
    for (const unPattern of UNRELATED_PATTERNS) {
      if (unPattern.test(trimmed) && !BIBLICAL_TOPICS_REGEX.test(trimmed)) {
        return {
          isValid: false,
          error: 'Theologica AI is designed for Bible study. Please enter a request related to Scripture or your canvas cards.',
        };
      }
    }
    return { isValid: true };
  }

  // 4. For 'generate' mode: Ensure the prompt is appropriate and not purely off-topic
  // Check for clearly unrelated secular queries (pure code, sports scores, recipes, crypto)
  for (const unPattern of UNRELATED_PATTERNS) {
    if (unPattern.test(trimmed)) {
      // If the prompt also mentions a biblical/theological term (e.g. "what does the Bible say about money/stocks"), allow it!
      if (!BIBLICAL_TOPICS_REGEX.test(trimmed)) {
        return {
          isValid: false,
          error: 'Theologica AI is designed for Bible study. Please enter a topic, question, or passage related to Scripture or Christian theology.',
        };
      }
    }
  }

  // Accept any prompt that has any theological, scripture, moral, life, or spiritual context.
  // Theologica AI will contextualize and ground the study guide in Scripture and Christian doctrine.
  return { isValid: true };
}
