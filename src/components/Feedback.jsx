import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../icons/Icon.jsx'
import { haptic } from '../lib/haptics.js'

const Ctx = createContext(null)
export const useFeedback = () => useContext(Ctx)

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const [input, setInput] = useState('')
  const resolver = useRef(null)

  const toast = useCallback((msg, kind = 'info') => {
    const id = Math.random()
    if (kind === 'success') haptic('success')
    if (kind === 'error') haptic('warn')
    setToasts((t) => [...t.slice(-2), { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 4200 : 2600)
  }, [])

  const ask = useCallback((opts) => {
    setInput(opts.defaultValue || '')
    setDialog(opts)
    return new Promise((res) => (resolver.current = res))
  }, [])

  const close = (val) => {
    resolver.current?.(val)
    resolver.current = null
    setDialog(null)
  }

  const confirm = useCallback((opts) => ask({ ...opts, kind: 'confirm' }), [ask])
  const prompt = useCallback((opts) => ask({ ...opts, kind: 'prompt' }), [ask])

  return (
    <Ctx.Provider value={{ toast, confirm, prompt }}>
      {children}
      {createPortal(
        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`toast lg toast-${t.kind}`}>
              <Icon name={t.kind === 'error' ? 'alert' : t.kind === 'success' ? 'check' : 'info'} size={18} stroke={2.4} />
              <span>{t.msg}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
      {dialog &&
        createPortal(
          <div className="dialog-root" onClick={() => close(dialog.kind === 'prompt' ? null : false)}>
            <form
              className="dialog lg"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault()
                if (dialog.kind === 'prompt') {
                  if (!input.trim()) return
                  close(input.trim())
                } else close(true)
              }}
            >
              <h3>{dialog.title}</h3>
              {dialog.message && <p>{dialog.message}</p>}
              {dialog.kind === 'prompt' && (
                <input
                  className="field"
                  autoFocus
                  value={input}
                  maxLength={dialog.maxLength || 40}
                  placeholder={dialog.placeholder}
                  onChange={(e) => setInput(e.target.value)}
                />
              )}
              <div className="dialog-actions">
                <button type="button" onClick={() => close(dialog.kind === 'prompt' ? null : false)}>
                  {dialog.cancelText || 'Cancel'}
                </button>
                <button type="submit" className={dialog.destructive ? 'destructive' : 'bold'}>
                  {dialog.confirmText || 'OK'}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </Ctx.Provider>
  )
}
