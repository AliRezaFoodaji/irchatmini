"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import type { ServerMessage, Signal } from "@/lib/protocol";
import { SignalingClient } from "@/lib/signaling";
import type { ConnectionState } from "@/lib/signaling";
import { getIceServers } from "@/lib/config";
import {
  ArrowLeftIcon,
  CamOffIcon,
  CamOnIcon,
  LogoIcon,
  MicOffIcon,
  MicOnIcon,
  NextIcon,
  ShieldIcon,
  SparkIcon,
  StopIcon,
  UsersIcon,
} from "./icons";

type View = "home" | "starting" | "searching" | "call" | "error";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getMediaError(e: unknown): string {
  if (!navigator.mediaDevices?.getUserMedia) {
    return "مرورگر شما از دسترسی دوربین پشتیبانی نمی‌کند یا به اتصال امن (HTTPS) نیاز است.";
  }
  const name = (e as DOMException)?.name;
  if (name === "NotAllowedError")
    return "دسترسی به دوربین و میکروفون رد شد. لطفاً در تنظیمات مرورگر / مرورگر خود اجازه بدهید.";
  if (name === "NotFoundError")
    return "دوربین یا میکروفونی در این دستگاه پیدا نشد.";
  if (name === "NotReadableError")
    return "دوربین یا میکروفون توسط برنامه دیگری در حال استفاده است.";
  return "برقراری اتصال ممکن نشد. لطفاً دوباره تلاش کنید.";
}

const FEATURES = [
  {
    icon: UsersIcon,
    title: "کاملاً تصادفی",
    desc: "با یک غریبه‌ی ناشناس و تصادفی هر بار",
  },
  {
    icon: ShieldIcon,
    title: "خصوصی و امن",
    desc: "اتصال مستقیم و رمزنگاری‌شده؛ هیچ‌چیز ذخیره نمی‌شود",
  },
  {
    icon: SparkIcon,
    title: "رایگان و بدون ثبت‌نام",
    desc: "بدون ساخت حساب؛ همین حالا وارد شو",
  },
];

