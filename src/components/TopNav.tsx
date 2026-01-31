import { useAuth } from '../contexts/AuthContext';
import logoLong from '../../assets/logoLong.png';

type TopNavProps = {
  totalPoints: number;
  familyName?: string;
};

const TopNav = ({ totalPoints, familyName }: TopNavProps) => {
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 pt-4 md:px-8">
        <div className="card flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <img src={logoLong} alt="YumTrail" className="h-9 w-auto" />
            {familyName ? (
              <div className="text-xs text-moss-700">Family: {familyName}</div>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border-2 border-bark-200 bg-mist-50 px-3 py-1 text-xs font-semibold text-pine-900">
              Family points: {totalPoints}
            </div>
            <button className="btn-ghost" onClick={signOut} type="button">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
