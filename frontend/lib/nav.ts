export interface NavItem {
  href: string;
  label: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  { title: 'Umumiy', items: [{ href: '/', label: 'Bosh sahifa' }] },
  {
    title: 'Moderatsiya',
    items: [
      { href: '/moderation', label: 'Moderatsiya navbati' },
      { href: '/reports', label: 'Shikoyatlar' },
    ],
  },
  {
    title: 'Muammolar',
    items: [
      { href: '/issues', label: 'Barcha muammolar' },
      { href: '/rounds', label: 'Ovoz davrlari' },
    ],
  },
  {
    title: 'Mahalla',
    items: [
      { href: '/residents', label: 'Aholi' },
      { href: '/events', label: 'Tadbirlar' },
      { href: '/announcements', label: "E'lonlar" },
    ],
  },
  { title: 'Tizim', items: [{ href: '/audit', label: 'Audit jurnali' }] },
];
