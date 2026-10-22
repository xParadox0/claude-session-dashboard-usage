import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'
import { randomUUID } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import {
  SettingsSchema,
  DEFAULT_SETTINGS,
  ensureMachineId,
  type Settings,
} from './settings.types'

const SETTINGS_DIR = '.claude-dashboard'
const SETTINGS_FILE = 'settings.json'

function getSettingsPath(): string {
  return path.join(os.homedir(), SETTINGS_DIR, SETTINGS_FILE)
}

function getSettingsDir(): string {
  return path.join(os.homedir(), SETTINGS_DIR)
}

export const getSettings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Settings> => {
    const filePath = getSettingsPath()

    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const json = JSON.parse(raw) as unknown
      const result = SettingsSchema.safeParse(json)

      if (result.success) {
        const settings = ensureMachineId(result.data, randomUUID)
        if (!result.data.machineId) {
          persistSettings(settings)
        }
        return settings
      }

      // Corrupt or invalid file -- return defaults
      console.warn('Invalid settings file, using defaults:', result.error.message)
      const settings = { ...DEFAULT_SETTINGS, machineId: randomUUID() }
      persistSettings(settings)
      return settings
    } catch {
      // File does not exist or is unreadable -- return defaults
      const settings = { ...DEFAULT_SETTINGS, machineId: randomUUID() }
      persistSettings(settings)
      return settings
    }
  },
)

export const saveSettings = createServerFn({ method: 'POST' })
  .inputValidator((input: Settings) => {
    const result = SettingsSchema.parse(input)
    return result
  })
  .handler(async ({ data }): Promise<Settings> => {
    const settingsWithTimestamp: Settings = {
      ...data,
      machineId: data.machineId ?? randomUUID(),
      updatedAt: new Date().toISOString(),
    }

    try {
      persistSettings(settingsWithTimestamp)
      return settingsWithTimestamp
    } catch (error) {
      throw new Error(
        `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  })

function persistSettings(settings: Settings): void {
  const dir = getSettingsDir()
  const filePath = getSettingsPath()
  const tmpPath = filePath + '.tmp'
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(tmpPath, JSON.stringify(settings, null, 2), 'utf-8')
  fs.renameSync(tmpPath, filePath)
}
