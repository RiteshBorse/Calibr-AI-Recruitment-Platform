"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Bot, User } from "lucide-react";
import { useRef, useEffect } from "react";
import React from "react";
import type { ConversationItem } from "../types";

interface ChatListProps {
  items: ConversationItem[];
}

export default function ChatList({ items }: ChatListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [items]);

  return (
    <Card className="backdrop-blur-xl bg-white/5 border border-white/10 mb-6">
      <CardContent className="p-0">
        <div ref={containerRef} className="h-96 overflow-y-auto p-6 space-y-4">
          {items.map((msg, index) => (
            <div key={index} className={`flex gap-4 ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
              {msg.role === "assistant" && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === "assistant" ? "bg-white/10 border border-white/20 rounded-tl-none" : "bg-gradient-to-r from-indigo-500/30 to-rose-500/30 border border-indigo-500/30 rounded-tr-none"}`}>
                {msg.role === "assistant" && msg.question && (
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mb-2 border ${msg.question.category === "technical" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : msg.question.category === "followup" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-purple-500/20 text-purple-300 border-purple-500/30"}`}>
                    {msg.question.category.toUpperCase()}
                    {msg.question.difficulty && ` • ${msg.question.difficulty.toUpperCase()}`}
                  </span>
                )}
                <p className="text-white">{msg.content}</p>
              </div>
              {msg.role === "user" && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}