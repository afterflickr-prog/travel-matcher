'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Attendee {
  id: number;
  user_id: string;
  user_name: string;
  user_gender: string;
  user_age_range: string;
  user_travel_style: string;
  status: 'considering' | 'confirmed';
  phone_number: string | null;
}

interface Message {
  id: number;
  sender_name: string;
  sender_gender: string;
  sender_age_range: string;
  sender_travel_style: string;
  content: string;
  created_at: string;
}

export default function DestinationChatRoom({ destination, currentUser, onClose }: any) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
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

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    fetchData();
    const msgSub = supabase.channel(`msg_${destination}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `destination=eq.${destination}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        scrollToBottom();
      }).subscribe();

    const attSub = supabase.channel(`att_${destination}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees', filter: `destination=eq.${destination}` }, fetchData)
      .subscribe();

    const presenceChannel = supabase.channel(`presence_${destination}`, { config: { presence: { key: currentUser.id } } });
    presenceChannel.on('presence', { event: 'sync' }, async () => {
      const state = presenceChannel.presenceState();
      const online = Object.keys(state).length;
      setOnlineCount(online);
      if (online === 0) {
        await supabase.from('messages').delete().eq('destination', destination);
        await supabase.from('attendees').delete().eq('destination', destination);
      }
    });
    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await presenceChannel.track({ id: currentUser.id });
    });

    upsertAttendee('considering');

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(msgSub);
      supabase.removeChannel(attSub);
      supabase.removeChannel(presenceChannel);
    };
  }, [destination]);

  async function fetchData() {
    const [msgRes, attRes] = await Promise.all([
      supabase.from('messages').select('*').eq('destination', destination).order('created_at', { ascending: true }),
      supabase.from('attendees').select('*').eq('destination', destination)
    ]);
    if (msgRes.data) setMessages(msgRes.data);
    if (attRes.data) setAttendees(attRes.data);
    scrollToBottom();
  }

  async function upsertAttendee(status: 'considering' | 'confirmed', phone: string | null = null) {
    await supabase.from('attendees').upsert({
      destination, user_id: currentUser.id, user_name: currentUser.name, user_gender: currentUser.gender,
      user_age_range: currentUser.ageRange, user_travel_style: currentUser.travelStyle, status, phone_number: phone
    }, { onConflict: 'destination,user_id' });
    fetchData();
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
    if (!inputText.trim()) return;
    await supabase.from('messages').insert([{
      destination, sender_name: currentUser.name, sender_gender: currentUser.gender,
      sender_age_range: currentUser.ageRange, sender_travel_style: currentUser.travelStyle, content: inputText.trim()
    }]);
    setInputText('');
  }

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-[460px] md:h-[680px] bg-white md:rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden font-sans">
      {/* Header & Status */}
      <div className="bg-slate-900 text-white p-3 shadow-md relative">
        <button onClick={onClose} className="absolute right-3 top-3 text-slate-400 hover:text-white w-6 h-6 flex items-center justify-center rounded-full text-lg">✕</button>
        <div className="font-bold text-sm flex items-center gap-2 mb-1">📍 {destination} <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span className="text-[10px] text-emerald-400">{onlineCount} 在線</span></div>
        <div className="text-[11px] text-slate-300">🎯 成團進度 (3男3女): 尚餘 {Math.max(0, 3 - maleConfirmed.length)} 男、{Math.max(0, 3 - femaleConfirmed.length)} 女</div>
        
        {/* Buttons */}
        <div className="flex gap-2 mt-2">
          <button onClick={() => upsertAttendee('considering')} className={`flex-1 py-1.5 text-[11px] font-bold rounded ${myStatus === 'considering' ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'}`}>🤔 考慮中</button>
          <button onClick={handleAttemptConfirm} disabled={myStatus === 'confirmed' || (currentUser.gender === '男' && isMaleFull) || (currentUser.gender === '女' && isFemaleFull)} className={`flex-1 py-1.5 text-[11px] font-bold rounded ${myStatus === 'confirmed' ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}>
            {myStatus === 'confirmed' ? '✅ 已確認出席' : '✅ 確認出席 (鎖名額)'}
          </button>
        </div>
      </div>

      {/* Group Formed Directory */}
      {isGroupFormed && myStatus === 'confirmed' && (
        <div className="bg-amber-50 border-b border-amber-200 p-3 max-h-32 overflow-y-auto">
          <div className="text-xs font-bold text-amber-800 mb-2">🎉 3男3女 已成團！通訊錄已解鎖：</div>
          <div className="space-y-1">
            {[...maleConfirmed, ...femaleConfirmed].map(a => (
              <div key={a.user_id} className="text-[11px] flex justify-between items-center text-slate-700 bg-white px-2 py-1 rounded border border-amber-100">
                <span>{a.user_gender === '男' ? '🟦' : '🟧'} {a.user_name} ({a.user_age_range})</span>
                <span className="font-mono text-amber-700 font-bold">{a.phone_number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map(msg => {
          const isMe = msg.sender_name === currentUser.name;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="text-[10px] text-slate-400 mb-1 px-1 flex items-center gap-1">
                {msg.sender_gender === '男' ? '🟦' : '🟧'} {msg.sender_name} ({msg.sender_age_range}) · {msg.sender_travel_style.split(' ')[0]}
              </div>
              <div className={`max-w-[85%] px-3 py-2 rounded-2xl shadow-sm text-xs ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
        <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="發送訊息..." className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold">發送</button>
      </form>

      {/* Phone Modal */}
      {showPhoneModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-sm mb-2 text-slate-800">🎒 鎖定席位與聯絡方式</h3>
            <p className="text-[11px] text-slate-500 mb-4">電話在未成團前完全保密。當 3男3女 湊齊時，系統才會解鎖通訊錄給另外 5 位隊員。</p>
            <form onSubmit={handleConfirmSubmit}>
              <input type="text" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="例如: +852 91234567" className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500" required />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPhoneModal(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">取消</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg">確認並鎖定名額</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
