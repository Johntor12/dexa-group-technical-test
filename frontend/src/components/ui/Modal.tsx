import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export function Modal({ title, open, onClose, children, footer }: { title: string; open: boolean; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const node = ref.current; if (open && node && !node.open) node.showModal(); if (!open && node?.open) node.close() }, [open])
  return <dialog ref={ref} onClose={onClose} aria-label={title} onClick={event => { if (event.target === ref.current) ref.current?.close() }}><div className="section-title"><h2>{title}</h2><button autoFocus onClick={onClose}>Tutup</button></div>{children}{footer && <div className="form-actions mt-[1vw]">{footer}</div>}</dialog>
}
