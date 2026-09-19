import type { ReactNode } from 'react'
import { navigate } from '../nav'

/**
 * One action per screen (UX principles). The shell supplies a back affordance
 * and a title, and otherwise stays out of the way.
 */
export function Shell({
  title,
  back,
  children,
  footer,
  noScroll = false,
}: {
  title?: string
  back?: string
  children: ReactNode
  footer?: ReactNode
  /** ACQ / UX: no scrolling during encode. */
  noScroll?: boolean
}) {
  return (
    <div
      className={`min-h-full flex flex-col ${noScroll ? 'h-[100dvh] overflow-hidden' : ''}`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
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
      <main className={`flex-1 px-5 ${noScroll ? 'overflow-hidden' : ''}`}>{children}</main>
      {footer && <div className="px-5 pt-4 pb-5 shrink-0">{footer}</div>}
    </div>
  )
}
