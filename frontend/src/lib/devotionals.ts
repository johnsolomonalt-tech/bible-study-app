export interface DevotionalEntry {
  dayOfYear: number;
  morningVerse: string;
  morningText: string;
  eveningVerse: string;
  eveningText: string;
  citation: string;
}

export const DEVOTIONALS: DevotionalEntry[] = [
  {
    dayOfYear: 1,
    morningVerse: "Genesis 1:4 - And God saw the light, that it was good: and God divided the light from the darkness.",
    morningText: "Light might well be good since it sprang from that fiat of goodness, 'Let there be light.' We who have enjoyed it should be of the same mind as our Maker, and realize it to be good in tracing many a comfort to its appearance. Have you the light of the Holy Spirit? If so, bless God for it.",
    eveningVerse: "Psalm 119:105 - Thy word is a lamp unto my feet, and a light unto my path.",
    eveningText: "What a lamp is this! It guides the soul to God, to heaven, and to glory. It reveals the way of salvation, it illuminates the darkest night of sorrow, and it gives the weary traveler a safe and certain path. Trust it tonight, and let its promises comfort your resting heart.",
    citation: "Source: Morning and Evening by Charles Spurgeon"
  },
  {
    dayOfYear: 2,
    morningVerse: "Isaiah 41:10 - Fear thou not; for I am with thee: be not dismayed; for I am thy God.",
    morningText: "The Lord will not leave His people. We may change, our circumstances may shift like the wind, but His promise remains eternally secure. Walk into this day knowing that the Almighty walks beside you, holding your right hand.",
    eveningVerse: "Matthew 11:28 - Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
    eveningText: "The day is done, and the burdens are heavy. Bring them to the Master. Do not carry tomorrow's cares into tonight's rest. Jesus invites you to cast all your anxiety upon Him, for He cares for you.",
    citation: "Source: Morning and Evening by Charles Spurgeon"
  },
  {
    dayOfYear: 3,
    morningVerse: "Lamentations 3:22-23 - It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.",
    morningText: "Every dawn brings a fresh supply of grace. The mercies of yesterday are gone, but today's mercies are already waiting for you. Do not look to your own strength; look to the faithfulness of God, which never falters.",
    eveningVerse: "Psalm 4:8 - I will both lay me down in peace, and sleep: for thou, LORD, only makest me dwell in safety.",
    eveningText: "Peace is not the absence of trouble, but the presence of God. As you close your eyes, remember that the Watchman of Israel neither slumbers nor sleeps. You are safe in His keeping.",
    citation: "Source: Morning and Evening by Charles Spurgeon"
  },
  {
    dayOfYear: 4,
    morningVerse: "Romans 8:28 - And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
    morningText: "Providence is often a mystery, but it is never a mistake. Even the bitterest trials are measured out by a loving Father's hand. Trust that the tapestry He is weaving will one day reveal a masterpiece of grace.",
    eveningVerse: "Philippians 4:6 - Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.",
    eveningText: "Anxiety achieves nothing but exhaustion. Trade your worries for prayer tonight. Let the Lord handle the complexities of your life while you rest in the simplicity of His love.",
    citation: "Source: Morning and Evening by Charles Spurgeon"
  },
  {
    dayOfYear: 5,
    morningVerse: "Psalm 23:1 - The LORD is my shepherd; I shall not want.",
    morningText: "A shepherd provides, protects, and guides. If the Lord is your Shepherd, what could you possibly lack? He will lead you to green pastures today, even if the path first takes you through the rocky valleys.",
    eveningVerse: "John 14:27 - Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.",
    eveningText: "The world's peace is fragile, easily shattered by the slightest storm. Christ's peace is an anchor in the deepest sea. Let it settle your spirit as the night falls.",
    citation: "Source: Morning and Evening by Charles Spurgeon"
  },
  {
    dayOfYear: 6,
    morningVerse: "Proverbs 3:5-6 - Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.",
    morningText: "Human wisdom is a flickering candle; divine wisdom is the blazing sun. Do not rely on your own logic today. Seek His face in every decision, and He will make the way plain before you.",
    eveningVerse: "1 Peter 5:7 - Casting all your care upon him; for he careth for you.",
    eveningText: "Your cares are safe in His hands. He does not merely tolerate your prayers; He invites them because He cares for you deeply and personally. Leave your burdens at the cross tonight.",
    citation: "Source: Morning and Evening by Charles Spurgeon"
  },
  {
    dayOfYear: 7,
    morningVerse: "Isaiah 26:3 - Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.",
    morningText: "A scattered mind breeds chaos, but a mind fixed on Christ experiences perfect peace. Anchor your thoughts on His promises today, and let the storm rage around you while you remain untouched within.",
    eveningVerse: "Psalm 121:1-2 - I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth.",
    eveningText: "Look past the difficulties of the day and fix your gaze on the Creator. The God who spoke the universe into existence is more than capable of handling your needs. Rest in His omnipotence.",
    citation: "Source: Morning and Evening by Charles Spurgeon"
  }
];

// Helper to get the correct entry regardless of dayOfYear
export function getDevotionalForDay(dayOfYear: number): DevotionalEntry {
  const index = (dayOfYear - 1) % DEVOTIONALS.length;
  return DEVOTIONALS[index];
}
