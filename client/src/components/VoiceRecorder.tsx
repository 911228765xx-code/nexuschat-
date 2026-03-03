import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, X, Send, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onVoiceMessage: (audioUrl: string, transcription: string, durationSeconds: number) => void;
  disabled?: boolean;
}

type RecordingState = "idle" | "recording" | "uploading";

export default function VoiceRecorder({ onVoiceMessage, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(Array(20).fill(3));
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const uploadAudio = trpc.voice.uploadAudio.useMutation();
  const transcribe = trpc.voice.transcribe.useMutation();

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const animateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    // Sample 20 evenly spaced frequency bins
    const bars = Array.from({ length: 20 }, (_, i) => {
      const idx = Math.floor((i / 20) * dataArray.length);
      return Math.max(3, Math.round((dataArray[idx] / 255) * 32));
    });
    setWaveform(bars);
    animFrameRef.current = requestAnimationFrame(animateWaveform);
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || state !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up analyser for waveform visualization
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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100); // collect chunks every 100ms
      setState("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

      animateWaveform();
    } catch {
      toast.error("无法访问麦克风", { description: "请在浏览器设置中允许麦克风权限" });
    }
  }, [disabled, state, animateWaveform]);

  const cancelRecording = useCallback(() => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    chunksRef.current = [];
    setState("idle");
    setDuration(0);
    setWaveform(Array(20).fill(3));
  }, [stopTimer]);

  const sendRecording = useCallback(async () => {
    if (state !== "recording") return;
    stopTimer();

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    const recordedDuration = duration;

    // Stop recording and wait for final data
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    streamRef.current?.getTracks().forEach(t => t.stop());

    if (chunksRef.current.length === 0) {
      setState("idle");
      return;
    }

    setState("uploading");
    setWaveform(Array(20).fill(3));

    try {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Upload audio to S3
      const { url } = await uploadAudio.mutateAsync({
        base64,
        mimeType: blob.type,
        durationSeconds: recordedDuration,
      });

      // Transcribe with Whisper
      let transcription = "";
      try {
        const result = await transcribe.mutateAsync({ audioUrl: url });
        transcription = result.text;
      } catch {
        // Transcription failure is non-fatal; still send the voice message
        transcription = "[语音消息]";
      }

      onVoiceMessage(url, transcription, recordedDuration);
    } catch (err) {
      toast.error("发送失败", { description: "语音消息上传失败，请重试" });
    } finally {
      setState("idle");
      setDuration(0);
      chunksRef.current = [];
    }
  }, [state, duration, stopTimer, uploadAudio, transcribe, onVoiceMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [stopTimer]);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        className="p-2 rounded-full text-muted-foreground hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors disabled:opacity-40"
        title="录音"
      >
        <Mic size={18} />
      </button>
    );
  }

  if (state === "uploading") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] text-sm">
        <Loader2 size={14} className="animate-spin" />
        <span>正在发送...</span>
      </div>
    );
  }

  // Recording state
  return (
    <div className="flex items-center gap-2 flex-1">
      {/* Cancel button */}
      <button
        type="button"
        onClick={cancelRecording}
        className="p-1.5 rounded-full text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
        title="取消"
      >
        <X size={16} />
      </button>

      {/* Waveform visualization */}
      <div className="flex items-center gap-0.5 flex-1 h-8 px-2">
        {waveform.map((h, i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-[#00d4ff] transition-all duration-75"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      {/* Duration */}
      <span className="text-xs text-[#00d4ff] font-mono flex-shrink-0 w-10 text-right">
        {formatDuration(duration)}
      </span>

      {/* Send button */}
      <button
        type="button"
        onClick={sendRecording}
        className="p-1.5 rounded-full bg-[#00d4ff] text-black hover:bg-[#00d4ff]/80 transition-colors flex-shrink-0"
        title="发送语音"
      >
        <Send size={14} />
      </button>
    </div>
  );
}
