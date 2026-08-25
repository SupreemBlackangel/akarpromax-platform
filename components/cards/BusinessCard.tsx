'use client';
import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface BusinessCardProps {
  user: {
    name: string;
    rank: string;
    avatar?: string;
    email: string;
    phone?: string;
    bio?: string;
    username: string;
  };
}

export function BusinessCard({ user }: BusinessCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rankColors = {
    new: 'from-gray-400 to-gray-600',
    rising: 'from-green-400 to-green-600',
    distinguished: 'from-blue-400 to-blue-600',
    gold: 'from-yellow-400 to-yellow-600',
    promax: 'from-purple-400 to-purple-600',
  };
  const color = rankColors[user.rank?.toLowerCase() as keyof typeof rankColors] || rankColors.new;
  const profileUrl = `https://akarpromax.com/u/${user.username}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>بطاقة ${user.name}</title>
        <style>
          body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f0f0; font-family: sans-serif; }
          .card { width: 350px; background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); overflow: hidden; }
          .header { background: linear-gradient(135deg, #2563EB, #1D4ED8); padding: 20px; text-align: center; color: white; }
          .logo { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
          .avatar { width: 80px; height: 80px; border-radius: 50%; border: 4px solid white; margin: -40px auto 10px; background: #e0e0e0; overflow: hidden; display: flex; align-items: center; justify-content: center; }
          .avatar img { width: 100%; height: 100%; object-fit: cover; }
          .body { padding: 20px; text-align: center; }
          .name { font-size: 18px; font-weight: bold; color: #1a1a1a; }
          .info { margin-top: 12px; font-size: 13px; color: #555; }
          .footer { padding: 12px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; }
        </style>
        </head><body>
        <div class="card">
          <div class="header"><div class="logo">AkarProMax</div></div>
          <div class="avatar">${user.avatar ? `<img src="${user.avatar}" />` : '<div style="font-size:32px;background:#2563EB;color:white;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">👤</div>'}</div>
          <div class="body">
            <div class="name">${user.name}</div>
            <div class="info">
              <div>${user.email}</div>
              ${user.phone ? `<div>${user.phone}</div>` : ''}
            </div>
          </div>
          <div class="footer">www.akarpromax.com</div>
        </div>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div ref={cardRef} className="max-w-xs mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      <div className={`bg-gradient-to-r ${color} p-6 text-center text-white`}>
        <div className="text-xl font-bold tracking-wider">AkarProMax</div>
      </div>
      <div className="relative -mt-12 flex justify-center">
        <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-md">
          {user.avatar ? <img src={user.avatar} alt={user.name} width={96} height={96} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-4xl bg-blue-600 text-white">👤</div>}
        </div>
      </div>
      <div className="p-6 text-center">
        <h3 className="text-xl font-bold text-gray-800">{user.name}</h3>
        <span className={`inline-block px-4 py-1 rounded-full text-xs font-bold mt-1 ${
          user.rank?.toLowerCase() === 'gold' ? 'bg-yellow-100 text-yellow-800' :
          user.rank?.toLowerCase() === 'distinguished' ? 'bg-blue-100 text-blue-800' :
          user.rank?.toLowerCase() === 'promax' ? 'bg-purple-100 text-purple-800' :
          user.rank?.toLowerCase() === 'rising' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-600'
        }`}>{user.rank || 'NEW'}</span>
        <div className="mt-4 text-sm text-gray-600 space-y-1">
          <p>{user.email}</p>
          {user.phone && <p>{user.phone}</p>}
          {user.bio && <p className="text-xs text-gray-500 mt-2">{user.bio}</p>}
        </div>
        <div className="mt-4 flex justify-center">
          <QRCodeSVG value={profileUrl} size={60} level="H" />
        </div>
        <button onClick={handlePrint} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">طباعة البطاقة</button>
      </div>
      <div className="bg-gray-50 px-6 py-3 text-center text-xs text-gray-400 border-t border-gray-100">www.akarpromax.com</div>
    </div>
  );
}
