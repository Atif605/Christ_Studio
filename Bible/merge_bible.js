const fs = require('fs');
const path = require('path');

// 1. Exact File Paths pointing to your "Bible" folder
const englishFilePath = path.join(process.cwd(), 'Bible', 'Genesis.json');
const urduFilePath = path.join(process.cwd(), 'Bible', 'genesis_ur.txt');
const outputFilePath = path.join(process.cwd(), 'new_bible_data.json');

console.log('🔄 Searching Files at:');
console.log(`- English: ${englishFilePath}`);
console.log(`- Urdu:    ${urduFilePath}`);

// 2. Read English JSON and Urdu Text File
let englishData, urduText;

try {
  englishData = JSON.parse(fs.readFileSync(englishFilePath, 'utf8'));
  urduText = fs.readFileSync(urduFilePath, 'utf8');
} catch (err) {
  console.error('❌ File Reading Error:', err.message);
  process.exit(1);
}

// 3. Helper to parse Urdu verses accurately
function parseUrduVerses(rawText) {
  const chaptersMap = {};
  
  // Split by Chapter Header (پَیدائش X)
  const chapterBlocks = rawText.split(/پَیدائش\s+(\d+)/g);

  for (let i = 1; i < chapterBlocks.length; i += 2) {
    const chNum = parseInt(chapterBlocks[i], 10);
    const content = chapterBlocks[i + 1];

    // Regex to capture verse numbers and text
    const verseMatches = [...content.matchAll(/(\d+)([\s\S]*?)(?=(?:\d+|$))/g)];
    const versesMap = {};

    verseMatches.forEach(match => {
      const verseNum = parseInt(match[1], 10);
      let verseText = match[2].trim();

      // Clean up standalone headings if present
      verseText = verseText.replace(/^[^\n]*\n(?=\d+)/, '').trim();
      verseText = verseText.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ');

      if (verseNum && verseText) {
        versesMap[verseNum] = verseText;
      }
    });

    chaptersMap[chNum] = versesMap;
  }

  return chaptersMap;
}

console.log('⚡ Merging Genesis Urdu and English verses...');

const urduChapters = parseUrduVerses(urduText);
const mergedOutput = [];

// 4. Merge English & Urdu chapter by chapter
englishData.chapters.forEach(ch => {
  const chapterNum = parseInt(ch.chapter, 10);
  const urduVersesForCh = urduChapters[chapterNum] || {};

  const mergedVerses = ch.verses.map(v => {
    const verseNum = parseInt(v.verse, 10);
    return {
      verseNum: verseNum,
      textUrdu: urduVersesForCh[verseNum] || '',
      textEng: v.text
    };
  });

  mergedOutput.push({
    docId: `book_1_chapter_${chapterNum}`,
    bookNum: 1,
    bookNameUrdu: "پیدائش",
    bookNameEng: "Genesis",
    chapterNum: chapterNum,
    verses: mergedVerses
  });
});

// 5. Save output file in the main folder for Firebase Upload
fs.writeFileSync(outputFilePath, JSON.stringify(mergedOutput, null, 2), 'utf8');

console.log('--------------------------------------------------');
console.log('🎉 SUCCESS: Created "new_bible_data.json" successfully!');
console.log(`📁 File saved at: ${outputFilePath}`);
console.log('--------------------------------------------------');