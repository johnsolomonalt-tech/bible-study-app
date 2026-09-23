/**
 * Reverse-Interlinear & Original Languages Lexicon
 * 
 * Provides Greek (NT) and Hebrew (OT) original language lemmas, Strong's Concordance codes,
 * phonetic transliterations, theological definitions, and canonical frequency counts.
 */

export interface InterlinearWord {
  id: string;               // e.g. "G3056" or "H2617"
  lemma: string;            // Original script e.g. "λόγος" or "חֶסֶד"
  transliteration: string;  // e.g. "logos" or "chesed"
  strongs: string;          // e.g. "G3056" or "H2617"
  language: 'Greek' | 'Hebrew' | 'Aramaic';
  partOfSpeech: string;     // e.g. "Noun Masculine", "Verb"
  pronunciation: string;    // phonetic guide e.g. "LO-gos"
  gloss: string;            // 1-3 word translation
  definition: string;       // Rich theological definition
  occurrences: number;      // NT or OT frequency
  testament: 'OT' | 'NT';
  keyVerses: string[];
}

export const LEXICON_ENTRIES: Record<string, InterlinearWord> = {
  // --- GREEK (New Testament) ---
  "word": {
    id: "G3056",
    lemma: "λόγος",
    transliteration: "logos",
    strongs: "G3056",
    language: "Greek",
    partOfSpeech: "Noun Masculine",
    pronunciation: "LO-gos",
    gloss: "Word, Divine Reason, Revelation",
    definition: "The divine expression, active reason, and communication of God; personified uniquely in Jesus Christ who made the unseen Father known (John 1:1, 14).",
    occurrences: 330,
    testament: "NT",
    keyVerses: ["John 1:1", "John 1:14", "1 John 1:1", "Hebrews 4:12"]
  },
  "god": {
    id: "G2316",
    lemma: "θεός",
    transliteration: "theos",
    strongs: "G2316",
    language: "Greek",
    partOfSpeech: "Noun Masculine",
    pronunciation: "theh-OS",
    gloss: "God, The Supreme Deity",
    definition: "The one true transcendent God, Creator and Sovereign of all things, revealed in Father, Son, and Holy Spirit.",
    occurrences: 1317,
    testament: "NT",
    keyVerses: ["John 1:1", "Romans 8:28", "1 Corinthians 8:6", "1 John 4:8"]
  },
  "lord": {
    id: "G2962",
    lemma: "κύριος",
    transliteration: "kurios",
    strongs: "G2962",
    language: "Greek",
    partOfSpeech: "Noun Masculine",
    pronunciation: "KOO-ree-os",
    gloss: "Lord, Sovereign, Master",
    definition: "Master, owner, sovereign ruler. Used in the Septuagint and New Testament as the supreme divine title for YHWH and for the resurrected Christ.",
    occurrences: 717,
    testament: "NT",
    keyVerses: ["Romans 10:9", "Philippians 2:11", "Luke 2:11"]
  },
  "love": {
    id: "G26",
    lemma: "ἀγάπη",
    transliteration: "agape",
    strongs: "G26",
    language: "Greek",
    partOfSpeech: "Noun Feminine",
    pronunciation: "ah-GAH-pay",
    gloss: "Self-sacrificing Love",
    definition: "Unconditional, benevolent, covenantal love; not merely emotional affection, but deliberate, self-sacrificial commitment seeking the ultimate good of the other.",
    occurrences: 116,
    testament: "NT",
    keyVerses: ["1 Corinthians 13:4", "1 John 4:8", "John 15:13", "Romans 5:8"]
  },
  "grace": {
    id: "G5485",
    lemma: "χάρις",
    transliteration: "charis",
    strongs: "G5485",
    language: "Greek",
    partOfSpeech: "Noun Feminine",
    pronunciation: "KHAH-ris",
    gloss: "Grace, Unmerited Favor",
    definition: "Free, unmerited divine favor and operative power bestowed on undeserving sinners, bringing salvation and empowering holy living.",
    occurrences: 156,
    testament: "NT",
    keyVerses: ["Ephesians 2:8", "2 Corinthians 12:9", "Romans 3:24", "John 1:16"]
  },
  "faith": {
    id: "G4102",
    lemma: "πίστις",
    transliteration: "pistis",
    strongs: "G4102",
    language: "Greek",
    partOfSpeech: "Noun Feminine",
    pronunciation: "PEES-tis",
    gloss: "Faith, Trust, Fidelity",
    definition: "Personal reliance and steadfast conviction regarding God's character and promises in Jesus Christ; living faithfulness, not intellectual assent alone.",
    occurrences: 243,
    testament: "NT",
    keyVerses: ["Hebrews 11:1", "Romans 1:17", "Ephesians 2:8", "Galatians 2:20"]
  },
  "peace": {
    id: "G1515",
    lemma: "εἰρήνη",
    transliteration: "eirene",
    strongs: "G1515",
    language: "Greek",
    partOfSpeech: "Noun Feminine",
    pronunciation: "ay-RAY-nay",
    gloss: "Peace, Reconciliation, Rest",
    definition: "The state of tranquil harmony and wholeness resulting from reconciliation with God through Christ, silencing enmity and despair.",
    occurrences: 92,
    testament: "NT",
    keyVerses: ["John 14:27", "Philippians 4:7", "Romans 5:1"]
  },
  "spirit": {
    id: "G4151",
    lemma: "πνεῦμα",
    transliteration: "pneuma",
    strongs: "G4151",
    language: "Greek",
    partOfSpeech: "Noun Neuter",
    pronunciation: "PNEV-mah",
    gloss: "Spirit, Breath, Wind",
    definition: "Breath, wind, spirit; specifically the Holy Spirit—the third person of the Trinity who regenerates, convicts, guides, and empowers believers.",
    occurrences: 379,
    testament: "NT",
    keyVerses: ["John 3:8", "Romans 8:14", "Galatians 5:22", "Acts 1:8"]
  },
  "light": {
    id: "G5457",
    lemma: "φῶς",
    transliteration: "phos",
    strongs: "G5457",
    language: "Greek",
    partOfSpeech: "Noun Neuter",
    pronunciation: "FOCE",
    gloss: "Light, Illumination, Purity",
    definition: "Radiant divine light; the moral and theological antithesis of spiritual darkness, deception, and death.",
    occurrences: 73,
    testament: "NT",
    keyVerses: ["John 1:5", "John 8:12", "1 John 1:5", "Matthew 5:14"]
  },
  "life": {
    id: "G2222",
    lemma: "ζωή",
    transliteration: "zoe",
    strongs: "G2222",
    language: "Greek",
    partOfSpeech: "Noun Feminine",
    pronunciation: "zo-AY",
    gloss: "Life, Vitality, Eternal Life",
    definition: "True, transcendent, uncreated life originating in God; distinguished from mere biological existence (*bios*), denoting union with Christ.",
    occurrences: 135,
    testament: "NT",
    keyVerses: ["John 10:10", "John 14:6", "1 John 5:12", "John 3:16"]
  },
  "truth": {
    id: "G225",
    lemma: "ἀλήθεια",
    transliteration: "aletheia",
    strongs: "G225",
    language: "Greek",
    partOfSpeech: "Noun Feminine",
    pronunciation: "ah-LAY-thay-ah",
    gloss: "Truth, Reality, Verity",
    definition: "That which is objectively real and unhidden; divine truth disclosed in Jesus Christ against all worldly falsehood.",
    occurrences: 109,
    testament: "NT",
    keyVerses: ["John 14:6", "John 8:32", "John 17:17", "Ephesians 4:15"]
  },
  "righteousness": {
    id: "G1343",
    lemma: "δικαιοσύνη",
    transliteration: "dikaiosyne",
    strongs: "G1343",
    language: "Greek",
    partOfSpeech: "Noun Feminine",
    pronunciation: "dee-kai-os-OO-nay",
    gloss: "Righteousness, Justification",
    definition: "Conformity to God's holy standard; the righteous standing imputed to believers through faith in Jesus Christ.",
    occurrences: 92,
    testament: "NT",
    keyVerses: ["Romans 1:17", "Romans 3:21", "2 Corinthians 5:21", "Matthew 5:6"]
  },
  "gospel": {
    id: "G2098",
    lemma: "εὐαγγέλιον",
    transliteration: "euangelion",
    strongs: "G2098",
    language: "Greek",
    partOfSpeech: "Noun Neuter",
    pronunciation: "yoo-ang-GEL-ee-on",
    gloss: "Gospel, Good News",
    definition: "The joyful royal proclamation of victory: the incarnation, atoning death, resurrection, and kingdom reign of Jesus the Messiah.",
    occurrences: 76,
    testament: "NT",
    keyVerses: ["Romans 1:16", "1 Corinthians 15:1-4", "Mark 1:15"]
  },
  "holy": {
    id: "G40",
    lemma: "ἅγιος",
    transliteration: "hagios",
    strongs: "G40",
    language: "Greek",
    partOfSpeech: "Adjective",
    pronunciation: "HAH-gee-os",
    gloss: "Holy, Set Apart, Consecrated",
    definition: "Fundamentally distinct from the profane; consecrated unto God's exclusive possession and bearing His moral purity.",
    occurrences: 233,
    testament: "NT",
    keyVerses: ["1 Peter 1:16", "Romans 12:1", "Revelation 4:8"]
  },
  "glory": {
    id: "G1391",
    lemma: "δόξα",
    transliteration: "doxa",
    strongs: "G1391",
    language: "Greek",
    partOfSpeech: "Noun Feminine",
    pronunciation: "DOX-ah",
    gloss: "Glory, Radiance, Honor",
    definition: "The luminous manifestation of God's majesty, excellence, and supreme worth; the weight of divine presence.",
    occurrences: 166,
    testament: "NT",
    keyVerses: ["John 1:14", "Romans 8:18", "1 Corinthians 10:31"]
  },
  "lamb": {
    id: "G286",
    lemma: "ἀμνός",
    transliteration: "amnos",
    strongs: "G286",
    language: "Greek",
    partOfSpeech: "Noun Masculine",
    pronunciation: "am-NOS",
    gloss: "Lamb, Sacrificial Victim",
    definition: "The young sacrificial lamb; applied uniquely to Jesus as the guiltless offering taking away the sin of the world.",
    occurrences: 4,
    testament: "NT",
    keyVerses: ["John 1:29", "John 1:36", "1 Peter 1:19", "Acts 8:32"]
  },

  // --- HEBREW (Old Testament) ---
  "covenant": {
    id: "H1285",
    lemma: "בְּרִית",
    transliteration: "berit",
    strongs: "H1285",
    language: "Hebrew",
    partOfSpeech: "Noun Feminine",
    pronunciation: "beh-REETH",
    gloss: "Covenant, Sacred Pact",
    definition: "A solemn, binding treaty or relationship established by divine oath, ratified by blood, guaranteeing God's faithfulness to His people.",
    occurrences: 284,
    testament: "OT",
    keyVerses: ["Genesis 15:18", "Jeremiah 31:31", "Exodus 24:8", "Psalm 105:8"]
  },
  "steadfast love": {
    id: "H2617",
    lemma: "חֶסֶד",
    transliteration: "chesed",
    strongs: "H2617",
    language: "Hebrew",
    partOfSpeech: "Noun Masculine",
    pronunciation: "KHEH-sed",
    gloss: "Lovingkindness, Covenant Loyalty",
    definition: "Enduring covenantal mercy, unwavering loyalty, and steadfast devotion flowing from God's gracious character toward His people.",
    occurrences: 248,
    testament: "OT",
    keyVerses: ["Psalm 136:1", "Exodus 34:6", "Lamentations 3:22", "Micah 6:8"]
  },
  "chesed": {
    id: "H2617",
    lemma: "חֶסֶד",
    transliteration: "chesed",
    strongs: "H2617",
    language: "Hebrew",
    partOfSpeech: "Noun Masculine",
    pronunciation: "KHEH-sed",
    gloss: "Lovingkindness, Covenant Loyalty",
    definition: "Enduring covenantal mercy, unwavering loyalty, and steadfast devotion flowing from God's gracious character toward His people.",
    occurrences: 248,
    testament: "OT",
    keyVerses: ["Psalm 136:1", "Exodus 34:6", "Lamentations 3:22", "Micah 6:8"]
  },
  "shalom": {
    id: "H7965",
    lemma: "שָׁלוֹם",
    transliteration: "shalom",
    strongs: "H7965",
    language: "Hebrew",
    partOfSpeech: "Noun Masculine",
    pronunciation: "shah-LOME",
    gloss: "Wholeness, Complete Peace",
    definition: "Comprehensive well-being, harmony, prosperity, safety, and reconciliation within the created order and with Yahweh.",
    occurrences: 237,
    testament: "OT",
    keyVerses: ["Numbers 6:26", "Isaiah 9:6", "Psalm 29:11", "Jeremiah 29:11"]
  },
  "create": {
    id: "H1254",
    lemma: "בָּרָא",
    transliteration: "bara",
    strongs: "H1254",
    language: "Hebrew",
    partOfSpeech: "Verb",
    pronunciation: "bah-RAH",
    gloss: "Create out of nothing",
    definition: "Divine creative activity; in Scripture, God is exclusively the subject of this verb (*creatio ex nihilo*).",
    occurrences: 54,
    testament: "OT",
    keyVerses: ["Genesis 1:1", "Isaiah 40:28", "Psalm 51:10"]
  },
  "shepherd": {
    id: "H7462",
    lemma: "רָעָה",
    transliteration: "ra'ah",
    strongs: "H7462",
    language: "Hebrew",
    partOfSpeech: "Verb / Participle",
    pronunciation: "rah-AH",
    gloss: "Pasture, Tend, Shepherd",
    definition: "To feed, guide, guard, and preserve a flock; the foundational metaphor for Yahweh's tender pastoral care over His covenant people.",
    occurrences: 173,
    testament: "OT",
    keyVerses: ["Psalm 23:1", "Ezekiel 34:11", "Isaiah 40:11"]
  }
};

