/**
 * 自检：`node --test test/smoke.mjs`（需先 `pnpm build`）。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = fileURLToPath(new URL('..', import.meta.url))
const plugin = await import('../lib/index.js')

function fakeContext() {
  const skills = []
  const ctx = {
    skills: { register(skill) { skills.push(skill); return () => {} } },
    get() { return undefined },
    on() {},
    logger: { warn() {} },
  }
  return { ctx, skills }
}

test('注册技能：名字、正文、资源目录都正确', () => {
  const { ctx, skills } = fakeContext()
  plugin.apply(ctx)
  assert.equal(skills.length, 1)
  assert.equal(skills[0].name, 'chronic-care-team')
  assert.ok(skills[0].description.length > 40)
  assert.ok(skills[0].resourceBase.path.endsWith(join('resources', 'skills', 'chronic-care-team')))
})

test('知识载荷完整：六条硬规则、妊娠闸门、四级就医建议都在', () => {
  const { ctx, skills } = fakeContext()
  plugin.apply(ctx)
  const body = skills[0].content
  for (const needle of ['不可违背的六条', '妊娠闸门', '四级就医建议', '必须在医师指导下调整治疗方案', 'A/B/C', '没有医学背景的人看懂']) {
    assert.ok(body.includes(needle), `缺少：${needle}`)
  }
})

test('缺少 skills 服务时只告警，不抛错', () => {
  const ctx = { get() {}, on() {}, logger: { warn() {} } }
  assert.doesNotThrow(() => plugin.apply(ctx))
})

test('Web 半边：语法可解析，声明了两个 slot', () => {
  const code = readFileSync(join(root, 'client', 'index.js'), 'utf8')
  assert.doesNotThrow(() => new vm.Script(code, { filename: 'client/index.js' }))
  assert.ok(code.includes('__ModuleLoader__.load'))
  assert.ok(code.includes("ctx.slots.inject('main'"))
  assert.ok(code.includes("ctx.slots.inject('sidebar.panellist'"))
})

test('Web 半边：跑一遍模块契约，两个 slot 参数正确', () => {
  const code = readFileSync(join(root, 'client', 'index.js'), 'utf8')
  const noopHook = (init) => [typeof init === 'function' ? init() : init, () => {}]
  const fakeReact = {
    createElement: () => null,
    useState: noopHook,
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useRef: (init) => ({ current: init }),
    useCallback: (fn) => fn,
  }
  let loaded = null
  const sandbox = {
    window: { __ModuleLoader__: { load: (spec) => { loaded = spec } } },
    document: { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), head: { appendChild() {} } },
    navigator: { language: 'zh-CN' },
    localStorage: { getItem: () => null, setItem: () => {} },
    console,
  }
  sandbox.globalThis = sandbox
  vm.createContext(sandbox)
  vm.runInContext(code, sandbox, { filename: 'client/index.js' })

  assert.ok(loaded)
  assert.equal(loaded.id, 'chronic-care-workbench')
  const exportsObj = loaded.factory(() => fakeReact)
  assert.equal(typeof exportsObj.apply, 'function')
  assert.deepEqual([...exportsObj.inject], ['slots'])

  const registered = []
  const ctx = {
    slots: {
      inject: (name, fn) => fn(),
      register: (spec, component) => { registered.push({ spec, component }); return () => {} },
    },
  }
  exportsObj.apply(ctx)
  const main = registered.find((r) => r.spec.name === 'main')
  const side = registered.find((r) => r.spec.name === 'sidebar.panellist')
  assert.ok(main && main.spec.key === 'chronic-care-workbench')
  assert.ok(side && side.spec.id === 'chronic-care-workbench' && typeof side.spec.order === 'number')
  assert.equal(typeof side.spec.label(), 'string')
})

test('Web 半边：红线与非功能需求的关键实现都在', () => {
  const code = readFileSync(join(root, 'client', 'index.js'), 'utf8')
  for (const id of ['stroke', 'cardiac', 'breath', 'hypo', 'dka', 'aki']) {
    assert.ok(code.includes(`id: '${id}'`), `缺少红线：${id}`)
  }
  // 自包含：不引外部网络资源
  assert.ok(!/https?:\/\/(?!127\.0\.0\.1)/.test(code), '不应出现外部 URL')
  assert.ok(code.includes('mustLine'), '缺少固定免责句')
  assert.ok(code.includes('svg'), '趋势图应为内联 SVG')
})
