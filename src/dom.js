const createElement = name => (opt, children) => {
  if (Array.isArray(opt)) [children, opt] = [opt, {}]
  const el = window.document.createElement(name)
  for (const child of children || []) el.appendChild(child)
  for (const [key, value] of Object.entries(opt)) if (value) el[key] = value
  el.push = child => el.appendChild(child)
  return el
}
export const div = createElement('div')
export const button = createElement('button')
export const h1 = createElement('h1')
export const img = createElement('img')
export const input = createElement('input')
export const h4 = createElement('h4')
export const span = createElement('span')
