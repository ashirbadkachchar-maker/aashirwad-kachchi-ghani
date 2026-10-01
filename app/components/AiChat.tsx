"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "./SiteChrome";

type Msg = { from: "bot" | "user"; text: string };
type PRow = { oil_type: string; pack_size_kg: number; price: number };

// Database fail ho to bhi chalega — backup rates
const FALLBACK: PRow[] = [
  { oil_type: "mustard", pack_size_kg: 1, price: 199 },
  { oil_type: "mustard", pack_size_kg: 2, price: 379 },
  { oil_type: "mustard", pack_size_kg: 5, price: 899 },
  { oil_type: "sesame", pack_size_kg: 1, price: 259 },
  { oil_type: "sesame", pack_size_kg: 2, price: 479 },
  { oil_type: "sesame", pack_size_kg: 5, price: 1099 },
  { oil_type: "gud", pack_size_kg: 1, price: 299 },
  { oil_type: "gud", pack_size_kg: 2, price: 549 },
  { oil_type: "cheeni", pack_size_kg: 1, price: 279 },
  { oil_type: "cheeni", pack_size_kg: 2, price: 519 },
];
const NAMES: Record<string, { hi: string; en: string }> = {
  mustard: { hi: "सरसों का तेल", en: "Mustard Oil" },
  sesame: { hi: "तिल का तेल", en: "Sesame Oil" },
  gud: { hi: "तिल गुड़ कच्चर", en: "Til-Gud Chikki" },
  cheeni: { hi: "तिल चीनी कच्चर", en: "Til-Cheeni Chikki" },
  peanut: { hi: "मूंगफली तेल", en: "Peanut Oil" },
};
const ORDER = ["mustard", "sesame", "gud", "cheeni", "peanut"];
const NORM = (t: string) => {
  const s = (t || "").toLowerCase();
  if (s.includes("mustard") || s.includes("sarso") || s.includes("sarson")) return "mustard";
  if (s.includes("peanut") || s.includes("moongfali") || s.includes("mungfali")) return "peanut";
  if (s.includes("gud")) return "gud";
  if (s.includes("cheeni") || s.includes("chini")) return "cheeni";
  if (s.includes("sesame") || s.includes("til")) return "sesame";
  return s.trim();
};

// --- Database se jawab banane wala engine (koi AI nahi!) ---
function getReply(q: string, rows: PRow[], lang: "hi" | "en"): string {
  const s = " " + q.toLowerCase() + " ";
  const has = (...ws: string[]) => ws.some((w) => s.includes(w));
  const nm = (id: string) => (lang === "hi"? NAMES[id].hi : NAMES[id].en);

  let prod: string | null = null;
  if (has("mustard", "sarso", "sarson", "सरसों")) prod = "mustard";
  else if (has("sesame", "तिल", "til oil", "til ka", "til ke")) prod = "sesame";
  else if (has("peanut", "mungfali", "moongfali", "मूंगफली")) prod = "peanut";
  else if (has("gud", "गुड़")) prod = "gud";
  else if (has("cheeni", "chini", "चीनी")) prod = "cheeni";

  const priceLine = (id: string) => {
    const items = rows.filter((r) => NORM(String(r.oil_type)) === id).sort((a, b) => a.pack_size_kg - b.pack_size_kg);
    return items.map((r) => `${r.pack_size_kg}kg — ₹${r.price}`).join(", ");
  };

  if (has("namaste", "namaskar", "नमस्ते", "hello", "hey", "ram ram", "राम राम", "salaam")) {
    return lang === "hi"
     ? "🙏 नमस्ते! मैं आशीर्वाद कच्चर सहायक हूँ। रेट, डिलीवरी या ऑर्डर के बारे में पूछिए।"
      : "🙏 Hello! I'm the Aashirwad Kachchar assistant. Ask me about rates, delivery or ordering.";
  }
  if (has("thank", "dhanyavad", "धन्यवाद", "shukriya", "शुक्रिया")) {
    return lang === "hi"? "😊 आपका स्वागत है! और कुछ पूछना हो तो बताइए।" : "😊 You're welcome! Let me know if you need anything else.";
  }
  const askRate = has("rate", "price", "kimat", "keemat", "daam", "kitne", "कितने", "रेट", "कीमत", "cost", "charge", "tel", "तेल", "oil", "list", "लिस्ट");
  if (askRate && prod) {
    const line = priceLine(prod);
    if (line) return (lang === "hi"? `🛢️ ${nm(prod)} के रेट:\n${line}` : `🛢️ ${nm(prod)} rates:\n${line}`);
  }
  if (askRate) {
    const lines = ORDER.map((id) => { const l = priceLine(id); return l? `• ${nm(id)}: ${l}` : ""; }).filter(Boolean);
    if (lines.length) return (lang === "hi"? "📋 आज के रेट:\n" : "📋 Today's rates:\n") + lines.join("\n");
  }
  if (has("deliver", "डिलीवरी", "bhejenge", "भेजेंगे", "pahunch", "पहुंच", "shipping", "courier", "kab aayega", "कब आएगा")) {
    return lang === "hi"
     ? "🚚 ऑर्डर के बाद हमारी टीम कॉल करके डिलीवरी कन्फर्म करेगी। भोपालगढ़ क्षेत्र में तेज़ डिलीवरी उपलब्ध है।"
      : "🚚 After ordering, our team will call to confirm delivery. Fast delivery available in the Bhopalgarh area.";
  }
  if (has("order", "buy", "kharid", "खरीद", "ऑर्डर", "mangwana", "मंगवाना", "kaise karein", "कैसे करें")) {
    return lang === "hi"
     ? "🛒 ऑर्डर करना आसान है:\n1️⃣ प्रोडक्ट और साइज़ चुनें\n2️⃣ 'जोड़ें' दबाएं\n3️⃣ कार्ट में जाकर पेमेंट करें — बस!"
      : "🛒 Ordering is easy:\n1️⃣ Choose product & size\n2️⃣ Tap 'Add'\n3️⃣ Go to cart and pay — done!";
  }
  if (has("payment", "paisa", "पैसा", "पैसे", "upi", "pay", "cash", "पेमेंट", "card", "कार्ड")) {
    return lang === "hi"
     ? "💳 पेमेंट UPI / कार्ड से Razorpay द्वारा 100% सुरक्षित होता है।"
      : "💳 Payment via UPI / card is 100% secure through Razorpay.";
  }
  if (has("kahan", "कहां", "address", "location", "pata", "पता", "dukkan", "दुकान", "shop")) {
    return lang === "hi"
     ? "📍 आशीर्वाद कच्चर — जोधपुर रोड, भोपालगढ़ (राजस्थान)।"
      : "📍 Aashirwad Kachchar — Jodhpur Road, Bhopalgarh (Rajasthan).";
  }
  if (has("shuddh", "शुद्ध", "pure", "nakli", "नकली", "asli", "असली", "quality", "क्वालिटी", "chemical", "केमिकल")) {
    return lang === "hi"
     ? "💯 100% शुद्ध कच्ची घानी तेल — कोल्हू में पिसाई, कोई केमिकल या प्रिजर्वेटिव नहीं।"
      : "💯 100% pure kachchi ghani oil — traditionally pressed, no chemicals or preservatives.";
  }
  return lang === "hi"
   ? "😅 माफ कीजिए, मैं ये नहीं समझ पाया।\nआप पूछ सकते हैं: रेट लिस्ट • सरसों तेल का रेट • डिलीवरी • ऑर्डर कैसे करें"
    : "😅 Sorry, I didn't understand that.\nYou can ask: rate list • mustard oil rate • delivery • how to order";
}

