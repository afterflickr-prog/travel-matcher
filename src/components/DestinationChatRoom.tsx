'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Attendee {
  id?: number;
  user_id: string;
  user_name: string;
  user_gender: string;
  user_age_range: string;
  user_travel_style: string;
  status: 'considering' | 'confirmed';
  phone_number: string | null;
}

interface Message {
  id?: number;
  sender_name: string;
  sender_gender: string;
  sender_age_range: string;
  sender_travel_style: string;
  content: string;
  created_at?: string;
}

export default function DestinationChatRoom({ destination, currentUser, onClose }: any) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [inputText, setInputText] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const maleConfirmed = attendees.filter(a => a.user_gender === '男' && a.status === 'confirmed');
  const femaleConfirmed = attendees.filter(a => a.user_gender === '女' && a.status === 'confirmed');
  const isMaleFull = maleConfirmed.length >= 3;
  const isFemaleFull = femaleConfirmed.length >= 3;
  const isGroupFormed = isMaleFull && isFemaleFull;
  const myStatus = attendees.find(a => a.user_id === currentUser.id)?.status || 'considering';

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  useEffect(() => {
    fetchData();

    // 1. 訊息即時監聽
    const msgSub = supabase.channel(`msg_${destination}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `destination=eq.${destination}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          // 避免自己樂觀更新的訊息重複加入
          if (prev.some(m => m.id === newMsg.id || (m.content === newMsg.content && m.sender_name === newMsg.sender_name && Math.abs(new Date(m.created_at || '').getTime() - new Date(newMsg.created_at || '').getTime()) < 2000))) {
            return prev;
          }
          return [...prev, newMsg];
        });
        scrollToBottom();
      }).subscribe();

    // 2. 出席狀態監聽
    const attSub = supabase.channel(`att_${destination}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees', filter: `destination=eq.${destination}` }, () => {
        fetchData();
      }).subscribe();

    // 3. 在線人數 Presence
    const presenceChannel = supabase.channel(`presence_${destination}`, { config: { presence: { key: currentUser.id } } });
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const count = Object.keys(state).length;
      setOnlineCount(Math.max(1, count));
    });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ id: currentUser.id, name: currentUser.name });
      }
    });

    // 預設加入考慮中席位
    upsertAttendee('considering');

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(msgSub);
      supabase.removeChannel(attSub);
      supabase.removeChannel(presenceChannel);
    };
  }, [destination]);

  async function fetchData() {
    try {
      const [msgRes, attRes] = await Promise.all([
        supabase.from('messages').select('*').eq('destination', destination).order('created_at', { ascending: true }),
        supabase.from('attendees').select('*').eq('destination', destination)
      ]);
      if (msgRes.data) setMessages(msgRes.data);
      if (attRes.data) setAttendees(attRes.data);
      scrollToBottom();
    } catch (err) {}
  }

  async function upsertAttendee(status: 'considering' | 'confirmed', phone: string | null = null) {
    try {
      await supabase.from('attendees').upsert({
        destination,
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_gender: currentUser.gender,
        user_age_range: currentUser.ageRange,
        user_travel_style: currentUser.travelStyle,
        status,
        phone_number: phone
      }, { onConflict: 'destination,user_id' });
      fetchData();
    } catch (err) {}
  }

  function handleAttemptConfirm() {
    if (currentUser.gender === '男' && isMaleFull) return alert('男生名額已滿 3 人，等待女生確認中！');
    if (currentUser.gender === '女' && isFemaleFull) return alert('女生名額已滿 3 人，等待男生確認中！');
    setShowPhoneModal(true);
  }

  function handleConfirmSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    upsertAttendee('confirmed', phoneInput.trim());
    setShowPhoneModal(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    // 樂觀更新：立刻出現在本機畫面上，不卡頓
    const optimisticMsg: Message = {
      id: Date.now(),
      sender_name: currentUser.name,
      sender_gender: currentUser.gender,
      sender_age_range: currentUser.ageRange,
      sender_travel_style: currentUser.travelStyle,
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');
    scrollToBottom();

    // 寫入 Supabase 資料庫
    try {
      const { error } = await supabase.from('messages').insert([{
        destination,
        sender_name: currentUser.name,
        sender_gender: currentUser.gender,
        sender_age_range: currentUser.ageRange,
        sender_travel_style: currentUser.travelStyle,
        content: text
      }]);
      if (error) {
        console.error('發送失敗:', error);
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-[460px] md:h-[680px] bg-white md:rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden font-sans">
      {/* 頂部房名與人數看板 */}
      <div className="bg-slate-900 text-white p-3.5 shadow-md relative">
        <button onClick={onClose} className="absolute right-3 top-3 text-slate-400 hover:text-white w-6 h-6 flex items-center justify-center rounded-full text-base font-bold">✕</button>
        
        <div className="font-bold text-sm flex items-center gap-2 mb-1">
          <span>📍 {destination}</span>
          <span className="flex items-center gap-1 bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {onlineCount} 人在線 · 共 {attendees.length} 位旅人
          </span>
        </div>

        <div className="text-[11px] text-slate-300 flex items-center gap-2">
          <span>🎯 成團尚餘：</span>
          <span className="font-bold text-blue-400">{Math.max(0, 3 - maleConfirmed.length)} 男</span>
          <span>、</span>
          <span className="font-bold text-orange-400">{Math.max(0, 3 - femaleConfirmed.length)} 女</span>
          <span className="text-slate-400 text-[10px]">({maleConfirmed.length}/3男 · {femaleConfirmed.length}/3女)</span>
        </div>
        
        {/* 出席意向按鈕 */}
        <div className="flex gap-2 mt-2.5">
          <button 
            onClick={() => upsertAttendee('considering')} 
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition ${myStatus === 'considering' ? 'bg-slate-700 text-white ring-1 ring-slate-500' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            🤔 可能出席 (考慮中)
          </button>
          <button 
            onClick={handleAttemptConfirm} 
            disabled={myStatus === 'confirmed' || (currentUser.gender === '男' && isMaleFull) || (currentUser.gender === '女' && isFemaleFull)} 
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition ${myStatus === 'confirmed' ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {myStatus === 'confirmed' ? '✅ 已確認出席 (已鎖名額)' : '✅ 確認出席 (填電話鎖定)'}
          </button>
        </div>
      </div>

      {/* 達成 3男3女 金色通訊錄解鎖 */}
      {isGroupFormed && myStatus === 'confirmed' && (
        <div className="bg-amber-50 border-b border-amber-200 p-3 max-h-36 overflow-y-auto">
          <div className="text-xs font-bold text-amber-800 mb-1.5">🎉 3男3女 正式成團！核心隊員通訊錄：</div>
          <div className="space-y-1">
            {[...maleConfirmed, ...femaleConfirmed].map(a => (
              <div key={a.user_id} className="text-[11px] flex justify-between items-center text-slate-700 bg-white px-2 py-1 rounded border border-amber-200">
                <span>{a.user_gender === '男' ? '🟦' : '🟧'} {a.user_name} ({a.user_age_range})</span>
                <span className="font-mono text-amber-700 font-bold">{a.phone_number || '未登記'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 訊息流 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
            <span>👋 還沒有人發言，打個招呼開始破冰吧！</span>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_name === currentUser.name;
            return (
              <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="text-[10px] text-slate-400 mb-0.5 px-1 flex items-center gap-1">
                  <span>{msg.sender_gender === '男' ? '🟦' : '🟧'} {msg.sender_name}</span>
                  <span>({msg.sender_age_range})</span>
                  <span>·</span>
                  <span>{(msg.sender_travel_style || '').split(' ')[0]}</span>
                </div>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl shadow-sm text-xs leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 輸入框 */}
      <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-slate-200 flex gap-2 items-center">
        <input 
          type="text" 
          value={inputText} 
          onChange={e => setInputText(e.target.value)} 
          placeholder={`在【${destination}】頻道發言...`} 
          className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
        />
        <button type="submit" disabled={!inputText.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold transition">
          發送
        </button>
      </form>

      {/* 電話登記彈窗 */}
      {showPhoneModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-sm mb-1.5 text-slate-800">🎒 鎖定 1 個正式出席席位</h3>
            <p className="text-[11px] text-slate-500 mb-3.5 leading-relaxed">
              電話在未成團前完全保密。只有當【3男3女 湊齊正式成團】時，系統才會解鎖通訊錄給另外 5 位隊員。
            </p>
            <form onSubmit={handleConfirmSubmit}>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">聯絡電話 / WhatsApp</label>
              <input 
                type="text" 
                value={phoneInput} 
                onChange={e => setPhoneInput(e.target.value)} 
                placeholder="例如: +852 91234567" 
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500" 
                autoFocus
                required 
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPhoneModal(false)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition">取消</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition">確認並鎖定名額</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