/**
 * Match a raw English word or transliteration to an original language lexicon entry
 */
export function findInterlinearWord(rawWord: string, isOldTestament = false): InterlinearWord | null {
  if (!rawWord) return null;
  const clean = rawWord.toLowerCase().replace(/[^a-z]/g, '');

  if (LEXICON_ENTRIES[clean]) {
    return LEXICON_ENTRIES[clean];
  }

  // Check special cases
  if (clean === 'shepherd' || clean === 'pasture') return LEXICON_ENTRIES['shepherd'];
  if (clean === 'created' || clean === 'creation' || clean === 'beginning') return isOldTestament ? LEXICON_ENTRIES['create'] : LEXICON_ENTRIES['word'];
  if (clean === 'mercy' || clean === 'kindness' || clean === 'loyalty') return isOldTestament ? LEXICON_ENTRIES['steadfast love'] : LEXICON_ENTRIES['grace'];
  if (clean === 'holy' || clean === 'holiness' || clean === 'sanctified') return LEXICON_ENTRIES['holy'];
  if (clean === 'savior' || clean === 'salvation' || clean === 'save') return isOldTestament ? LEXICON_ENTRIES['shalom'] : LEXICON_ENTRIES['gospel'];
  if (clean === 'lamb' || clean === 'sacrifice') return LEXICON_ENTRIES['lamb'];
  if (clean === 'glory' || clean === 'glorified') return LEXICON_ENTRIES['glory'];

  return null;
}
