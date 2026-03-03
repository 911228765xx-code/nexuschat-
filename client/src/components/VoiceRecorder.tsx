/**
 * VoiceRecorder — 按住说话，松开发送
 * - 按住 Mic 按钮开始录音
 * - 松开自动发送（录音 < 1s 则丢弃）
 * - 上滑 60px 取消录音
 * - 最长 60 秒，超时自动发送
 * - 实时波形可视化 + 进度环
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const MAX_DURATION = 60; // seconds

interface VoiceRecorderProps {
  onVoiceMessage: (audioUrl: string, transcription: string, durationSeconds: number) => void;
  disabled?: boolean;
}

type RecordingState = "idle" | "recording" | "uploading";

export default function VoiceRecorder({ onVoiceMessage, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(Array(16).fill(3));
  const [isCancelling, setIsCancelling] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startYRef = useRef<number>(0);
  // Use ref to access latest sendRecording in maxTimer callback
  const sendRecordingRef = useRef<(() => void) | null>(null);

  const uploadAudio = trpc.voice.uploadAudio.useMutation();
  const transcribe = trpc.voice.transcribe.useMutation();

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
  }, []);

  const animateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const bars = Array.from({ length: 16 }, (_, i) => {
      const idx = Math.floor((i / 16) * dataArray.length);
      return Math.max(3, Math.round((dataArray[idx] / 255) * 28));
    });
    setWaveform(bars);
    animFrameRef.current = requestAnimationFrame(animateWaveform);
  }, []);

  const doSendRecording = useCallback(async (recorder: MediaRecorder, recordedDuration: number) => {
    streamRef.current?.getTracks().forEach(t => t.stop());

    if (chunksRef.current.length === 0 || recordedDuration < 1) {
      setState("idle");
      setDuration(0);
      return;
    }

    setState("uploading");
    setWaveform(Array(16).fill(3));

    try {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const { url } = await uploadAudio.mutateAsync({
        base64,
        mimeType: blob.type,
        durationSeconds: recordedDuration,
      });

      let transcription = "";
      try {
        const result = await transcribe.mutateAsync({ audioUrl: url });
        transcription = result.text;
      } catch {
        transcription = "[语音消息]";
      }

      onVoiceMessage(url, transcription, recordedDuration);
    } catch {
      toast.error("发送失败", { description: "语音消息上传失败，请重试" });
    } finally {
      setState("idle");
      setDuration(0);
      chunksRef.current = [];
    }
  }, [uploadAudio, transcribe, onVoiceMessage]);

  const sendRecording = useCallback(async () => {
    if (state !== "recording") return;
    stopTimer();

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    const recordedDuration = duration;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    await doSendRecording(recorder, recordedDuration);
  }, [state, duration, stopTimer, doSendRecording]);

  // Keep ref in sync for use in maxTimer
  useEffect(() => {
    sendRecordingRef.current = sendRecording;
  }, [sendRecording]);

  const cancelRecording = useCallback(() => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    chunksRef.current = [];
    setState("idle");
    setDuration(0);
    setIsCancelling(false);
    setWaveform(Array(16).fill(3));
  }, [stopTimer]);

  const startRecording = useCallback(async (startY: number) => {
    if (disabled || state !== "idle") return;
    startYRef.current = startY;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100);
      setState("recording");
      setDuration(0);
      setIsCancelling(false);

      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      animateWaveform();

      // Auto-send at MAX_DURATION
      maxTimerRef.current = setTimeout(() => {
        toast.info(`已达到最长 ${MAX_DURATION} 秒，自动发送`);
        sendRecordingRef.current?.();
      }, MAX_DURATION * 1000);
    } catch {
      toast.error("无法访问麦克风", { description: "请在浏览器设置中允许麦克风权限" });
    }
  }, [disabled, state, animateWaveform]);

  // Pointer event handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startRecording(e.clientY);
  }, [disabled, startRecording]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (state !== "recording") return;
    const deltaY = startYRef.current - e.clientY;
    setIsCancelling(deltaY > 60);
  }, [state]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (state !== "recording") return;
    const deltaY = startYRef.current - e.clientY;
    if (deltaY > 60) {
      cancelRecording();
      toast.info("已取消录音");
    } else {
      sendRecording();
    }
  }, [state, cancelRecording, sendRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [stopTimer]);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Progress ring for 60s limit (SVG circle)
  const RADIUS = 16;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const progress = duration / MAX_DURATION;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  // Warning color when > 80% (48s)
  const isWarning = duration >= MAX_DURATION * 0.8;

  if (state === "uploading") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] text-xs">
        <Loader2 size={13} className="animate-spin" />
        <span>发送中...</span>
      </div>
    );
  }

  if (state === "recording") {
    return (
      <div className="flex items-center gap-2 flex-1 select-none">
        {/* Waveform + duration */}
        <div className={`flex items-center gap-0.5 flex-1 h-8 px-2 rounded-xl transition-colors ${isCancelling ? "bg-red-500/10" : "bg-[#00d4ff]/10"}`}>
          {waveform.map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-75 ${isCancelling ? "bg-red-400" : isWarning ? "bg-amber-400" : "bg-[#00d4ff]"}`}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
        <span className={`text-xs font-mono flex-shrink-0 w-10 text-right ${isCancelling ? "text-red-400" : isWarning ? "text-amber-400" : "text-[#00d4ff]"}`}>
          {isCancelling ? "取消" : formatDuration(duration)}
        </span>

        {/* Hold button with progress ring */}
        <div
          className="relative flex-shrink-0 w-10 h-10"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={cancelRecording}
        >
          {/* SVG progress ring */}
          <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 40 40">
            <circle
              cx="20" cy="20" r={RADIUS}
              fill="none"
              stroke={isCancelling ? "rgb(239,68,68)" : isWarning ? "rgb(251,191,36)" : "rgb(0,212,255)"}
              strokeWidth="2.5"
              strokeOpacity="0.25"
            />
            <circle
              cx="20" cy="20" r={RADIUS}
              fill="none"
              stroke={isCancelling ? "rgb(239,68,68)" : isWarning ? "rgb(251,191,36)" : "rgb(0,212,255)"}
              strokeWidth="2.5"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.9s linear" }}
            />
          </svg>
          <button
            type="button"
            className={`absolute inset-0 flex items-center justify-center rounded-full transition-all duration-100 ${
              isCancelling
                ? "bg-red-500/20 text-red-400 scale-90"
                : "bg-[#00d4ff]/20 text-[#00d4ff] scale-95"
            }`}
            style={{ touchAction: "none" }}
          >
            <Mic size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Idle state — show hold-to-record button
  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      disabled={disabled}
      className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 active:scale-90 active:bg-[#00d4ff]/20 transition-all duration-100 disabled:opacity-40 select-none"
      style={{ touchAction: "none" }}
      title="按住说话"
    >
      <Mic size={18} />
    </button>
  );
}
