const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// 1. Service Account Check
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ ERROR: 'serviceAccountKey.json' file maujood nahi hai!");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Ignore system files
const IGNORED_FILES = [
  'serviceAccountKey.json',
  'package.json',
  'package-lock.json',
  'firebase.json',
  'tsconfig.json',
  'components.json'
];

async function startUpload() {
  console.log("🚀 'the_holy_bible' collection mein data upload hona shuru ho raha hai...\n");

  let targetDir = path.join(__dirname, 'Bible-niv-main');
  if (!fs.existsSync(targetDir)) {
    targetDir = path.join(__dirname, 'chapters');
    if (!fs.existsSync(targetDir)) {
      targetDir = __dirname;
    }
  }

  console.log(`📁 Target Folder: ${targetDir}\n`);

  let totalUploaded = 0;
  let batch = db.batch();
  let batchCount = 0;

  try {
    const items = fs.readdirSync(targetDir);

    for (const item of items) {
      if (IGNORED_FILES.includes(item)) continue;

      const itemPath = path.join(targetDir, item);
      const stat = fs.statSync(itemPath);

      // --- Single JSON Files (e.g. Genesis.json) ---
      if (stat.isFile() && item.endsWith('.json')) {
        const fileData = safeParseJSON(itemPath);
        if (!fileData) continue;

        if (fileData.book && Array.isArray(fileData.chapters)) {
          console.log(`📖 Processing Book: ${fileData.book}`);

          fileData.chapters.forEach((ch, idx) => {
            const chapterNumber = parseInt(ch.chapter || (idx + 1));
            const docId = `${fileData.book}_${chapterNumber}`;
            const cleanVersesList = formatVerses(ch.verses || []);

            const docRef = db.collection('the_holy_bible').doc(docId);
            batch.set(docRef, {
              bookName: fileData.book,
              chapterNumber: chapterNumber,
              verses: cleanVersesList
            });

            batchCount++;
            totalUploaded++;
          });
        }
      } 
      // --- Subfolders (e.g. chapters/1/1.json) ---
      else if (stat.isDirectory()) {
        const bookNumber = parseInt(item);
        if (isNaN(bookNumber)) continue;

        const files = fs.readdirSync(itemPath);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const chapterNumber = parseInt(file.replace('.json', ''));
          const fileData = safeParseJSON(path.join(itemPath, file));
          if (!fileData) continue;

          const docId = `book_${bookNumber}_chapter_${chapterNumber}`;
          const cleanVersesList = formatVerses(fileData.verses || []);

          const docRef = db.collection('the_holy_bible').doc(docId);
          batch.set(docRef, {
            bookNumber: bookNumber,
            bookName: fileData.book_name || fileData.book || `Book ${bookNumber}`,
            chapterNumber: chapterNumber,
            verses: cleanVersesList
          });

          batchCount++;
          totalUploaded++;
          console.log(`✅ Queued: ${fileData.book_name || 'Book'} - Chapter ${chapterNumber}`);
        }
      }

      if (batchCount >= 400) {
        await batch.commit();
        console.log("💾 Saved batch of 400 chapters to Firestore...");
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`\n🎉 SUCCESS! Total ${totalUploaded} chapters 'the_holy_bible' collection mein upload ho gaye hain.`);

  } catch (err) {
    console.error("❌ Upload Error:", err);
  }
}

function safeParseJSON(filePath) {
  try {
    let rawContent = fs.readFileSync(filePath, 'utf8').trim();
    const firstBrace = rawContent.indexOf('{');
    const lastBrace = rawContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      rawContent = rawContent.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(rawContent);
  } catch (err) {
    return null;
  }
}

function formatVerses(versesArray) {
  return versesArray.map(v => {
    return {
      verseNum: parseInt(v.verse || v.verseNum || v.number),
      text: v.text || ''
    };
  });
}

startUpload();