import { navigate } from '../nav'

/**
 * Persistent bottom nav.
 *
 * It appears on the hub screens only. Encode, commute and the scored checks hide it
 * deliberately: "one action per screen" is a stated UX principle, and during encode
 * a row of escape hatches at the bottom of the screen is four extra decisions at the
 * exact moment the design is trying to leave you with one.
 */
export type Tab = 'today' | 'practice' | 'plan' | 'text' | 'settings'

const TABS: { id: Tab; label: string; to: string; icon: JSX.Element }[] = [
  {
    id: 'today',
    label: 'Today',
    to: '/',
    icon: (
      <path d="M4 7h16M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2M4 7v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7M8 3v4M16 3v4" />
    ),
  },
  {
    id: 'practice',
    label: 'Practice',
    to: '/practice',
    icon: <path d="M12 4v16M4 9v6M20 9v6M8 6v12M16 6v12" />,
  },
  {
    id: 'plan',
    label: 'Plan',
    to: '/plan',
    icon: <path d="M4 6h16M4 12h10M4 18h13" />,
  },
  {
    id: 'text',
    label: 'Text',
    to: '/boundaries',
    icon: <path d="M5 4h10l4 4v12a0 0 0 0 1 0 0H5zM15 4v4h4M8 13h8M8 17h5" />,
  },
  {
    id: 'settings',
    label: 'Settings',
    to: '/settings',
    icon: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10.6 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />,
  },
]

export function NavBar({ active }: { active: Tab }) {
  return (
    <nav
      className="shrink-0 border-t border-ink-800 bg-ink-950/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main"
    >
      <ul className="flex">
        {TABS.map((t) => {
          const on = t.id === active
          return (
            <li key={t.id} className="flex-1">
              <button
                onClick={() => navigate(t.to)}
                aria-current={on ? 'page' : undefined}
                className={`w-full min-h-[3.75rem] flex flex-col items-center justify-center gap-1
                            ${on ? 'text-neutral-100' : 'text-neutral-600'}`}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={on ? 2 : 1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {t.icon}
                </svg>
                <span className="text-[0.65rem] tracking-wide">{t.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
