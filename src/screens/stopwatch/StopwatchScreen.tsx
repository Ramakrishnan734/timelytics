import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { Colors }         from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import {
  saveSession,
  getSessions,
  StopwatchSession,
  SessionLap,
} from '../../services/sessionService';

type TimerState = 'idle' | 'running' | 'paused';

function formatTime(ms: number): string {
  const totalCentiseconds = Math.floor(ms / 10);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const cc = String(centiseconds).padStart(2, '0');
  return `${mm}:${ss}.${cc}`;
}

function formatSessionDate(epochMs: number): string {
  const d = new Date(epochMs);
  return (
    d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' — ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
}

const StopwatchScreen: React.FC = () => {
  const { user } = useAuth();

  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [elapsed,    setElapsed]    = useState<number>(0);
  const [laps,       setLaps]       = useState<SessionLap[]>([]);
  const [lapStart,   setLapStart]   = useState<number>(0);

  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef       = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  const [sessions,       setSessions]       = useState<StopwatchSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [saving,         setSaving]         = useState<boolean>(false);

  const isSavingRef = useRef<boolean>(false);

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

  function handleStart(): void {
    accumulatedRef.current = 0;
    setElapsed(0);
    setLaps([]);
    setLapStart(0);
    startInterval();
    setTimerState('running');
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
        label:     'Session',
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
    setTimerState('idle');
  }

  const isIdle    = timerState === 'idle';
  const isRunning = timerState === 'running';
  const isPaused  = timerState === 'paused';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loadingHistory}
          onRefresh={loadHistory}
          tintColor={Colors.primary}
        />
      }
    >
      <Text style={styles.header}>Stopwatch</Text>

      <View style={styles.timerCard}>
        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
      </View>

      <View style={styles.controlsRow}>
        {isIdle && (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleStart}>
            <Text style={styles.btnTextPrimary}>Start</Text>
          </TouchableOpacity>
        )}

        {isRunning && (
          <>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handlePause}>
              <Text style={styles.btnTextSecondary}>Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleLap}>
              <Text style={styles.btnTextSecondary}>Lap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger, saving && styles.btnDisabled]}
              onPress={handleReset}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={Colors.onErrorContainer} size="small" />
                : <Text style={styles.btnTextDanger}>Reset</Text>}
            </TouchableOpacity>
          </>
        )}

        {isPaused && (
          <>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleResume}>
              <Text style={styles.btnTextPrimary}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleLap}>
              <Text style={styles.btnTextSecondary}>Lap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger, saving && styles.btnDisabled]}
              onPress={handleReset}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={Colors.onErrorContainer} size="small" />
                : <Text style={styles.btnTextDanger}>Reset</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>

      {laps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Laps</Text>
          {laps.map(lap => (
            <View key={lap.lapNumber} style={styles.lapRow}>
              <Text style={styles.lapLabel}>Lap {lap.lapNumber}</Text>
              <Text style={styles.lapTime}>{formatTime(lap.time)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Previous Sessions</Text>
        {loadingHistory && sessions.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : sessions.length === 0 ? (
          <Text style={styles.emptyText}>No sessions recorded yet</Text>
        ) : (
          sessions.map(session => (
            <View key={session.id} style={styles.sessionCard}>
              <Text style={styles.sessionDate}>{formatSessionDate(session.savedAt)}</Text>
              <View style={styles.sessionMeta}>
                <Text style={styles.sessionDuration}>{formatTime(session.duration)}</Text>
                <Text style={styles.sessionLaps}>
                  {session.laps.length === 0
                    ? 'No laps'
                    : session.laps.length === 1
                      ? '1 lap'
                      : `${session.laps.length} laps`}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

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
  header: {
    color:        Colors.textPrimary,
    fontSize:     22,
    fontWeight:   '700',
    marginBottom: Spacing.lg,
  },
  timerCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius:    Radius.xl,
    alignItems:      'center',
    paddingVertical: Spacing.xxl,
    marginBottom:    Spacing.lg,
  },
  timerText: {
    color:         Colors.textPrimary,
    fontSize:      56,
    fontWeight:    '200',
    letterSpacing: 2,
    fontVariant:   ['tabular-nums'],
  },
  controlsRow: {
    flexDirection: 'row',
    gap:           Spacing.sm,
    marginBottom:  Spacing.lg,
    flexWrap:      'wrap',
  },
  btn: {
    flex:            1,
    minWidth:        72,
    paddingVertical: Spacing.md,
    borderRadius:    Radius.lg,
    alignItems:      'center',
    justifyContent:  'center',
  },
  btnPrimary: {
    backgroundColor: Colors.primaryContainer,
  },
  btnSecondary: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth:     1,
    borderColor:     Colors.outlineVariant,
  },
  btnDanger: {
    backgroundColor: Colors.errorContainer,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnTextPrimary: {
    color:      Colors.onPrimaryContainer,
    fontWeight: '600',
    fontSize:   15,
  },
  btnTextSecondary: {
    color:      Colors.textPrimary,
    fontWeight: '600',
    fontSize:   15,
  },
  btnTextDanger: {
    color:      Colors.onErrorContainer,
    fontWeight: '600',
    fontSize:   15,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    color:         Colors.textSecondary,
    fontSize:      13,
    fontWeight:    '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom:  Spacing.sm,
  },
  lapRow: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingVertical:   Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  lapLabel: {
    color:    Colors.textSecondary,
    fontSize: 14,
  },
  lapTime: {
    color:       Colors.textPrimary,
    fontSize:    14,
    fontWeight:  '600',
    fontVariant: ['tabular-nums'],
  },
  sessionCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    marginBottom:    Spacing.sm,
  },
  sessionDate: {
    color:        Colors.textSecondary,
    fontSize:     12,
    marginBottom: Spacing.xs,
  },
  sessionMeta: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  sessionDuration: {
    color:       Colors.textPrimary,
    fontSize:    18,
    fontWeight:  '600',
    fontVariant: ['tabular-nums'],
  },
  sessionLaps: {
    color:    Colors.textSecondary,
    fontSize: 13,
  },
  emptyText: {
    color:     Colors.textSecondary,
    fontSize:  14,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  loader: {
    marginTop: Spacing.md,
  },
});

export default StopwatchScreen;
