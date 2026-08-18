/**
 * StopwatchScreen.tsx
 *
 * Session 15 — Stopwatch UI Polish (Pass 2) + Named Sessions.
 *
 * New in this pass:
 *   - Idle screen shows activity selector: Coding / Study / Workout / Focus /
 *     Custom / Quick Start
 *   - Custom shows an inline TextInput for a user-typed name
 *   - Quick Start preserves original "Session" label behavior
 *   - Selected label shown prominently above the hero timer while running/paused
 *   - saveSession now receives the selected label (sessionService no longer
 *     hardcodes "Session")
 *   - Session history cards display the label (emoji + name)
 *   - Existing sessions with label "Session" continue displaying correctly
 *
 * All stopwatch logic, Firestore, pull-to-refresh, navigation — UNCHANGED.
 * Pass 2 visual design preserved entirely.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { Colors }          from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import {
  saveSession,
  getSessions,
  StopwatchSession,
  SessionLap,
} from '../../services/sessionService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimerState = 'idle' | 'running' | 'paused';

// ---------------------------------------------------------------------------
// Activity presets
// ---------------------------------------------------------------------------

interface ActivityPreset {
  emoji: string;
  name:  string;
  label: string;   // stored value (no emoji)
}

const PRESETS: ActivityPreset[] = [
  { emoji: '💻', name: 'Coding',  label: 'Coding'  },
  { emoji: '📚', name: 'Study',   label: 'Study'   },
  { emoji: '🏋️', name: 'Workout', label: 'Workout' },
  { emoji: '🎯', name: 'Focus',   label: 'Focus'   },
];

const QUICK_START_LABEL = 'Session';
const CUSTOM_KEY        = 'custom';

// ---------------------------------------------------------------------------
// Formatters — unchanged
// ---------------------------------------------------------------------------

function formatTime(ms: number): string {
  const totalCentiseconds = Math.floor(ms / 10);
  const centiseconds      = totalCentiseconds % 100;
  const totalSeconds      = Math.floor(totalCentiseconds / 100);
  const seconds           = totalSeconds % 60;
  const minutes           = Math.floor(totalSeconds / 60);
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const cc = String(centiseconds).padStart(2, '0');
  return `${mm}:${ss}.${cc}`;
}

function formatSessionDate(epochMs: number): string {
  const d = new Date(epochMs);
  return (
    d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
}

/** Map a stored label back to its emoji for history display */
function labelToEmoji(label: string): string {
  switch (label) {
    case 'Coding':  return '💻';
    case 'Study':   return '📚';
    case 'Workout': return '🏋️';
    case 'Focus':   return '🎯';
    case 'Session': return '⏱';
    default:        return '✏️';   // custom
  }
}

// ---------------------------------------------------------------------------
// Derived visual tokens per state — unchanged from Pass 2
// ---------------------------------------------------------------------------

interface StateTheme {
  ringColor:  string;
  timerColor: string;
  stateLabel: string;
  stateDot:   string;
}

