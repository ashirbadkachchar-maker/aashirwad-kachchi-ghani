"use client";
import { useState, useRef, useEffect } from "react";
import { useLang } from "./SiteChrome";

type Msg = { role: "user" | "ai"; text: string };

export default function AiChat() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: lang === "hi"? "Namaste! 🙏 Mai aapki kya madad kar sakta hoon? Product, price ya order ke baare me puchiye." : "Hello! 🙏 How can I help you? Ask about products, prices or orders." }
  ]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const newMsgs: Msg[] = [...msgs, { role: "user", text }];
    setMsgs(newMsgs);
    setLoading(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, lang, history: newMsgs.slice(-8) })
      });
      const data = await res.json();
      setMsgs([...newMsgs, { role: "ai", text: data.reply || (lang === "hi"? "Kuch gadbad hui, dobara try karo." : "Something went wrong, try again.") }]);
    } catch {
      setMsgs([...newMsgs, { role: "ai", text: lang === "hi"? "Network error, dobara try karo." : "Network error, try again." }]);
    }
    setLoading(false);
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="AI Chat"
          className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-orange-500 text-white text-2xl shadow-lg hover:bg-orange-600">
          💬
        </button>
      )}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-amber-200 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-2.5 flex justify-between items-center">
            <p className="font-bold text-sm">🤖 {lang === "hi"? "AI Sahayak" : "AI Assistant"}</p>
            <button onClick={() => setOpen(false)} className="text-white text-xl leading-none px-1">×</button>
          </div>
          <div ref={boxRef} className="h-72 overflow-y-auto p-3 space-y-2 bg-amber-50">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-snug ${m.role === "user"? "bg-orange-500 text-white ml-auto rounded-br-sm" : "bg-white border border-amber-100 rounded-bl-sm"}`}>
                {m.text}
              </div>
            ))}
            {loading && <div className="bg-white border border-amber-100 px-3 py-2 rounded-2xl text-sm w-fit">✍️...</div>}
          </div>
          <div className="p-2 flex gap-2 border-t border-amber-100">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={lang === "hi"? "Apna sawal likho..." : "Type your question..."}
              maxLength={500} className="flex-1 border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none" />
            <button onClick={send} disabled={loading} className="bg-orange-500 text-white rounded-xl px-4 font-bold disabled:opacity-50">➤</button>
          </div>
        </div>
      )}
    </>
  );
}
