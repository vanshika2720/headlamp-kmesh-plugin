import { registerRoute, registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import { KmeshOverview } from './components/KmeshOverview';

// 1. Register Kmesh Sidebar navigation entry
registerSidebarEntry({
  parent: null,
  name: 'kmesh',
  label: 'Kmesh',
  url: '/kmesh',
  icon: 'mdi:hexagon-multiple-outline', // Elegant hexagonal grid representation
});

// 2. Register route to display when Sidebar item is active
registerRoute({
  path: '/kmesh',
  sidebar: 'kmesh',
  name: 'Kmesh Overview',
  exact: true,
  component: () => <KmeshOverview />,
});
