'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface ChatRoomProps {
  currentUserId: string;
  currentUserName: string;
  targetUserId: string;
  targetUserName: string;
  onClose: () => void;
}

export default function ChatRoom({
  currentUserId,
  currentUserName,
  targetUserId,
  targetUserName,
  onClose,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滾動到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // 1. 載入歷史訊息
    async function fetchMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
      scrollToBottom();
    }

    fetchMessages();

    // 2. 訂閱 Realtime 新訊息
    const channel = supabase
      .channel('realtime_chat_' + currentUserId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === targetUserId) ||
            (newMsg.sender_id === targetUserId && newMsg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => [...prev, newMsg]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, targetUserId]);

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
        sender_id: currentUserId,
        receiver_id: targetUserId,
        content: textToSend,
      },
    ]);

    if (error) {
      alert('訊息發送失敗：' + error.message);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden h-[480px]">
      {/* 聊天室標題列 */}
      <div className="bg-blue-600 text-white p-3.5 flex justify-between items-center shadow-sm">
        <div>
          <div className="font-semibold text-sm flex items-center gap-1.5">
            <span>與 {targetUserName} 對話中</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
          </div>
          <div className="text-[10px] text-blue-100">身分：{currentUserName} (匿名)</div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-blue-700 w-6 h-6 flex items-center justify-center rounded-full text-base transition"
        >
          ✕
        </button>
      </div>

      {/* 訊息內容列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 text-xs">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 mt-8">
            向 {targetUserName} 打個招呼，開啟旅行對話吧！
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl shadow-sm ${
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

      {/* 訊息輸入區 */}
      <form onSubmit={handleSendMessage} className="p-2 bg-white border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="輸入訊息..."
          className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition"
        >
          發送
        </button>
      </form>
    </div>
  );
}
