// 파일 기반 사용자 저장소. 재시작 후에도 계정 유지. 비밀번호는 bcrypt 해시만 저장.
import bcrypt from 'bcryptjs'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../.data')
const file = resolve(dataDir, 'users.json')

export interface User {
  id: string
  email: string
  name: string
  passwordHash: string // 평문은 절대 저장하지 않음
  createdAt: string
}

let users: User[] = []

function persist() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  writeFileSync(file, JSON.stringify(users, null, 2))
}

function load() {
  if (existsSync(file)) {
    try {
      users = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      users = []
    }
  }
}

export const DEMO_ACCOUNT = { email: 'demo@sugub.kr', password: 'demo1234', name: '홍길동' }

export function initUsers(): User {
  load()
  let demo = users.find((u) => u.email === DEMO_ACCOUNT.email)
  if (!demo) {
    demo = {
      id: 'u-demo',
      email: DEMO_ACCOUNT.email,
      name: DEMO_ACCOUNT.name,
      passwordHash: bcrypt.hashSync(DEMO_ACCOUNT.password, 10),
      createdAt: new Date().toISOString(),
    }
    users.push(demo)
    persist()
  }
  return demo
}

export function findByEmail(email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export function findById(id: string): User | undefined {
  return users.find((u) => u.id === id)
}

export function createUser(email: string, name: string, password: string): User {
  const user: User = {
    id: 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    email,
    name,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  persist()
  return user
}

export function verifyPassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.passwordHash)
}

/** 클라이언트에 안전하게 노출할 형태(해시 제외). */
export function publicUser(u: User) {
  return { id: u.id, email: u.email, name: u.name }
}
