const createElement = name => (opt, children) => {
  if (Array.isArray(opt)) {
    children = opt
    opt = {}
  }
  const el = window.document.createElement(name)
  for (const child of children || []) {
    el.appendChild(child)
  }
  for (const [key, value] of Object.entries(opt)) {
    if (key === 'children') continue
    if (value) el[key] = value
  }
  return el
}
export const div = createElement('div')
export const button = createElement('button')
export const h1 = createElement('h1')