function getStateTheme(timerState: TimerState): StateTheme {
  switch (timerState) {
    case 'running':
      return {
        ringColor:  Colors.primary,
        timerColor: Colors.primary,
        stateLabel: 'Running',
        stateDot:   Colors.primary,
      };
    case 'paused':
      return {
        ringColor:  Colors.outlineVariant,
        timerColor: Colors.textSecondary,
        stateLabel: 'Paused',
        stateDot:   Colors.warning,
      };
    default:
      return {
        ringColor:  Colors.outlineVariant,
        timerColor: Colors.textPrimary,
        stateLabel: 'Ready',
        stateDot:   Colors.outlineVariant,
      };
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Circular hero timer — now also receives the active session label */
interface HeroTimerProps {
  elapsed:      number;
  timerState:   TimerState;
  lapCount:     number;
  sessionLabel: string;
}

const HeroTimer: React.FC<HeroTimerProps> = ({
  elapsed,
  timerState,
  lapCount,
  sessionLabel,
}) => {
  const theme    = getStateTheme(timerState);
  const isIdle   = timerState === 'idle';
  const showName = !isIdle && sessionLabel !== '';

  return (
    <View style={styles.heroOuter}>
      {/* Active session name above ring — only when running/paused */}
      {showName && (
        <View style={styles.sessionNameRow}>
          <Text style={styles.sessionNameEmoji}>{labelToEmoji(sessionLabel)}</Text>
          <Text style={styles.sessionNameText}>{sessionLabel.toUpperCase()}</Text>
        </View>
      )}

      {/* Ring */}
      <View style={[styles.heroRing, { borderColor: theme.ringColor }]}>
        <View style={styles.heroInner}>
          {/* State indicator */}
          <View style={styles.stateRow}>
            <View style={[styles.stateDot, { backgroundColor: theme.stateDot }]} />
            <Text style={styles.stateLabel}>{theme.stateLabel}</Text>
          </View>

          {/* Timer */}
          <Text style={[styles.timerText, { color: theme.timerColor }]}>
            {formatTime(elapsed)}
          </Text>

          {/* Lap hint */}
          {lapCount > 0 ? (
            <Text style={styles.lapHint}>
              {lapCount} {lapCount === 1 ? 'lap' : 'laps'}
            </Text>
          ) : (
            <Text style={styles.lapHintPlaceholder}> </Text>
          )}
        </View>
      </View>
    </View>
  );
};

/** Single lap row — timeline style, unchanged */
interface LapRowProps {
  lap:   SessionLap;
  total: number;
}

const LapRow: React.FC<LapRowProps> = ({ lap, total }) => (
  <View style={styles.lapRow}>
    <View style={styles.lapAccentBar} />
    <Text style={styles.lapNumber}>{String(lap.lapNumber).padStart(2, '0')}</Text>
    <View style={styles.lapLabelCol}>
      <Text style={styles.lapLabel}>Lap {lap.lapNumber}</Text>
      <Text style={styles.lapSplit}>of {formatTime(total)}</Text>
    </View>
    <Text style={styles.lapTime}>{formatTime(lap.time)}</Text>
  </View>
);

/** Session history card — now shows label with emoji */
interface SessionCardProps {
  session: StopwatchSession;
}

const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const lapCount = session.laps.length;
  const lapText  =
    lapCount === 0 ? 'No laps' :
    lapCount === 1 ? '1 lap'   :
    `${lapCount} laps`;
  const emoji = labelToEmoji(session.label);

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionLeft}>
        <View style={styles.sessionLabelRow}>
          <Text style={styles.sessionLabelEmoji}>{emoji}</Text>
          <Text style={styles.sessionLabelText}>{session.label}</Text>
        </View>
        <Text style={styles.sessionDuration}>{formatTime(session.duration)}</Text>
        <Text style={styles.sessionDate}>{formatSessionDate(session.savedAt)}</Text>
      </View>
      <View style={styles.sessionRight}>
        <Text style={styles.sessionLapCount}>{lapText}</Text>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Activity selector — shown only when idle
// ---------------------------------------------------------------------------

interface ActivitySelectorProps {
  onSelect:     (label: string) => void;
  onQuickStart: () => void;
}

const ActivitySelector: React.FC<ActivitySelectorProps> = ({ onSelect, onQuickStart }) => {
  const [selected,    setSelected]    = useState<string | null>(null);
  const [customText,  setCustomText]  = useState<string>('');
  const [customError, setCustomError] = useState<string>('');

  function handlePreset(preset: ActivityPreset): void {
    setSelected(preset.label);
    setCustomError('');
  }

  function handleCustom(): void {
    setSelected(CUSTOM_KEY);
    setCustomError('');
  }

  function handleStart(): void {
    if (selected === CUSTOM_KEY) {
      const trimmed = customText.trim();
      if (!trimmed) {
        setCustomError('Enter a session name to continue.');
        return;
      }
      onSelect(trimmed);
    } else if (selected !== null) {
      onSelect(selected);
    }
  }

  const isPresetSelected = (label: string) => selected === label;
  const isCustomSelected = selected === CUSTOM_KEY;
  const canStart         = selected !== null &&
    !(selected === CUSTOM_KEY && customText.trim() === '');

  return (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>What are you working on?</Text>

      {/* Preset grid */}
      <View style={styles.presetGrid}>
        {PRESETS.map(p => (
          <TouchableOpacity
            key={p.label}
            style={[
              styles.presetChip,
              isPresetSelected(p.label) && styles.presetChipSelected,
            ]}
            onPress={() => handlePreset(p)}
            activeOpacity={0.75}
          >
            <Text style={styles.presetEmoji}>{p.emoji}</Text>
            <Text style={[
              styles.presetName,
              isPresetSelected(p.label) && styles.presetNameSelected,
            ]}>
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Custom chip */}
        <TouchableOpacity
          style={[styles.presetChip, isCustomSelected && styles.presetChipSelected]}
          onPress={handleCustom}
          activeOpacity={0.75}
        >
          <Text style={styles.presetEmoji}>✏️</Text>
          <Text style={[
            styles.presetName,
            isCustomSelected && styles.presetNameSelected,
          ]}>
            Custom
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom text input — appears when Custom selected */}
      {isCustomSelected && (
        <View style={styles.customInputWrap}>
          <TextInput
            style={[styles.customInput, customError ? styles.customInputError : null]}
            placeholder="e.g. Project Work"
            placeholderTextColor={Colors.textSecondary}
            value={customText}
            onChangeText={t => {
              setCustomText(t);
              if (customError) setCustomError('');
            }}
            maxLength={32}
            autoFocus
            returnKeyType="done"
          />
          {customError ? (
            <Text style={styles.customErrorText}>{customError}</Text>
          ) : null}
        </View>
      )}

      {/* Start with selected activity */}
      <TouchableOpacity
        style={[styles.primaryPill, !canStart && styles.btnDisabled]}
        onPress={handleStart}
        disabled={!canStart}
        activeOpacity={0.75}
      >
        <Text style={styles.primaryPillText}>
          {selected === null ? 'Select an activity' : 'Start'}
        </Text>
      </TouchableOpacity>

      {/* Quick Start — always available */}
      <TouchableOpacity
        style={styles.quickStartBtn}
        onPress={onQuickStart}
        activeOpacity={0.75}
      >
        <Text style={styles.quickStartText}>Quick Start</Text>
      </TouchableOpacity>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const StopwatchScreen: React.FC = () => {
  const { user } = useAuth();

  const [timerState,    setTimerState]    = useState<TimerState>('idle');
  const [elapsed,       setElapsed]       = useState<number>(0);
  const [laps,          setLaps]          = useState<SessionLap[]>([]);
  const [lapStart,      setLapStart]      = useState<number>(0);
  const [sessionLabel,  setSessionLabel]  = useState<string>('');

  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef       = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  const [sessions,       setSessions]       = useState<StopwatchSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [saving,         setSaving]         = useState<boolean>(false);

  const isSavingRef = useRef<boolean>(false);

  // -------------------------------------------------------------------------
  // Timer engine — UNCHANGED
  // -------------------------------------------------------------------------

  function startInterval(): void {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const now   = Date.now();
      const total = (now - startRef.current) + accumulatedRef.current;
      setElapsed(total);
    }, 10);
  }

  function stopInterval(currentElapsed: number): void {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    accumulatedRef.current = currentElapsed;
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Session history — UNCHANGED
  // -------------------------------------------------------------------------

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const data = await getSessions(user.uid);
      setSessions(data);
    } catch {
      // non-fatal
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  // -------------------------------------------------------------------------
  // Controls — core logic UNCHANGED; start now accepts a label
  // -------------------------------------------------------------------------

  function startWithLabel(label: string): void {
    accumulatedRef.current = 0;
    setElapsed(0);
    setLaps([]);
    setLapStart(0);
    setSessionLabel(label);
    startInterval();
    setTimerState('running');
  }

  // Called by ActivitySelector with a chosen or custom label
  function handleStart(label: string): void {
    startWithLabel(label);
  }

  // Quick Start — preserves original "Session" behavior
  function handleQuickStart(): void {
    startWithLabel(QUICK_START_LABEL);
  }

  function handlePause(): void {
    stopInterval(elapsed);
    setTimerState('paused');
  }

  function handleResume(): void {
    startInterval();
    setTimerState('running');
  }

  function handleLap(): void {
    const currentMs = elapsed;
    const splitMs   = currentMs - lapStart;
    const lapNumber = laps.length + 1;
    setLaps(prev => [...prev, { lapNumber, time: splitMs }]);
    setLapStart(currentMs);
  }

  async function handleReset(): Promise<void> {
    if (isSavingRef.current) return;

    const totalElapsed = elapsed;

    if (totalElapsed === 0) {
      clearStopwatch();
      return;
    }

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!user) {
      Alert.alert('Error', 'You must be signed in to save a session.');
      return;
    }

    isSavingRef.current = true;
    setSaving(true);

    try {
      await saveSession(user.uid, {
        label:     sessionLabel || QUICK_START_LABEL,
        duration:  totalElapsed,
        laps:      laps,
        startedAt: Date.now() - totalElapsed,
      });
      clearStopwatch();
      await loadHistory();
    } catch {
      Alert.alert(
        'Save Failed',
        'Could not save the session. Your stopwatch data is preserved. Please try again.',
        [{ text: 'OK' }],
      );
      accumulatedRef.current = totalElapsed;
      setTimerState('paused');
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  }

  function clearStopwatch(): void {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    accumulatedRef.current = 0;
    setElapsed(0);
    setLaps([]);
    setLapStart(0);
    setSessionLabel('');
    setTimerState('idle');
  }

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const isIdle    = timerState === 'idle';
  const isRunning = timerState === 'running';
  const isPaused  = timerState === 'paused';

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loadingHistory}
          onRefresh={loadHistory}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      {/* ── Screen title ── */}
      <Text style={styles.screenTitle}>Stopwatch</Text>

      {/* ── IDLE: Activity selector replaces hero timer ── */}
      {isIdle ? (
        <ActivitySelector
          onSelect={handleStart}
          onQuickStart={handleQuickStart}
        />
      ) : (
        <>
          {/* ── Hero timer (running / paused) ── */}
          <HeroTimer
            elapsed={elapsed}
            timerState={timerState}
            lapCount={laps.length}
            sessionLabel={sessionLabel}
          />

          {/* ── Controls ── */}
          <View style={styles.controlsZone}>
            {isRunning && (
              <>
                <TouchableOpacity
                  style={styles.primaryPill}
                  onPress={handlePause}
                  activeOpacity={0.75}
                >
                  <Text style={styles.primaryPillText}>Pause</Text>
                </TouchableOpacity>
                <View style={styles.secondaryRow}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={handleLap}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.secondaryBtnText}>Lap</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, saving && styles.btnDisabled]}
                    onPress={handleReset}
                    disabled={saving}
                    activeOpacity={0.75}
                  >
                    {saving
                      ? <ActivityIndicator color={Colors.danger} size="small" />
                      : <Text style={[styles.secondaryBtnText, styles.resetText]}>Reset</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {isPaused && (
              <>
                <TouchableOpacity
                  style={styles.primaryPill}
                  onPress={handleResume}
                  activeOpacity={0.75}
                >
                  <Text style={styles.primaryPillText}>Resume</Text>
                </TouchableOpacity>
                <View style={styles.secondaryRow}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={handleLap}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.secondaryBtnText}>Lap</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, saving && styles.btnDisabled]}
                    onPress={handleReset}
                    disabled={saving}
                    activeOpacity={0.75}
                  >
                    {saving
                      ? <ActivityIndicator color={Colors.danger} size="small" />
                      : <Text style={[styles.secondaryBtnText, styles.resetText]}>Reset</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* ── Current laps ── */}
          {laps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Current Laps</Text>
              <View style={styles.lapList}>
                {[...laps].reverse().map(lap => (
                  <LapRow key={lap.lapNumber} lap={lap} total={elapsed} />
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {/* ── Previous sessions — always visible ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Previous Sessions</Text>

        {loadingHistory && sessions.length === 0 ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color={Colors.primary} size="small" />
            <Text style={styles.centeredStateText}>Loading…</Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏁</Text>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyBody}>
              Start the stopwatch and save your first session.
            </Text>
          </View>
        ) : (
          sessions.map(session => (
            <SessionCard key={session.id} session={session} />
          ))
        )}
      </View>
    </ScrollView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const RING_SIZE  = 240;
const RING_WIDTH = 3;

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop:        Spacing.lg,
    paddingBottom:     Spacing.xxl,
  },

  // ── Screen title ───────────────────────────────────────────────────────
  screenTitle: {
    color:         Colors.textPrimary,
    fontSize:      22,
    fontWeight:    '700',
    letterSpacing: -0.3,
    marginBottom:  Spacing.lg,
  },

  // ── Activity selector (idle state) ─────────────────────────────────────
  selectorContainer: {
    marginBottom: Spacing.lg,
    gap:          Spacing.md,
  },
  selectorTitle: {
    color:      Colors.textSecondary,
    fontSize:   14,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.sm,
  },
  presetChip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius:    Radius.full,
    paddingVertical:   10,
    paddingHorizontal: Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.outlineVariant,
  },
  presetChipSelected: {
    backgroundColor: Colors.primaryContainer,
    borderColor:     Colors.primary,
  },
  presetEmoji: {
    fontSize: 16,
  },
  presetName: {
    color:      Colors.textPrimary,
    fontSize:   14,
    fontWeight: '500',
  },
  presetNameSelected: {
    color:      Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  customInputWrap: {
    gap: Spacing.xs,
  },
  customInput: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.outlineVariant,
    paddingHorizontal: Spacing.md,
    paddingVertical:   12,
    color:           Colors.textPrimary,
    fontSize:        15,
  },
  customInputError: {
    borderColor: Colors.danger,
  },
  customErrorText: {
    color:    Colors.danger,
    fontSize: 12,
  },
  quickStartBtn: {
    alignItems:  'center',
    paddingVertical: Spacing.sm,
  },
  quickStartText: {
    color:         Colors.textSecondary,
    fontSize:      14,
    fontWeight:    '500',
    textDecorationLine: 'underline',
  },

  // ── Hero timer zone ────────────────────────────────────────────────────
  heroOuter: {
    alignItems:   'center',
    marginBottom: Spacing.lg,
    gap:          Spacing.sm,
  },
  sessionNameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  sessionNameEmoji: {
    fontSize: 18,
  },
  sessionNameText: {
    color:         Colors.textPrimary,
    fontSize:      13,
    fontWeight:    '700',
    letterSpacing: 1.5,
  },
  heroRing: {
    width:           RING_SIZE,
    height:          RING_SIZE,
    borderRadius:    RING_SIZE / 2,
    borderWidth:     RING_WIDTH,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: Colors.surfaceContainerLowest,
  },
  heroInner: {
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: Spacing.md,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginBottom:  Spacing.sm,
  },
  stateDot: {
    width:        7,
    height:       7,
    borderRadius: Radius.full,
  },
  stateLabel: {
    color:         Colors.textSecondary,
    fontSize:      12,
    fontWeight:    '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  timerText: {
    fontSize:      48,
    fontWeight:    '200',
    letterSpacing: 1.5,
    fontVariant:   ['tabular-nums'],
  },
  lapHint: {
    color:      Colors.textSecondary,
    fontSize:   12,
    marginTop:  Spacing.xs,
    fontWeight: '500',
  },
  lapHintPlaceholder: {
    fontSize:  12,
    marginTop: Spacing.xs,
  },

  // ── Controls zone ──────────────────────────────────────────────────────
  controlsZone: {
    gap:          Spacing.sm,
    marginBottom: Spacing.xl,
  },
  primaryPill: {
    backgroundColor: Colors.primaryContainer,
    borderRadius:    Radius.full,
    paddingVertical: 15,
    alignItems:      'center',
    justifyContent:  'center',
  },
  primaryPillText: {
    color:         Colors.onPrimaryContainer,
    fontSize:      17,
    fontWeight:    '700',
    letterSpacing: 0.2,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap:           Spacing.sm,
  },
  secondaryBtn: {
    flex:            1,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius:    Radius.full,
    paddingVertical: 13,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     Colors.outlineVariant,
    minHeight:       48,
  },
  secondaryBtnText: {
    color:      Colors.textPrimary,
    fontSize:   15,
    fontWeight: '600',
  },
  resetText: {
    color: Colors.danger,
  },
  btnDisabled: {
    opacity: 0.45,
  },

  // ── Section ────────────────────────────────────────────────────────────
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    color:         Colors.textSecondary,
    fontSize:      11,
    fontWeight:    '700',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom:  Spacing.sm,
  },

  // ── Lap list ───────────────────────────────────────────────────────────
  lapList: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
  },
  lapRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    gap:               Spacing.sm,
  },
  lapAccentBar: {
    width:           3,
    height:          32,
    borderRadius:    2,
    backgroundColor: Colors.primaryContainer,
    marginRight:     2,
  },
  lapNumber: {
    color:       Colors.textSecondary,
    fontSize:    13,
    fontWeight:  '700',
    fontVariant: ['tabular-nums'],
    width:       24,
  },
  lapLabelCol: {
    flex: 1,
  },
  lapLabel: {
    color:      Colors.textPrimary,
    fontSize:   13,
    fontWeight: '500',
  },
  lapSplit: {
    color:     Colors.textSecondary,
    fontSize:  11,
    marginTop: 1,
  },
  lapTime: {
    color:       Colors.textPrimary,
    fontSize:    16,
    fontWeight:  '700',
    fontVariant: ['tabular-nums'],
  },

  // ── Session history cards ──────────────────────────────────────────────
  sessionCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surfaceContainer,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    marginBottom:    Spacing.sm,
  },
  sessionLeft: {
    flex: 1,
    gap:  3,
  },
  sessionLabelRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
    marginBottom:  2,
  },
  sessionLabelEmoji: {
    fontSize: 14,
  },
  sessionLabelText: {
    color:      Colors.textPrimary,
    fontSize:   13,
    fontWeight: '600',
  },
  sessionDuration: {
    color:         Colors.textPrimary,
    fontSize:      24,
    fontWeight:    '300',
    letterSpacing: 0.5,
    fontVariant:   ['tabular-nums'],
  },
  sessionDate: {
    color:      Colors.textSecondary,
    fontSize:   12,
    fontWeight: '400',
  },
  sessionRight: {
    alignItems: 'flex-end',
  },
  sessionLapCount: {
    color:      Colors.textSecondary,
    fontSize:   13,
    fontWeight: '500',
  },

  // ── Centered loading state ─────────────────────────────────────────────
  centeredState: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: Spacing.xl,
    gap:             Spacing.sm,
  },
  centeredStateText: {
    color:    Colors.textSecondary,
    fontSize: 14,
  },

  // ── Empty state ────────────────────────────────────────────────────────
  emptyState: {
    alignItems:        'center',
    paddingVertical:   Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize:     36,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color:        Colors.textPrimary,
    fontSize:     16,
    fontWeight:   '600',
    marginBottom: Spacing.xs,
  },
  emptyBody: {
    color:      Colors.textSecondary,
    fontSize:   14,
    textAlign:  'center',
    lineHeight: 20,
  },
});

export default StopwatchScreen;
