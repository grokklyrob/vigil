import { STATIONS } from './copy'

export function createStations() {
  const kickerEl = document.getElementById('kicker')
  const bodyEl = document.getElementById('body')
  const live = document.getElementById('live')
  const advanceEl = document.getElementById('advance')
  if (!kickerEl || !bodyEl || !(advanceEl instanceof HTMLButtonElement)) {
    throw new Error('station markup missing')
  }
  const kicker = kickerEl
  const body = bodyEl
  const advance = advanceEl

  let index = 0

  function paint(): void {
    const s = STATIONS[index]!
    kicker.textContent = s.kicker
    body.replaceChildren(
      ...s.paragraphs.map((text) => {
        const p = document.createElement('p')
        p.textContent = text
        return p
      }),
    )
    if (live) live.textContent = s.spoken
    const closing = index >= STATIONS.length - 1
    advance.disabled = closing
    advance.hidden = closing
  }

  function forward(): void {
    if (index < STATIONS.length - 1) {
      index += 1
      paint()
    }
  }

  function back(): void {
    if (index > 0) {
      index -= 1
      paint()
    }
  }

  paint()

  return {
    forward,
    back,
    get isClosing() {
      return index >= STATIONS.length - 1
    },
  }
}

export type Stations = ReturnType<typeof createStations>
