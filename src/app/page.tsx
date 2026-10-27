'use client';

import { useState } from 'react';
import ChatRoom from '@/components/ChatRoom';
import { Heart, X, MessageCircle, MapPin, Compass } from 'lucide-react';

const MOCK_TRAVELERS = [
  {
    id: 'user-002',
    full_name: '阿霖',
    destination: '尼泊爾 安納布爾納環線',
    style: '徒步重裝 / 戶外攝影',
    bio: '預計秋天走 ACT 大環線，想找步速相近、喜歡拍照的搭子互相照應！',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-003',
    full_name: 'Suki',
    destination: '京都 & 宇治',
    style: '慢活自由行 / 咖啡館巡禮',
    bio: '不趕行程，每天找一間町家咖啡館坐著看書拍照，歡迎搭伙吃晚餐。',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
  },
];

export default function Home() {
  const currentUserId = 'user-001';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeChatUser, setActiveChatUser] = useState<typeof MOCK_TRAVELERS[0] | null>(null);

  const traveler = MOCK_TRAVELERS[currentIndex];

  const handleNext = () => {
    if (currentIndex < MOCK_TRAVELERS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-800">SoloTraveler 旅行搭子配對</h1>
        <p className="text-sm text-slate-500">尋找步調相投的旅伴，一起出發</p>
      </header>

      {!activeChatUser ? (
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          <div className="relative h-80 w-full bg-slate-200">
            <img
              src={traveler.image}
              alt={traveler.full_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white">
              <h2 className="text-2xl font-bold">{traveler.full_name}</h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-200 mt-1">
                <MapPin size={14} className="text-red-400" />
                <span>想去：{traveler.destination}</span>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              <Compass size={14} />
              <span>{traveler.style}</span>
            </div>
            <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
              {traveler.bio}
            </p>
          </div>

          <div className="px-6 pb-6 pt-2 flex items-center justify-center gap-6">
            <button
              onClick={handleNext}
              className="p-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all shadow-sm"
              title="下一個"
            >
              <X size={24} />
            </button>
            <button
              onClick={() => setActiveChatUser(traveler)}
              className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-md hover:scale-105"
              title="立即聊聊"
            >
              <MessageCircle size={24} />
            </button>
            <button
              onClick={handleNext}
              className="p-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-all shadow-md hover:scale-105"
              title="想同遊"
            >
              <Heart size={24} />
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          <button
            onClick={() => setActiveChatUser(null)}
            className="mb-3 text-sm text-slate-500 hover:text-slate-800 underline"
          >
            ← 返回滑動配對
          </button>
          <ChatRoom
            currentUserId={currentUserId}
            targetUserId={activeChatUser.id}
            targetUserName={activeChatUser.full_name}
          />
        </div>
      )}
    </main>
  );
}
