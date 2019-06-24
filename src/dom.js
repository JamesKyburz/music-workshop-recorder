const createElement = (name, opt) => {
  const el = window.document.createElement(name)
  for (const child of opt.children || []) {
    el.appendChild(child)
  }
  for (const [key, value] of Object.entries(opt)) {
    if (key === 'children') continue
    if (value) el[key] = value
  }
  return el
}
export const div = createElement.bind(null, 'div')
export const button = createElement.bind(null, 'button')
export const h1 = createElement.bind(null, 'h1')
