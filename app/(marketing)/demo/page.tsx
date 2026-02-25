"use client";

import { useState, useEffect } from 'react';
import DemoLayout, { type DemoTab } from '../_demo/DemoLayout';
import MenuStudio from '../_demo/studio/MenuStudio';
import { StudioProvider } from '../_demo/studio/context/StudioContext';
import MenuInventory from '../_demo/inventory/MenuInventory';
import QRGenerator from '../_demo/qr/QRGenerator';
import { MenuProvider } from '../_context/MenuContext';

export default function DemoDashboard() {
  const [activeTab, setActiveTab] = useState<DemoTab>('studio');

  return (
    <MenuProvider>
      <DemoLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'studio' && (
          <StudioProvider>
            <MenuStudio />
          </StudioProvider>
        )}
        {activeTab === 'inventory' && <MenuInventory />}
        {activeTab === 'qr' && <QRGenerator />}
      </DemoLayout>
    </MenuProvider>
  );
}
