import { useSettingsStore } from '../stores/useSettingsStore';

const localeFor = (currency) => {
  switch (currency) {
    case 'USD': return 'en-US'
    case 'EUR': return 'de-DE'
    case 'BRL': return 'pt-BR'
    case 'ARS':
    default: return 'es-AR'
  }
}

export function formatCurrency(amount) {
  // amount could be undefined/null
  const { moneda } = useSettingsStore.getState()
  const locale = localeFor(moneda)
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: moneda }).format(amount || 0)
  } catch (e) {
    return (amount || 0).toFixed(2)
  }
}

export default formatCurrency
