import { ref, computed, onUnmounted } from 'vue'

/**
 * Composable that creates a countdown timer.
 *
 * @param initialSeconds - Total seconds for the countdown.
 * @param onExpire       - Optional callback invoked when the timer reaches zero.
 *
 * @example
 * ```ts
 * const { formattedTime, isWarning, start, stop } = useTimer(3600, () => {
 *   submitTest()
 * })
 * start()
 * ```
 */
export function useTimer(initialSeconds: number, onExpire?: () => void) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const timeRemaining = ref<number>(initialSeconds)
  const isRunning = ref<boolean>(false)

  let intervalId: ReturnType<typeof setInterval> | null = null

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  /** Formatted time string in MM:SS format */
  const formattedTime = computed<string>(() => {
    const total = Math.max(0, timeRemaining.value)
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })

  /** Less than 5 minutes remaining */
  const isWarning = computed<boolean>(() => timeRemaining.value > 0 && timeRemaining.value < 300)

  /** Less than 1 minute remaining */
  const isCritical = computed<boolean>(() => timeRemaining.value > 0 && timeRemaining.value < 60)

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  function tick(): void {
    if (timeRemaining.value <= 0) {
      stopInterval()
      isRunning.value = false
      onExpire?.()
      return
    }
    timeRemaining.value--
    if (timeRemaining.value <= 0) {
      stopInterval()
      isRunning.value = false
      onExpire?.()
    }
  }

  function startInterval(): void {
    if (intervalId !== null) return
    intervalId = setInterval(tick, 1000)
  }

  function stopInterval(): void {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  // ---------------------------------------------------------------------------
  // Public actions
  // ---------------------------------------------------------------------------

  /** Start (or restart) the countdown from the current `timeRemaining`. */
  function start(): void {
    stopInterval()
    isRunning.value = true
    startInterval()
  }

  /** Pause the countdown without resetting it. */
  function pause(): void {
    stopInterval()
    isRunning.value = false
  }

  /** Resume after a pause. */
  function resume(): void {
    if (isRunning.value) return
    if (timeRemaining.value <= 0) return
    isRunning.value = true
    startInterval()
  }

  /** Stop the countdown and reset to the initial value. */
  function stop(): void {
    stopInterval()
    isRunning.value = false
    timeRemaining.value = initialSeconds
  }

  // ---------------------------------------------------------------------------
  // Cleanup on component unmount
  // ---------------------------------------------------------------------------
  onUnmounted(() => {
    stopInterval()
  })

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return {
    timeRemaining,
    formattedTime,
    isRunning,
    isWarning,
    isCritical,
    start,
    pause,
    resume,
    stop,
  }
}
