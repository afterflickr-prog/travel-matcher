'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import DestinationChatRoom from '@/components/DestinationChatRoom';

interface UserSession {
  id: string;
  name: string;
  gender: string;
  ageRange: string;
  travelStyle: string;
  destination: string;
}

interface ActiveRoom {
  destination: string;
  confirmedMales: number;
  confirmedFemales: number;
  totalAttendees: number;
}

const DESTINATIONS = ['尼泊爾 (ACT/ABC 徒步)', '日本京都 (漫活散策)', '冰島 (自駕環島/極光)', '泰國清邁 (數位遊牧)', '瑞士阿爾卑斯 (高山風光)'];
const AGE_RANGES = ['18 - 25 歲', '26 - 30 歲', '31 - 35 歲', '36 - 41 歲', '42 歲以上'];
const TRAVEL_STYLES = [
  { name: '📋 總建築師', desc: '行程規劃狂，文件齊全，絕不錯過班車。' },
  { name: '🕰️ 慢旅行者', desc: '好好認識一個地方，同一條街走到不再陌生。' },
  { name: '🥾 冒險者', desc: '假期有海拔圖，用爬山、潛水來選目的地。' },
  { name: '🍜 吃貨型', desc: '用餐廳清單導航城市，為了一碗麵跨區。' },
  { name: '🏛️ 文化探索者', desc: '出發前先讀書，能在博物館待三小時。' },
  { name: '🏖️ 充電型', desc: '好床、泳池、沒行程，徹底放空。' }
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [activeChatRoom, setActiveChatRoom] = useState<string | null>(null);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  
  const [name, setName] = useState('');
  const [gender, setGender] = useState('男');
  const [ageRange, setAgeRange] = useState(AGE_RANGES[1]);
  const [travelStyle, setTravelStyle] = useState(TRAVEL_STYLES[2].name);
  const [destination, setDestination] = useState(DESTINATIONS[0]);
  const [customDest, setCustomDest] = useState('');
  const [tab, setTab] = useState<'rooms' | 'create'>('create');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('traveler_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const validSession: UserSession = {
            id: parsed.id || crypto.randomUUID(),
            name: parsed.name || '',
            gender: parsed.gender || '男',
            ageRange: parsed.ageRange || AGE_RANGES[1],
            travelStyle: parsed.travelStyle || TRAVEL_STYLES[2].name,
            destination: parsed.destination || DESTINATIONS[0]
          };
          setCurrentUser(validSession);
          setName(validSession.name);
          setGender(validSession.gender);
          setAgeRange(validSession.ageRange);
          setTravelStyle(validSession.travelStyle);
        }
      }
    } catch (e) {
      localStorage.removeItem('traveler_session');
    }

    fetchActiveRooms();

    const channel = supabase.channel('public_attendees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees' }, () => {
        fetchActiveRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchActiveRooms() {
    try {
      const { data, error } = await supabase.from('attendees').select('*');
      if (error || !data) return;
      const roomMap = new Map<string, ActiveRoom>();
      data.forEach(a => {
        if (!a || !a.destination) return;
        if (!roomMap.has(a.destination)) {
          roomMap.set(a.destination, {
            destination: a.destination,
            confirmedMales: 0,
            confirmedFemales: 0,
            totalAttendees: 0
          });
        }
        const r = roomMap.get(a.destination)!;
        r.totalAttendees += 1;
        if (a.status === 'confirmed') {
          if (a.user_gender === '男') r.confirmedMales += 1;
          if (a.user_gender === '女') r.confirmedFemales += 1;
        }
      });
      setActiveRooms(Array.from(roomMap.values()));
    } catch (err) {}
  }

  function handleJoin(e?: React.FormEvent, targetDest?: string) {
    if (e) e.preventDefault();
    if (!name.trim()) return alert('請填寫稱呼');
    
    const finalDest = targetDest || (destination === '其他' ? customDest.trim() : destination);
    if (!finalDest) return alert('請填寫目的地');

    const session: UserSession = {
      id: currentUser?.id || crypto.randomUUID(),
      name: name.trim(),
      gender,
      ageRange,
      travelStyle,
      destination: finalDest
    };
    try {
      localStorage.setItem('traveler_session', JSON.stringify(session));
    } catch (e) {}
    setCurrentUser(session);
    setActiveChatRoom(finalDest);
  }

  if (!mounted) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">載入中...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-black text-blue-600">✈️ SoloTravel Match</h1>
          <p className="text-xs text-slate-500">3男3女 鎖定成團 · 6大旅行風格</p>
        </div>
        {currentUser && (
          <span className="text-[11px] bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 font-medium">
            👤 {currentUser.name} ({currentUser.gender}) · {(currentUser.travelStyle || '').split(' ')[0]}
          </span>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-8">
        <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6">
          <button onClick={() => setTab('rooms')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition ${tab === 'rooms' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>🔥 現有活躍房間</button>
          <button onClick={() => setTab('create')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition ${tab === 'create' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>📍 選擇/發起新目的地</button>
        </div>

        {tab === 'rooms' && (
          <div className="space-y-4">
            {activeRooms.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-2xl border border-dashed border-slate-300">目前暫無活躍房間，切換至發起新目的地開拓第一間！</div>
            ) : (
              activeRooms.map(r => (
                <div key={r.destination} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg text-slate-800">📍 {r.destination}</h3>
                    <span className="text-[11px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">👥 {r.totalAttendees} 人參與中</span>
                  </div>
                  <div className="text-xs space-y-1.5 mb-4 text-slate-600">
                    <div>🎯 距離 3男3女成團 尚餘：<span className="font-bold text-blue-600">{Math.max(0, 3 - r.confirmedMales)} 男</span> 、 <span className="font-bold text-orange-500">{Math.max(0, 3 - r.confirmedFemales)} 女</span></div>
                    <div className="flex gap-4">
                      <span>♂ 男生已確認: {r.confirmedMales}/3</span>
                      <span>♀ 女生已確認: {r.confirmedFemales}/3</span>
                    </div>
                  </div>
                  <button onClick={() => handleJoin(undefined, r.destination)} className="w-full py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-blue-600 font-bold text-sm rounded-xl transition">進入房間搶佔席位 →</button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'create' && (
          <form onSubmit={(e) => handleJoin(e)} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">目的地</label>
              <select value={destination} onChange={e => setDestination(e.target.value)} className="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                <option value="其他">其他自訂目的地...</option>
              </select>
              {destination === '其他' && <input type="text" placeholder="輸入目的地..." value={customDest} onChange={e => setCustomDest(e.target.value)} className="mt-2 w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required />}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">稱呼</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="暱稱" className="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">性別</label>
                <select value={gender} onChange={e => setGender(e.target.value)} className="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="男">男</option><option value="女">女</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">年齡</label>
                <select value={ageRange} onChange={e => setAgeRange(e.target.value)} className="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-white">
                  {AGE_RANGES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">旅行風格</label>
                <select value={travelStyle} onChange={e => setTravelStyle(e.target.value)} className="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-white">
                  {TRAVEL_STYLES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-500 leading-relaxed">
              {TRAVEL_STYLES.find(s => s.name === travelStyle)?.desc}
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm">開啟專屬頻道 →</button>
          </form>
        )}
      </div>

      {activeChatRoom && currentUser && <DestinationChatRoom destination={activeChatRoom} currentUser={currentUser} onClose={() => setActiveChatRoom(null)} />}
    </main>
  );
}
