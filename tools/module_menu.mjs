import {emitKeypressEvents} from 'node:readline'

// Returns selected IDs in menu order, or null when cancelled.
export async function selectModuleMenu(items, {input=process.stdin, output=process.stdout}={}) {
  if (!input.isTTY || !output.isTTY) return items.map(item => item.id)
  const selected = items.map(() => true)
  let cursor = 0
  let renderedLines = 0
  let notice = ''
  const wasRaw = Boolean(input.isRaw)

  return new Promise((resolve, reject) => {
    function render() {
      const count = selected.filter(Boolean).length
      const lines = [
        '[MaaYMZX] 选择本次执行的模块',
        '↑↓ 移动   空格 勾选/取消   回车 执行   Esc 取消',
        '',
        ...items.map((item,index) => `${index===cursor?'>':' '} [${selected[index]?'x':' '}] ${index+1}. ${item.label}`),
        '',
        notice || `已选 ${count}/${items.length} 项；默认全部选中，直接回车一键执行。`,
      ]
      if (renderedLines) output.write(`\x1b[${renderedLines}A`)
      output.write(lines.map(line => '\r\x1b[2K'+line).join('\n')+'\n')
      renderedLines = lines.length
    }
    function cleanup() {
      input.removeListener('keypress', onKey)
      input.removeListener('error', onError)
      input.setRawMode(wasRaw)
      input.pause()
      output.write('\x1b[?25h')
    }
    function onError(error) {
      cleanup()
      reject(error)
    }
    function onKey(_text, key={}) {
      if (key.name==='escape' || (key.ctrl && key.name==='c')) {
        cleanup()
        resolve(null)
        return
      }
      if (key.name==='return' || key.name==='enter') {
        const ids=items.filter((_item,index)=>selected[index]).map(item=>item.id)
        if (ids.length) {
          cleanup()
          resolve(ids)
          return
        }
        notice='请至少勾选一个模块，或按 Esc 取消。'
      } else if (key.name==='up') {
        cursor=(cursor+items.length-1)%items.length
        notice=''
      } else if (key.name==='down') {
        cursor=(cursor+1)%items.length
        notice=''
      } else if (key.name==='space') {
        selected[cursor]=!selected[cursor]
        notice=''
      } else return
      render()
    }
    emitKeypressEvents(input)
    input.setRawMode(true)
    input.on('keypress',onKey)
    input.on('error',onError)
    input.resume()
    output.write('\x1b[?25l')
    render()
  })
}
