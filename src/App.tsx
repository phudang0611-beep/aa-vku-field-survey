import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  Inbox,
  History,
  Activity,
  PlusCircle
} from 'lucide-react';
import { Header } from './components/Header';
import { MultiStepForm } from './components/MultiStepForm';
import { SyncQueueList } from './components/SyncQueueList';
import { SurveyHistory } from './components/SurveyHistory';
import { NetworkSimulator } from './components/NetworkSimulator';
import { getAllQueueItems } from './db/indexedDB';

type TabType = 'form' | 'queue' | 'history' | 'simulator';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('form');
  const [pendingCount, setPendingCount] = useState<number>(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const items = await getAllQueueItems();
      const count = items.filter((i) => i.status === 'PENDING_SYNC' || i.status === 'FAILED').length;
      setPendingCount(count);
    } catch (err) {
      console.error('Failed to get pending count:', err);
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  const handleSurveySubmitted = () => {
    refreshPendingCount();
    // Prompt user or switch tab
    setActiveTab('queue');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Top Header */}
      <Header pendingCount={pendingCount} onSyncTriggered={refreshPendingCount} />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-24 sm:pb-8">
        {/* Desktop Tab Navigation */}
        <div className="hidden sm:flex items-center justify-between mb-6 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1 w-full">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'form'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Khảo sát mới</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === 'queue'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Hàng đợi Offline</span>
              {pendingCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    activeTab === 'queue'
                      ? 'bg-white text-sky-800'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Lịch sử đã gửi</span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'simulator'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Giả lập & Kiểm tra</span>
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="transition-all duration-200">
          {activeTab === 'form' && <MultiStepForm onSubmitted={handleSurveySubmitted} />}
          {activeTab === 'queue' && <SyncQueueList onQueueUpdated={refreshPendingCount} />}
          {activeTab === 'history' && <SurveyHistory />}
          {activeTab === 'simulator' && <NetworkSimulator onDataChanged={refreshPendingCount} />}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 py-1.5 px-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('form')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'form' ? 'text-sky-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-[10px]">Khảo sát</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative ${
            activeTab === 'queue' ? 'text-sky-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <div className="relative">
            <Inbox className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-2 text-[9px] w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center font-black">
                {pendingCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Hàng đợi</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'history' ? 'text-sky-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px]">Lịch sử</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'simulator' ? 'text-sky-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px]">Giả lập</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
