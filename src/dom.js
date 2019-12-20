const createElement = name => (opt, children) => {
  if (Array.isArray(opt)) [children, opt] = [opt, {}]
  const el = window.document.createElement(name)
  for (const child of children || []) el.appendChild(child)
  for (const [key, value] of Object.entries(opt)) if (value) el[key] = value
  el.push = child => el.appendChild(child)
  return el
}
export const div = createElement('div')
export const a = createElement('a')
export const img = createElement('img')
export const input = createElement('input')
export const h4 = createElement('h4')
export const span = createElement('span')
export const audio = createElement('audio')
export const video = createElement('video')
export const datalist = createElement('datalist')
export const option = createElement('option')