export default function VideoChat() {
  const [view, setView] = useState<View>("home");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [error, setError] = useState("");
  const [peerText, setPeerText] = useState("");
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(0);
  const [remoteReady, setRemoteReady] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sigRef = useRef<SignalingClient | null>(null);
  const viewRef = useRef<View>("home");
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const busyRef = useRef(false);
  const connectedBeforeRef = useRef(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    const el = localVideoRef.current;
    const stream = streamRef.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  }, [view]);

  function flashNotice(msg: string) {
    setNotice(msg);
    if (noticeTimerRef.current !== null) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => setNotice(""), 4500);
  }

  const sendSignal = (data: Signal) => {
    sigRef.current?.send({ type: "signal", data });
  };

  function tearDownPeer() {
    const pc = pcRef.current;
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
      pcRef.current = null;
    }
    pendingCandidatesRef.current = [];
    setRemoteReady(false);
    setPeerText("");
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }

  function stopLocalTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }

  async function beginCall(initiator: boolean) {
    const stream = streamRef.current;
    if (!stream) return;

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    pcRef.current = pc;
    for (const track of stream.getTracks()) pc.addTrack(track, stream);
    setPeerText("در حال برقراری اتصال...");

    pc.ontrack = (ev) => {
      const el = remoteVideoRef.current;
      if (el && ev.streams[0]) {
        el.srcObject = ev.streams[0];
        setRemoteReady(true);
        el.play().catch(() => {});
      }
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        sendSignal({ kind: "candidate", candidate: ev.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setPeerText("متصل شدی!");
      else if (s === "failed") setPeerText("اتصال دچار مشکل شد؛ «بعدی» را بزن.");
      else if (s === "disconnected") setPeerText("اتصال ضعیف است...");
      else setPeerText("در حال برقراری اتصال...");
    };

    if (initiator) {
      await sleep(500);
      if (pcRef.current !== pc) return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ kind: "offer", sdp: offer.sdp ?? "" });
    }
  }

  async function flushPendingCandidates(pc: RTCPeerConnection) {
    const pending = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const c of pending) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* candidate no longer valid */
      }
    }
  }

  async function handleSignal(data: Signal) {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      if (data.kind === "offer") {
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "offer", sdp: data.sdp }),
        );
        await flushPendingCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ kind: "answer", sdp: answer.sdp ?? "" });
      } else if (data.kind === "answer") {
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "answer", sdp: data.sdp }),
        );
        await flushPendingCandidates(pc);
      } else if (data.kind === "candidate") {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(data.candidate);
        } else {
          pendingCandidatesRef.current.push(data.candidate);
        }
      }
    } catch {
      /* ignore malformed or stale signals */
    }
  }

  function handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case "matched":
        setView("call");
        void beginCall(msg.initiator);
        break;
      case "signal":
        void handleSignal(msg.data);
        break;
      case "peer-left":
        tearDownPeer();
        flashNotice("هم‌صحبت قبلی از چت خارج شد؛ دوباره جستجو می‌کنم.");
        setView("searching");
        break;
      case "stats":
        setOnline(msg.online);
        break;
      case "error":
        setError(msg.message);
        setView("error");
        break;
    }
  }

  function handleConnectionState(state: ConnectionState) {
    if (state === "connected") {
      if (connectedBeforeRef.current) {
        // Recovered after a drop — re-enter the queue.
        if (viewRef.current === "call") {
          tearDownPeer();
          flashNotice("اتصال بازیابی شد؛ در حال جستجوی دوباره...");
        }
        setView("searching");
        sigRef.current?.send({ type: "find" });
      } else {
        connectedBeforeRef.current = true;
      }
    } else if (state === "disconnected") {
      if (viewRef.current === "call" || viewRef.current === "searching") {
        flashNotice("اتصال به سرور قطع شد؛ در حال اتصال مجدد...");
      }
    }
  }

  async function start() {
    if (busyRef.current) return;
    busyRef.current = true;
    setView("starting");
    stopLocalTracks();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      const sig = new SignalingClient();
      sigRef.current = sig;
      sig.onMessage(handleMessage);
      sig.onStatusChange(handleConnectionState);

      await sig.connect();
      setView("searching");
      sig.send({ type: "find" });
    } catch (e) {
      stopLocalTracks();
      setError(getMediaError(e));
      setView("error");
    } finally {
      busyRef.current = false;
    }
  }

  function nextPerson() {
    tearDownPeer();
    sigRef.current?.send({ type: "next" });
    setView("searching");
  }

  function stopAndExit() {
    sigRef.current?.send({ type: "leave" });
    sigRef.current?.disconnect();
    sigRef.current = null;
    connectedBeforeRef.current = false;
    tearDownPeer();
    stopLocalTracks();
    setMicOn(true);
    setCamOn(true);
    setView("home");
  }

  function toggleMic() {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }

  function toggleCam() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }

  useEffect(() => {
    const handler = () => {
      sigRef.current?.send({ type: "leave" });
      pcRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, []);

  return (
    <main className="relative flex min-h-svh flex-1 flex-col overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      {view === "home" && <BackgroundDecor />}

      {view !== "call" && (
        <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-zinc-950 shadow-lg shadow-emerald-500/30">
              <LogoIcon className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-tight">مینی چت ایرانی</p>
              <p className="text-[10px] font-medium text-zinc-500" dir="ltr">
                MINI CHAT
              </p>
            </div>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3.5 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            {online} کاربر آنلاین
          </span>
        </header>
      )}

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-10">
        {view === "home" && (
          <HomeStage online={online} onStart={() => void start()} />
        )}

        {(view === "starting" || view === "searching") && (
          <SearchingStage
            view={view}
            localVideoRef={localVideoRef}
            camOn={camOn}
            onCancel={stopAndExit}
          />
        )}

        {view === "error" && <ErrorStage error={error} onBack={() => setView("home")} />}

        {view === "call" && (
          <CallScreen
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
            remoteReady={remoteReady}
            peerText={peerText}
            notice={notice}
            micOn={micOn}
            camOn={camOn}
            onToggleMic={toggleMic}
            onToggleCam={toggleCam}
            onNext={nextPerson}
            onEnd={stopAndExit}
          />
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function BackgroundDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="anim-float-slow absolute -top-24 right-1/4 size-80 rounded-full bg-emerald-500/15 blur-3xl" />
      <div
        className="anim-float-slow absolute -right-24 top-1/3 size-96 rounded-full bg-teal-500/10 blur-3xl"
        style={{ animationDelay: "-3s" }}
      />
      <div
        className="anim-float-slow absolute -bottom-32 left-1/4 size-80 rounded-full bg-indigo-500/10 blur-3xl"
        style={{ animationDelay: "-6s" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_55%,rgba(0,0,0,0.55))]" />
    </div>
  );
}

function HomeStage({
  online,
  onStart,
}: {
  online: number;
  onStart: () => void;
}) {
  return (
    <div className="flex w-full max-w-2xl flex-col items-center text-center">
      <div className="relative mb-7 flex size-24 items-center justify-center">
        <span className="anim-ring absolute inset-0 rounded-[1.9rem] border-2 border-emerald-400/30" />
        <span className="anim-ring-delayed absolute inset-0 rounded-[1.9rem] border-2 border-cyan-400/20" />
        <div className="relative flex size-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 text-zinc-950 shadow-2xl shadow-emerald-500/40">
          <LogoIcon className="size-10" />
        </div>
      </div>

      <p className="mb-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-emerald-300 backdrop-blur">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
        </span>
        چت ویدیویی تصادفی برای فارسی‌زبان‌ها
      </p>

      <h1 className="mb-4 bg-gradient-to-l from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-4xl font-black leading-tight text-transparent sm:text-6xl">
        با یک غریبه آشنا شو
      </h1>

      <p className="mb-8 max-w-md leading-8 text-zinc-400">
        دکمه را بزن؛ دوربین و میکروفونت روشن می‌شود و در چند ثانیه به یک
        غریبه‌ی تصادفی وصل می‌شوی. بدون ثبت‌نام، رایگان و ناشناس.
      </p>

      <div className="mb-8 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold sm:text-xs">
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-emerald-300">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          {online} نفر همین حالا آنلاین‌اند
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-zinc-300 backdrop-blur">
          <ShieldIcon className="size-3.5" />
          اتصال مستقیم
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-zinc-300 backdrop-blur">
          <SparkIcon className="size-3.5" />
          بدون ثبت‌نام
        </span>
      </div>

      <button
        onClick={onStart}
        className="group relative mb-12 w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 px-8 py-4 text-lg font-extrabold text-zinc-950 shadow-xl shadow-emerald-500/30 transition hover:shadow-emerald-500/50 hover:brightness-110 active:scale-[0.97]"
      >
        <span className="anim-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-l from-transparent via-white/45 to-transparent" />
        <span className="relative flex items-center justify-center gap-2">
          شروع گفت‌وگو
          <ArrowLeftIcon className="size-5 transition group-hover:-translate-x-1" />
        </span>
      </button>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-start backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.05]"
          >
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-300 transition group-hover:from-emerald-500/30 group-hover:to-cyan-500/30">
              <f.icon className="size-5" />
            </div>
            <p className="mb-1 text-sm font-bold">{f.title}</p>
            <p className="text-xs leading-6 text-zinc-500">{f.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 max-w-md text-[11px] leading-6 text-zinc-600">
        پیشنهاد می‌کنیم از گوگل‌کروم یا فایرفاکس استفاده کنید. اتصال مستقیم و
        زنده است؛ هیچ‌چیز ضبط یا روی سرور ذخیره نمی‌شود. برای اتصال از
        دستگاه‌های مختلف به اینترنت پایداری نیاز دارید.
      </p>
    </div>
  );
}

function SearchingStage({
  view,
  localVideoRef,
  camOn,
  onCancel,
}: {
  view: View;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  camOn: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center text-center">
      <div className="relative mb-8 flex size-44 items-center justify-center">
        <div
          className="anim-spin-slow absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(16,185,129,0.7) 110deg, transparent 260deg)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))",
          }}
        />
        <span className="anim-ring absolute inset-0 m-auto size-40 rounded-full border-2 border-emerald-400/30" />
        <span className="anim-ring-delayed absolute inset-0 m-auto size-40 rounded-full border-2 border-cyan-400/20" />
        <div className="anim-pulse-soft relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-zinc-950 shadow-2xl shadow-emerald-500/40">
          <UsersIcon className="size-10" />
        </div>
      </div>

      <p className="mb-2 text-xl font-bold">
        {view === "starting"
          ? "در حال آماده‌سازی دوربین و میکروفون..."
          : "در جستجوی هم‌صحبت تصادفی..."}
      </p>
      <span className="mb-3 flex gap-1.5" aria-hidden>
        <span className="anim-typing-dot size-2 rounded-full bg-emerald-400" />
        <span
          className="anim-typing-dot size-2 rounded-full bg-emerald-400"
          style={{ animationDelay: "0.15s" }}
        />
        <span
          className="anim-typing-dot size-2 rounded-full bg-emerald-400"
          style={{ animationDelay: "0.3s" }}
        />
      </span>
      <p className="mb-8 text-sm text-zinc-500">
        {view === "starting"
          ? "لطفاً دسترسی دوربین و میکروفون را در مرورگر تأیید کنید."
          : "هر چه زودتر یک هم‌صحبت پیدا کنیم؛ کمی صبر کنید."}
      </p>

      {view === "searching" && (
        <div className="relative mb-8">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-500/25 via-transparent to-cyan-500/25 blur-sm" />
          <div className="relative aspect-video w-56 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
            <video
              ref={localVideoRef}
              playsInline
              autoPlay
              muted
              className="-scale-x-100 h-full w-full object-cover"
            />
            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-xs text-zinc-500">
                دوربین خاموش است
              </div>
            )}
            <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 backdrop-blur">
              پیش‌نمایش شما
            </span>
          </div>
        </div>
      )}

      <button
        onClick={onCancel}
        className="rounded-xl border border-zinc-700 px-6 py-3 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
      >
        انصراف
      </button>
    </div>
  );
}

