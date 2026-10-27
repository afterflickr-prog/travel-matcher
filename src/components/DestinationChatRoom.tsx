'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  id: number;
  destination: string;
  sender_id: string;
  sender_name: string;
  sender_gender: string;
  sender_age: number;
  content: string;
  created_at: string;
}

interface DestinationChatRoomProps {
  destination: string;
  currentUser: {
    id: string;
    full_name: string;
    gender: string;
    age: number;
  };
  onClose: () => void;
}

export default function DestinationChatRoom({
  destination,
  currentUser,
  onClose,
}: DestinationChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // 1. 抓取該目的地的歷史對話
    async function fetchMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('destination', destination)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
      scrollToBottom();
    }

    fetchMessages();

    // 2. 訂閱該目的地的 Realtime 即時廣播
    const channel = supabase
      .channel('destination_' + destination)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `destination=eq.${destination}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [destination]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    const { error } = await supabase.from('messages').insert([
      {
        destination,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name,
        sender_gender: currentUser.gender,
        sender_age: currentUser.age,
        content: textToSend,
      },
    ]);

    if (error) {
      alert('訊息發送失敗：' + error.message);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 w-84 md:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden h-[520px]">
      {/* 聊天室 Header */}
      <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center shadow-sm">
        <div>
          <div className="font-bold text-sm flex items-center gap-2">
            <span>📍 {destination} 討論室</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
          </div>
          <div className="text-[10px] text-slate-300">
            發言身分：{currentUser.full_name} ({currentUser.gender}/{currentUser.age}歲)
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-300 hover:text-white hover:bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full text-base transition"
        >
          ✕
        </button>
      </div>

      {/* 對話訊息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 text-xs">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 mt-12 space-y-1">
            <p>目前還沒有人發言</p>
            <p className="text-[11px]">成為第一個在【{destination}】開話題的人吧！</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-slate-400 mb-1 px-1">
                  {msg.sender_name} ({msg.sender_gender} · {msg.sender_age}歲)
                </span>
                <div
                  className={`max-w-[80%] px-3.5 py-2 rounded-2xl shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  <p className="break-words leading-relaxed">{msg.content}</p>
                  <span className={`block text-[9px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 輸入框 */}
      <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`在【${destination}】頻道發言...`}
          className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition"
        >
          發送
        </button>
      </form>
    </div>
  );
}
