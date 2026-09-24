# आशीर्बाद कच्चर 🪔

कच्ची घानी शुद्ध तेल, भाटी प्रोडक्ट

## Products
- 🫗 सरसों तेल (कच्ची घानी) — 1kg, 2kg, 5kg
- 🥜 मूंगफली तेल (कोल्ड प्रेस्ड) — 1kg, 2kg, 5kg
- 🟤 तिल कच्चर (गुड़) — 1kg, 2kg
- ⚪ तिल कच्चर (चीनी) — 1kg, 2kg

## Setup
1. Supabase me database SQL chalao (Step 1 + products update)
2. GitHub repo me ye files upload karo
3. Vercel → New Project → repo import → Environment Variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - NEXT_PUBLIC_RAZORPAY_KEY_ID
   - RAZORPAY_KEY_SECRET (secret!)
   - SUPABASE_SERVICE_ROLE_KEY (secret!)
4. Deploy → /admin/setup par pehla admin banao

## Pages
- `/` — Home (products, fayde, public reviews)
- `/product/[id]` — Product detail
- `/cart` — Cart + Razorpay payment
- `/track` — Order tracking (Order No AKC-XXXXXX)
- `/feedback` — Delivery ke baad review
- `/admin` — Seller dashboard