function ErrorStage({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-zinc-900/80 p-8 text-center shadow-2xl shadow-red-500/10 backdrop-blur">
      <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-400 shadow-lg shadow-red-500/20">
        <StopIcon className="size-7" />
      </div>
      <p className="mb-2 text-xl font-bold text-red-400">مشکلی پیش آمد</p>
      <p className="mb-8 leading-7 text-zinc-400">{error}</p>
      <button
        onClick={onBack}
        className="w-full rounded-2xl bg-zinc-700 px-6 py-3 font-semibold text-zinc-100 transition hover:bg-zinc-600"
      >
        بازگشت
      </button>
    </div>
  );
}

function CallScreen({
  localVideoRef,
  remoteVideoRef,
  remoteReady,
  peerText,
  notice,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onNext,
  onEnd,
}: {
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  remoteReady: boolean;
  peerText: string;
  notice: string;
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onNext: () => void;
  onEnd: () => void;
}) {
  return (
    <div className="fixed inset-0 z-20 bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#101014_0%,#050507_70%)]" />
      <video
        ref={remoteVideoRef}
        playsInline
        autoPlay
        className="absolute inset-0 h-full w-full object-contain"
      />

      {!remoteReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="absolute size-80 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative flex size-28 items-center justify-center">
            <span className="anim-ring absolute inset-0 rounded-full border-2 border-emerald-400/40" />
            <span className="anim-ring-delayed absolute inset-0 rounded-full border-2 border-cyan-400/20" />
            <div className="anim-pulse-soft relative flex size-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
              <UsersIcon className="size-8" />
            </div>
          </div>
          <p className="mt-6 text-sm font-medium text-zinc-300">
            {peerText || "در حال برقراری اتصال..."}
          </p>
        </div>
      )}

      <div className="absolute bottom-24 right-3 w-32 sm:bottom-28 sm:w-44">
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/15 bg-zinc-900 shadow-2xl shadow-black/60 ring-1 ring-white/10">
          <video
            ref={localVideoRef}
            playsInline
            autoPlay
            muted
            className="-scale-x-100 h-full w-full object-cover"
          />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-[10px] text-zinc-500">
              دوربین خاموش
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 top-4 flex justify-center px-4">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-200 backdrop-blur">
          <span
            className={`size-2 rounded-full ${remoteReady ? "bg-emerald-400" : "anim-blink-dot bg-amber-400"}`}
          />
          {peerText || (remoteReady ? "متصل شدی!" : "در حال اتصال...")}
        </div>
      </div>

      {notice && (
        <div className="absolute inset-x-0 top-16 flex justify-center px-4">
          <div className="max-w-md rounded-full bg-zinc-900/90 px-5 py-2 text-center text-sm text-zinc-200 backdrop-blur">
            {notice}
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2 rounded-3xl border border-white/10 bg-zinc-950/70 p-2.5 shadow-2xl shadow-black/60 backdrop-blur sm:gap-3">
          <ControlButton
            label={micOn ? "میکروفون" : "بی‌صدا"}
            on={micOn}
            muted={!micOn}
            onClick={onToggleMic}
          >
            {micOn ? (
              <MicOnIcon className="size-5" />
            ) : (
              <MicOffIcon className="size-5" />
            )}
          </ControlButton>
          <ControlButton
            label={camOn ? "دوربین" : "خاموش"}
            on={camOn}
            muted={!camOn}
            onClick={onToggleCam}
          >
            {camOn ? (
              <CamOnIcon className="size-5" />
            ) : (
              <CamOffIcon className="size-5" />
            )}
          </ControlButton>
          <span className="h-8 w-px bg-white/10" />
          <ControlButton
            label="بعدی"
            on={false}
            onClick={onNext}
            className="bg-red-500 text-white hover:bg-red-400"
          >
            <NextIcon className="size-5" />
          </ControlButton>
          <ControlButton
            label="پایان"
            on={false}
            onClick={onEnd}
            className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
          >
            <StopIcon className="size-5" />
          </ControlButton>
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  on,
  muted,
  onClick,
  className = "",
  children,
}: {
  label: string;
  on: boolean;
  muted?: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-w-16 flex-col items-center gap-1.5 rounded-2xl px-3.5 py-3 text-[11px] font-semibold transition active:scale-95 ${
        className ||
        (muted
          ? "bg-amber-500/85 text-zinc-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400"
          : on
            ? "bg-emerald-500/90 text-zinc-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400"
            : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700")
      }`}
    >
      {children}
      {label}
    </button>
  );
}