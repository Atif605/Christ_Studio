const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// serviceAccountKey.json کی موجودگی کی تصدیق کریں
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("Error: serviceAccountKey.json is missing in the root directory!");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// فائر بیس ایڈمن ایس ڈی کے کو ماڈیولر طریقے سے شروع کریں
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// اپ لوڈ کرنے کے لیے دستیاب لیولز
const stages = [
  { id: 'beginner', name: 'Beginner', urduName: 'ابتدائی' },
  { id: 'elementary', name: 'Elementary', urduName: 'بنیادی پختگی' },
  { id: 'intermediate', name: 'Intermediate', urduName: 'متوسط' }
];

async function uploadData() {
  console.log("Starting Firebase Spark Plan Optimized Seeding Process...");

  for (const stage of stages) {
    const jsonPath = path.join(__dirname, 'triviadata', `${stage.id}.json`);

    if (!fs.existsSync(jsonPath)) {
      console.warn(`File not found: ${jsonPath} - Skipping.`);
      continue;
    }

    try {
      const rawData = fs.readFileSync(jsonPath, 'utf8');
      const dayArray = JSON.parse(rawData);

      // فلیٹ ارے کو دنوں کے نقشے (days map) میں تبدیل کریں تاکہ ایک دستاویز میں محفوظ کیا جا سکے
      const daysMap = {};
      dayArray.forEach(item => {
        daysMap[item.dayNumber] = item.questions;
      });

      console.log(`Uploading entire '${stage.name}' stage as a single optimized document...`);

      // 'trivia_stages' کلیکشن کے اندر متعلقہ دستاویز بنائیں
      await db.collection('trivia_stages').doc(stage.id).set({
        id: stage.id,
        name: stage.name,
        urduName: stage.urduName,
        days: daysMap
      }, { merge: true });

      console.log(`Successfully uploaded ${stage.name} (1 Document Write).`);
    } catch (error) {
      console.error(`Error processing ${stage.name}:`, error);
    }
  }

  console.log("Database upload process finished successfully.");
  process.exit(0);
}

uploadData();