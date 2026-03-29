import { ref, onUnmounted } from 'vue'
import { ANTI_CHEAT } from '@/lib/constants'

export type ViolationType =
  | 'tab_switch'
  | 'context_menu'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'devtools'
  | 'screenshot'

export interface ViolationEvent {
  type: ViolationType
  timestamp: string
  count: number
}

/**
 * Anti-cheat composable that monitors and prevents suspicious behaviour
 * during a test session.
 *
 * @param onViolation - Callback invoked each time a violation is detected.
 *                      Called with the current cumulative violation count.
 *                      When the count reaches `ANTI_CHEAT.MAX_TAB_SWITCHES`
 *                      the callback should terminate the test.
 *
 * @example
 * ```ts
 * const { violationCount, activate, deactivate } = useTestSecurity((count) => {
 *   if (count >= ANTI_CHEAT.MAX_TAB_SWITCHES) {
 *     finishTestWithViolation()
 *   }
 * })
 * activate()
 * ```
 */
export function useTestSecurity(onViolation?: (count: number) => void) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const violationCount = ref<number>(0)
  const isSecurityActive = ref<boolean>(false)

  // Track bound listeners so we can cleanly remove them
  const boundListeners: Array<{ target: EventTarget; event: string; handler: EventListener }> = []

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function recordViolation(_type: ViolationType): void {
    violationCount.value++
    onViolation?.(violationCount.value)
  }

  function addListener(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(event, handler, options)
    boundListeners.push({ target, event, handler })
  }

  function removeAllListeners(): void {
    for (const { target, event, handler } of boundListeners) {
      target.removeEventListener(event, handler)
    }
    boundListeners.length = 0
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  /** Detects tab/window switches via the Page Visibility API. */
  function handleVisibilityChange(): void {
    if (document.hidden) {
      recordViolation('tab_switch')
    }
  }

  /** Prevents the right-click context menu. */
  function handleContextMenu(e: Event): void {
    if (ANTI_CHEAT.DISABLE_CONTEXT_MENU) {
      e.preventDefault()
      recordViolation('context_menu')
    }
  }

  /** Prevents copy events. */
  function handleCopy(e: Event): void {
    if (ANTI_CHEAT.DISABLE_COPY_PASTE) {
      e.preventDefault()
      recordViolation('copy')
    }
  }

  /** Prevents cut events. */
  function handleCut(e: Event): void {
    if (ANTI_CHEAT.DISABLE_COPY_PASTE) {
      e.preventDefault()
      recordViolation('cut')
    }
  }

  /** Prevents paste events. */
  function handlePaste(e: Event): void {
    if (ANTI_CHEAT.DISABLE_COPY_PASTE) {
      e.preventDefault()
      recordViolation('paste')
    }
  }

  /**
   * Intercepts keyboard shortcuts commonly used to open dev tools
   * or take screenshots.
   *
   * Detected combos:
   *  - F12
   *  - Ctrl+Shift+I  (Chrome/Firefox dev tools)
   *  - Ctrl+Shift+J  (Chrome console)
   *  - Ctrl+Shift+C  (Inspect element)
   *  - Ctrl+U        (View source)
   *  - PrintScreen    (Screenshot attempt)
   */
  function handleKeyDown(e: KeyboardEvent): void {
    const isCtrl = e.ctrlKey || e.metaKey
    const isShift = e.shiftKey

    // F12
    if (e.key === 'F12') {
      e.preventDefault()
      recordViolation('devtools')
      return
    }

    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
    if (isCtrl && isShift && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
      e.preventDefault()
      recordViolation('devtools')
      return
    }

    // Ctrl+U (view source)
    if (isCtrl && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault()
      recordViolation('devtools')
      return
    }

    // PrintScreen
    if (e.key === 'PrintScreen') {
      e.preventDefault()
      recordViolation('screenshot')
      return
    }
  }

  // ---------------------------------------------------------------------------
  // Public actions
  // ---------------------------------------------------------------------------

  /** Activate all anti-cheat listeners. */
  function activate(): void {
    if (isSecurityActive.value) return

    isSecurityActive.value = true

    addListener(document, 'visibilitychange', handleVisibilityChange)
    addListener(document, 'contextmenu', handleContextMenu)
    addListener(document, 'copy', handleCopy)
    addListener(document, 'cut', handleCut)
    addListener(document, 'paste', handlePaste)
    addListener(document, 'keydown', handleKeyDown as EventListener, { capture: true })
  }

  /** Deactivate all anti-cheat listeners. */
  function deactivate(): void {
    if (!isSecurityActive.value) return

    isSecurityActive.value = false
    removeAllListeners()
  }

  // ---------------------------------------------------------------------------
  // Cleanup on component unmount
  // ---------------------------------------------------------------------------
  onUnmounted(() => {
    deactivate()
  })

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return {
    violationCount,
    isSecurityActive,
    activate,
    deactivate,
  }
}
