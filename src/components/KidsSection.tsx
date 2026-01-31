import { FormEvent, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { AppOutletContext } from '../pages/AppShell';
import { db } from '../lib/firebase';
import { useKids } from '../hooks/useKids';
import AvatarIcon from './AvatarIcon';
import { useToast } from './ToastProvider';
import { AVATAR_OPTIONS } from '../lib/avatars';
import { DEFAULT_CARE_STATS } from '../lib/careStats';
import { Kid } from '../types';
import { Pencil, Save, X } from 'lucide-react';

type KidsSectionProps = {
  showHeader?: boolean;
  heading?: string;
};

const KidsSection = ({ showHeader = true, heading = 'Kids' }: KidsSectionProps) => {
  const { familyId } = useOutletContext<AppOutletContext>();
  const { kids } = useKids(familyId);
  const { showToast } = useToast();
  
  // New Kid State
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<Kid['avatar']>('character');
  const [loading, setLoading] = useState(false);
  
  // Edit State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState<Kid['avatar']>('character');
  const [savingEdit, setSavingEdit] = useState(false);

  const startEditing = (kid: Kid) => {
    setEditingId(kid.id);
    setEditName(kid.name);
    setEditAvatar(kid.avatar);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditAvatar('character');
  };

  const saveEdit = async () => {
    if (!familyId || !editingId) return;
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'kids', editingId), {
        name: editName.trim(),
        avatar: editAvatar
      });
      showToast('Kid updated.', 'success');
      cancelEditing();
    } catch (err) {
      showToast('Failed to update kid.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddKid = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!familyId) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'kids'), {
        familyId,
        name: name.trim(),
        avatar,
        points: 0,
        cashBalance: 0,
        cashAchievements: [],
        careStats: {
          ...DEFAULT_CARE_STATS,
          updatedAt: serverTimestamp()
        },
        createdAt: serverTimestamp()
      });
      setName('');
      showToast('Kid added to the family.', 'success');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKid = async (kidId: string, kidName: string) => {
    if (!familyId) return;
    const confirmed = window.confirm(
      `Remove ${kidName}? This keeps existing logs and family points.`
    );
    if (!confirmed) return;
    setDeletingId(kidId);

    try {
      await deleteDoc(doc(db, 'kids', kidId));
      showToast('Kid removed from the family.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete kid.';
      showToast(message, 'warning');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        {showHeader ? <h2 className="text-xl text-pine-900">{heading}</h2> : null}
        <div className={showHeader ? 'mt-4' : ''}>
          <div className="grid gap-4 md:grid-cols-2">
            {kids.map((kid) => (
              <div key={kid.id} className="rounded-2xl border border-mist-200 bg-white/70 p-4">
                {editingId === kid.id ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-mist-700">Name</label>
                      <input
                        className="input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-mist-700">Avatar</label>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {AVATAR_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setEditAvatar(option.id)}
                            className={`relative flex-shrink-0 rounded-xl border-2 p-1 transition ${
                              editAvatar === option.id
                                ? 'border-moss-500 bg-moss-50'
                                : 'border-transparent hover:bg-mist-100'
                            }`}
                          >
                            <AvatarIcon avatar={option.id} className="h-10 w-10" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-primary flex-1 text-xs"
                        onClick={saveEdit}
                        disabled={savingEdit}
                      >
                        <Save className="mr-1 h-3 w-3" /> Save
                      </button>
                      <button
                        className="btn-ghost text-xs"
                        onClick={cancelEditing}
                        disabled={savingEdit}
                      >
                        <X className="mr-1 h-3 w-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-moss-100 text-pine-900">
                        <AvatarIcon avatar={kid.avatar} className="h-8 w-8 object-contain" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-pine-900">{kid.name}</p>
                        <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-sun-100 px-3 py-1 text-xs font-semibold text-sun-900">
                          <span>✨</span>
                          <span>{kid.points} pts</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        className="btn-ghost text-xs"
                        type="button"
                        onClick={() => startEditing(kid)}
                      >
                        <Pencil className="mr-1 h-3 w-3" /> Edit
                      </button>
                      <button
                        className="btn-ghost text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        type="button"
                        onClick={() => handleDeleteKid(kid.id, kid.name)}
                        disabled={deletingId === kid.id}
                      >
                        {deletingId === kid.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {kids.length === 0 ? (
              <p className="text-sm text-mist-600">Add your first kid to get started.</p>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-mist-500">
            Removing a kid keeps existing logs and family points unchanged.
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg text-pine-900">Add a kid</h3>
        <form className="mt-4 space-y-4" onSubmit={handleAddKid}>
          <div>
            <label htmlFor="kidName" className="text-xs font-semibold text-mist-700">
              Kid name
            </label>
            <input
              id="kidName"
              className="input mt-1"
              value={name}
              onChange={(event) => setName(event.target.value)}
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
                    avatar === option.id
                      ? 'border-moss-300 bg-moss-100 text-pine-900'
                      : 'border-mist-300 text-mist-700 hover:bg-mist-100'
                  }`}
                  onClick={() => setAvatar(option.id)}
                >
                  <AvatarIcon avatar={option.id} className="h-6 w-6 object-contain" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add kid'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default KidsSection;