export default function AiChat() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PRow[]>(FALLBACK);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [inp, setInp] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("products").select("oil_type, pack_size_kg, price").eq("is_active", true)
     .then(({ data }) => { if (data && data.length) setRows(data as PRow[]); });
  }, []);
  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{ from: "bot", text: lang === "hi"
       ? "🙏 नमस्ते! मैं आशीर्वाद कच्चर सहायक हूँ। रेट, डिलीवरी या ऑर्डर के बारे में पूछिए।"
        : "🙏 Hello! I'm the Aashirwad Kachchar assistant. Ask me about rates, delivery or ordering." }]);
    }
  }, [open]);
  useEffect(() => { boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight }); }, [msgs]);

  const send = (text?: string) => {
    const q = (text?? inp).trim();
    if (!q) return;
    setMsgs((m) => [...m, { from: "user", text: q }]);
    setInp("");
    setTimeout(() => setMsgs((m) => [...m, { from: "bot", text: getReply(q, rows, lang) }]), 350);
  };
  const chips = lang === "hi"
   ? ["📋 रेट लिस्ट", "🛢️ सरसों तेल का रेट", "🚚 डिलीवरी", "🛒 ऑर्डर कैसे करें"]
    : ["📋 Rate list", "🛢️ Mustard oil rate", "🚚 Delivery", "🛒 How to order"];

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Chat support"
          className="fixed bottom-[84px] right-4 z-50 w-12 h-12 rounded-full bg-orange-500 text-white text-2xl shadow-lg flex items-center justify-center active:scale-95 transition">
          💬
        </button>
      )}
      {open && (
        <div className="fixed z-50 right-4 left-4 sm:left-auto bottom-[84px] sm:w-[340px] bg-white rounded-2xl shadow-2xl border border-amber-200 flex flex-col overflow-hidden" style={{ maxHeight: "70vh" }}>
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between">
            <p className="text-white font-bold text-sm">💬 {lang === "hi"? "सहायता" : "Support"}</p>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-white text-lg leading-none">✕</button>
          </div>
          <div ref={boxRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-amber-50/50" style={{ minHeight: 220 }}>
            {msgs.map((m, i) => (
              <div key={i} className={"flex " + (m.from === "user"? "justify-end" : "justify-start")}>
                <p className={"max-w-[80%] text-[13px] px-3 py-2 rounded-2xl whitespace-pre-line leading-snug " + (m.from === "user"? "bg-orange-500 text-white rounded-br-md" : "bg-white border border-amber-100 text-gray-800 rounded-bl-md shadow-sm")}>{m.text}</p>
              </div>
            ))}
          </div>
          <div className="px-3 pt-2 flex gap-1.5 flex-wrap bg-white">
            {chips.map((c) => (
              <button key={c} onClick={() => send(c)} className="text-[11px] font-semibold border border-amber-300 text-amber-700 rounded-full px-2.5 py-1 active:scale-95 transition">{c}</button>
            ))}
          </div>
          <div className="p-3 flex gap-2 bg-white">
            <input value={inp} onChange={(e) => setInp(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder={lang === "hi"? "अपना सवाल लिखें…" : "Type your question…"}
              className="flex-1 text-sm border border-amber-200 rounded-xl px-3 py-2 outline-none focus:border-orange-400" />
            <button onClick={() => send()} aria-label="Send" className="bg-orange-500 text-white rounded-xl px-4 font-bold active:scale-95 transition">➤</button>
          </div>
        </div>
      )}
    </>
  );
}
