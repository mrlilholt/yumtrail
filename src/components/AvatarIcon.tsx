import { Kid } from '../types';
import forkPng from '../../assets/fork.png';
import knifePng from '../../assets/knife.png';
import spoonPng from '../../assets/spoon.png';
import characterPng from '../../assets/characterDownRight.png';
import peanutButterCupPng from '../../assets/peanutButterCup.png';
import sourPatchKidPng from '../../assets/sourPatchKid.png';
import hersheyChocolateBarPng from '../../assets/hersheyChocolateBar.png';
import gummybearPng from '../../assets/gummybear.png';

type AvatarIconProps = {
  avatar: Kid['avatar'];
  size?: number;
  className?: string;
};

const AvatarIcon = ({ avatar, size = 24, className }: AvatarIconProps) => {
  const mergedClassName = ['avatar-hover', className].filter(Boolean).join(' ');
  if (avatar === 'character') {
    return (
      <img
        src={characterPng}
        alt=""
        width={size}
        height={size}
        className={mergedClassName}
        aria-hidden="true"
      />
    );
  }

  if (avatar === 'fork') {
    return (
      <img
        src={forkPng}
        alt=""
        width={size}
        height={size}
        className={mergedClassName}
        aria-hidden="true"
      />
    );
  }

  if (avatar === 'spoon') {
    return (
      <img
        src={spoonPng}
        alt=""
        width={size}
        height={size}
        className={mergedClassName}
        aria-hidden="true"
      />
    );
  }

  if (avatar === 'knife') {
    return (
      <img
        src={knifePng}
        alt=""
        width={size}
        height={size}
        className={mergedClassName}
        aria-hidden="true"
      />
    );
  }

  if (avatar === 'peanutButterCup') {
    return (
      <img
        src={peanutButterCupPng}
        alt=""
        width={size}
        height={size}
        className={mergedClassName}
        aria-hidden="true"
      />
    );
  }

  if (avatar === 'sourPatchKid') {
    return (
      <img
        src={sourPatchKidPng}
        alt=""
        width={size}
        height={size}
        className={mergedClassName}
        aria-hidden="true"
      />
    );
  }

  if (avatar === 'hersheyChocolateBar') {
    return (
      <img
        src={hersheyChocolateBarPng}
        alt=""
        width={size}
        height={size}
        className={mergedClassName}
        aria-hidden="true"
      />
    );
  }

  if (avatar === 'gummybear') {
    return (
      <img
        src={gummybearPng}
        alt=""
        width={size}
        height={size}
        className={mergedClassName}
        aria-hidden="true"
      />
    );
  }

  const stroke = 'currentColor';
  const strokeWidth = 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={mergedClassName}
      aria-hidden="true"
    >
      <path
        d="M6 3v7"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M9 3v7"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M12 3v7"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M9 10v11"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
};

export default AvatarIcon;
