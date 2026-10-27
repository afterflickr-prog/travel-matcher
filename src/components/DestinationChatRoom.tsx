'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  id: number;
  destination: string;
  sender_id: string;
  sender_name: string;
  sender_gender: string;
  sender_age_range: string;
  content: string;
  created_at: string;
}

interface UserSession {
  id: string;
  name: string;
  gender: string;
  ageRange: string;
}

interface DestinationChatRoomProps {
  destination: string;
  currentUser: UserSession;
  onClose: () => void;
}

export default function DestinationChatRoom({
  destination,
  currentUser,
  onClose,
}: DestinationChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // 1. 抓取該頻道目前訊息
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

    // 2. 訂閱 Realtime 廣播與 Presence 在線狀態
    const channelId = 'room_' + encodeURIComponent(destination);
    const channel = supabase.channel(channelId, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    channel.on(
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
    );

    channel.on('presence', { event: 'sync' }, async () => {
      const presenceState = channel.presenceState();
      const currentOnline = Object.values(presenceState).flat();
      setOnlineUsers(currentOnline);

      // 當最後一人離開時，自動清空該房間訊息
      if (currentOnline.length === 0) {
        await supabase.from('messages').delete().eq('destination', destination);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: currentUser.id,
          name: currentUser.name,
          gender: currentUser.gender,
          ageRange: currentUser.ageRange,
        });
      }
    });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [destination, currentUser]);

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
        sender_name: currentUser.name,
        sender_gender: currentUser.gender,
        sender_age_range: currentUser.ageRange,
        content: textToSend,
      },
    ]);

    if (error) {
      alert('發送失敗：' + error.message);
    }
  }

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-[440px] md:h-[580px] bg-white md:rounded-3xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden">
      {/* 標頭 */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
        <div>
          <div className="font-bold text-sm flex items-center gap-2">
            <span>📍 {destination}</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {onlineUsers.length} 人在線
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            身分：{currentUser.name} ({currentUser.gender} · {currentUser.ageRange})
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white hover:bg-slate-800 w-8 h-8 flex items-center justify-center rounded-full text-lg transition"
        >
          ✕
        </button>
      </div>

      {/* 在線旅伴欄 */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-600">
        <span className="font-semibold text-slate-400 shrink-0">在線成員：</span>
        {onlineUsers.map((u: any, idx) => (
          <span
            key={idx}
            className={`px-2.5 py-0.5 rounded-lg border shrink-0 ${
              u.id === currentUser.id
                ? 'bg-blue-50 text-blue-700 border-blue-200 font-medium'
                : 'bg-white border-slate-200'
            }`}
          >
            {u.name} ({u.gender} · {u.ageRange})
          </span>
        ))}
      </div>

      {/* 訊息流 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100 text-xs">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 mt-20 space-y-1">
            <p className="font-medium text-slate-600">此聊天室目前為全新開啟</p>
            <p className="text-[11px]">說點什麼，與【{destination}】的旅伴打個招呼！</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-slate-400 mb-1 px-1">
                  {msg.sender_name} ({msg.sender_gender} · {msg.sender_age_range})
                </span>
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  <p className="break-words leading-relaxed text-xs">{msg.content}</p>
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

      {/* 發送區 */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`在【${destination}】頻道發言...`}
          className="flex-1 px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm"
        >
          發送
        </button>
      </form>
    </div>
  );
}
