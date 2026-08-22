"use client";

import CustomCursor from './_components/CustomCursor';
import Noise from './_components/Noise';
import { ReactNode } from 'react';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CustomCursor />
      <Noise />
      {children}
    </>
  );
}
