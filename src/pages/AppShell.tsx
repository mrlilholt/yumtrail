import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../hooks/useFamily';
import TopNav from '../components/TopNav';
import Sidebar from '../components/Sidebar';
import Onboarding from './Onboarding';
import { Family } from '../types';

export type AppOutletContext = {
  family: Family;
  familyId: string;
};

const AppShell = () => {
  const { user } = useAuth();
  const { family, familyId, loading } = useFamily(user?.uid);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-mist-700">
        Loading your forest...
      </div>
    );
  }

  if (!family || !familyId) {
    return (
      <div className="min-h-screen">
        <TopNav totalPoints={0} />
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Onboarding />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopNav totalPoints={family.totalPoints} familyName={family.familyName} />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-0 pb-10 md:flex-row md:px-6">
        <div className="pointer-events-none absolute -left-10 top-16 hidden h-40 w-40 rounded-full bg-white/30 blur-3xl md:block animate-float-slow" />
        <div className="pointer-events-none absolute right-6 top-52 hidden h-48 w-48 rounded-full bg-white/20 blur-3xl md:block animate-float-slow" />
        <Sidebar />
        <main className="flex-1 px-4 md:px-0">
          <Outlet context={{ family, familyId }} />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
