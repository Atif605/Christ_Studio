import { Devotional, SpotlightSlide } from '../types';

export const SEED_SPOTLIGHTS: (SpotlightSlide & {
  urduTitle?: string;
  urduSubtitle?: string;
  urduActionText?: string;
})[] = [
  {
    id: "promo-seed-1",
    title: "Echoes of Eternity: Praise Night",
    urduTitle: "ابدیت کی گونج: حمد و ثنا کی رات",
    subtitle: "Join us this coming Friday for a global, ad-free online worship night with worship leaders from across the region.",
    urduSubtitle: "اگلے جمعہ کو ہمارے ساتھ آن لائن لائیو عبادت کی رات میں شریک ہوں، جس میں پورے خطے کے رہنما شامل ہوں گے۔",
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
    actionText: "Join Worship",
    urduActionText: "عبادت میں شامل ہوں",
    actionLink: "#prayer-wall"
  },
  {
    id: "promo-seed-2",
    title: "Daily Quiet Time Masterclass",
    urduTitle: "خلوت کا وقت: ماسٹر کلاس",
    subtitle: "A practical study guide on how to establish structured, distraction-free morning study routines.",
    urduSubtitle: "روزانہ صبح کے مطالعہ کے معمولات کو منظم اور مستند بنانے کے لیے ایک عملی اور گہرا گائیڈ۔",
    imageUrl: "https://images.unsplash.com/photo-1504052434569-70ad58565b90?auto=format&fit=crop&w=1200&q=80",
    actionText: "Read Study Guide",
    urduActionText: "مطالعہ شروع کریں",
    actionLink: "https://replit.com"
  }
];

export const SEED_DEVOTIONALS: (Devotional & {
  urduTitle?: string;
  urduScriptureText?: string;
  urduBody?: string;
  urduReflectionQuestion?: string;
  urduCategory?: string;
})[] = [
  {
    id: "dev-seed-1",
    title: "Guarding Your Focus",
    urduTitle: "اپنی توجہ کی حفاظت",
    scriptureRef: "Proverbs 4:25",
    scriptureText: "Let your eyes look straight ahead; fix your gaze directly before you.",
    urduScriptureText: "تیری آنکھیں سامنے ہی لگی رہیں اور تیری پلکیں تیرے آگے سیدھی رہیں۔",
    body: "In a world filled with endless notifications, commercial algorithms, and secondary noise, maintaining a clear path of discipleship requires continuous effort. Guarding your focus isn't merely about shutting out negative influences, but intentionally reserving space for the voice of the Holy Spirit. Ensure your daily routine has a dedicated window for study and prayer.",
    urduBody: "بے شمار نوٹیفیکیشنز اور دنیاوی خلفشار سے بھری دنیا میں، ایمان کی راہ پر قائم رہنے کے لیے مسلسل جدوجہد کی ضرورت ہوتی ہے۔ اپنی توجہ کی حفاظت کرنا صرف بری چیزوں سے بچنا نہیں ہے، بلکہ ارادی طور پر روح القدس کی آواز کے لیے وقت نکالنا ہے۔ اپنے روزانہ کے معمول میں دعا اور کلام کے لیے ایک وقت مقرر کریں۔",
    reflectionQuestion: "What is currently the biggest distraction competing for your spiritual focus today?",
    urduReflectionQuestion: "آج آپ کی روحانی توجہ کے راستے میں سب سے بڑی رکاوٹ یا خلفشار کیا ہے؟",
    category: "Discipleship",
    urduCategory: "شاگردی",
    dateString: "Today"
  },
  {
    id: "dev-seed-2",
    title: "Standing in Spiritual Agreement",
    urduTitle: "روحانی اتفاق میں کھڑے ہونا",
    scriptureRef: "Matthew 18:19",
    scriptureText: "Again, truly I tell you that if two of you on earth agree about anything they ask for, it will be done for them by my Father in heaven.",
    urduScriptureText: "پھر مَیں تم سے سچ کہتا ہوں کہ اگر تم میں سے دو شخص زمین پر کسی بات کے لیے متفق ہو جائیں تو وہ میرے باپ کی طرف سے ہو جائے گی۔",
    body: "Intercession is a primary pillar of Christian fellowship. When we bring our burdens to the Prayer Wall and stand in agreement with another brother or sister, we are demonstrating covenant unity. Agreement isn't just about sharing a request, but locking shields with others in faith, believing in God's promises.",
    urduBody: "دوسروں کے لیے شفاعت کرنا مسیحی رفاقت کا ایک بنیادی ستون ہے۔ جب ہم اپنی ضرورتیں دعائیہ دیوار پر لاتے ہیں اور کسی دوسرے بہن بھائی کے ساتھ دعا میں متفق ہوتے ہیں، تو ہم ایمانی اتحاد کا مظاہرہ کرتے ہیں۔ اتفاق صرف ضرورت کا اشتراک نہیں ہے، بلکہ ایمان میں ایک دوسرے کا ساتھ دینا ہے۔",
    reflectionQuestion: "How can you support someone on the Prayer Wall today as an act of unity?",
    urduReflectionQuestion: "آج آپ دعائیہ دیوار پر کسی کے لیے آمین کہہ کر ان کا ساتھ کیسے دے سکتے ہیں؟",
    category: "Prayer",
    urduCategory: "دعا",
    dateString: "Yesterday"
  }
];