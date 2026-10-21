"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CallControls,
  CallingState,
  SpeakerLayout,
  StreamCall,
  StreamTheme,
  StreamVideo,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { getCallToken } from "@/actions/call";
import { acquireVideoCall, acquireVideoClient } from "@/lib/stream-video-lifecycle.mjs";
import { getSessionDisplayState } from "@/lib/session-access.mjs";
import { getSafeStreamErrorDetails } from "@/lib/stream-error.mjs";

function SessionTimeline({ state }) {
  if (state === "PRESTART") {
    return (
      <div className="rounded-xl border border-white/10 bg-black/30 p-6">
        <h2 className="font-semibold">Session not started</h2>
        <p className="mt-2 text-sm text-gray-400">
          Video becomes available at the scheduled start time.
        </p>
      </div>
    );
  }

  if (state === "INVALID") {
    return (
      <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300">
        The scheduled session time is invalid. Contact support for help.
      </div>
    );
  }

  if (state === "UNAVAILABLE") {
    return (
      <div className="rounded-xl border border-white/10 bg-black/30 p-6">
        <h2 className="font-semibold">Session unavailable</h2>
        <p className="mt-2 text-sm text-gray-400">
          This booking is no longer scheduled.
        </p>
      </div>
    );
  }

  if (state === "ENDED") {
    return (
      <div className="rounded-xl border border-white/10 bg-black/30 p-6">
        <h2 className="font-semibold">Session time has ended</h2>
        <p className="mt-2 text-sm text-gray-400">
          The scheduled session has finished. You can use the chat below
          for follow-up.
        </p>
      </div>
    );
  }

  return null;
}

function JoinedCall({ call, onLeave, onRetry }) {
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  useEffect(() => {
    let active = true;
    const lease = acquireVideoCall(call, (joinError) => {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "Stream video call initialization failed.",
          getSafeStreamErrorDetails(joinError)
        );
      }
      if (active) setError("Unable to join the video session. Check your connection and try again.");
    });
    lease.ready.then(async () => {
      if (!active) return;
      setJoined(true);
      try {
        await call.camera.enable();
      } catch (cameraFailure) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            "Stream camera could not be enabled.",
            getSafeStreamErrorDetails(cameraFailure)
          );
        }
        if (active) setCameraError("Camera unavailable. Check browser permission and device settings, then retry camera.");
      }
    }).catch(() => {
      if (active) {
        setError("Unable to join the video session. Check your connection and try again.");
      }
    });

    return () => {
      active = false;
      lease.release();
    };
  }, [call]);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300"
      >
        {error}
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black hover:bg-amber-300"
        >
          Try joining again
        </button>
      </div>
    );
  }

  if (
    callingState === CallingState.RECONNECTING ||
    callingState === CallingState.MIGRATING ||
    callingState === CallingState.OFFLINE
  ) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-xl bg-black text-sm text-gray-400">
        {callingState === CallingState.OFFLINE
          ? "You are offline. Waiting for your connection to return..."
          : "Restoring your video connection..."}
      </div>
    );
  }

  if (
    callingState === CallingState.RECONNECTING_FAILED ||
    callingState === CallingState.LEFT
  ) {
    return (
      <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300">
        <p>Your video connection ended. Rejoin the session to continue.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black hover:bg-amber-300"
        >
          Rejoin session
        </button>
      </div>
    );
  }

  if (!joined || callingState !== CallingState.JOINED) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-xl bg-black text-sm text-gray-400">
        Joining your interview...
      </div>
    );
  }

  return (
    <>
      {cameraError && (
        <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">
          <span>{cameraError}</span>
          <button
            type="button"
            onClick={async () => {
              setCameraError("");
              try {
                await call.camera.enable();
              } catch (cameraFailure) {
                if (process.env.NODE_ENV === "development") {
                  console.error("Stream camera retry failed.", getSafeStreamErrorDetails(cameraFailure));
                }
                setCameraError("Camera is still unavailable. Allow camera access in your browser and check that another app is not using it.");
              }
            }}
            className="rounded-md border border-amber-200/30 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-200/10"
          >
            Retry camera
          </button>
        </div>
      )}
      <div className="min-h-[24rem] overflow-hidden rounded-xl bg-black">
        <SpeakerLayout participantsBarPosition="bottom" />
      </div>

      <div className="mt-4 flex justify-center">
        <CallControls onLeave={onLeave} />
      </div>
    </>
  );
}

