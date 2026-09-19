import type { ReactNode } from 'react'
import { navigate } from '../nav'
import { NavBar } from './NavBar'
import type { Tab } from './NavBar'

/**
 * One action per screen (UX principles). The shell supplies a back affordance, a
 * title, and — on hub screens only — the bottom nav.
 */
export function Shell({
  title,
  back,
  children,
  footer,
  noScroll = false,
  tab,
}: {
  title?: string
  back?: string
  children: ReactNode
  footer?: ReactNode
  /** ACQ / UX: no scrolling during encode. */
  noScroll?: boolean
  /** Which nav tab is current. Omit on focused practice screens to hide the nav. */
  tab?: Tab
}) {
  return (
    <div
      /*
       * With a nav, the shell owns the viewport and only <main> scrolls, so the tab bar
       * stays put instead of sitting at the end of a long document. Without one, the
       * document scrolls normally.
       */
      className={
        tab || noScroll
          ? 'h-[100dvh] flex flex-col overflow-hidden'
          : 'min-h-[100dvh] flex flex-col'
      }
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: tab ? undefined : 'env(safe-area-inset-bottom)',
      }}
    >
      {(title || back) && (
        <header className="flex items-center gap-3 px-4 py-3 shrink-0">
          {back !== undefined && (
            <button
              onClick={() => navigate(back)}
              className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-neutral-400 text-2xl"
              aria-label="Back"
            >
              ←
            </button>
          )}
          {title && <h1 className="label">{title}</h1>}
        </header>
      )}
      <main
        className={`flex-1 px-5 ${
          noScroll ? 'overflow-hidden' : tab ? 'overflow-y-auto overscroll-contain' : ''
        }`}
      >
        {children}
      </main>
      {footer && <div className="px-5 pt-4 pb-5 shrink-0">{footer}</div>}
      {tab && <NavBar active={tab} />}
    </div>
  )
}
