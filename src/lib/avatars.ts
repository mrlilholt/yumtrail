import { Kid } from '../types';

export type AvatarOption = {
  id: Kid['avatar'];
  label: string;
};

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'character', label: 'Explorer' },
  { id: 'fork', label: 'Fork' },
  { id: 'spoon', label: 'Spoon' },
  { id: 'knife', label: 'Knife' },
  { id: 'peanutButterCup', label: 'Peanut Butter Cup' },
  { id: 'sourPatchKid', label: 'Sour Patch Kid' },
  { id: 'hersheyChocolateBar', label: 'Hershey Chocolate Bar' },
  { id: 'gummybear', label: 'Gummy Bear' }
];
