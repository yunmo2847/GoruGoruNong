import { chromium } from 'playwright'

const OUT = 'c:/Users/pokey/AppData/Local/Temp/claude/c--Users-pokey-OneDrive----------/b10dfb03-5683-48f6-af2f-d9fee7f0f128/scratchpad'
const logs = []
const browser = await chromium.launch()
const page = await browser.newPage()
page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${(e.stack || '').split('\n').slice(0,4).join('\n')}`))
page.on('requestfailed', (r) => logs.push(`[reqfailed] ${r.url()} ${r.failure()?.errorText}`))

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
try {
  await page.fill('input[type=email]', 'demo@sugub.kr')
  await page.fill('input[type=password]', 'demo1234')
  await page.click('button[type=submit]')
  await page.waitForTimeout(1500)
} catch (e) { logs.push('[login error] ' + e.message) }
logs.push('URL after login: ' + page.url())

await page.goto('http://localhost:5173/#/map', { waitUntil: 'networkidle' })
await page.waitForTimeout(1800)
await page.screenshot({ path: OUT + '/map.png' })
logs.push('MAP root innerText len: ' + (await page.evaluate(() => document.getElementById('root')?.innerText?.length || 0)))

await page.goto('http://localhost:5173/#/dashboard', { waitUntil: 'networkidle' })
await page.waitForTimeout(1800)
await page.screenshot({ path: OUT + '/dashboard.png' })
logs.push('DASH root innerText len: ' + (await page.evaluate(() => document.getElementById('root')?.innerText?.length || 0)))

console.log(logs.join('\n'))
await browser.close()
