import { app } from 'electron'
import path from 'path'
import fs from 'fs'

const stateFilePath = () => {
    return path.join(app.getPath('userData'), 'window-state.json')
}

/**
 * Load saved window state from disk
 * @returns {Object} Window state with x, y, width, height
 */
export function loadWindowState() {
    try {
        const filePath = stateFilePath()
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8')
            return JSON.parse(data)
        }
    } catch (err) {
        console.error('Failed to load window state:', err)
    }

    // Default window state
    return {
        width: 1200,
        height: 800,
        x: undefined,
        y: undefined,
        isMaximized: false
    }
}

/**
 * Save window state to disk
 * @param {BrowserWindow} win - The window to save state for
 */
export function saveWindowState(win) {
    try {
        const bounds = win.getBounds()
        const state = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            isMaximized: win.isMaximized()
        }

        const filePath = stateFilePath()
        const dir = path.dirname(filePath)

        // Ensure directory exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        fs.writeFileSync(filePath, JSON.stringify(state, null, 2))
    } catch (err) {
        console.error('Failed to save window state:', err)
    }
}

/**
 * Apply saved state to a window
 * @param {BrowserWindow} win - The window to apply state to
 * @param {Object} state - The state to apply
 */
export function applyWindowState(win, state) {
    if (state.x !== undefined && state.y !== undefined) {
        win.setPosition(state.x, state.y)
    }

    if (state.width && state.height) {
        win.setSize(state.width, state.height)
    }

    if (state.isMaximized) {
        win.maximize()
    }
}