export default function CallUI({
  bookingId,
  streamCallId,
  apiKey,
  user,
  serverNow,
  status,
  startTime,
  endTime,
}) {
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [error, setError] = useState("");
  const [connectionGeneration, setConnectionGeneration] = useState(0);
  const [callGeneration, setCallGeneration] = useState(0);
  const [now, setNow] = useState(() => {
    const serverTime = new Date(serverNow).getTime();
    return Number.isFinite(serverTime) ? serverTime : Date.now();
  });
  const [clockOffset] = useState(() => {
    const serverTime = new Date(serverNow).getTime();
    return Number.isFinite(serverTime) ? serverTime - Date.now() : 0;
  });

  const handleVideoConnectionError = useCallback((connectionError) => {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "Stream video client connection failed.",
        getSafeStreamErrorDetails(connectionError)
      );
    }
    setError("Video could not connect. Refresh the page and try again.");
  }, []);

  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const displayState = getSessionDisplayState(status, startTime, endTime, now);

  const canJoin =
    status === "SCHEDULED" && now >= start && now < end;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + clockOffset), 1000);
    return () => clearInterval(timer);
  }, [clockOffset]);

  useEffect(() => {
    if (!canJoin || !apiKey || !streamCallId) {
      return undefined;
    }

    let active = true;
    let lease;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        lease = acquireVideoClient({
          apiKey,
          bookingId,
          user,
          tokenProvider: async () => {
            const result = await getCallToken(bookingId);
            if (typeof result?.token !== "string" || !result.token) {
              throw new Error("Video token service returned an invalid response.");
            }
            return result.token;
          },
          onError: handleVideoConnectionError,
        });
        lease.ready
          .then(() => {
            if (active) setClient(lease.client);
          })
          .catch(() => {
            if (active) {
              setError("Unable to initialize video. Refresh the page and try again.");
            }
          });
      } catch (clientError) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            "Video client initialization failed.",
            getSafeStreamErrorDetails(clientError)
          );
        }
        if (active) setError("Unable to initialize video. Refresh the page and try again.");
      }
    });
    return () => {
      active = false;
      lease?.release();
    };
  }, [
    apiKey,
    bookingId,
    canJoin,
    connectionGeneration,
    streamCallId,
    user,
    handleVideoConnectionError,
  ]);

  const call = useMemo(
    () => (
      client && streamCallId
        ? client.call("default", streamCallId, { reuseInstance: callGeneration === 0 })
        : null
    ),
    [callGeneration, client, streamCallId]
  );

  if (displayState !== "READY") {
    return <SessionTimeline state={displayState} />;
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300"
      >
        <p>{error}</p>
        <button
          type="button"
          onClick={() => {
            setError("");
            setConnectionGeneration((generation) => generation + 1);
          }}
          className="mt-4 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black hover:bg-amber-300"
        >
          Retry connection
        </button>
      </div>
    );
  }

  if (!apiKey || !streamCallId) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300"
      >
        Video calling is not configured for this booking.
      </div>
    );
  }

  if (!client || !call) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-sm text-gray-400">
        Connecting to your interview...
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamTheme
        as="div"
        className="rounded-2xl border border-white/10 bg-[#111] p-3 sm:p-5"
      >
        <StreamCall call={call}>
          <JoinedCall
            key={callGeneration}
            call={call}
            onLeave={() => router.push("/appointments")}
            onRetry={() => setCallGeneration((generation) => generation + 1)}
          />
        </StreamCall>
      </StreamTheme>
    </StreamVideo>
  );
}
