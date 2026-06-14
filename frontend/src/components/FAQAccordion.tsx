"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQ } from "@/data/faqs";

interface FAQAccordionProps {
  faqs: FAQ[];
}

export default function FAQAccordion({ faqs }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<number | null>(null);

  const toggleFAQ = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {faqs.map((faq) => (
        <div 
          key={faq.id} 
          className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden transition-all duration-200 hover:border-gray-600"
        >
          <button
            onClick={() => toggleFAQ(faq.id)}
            className="w-full text-left px-6 py-4 flex items-center justify-between focus:outline-none"
            aria-expanded={openId === faq.id}
          >
            <span className="font-semibold text-lg text-gray-100">{faq.question}</span>
            <ChevronDown 
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                openId === faq.id ? "transform rotate-180 text-white" : ""
              }`} 
            />
          </button>
          
          <div 
            className={`transition-all duration-300 ease-in-out ${
              openId === faq.id ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            } overflow-hidden`}
          >
            <div className="px-6 pb-5 pt-1 text-gray-400 leading-relaxed">
              {faq.answer}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
