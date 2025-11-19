import create from 'zustand'

const PKEY = 'prefs_regional'

const readInitial = () => {
  try {
    const raw = localStorage.getItem(PKEY)
    if (!raw) return { lenguaje: 'es', moneda: 'ARS' }
    return JSON.parse(raw)
  } catch (e) {
    return { lenguaje: 'es', moneda: 'ARS' }
  }
}

export const useSettingsStore = create((set, get) => ({
  ...readInitial(),
  setLenguaje: (leng) => set(state => {
    const next = { ...state, lenguaje: leng }
    try { localStorage.setItem(PKEY, JSON.stringify(next)) } catch {}
    return next
  }),
  setMoneda: (moneda) => set(state => {
    const next = { ...state, moneda }
    try { localStorage.setItem(PKEY, JSON.stringify(next)) } catch {}
    return next
  })
}))

export default useSettingsStore
