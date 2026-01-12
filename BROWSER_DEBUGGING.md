# Browser Debugging Guide

## Quick Start

### Automatic Browser Detection

```bash
.\scripts\browser-debug.bat
```

This script automatically:

1. ✅ Detects if Edge or Chrome is running
2. ✅ Launches the detected browser with remote debugging
3. ✅ Opens http://localhost:8081
4. ✅ Enables port 9222 for VS Code attachment

### Manual Debugging Steps

1. **Run the script:**

   ```bash
   .\scripts\browser-debug.bat
   ```

2. **In VS Code:**

   - Press `F5` to open debug menu
   - Select either:
     - `🔗 Attach to Edge (Port 9222)` - if using Edge
     - `🔗 Attach to Chrome (Port 9222)` - if using Chrome

3. **View Console:**
   - All browser console messages appear in VS Code Debug Console
   - Errors, warnings, and logs are captured in real-time

## Browser Detection Logic

The script checks in this order:

1. **Edge** - If `msedge.exe` is running
2. **Chrome** - If `chrome.exe` is running
3. **Default** - Launches Edge if no browser detected

## Supported Browsers

### Microsoft Edge ✅

- Command: `msedge --remote-debugging-port=9222`
- Debug profile: `%TEMP%\edge-debug`
- VS Code debugger type: `msedge`

### Google Chrome ✅

- Command: `chrome --remote-debugging-port=9222`
- Debug profile: `%TEMP%\chrome-debug`
- VS Code debugger type: `chrome`

## Troubleshooting

### Port Already in Use

If you see "port 9222 already in use":

```bash
# Kill existing debug sessions
taskkill /F /IM msedge.exe /T
taskkill /F /IM chrome.exe /T
```

### Can't Attach in VS Code

1. Make sure browser was launched with `--remote-debugging-port=9222`
2. Check that http://localhost:8081 is accessible
3. Restart VS Code debugger (F5)

### Console Not Showing Messages

1. Verify `consoleMonitor.ts` is imported in `App.tsx`
2. Check browser DevTools console for errors
3. Ensure debug session is attached (green play button in VS Code)

## Alternative: Manual Launch

### Edge

```bash
msedge --remote-debugging-port=9222 --user-data-dir="%TEMP%\edge-debug" http://localhost:8081
```

### Chrome

```bash
chrome --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug" http://localhost:8081
```

## VS Code Launch Configuration

Located in `.vscode/launch.json`:

```json
{
  "type": "msedge",
  "request": "attach",
  "name": "🔗 Attach to Edge (Port 9222)",
  "port": 9222,
  "webRoot": "${workspaceFolder}/frontend"
}
```

## Console Monitoring

The app includes `consoleMonitor.ts` which captures:

- ✅ console.log/warn/error/info/debug
- ✅ Unhandled errors and promise rejections
- ✅ Full stack traces
- ✅ Downloadable JSON logs via `window.consoleMonitor.downloadLogs()`

## Backward Compatibility

`chrome-debug.bat` still works and redirects to `browser-debug.bat`

---

**Pro Tip:** Use Edge on Windows as it integrates better with VS Code and has better React DevTools support!
