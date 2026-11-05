const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const chaptersDir = path.join(__dirname, 'chapters');

async function startUpload() {
  console.log("Urdu Bible (Khuda aur Yesu Lafz Correction ke sath) upload ho rahi hai...");
  const folders = fs.readdirSync(chaptersDir);

  for (const folder of folders) {
    const bookNumber = parseInt(folder);
    if (isNaN(bookNumber)) continue;

    const bookPath = path.join(chaptersDir, folder);
    const files = fs.readdirSync(bookPath);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const chapterNumber = parseInt(file.replace('.json', ''));
      const filePath = path.join(bookPath, file);
      const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      const docId = `book_${bookNumber}_chapter_${chapterNumber}`;
      
      const urduVerses = fileData.verses.map(v => {
        let correctedText = v.text || '';
        
        // --- PUBLIC FAITH CORRECTIONS ---
        correctedText = correctedText.replace(/اللہ/g, 'خدا');
        correctedText = correctedText.replace(/عیسیٰ/g, 'یِسُوع');
        correctedText = correctedText.replace(/عیسی/g, 'یِسُوع');
        
        return {
          verseNum: v.verse,
          text: correctedText
        };
      });

      try {
        await db.collection('urdu_bible').doc(docId).set({
          bookNumber: bookNumber,
          bookName: fileData.book_name,
          chapterNumber: chapterNumber,
          verses: urduVerses
        });
        console.log(`Uploaded with Corrections: ${fileData.book_name} - Bab ${chapterNumber}`);
      } catch (err) {
        console.error(`Error uploading ${docId}:`, err);
      }
    }
  }
  console.log("Mubarak ho! Sabhi books mein standard Christian alfaz theek ho chuke hain aur upload mukammal hai.");
}

startUpload();