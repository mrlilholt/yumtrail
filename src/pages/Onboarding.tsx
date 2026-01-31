import { FormEvent, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import AvatarIcon from '../components/AvatarIcon';
import { useToast } from '../components/ToastProvider';
import { DEFAULT_POINT_CONFIG } from '../lib/points';
import { AVATAR_OPTIONS } from '../lib/avatars';
import { DEFAULT_CARE_STATS } from '../lib/careStats';
import { Kid } from '../types';

const Onboarding = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState<'family' | 'kid' | 'done'>('family');
  const [familyName, setFamilyName] = useState('');
  const [kidName, setKidName] = useState('');
  const [kidAvatar, setKidAvatar] = useState<Kid['avatar']>('character');
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateFamily = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!user) {
      setError('You must be signed in to create a family.');
      return;
    }
    if (!familyName.trim()) {
      setError('Please enter a family name.');
      return;
    }
    setLoading(true);

    try {
      const docRef = await addDoc(collection(db, 'families'), {
        ownerUid: user.uid,
        familyName: familyName.trim(),
        totalPoints: 0,
        phoneAtTableEnabled: false,
        unlockedCountries: [],
        pointConfig: DEFAULT_POINT_CONFIG,
        createdAt: serverTimestamp()
      });
      setFamilyId(docRef.id);
      setStep('kid');
      showToast('Family created. Add your first kid.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create family.';
      setError(message);
      showToast(message, 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKid = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!familyId) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'kids'), {
        familyId,
        name: kidName.trim(),
        avatar: kidAvatar,
        points: 0,
        cashBalance: 0,
        cashAchievements: [],
        careStats: {
          ...DEFAULT_CARE_STATS,
          updatedAt: serverTimestamp()
        },
        createdAt: serverTimestamp()
      });
      showToast('Kid added. Welcome to YumTrail!', 'success');
      setKidName('');
      setStep('done');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to add kid.';
      setError(message);
      showToast(message, 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-8 animate-fade-in">
      <h2 className="text-2xl text-pine-900">Set up your YumTrail family</h2>
      <p className="mt-2 text-sm text-mist-700">
        Create your family and add the first kid to start earning points.
      </p>

      {step === 'family' ? (
        <form className="mt-6 space-y-4" onSubmit={handleCreateFamily}>
          <div>
            <label htmlFor="familyName" className="text-xs font-semibold text-mist-700">
              Family name
            </label>
            <input
              id="familyName"
              className="input mt-1"
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
              placeholder="Evergreen Crew"
              required
            />
          </div>
          {error ? <p className="text-sm text-sun-700">{error}</p> : null}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create family'}
          </button>
        </form>
      ) : step === 'kid' ? (
        <form className="mt-6 space-y-4" onSubmit={handleCreateKid}>
          <div>
            <label htmlFor="kidName" className="text-xs font-semibold text-mist-700">
              Kid name
            </label>
            <input
              id="kidName"
              className="input mt-1"
              value={kidName}
              onChange={(event) => setKidName(event.target.value)}
              placeholder="Addie"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-mist-700">Avatar</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    kidAvatar === option.id
                      ? 'border-moss-300 bg-moss-100 text-pine-900'
                      : 'border-mist-300 text-mist-700 hover:bg-mist-100'
                  }`}
                  onClick={() => setKidAvatar(option.id)}
                >
                  <AvatarIcon avatar={option.id} className="h-6 w-6 object-contain" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="text-sm text-sun-700">{error}</p> : null}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add kid and continue'}
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-mist-700">
            All set. Your family is ready. You can head to the dashboard now.
          </p>
          <button
            className="btn-primary"
            type="button"
            onClick={() => window.location.assign('/app/dashboard')}
          >
            Go to dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
