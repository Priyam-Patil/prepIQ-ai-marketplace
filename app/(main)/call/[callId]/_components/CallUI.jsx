"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CallControls,
  SpeakerLayout,
  StreamCall,
  StreamTheme,
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-sdk";
import { getCallToken } from "@/actions/call";

function JoinedCall({ call, onLeave }) {
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    call.join().then(() => {
      if (active) setJoined(true);
    }).catch((joinError) => {
      if (active) setError(joinError instanceof Error ? joinError.message : "Unable to join the video session.");
    });
    return () => {
      active = false;
      call.leave().catch(() => {});
    };
  }, [call]);

  if (error) return <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300">{error}</div>;
  if (!joined) return <div className="flex min-h-80 items-center justify-center rounded-xl bg-black text-sm text-gray-400">Joining your interview…</div>;

  return (
    <StreamCall call={call}>
      <div className="min-h-[24rem] overflow-hidden rounded-xl bg-black">
        <SpeakerLayout participantsBarPosition="bottom" />
      </div>
      <div className="mt-4 flex justify-center">
        <CallControls onLeave={onLeave} />
      </div>
    </StreamCall>
  );
}

export default function CallUI({ bookingId, streamCallId, apiKey, user, status }) {
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (status !== "SCHEDULED" || !apiKey || !streamCallId) return undefined;

    const videoClient = new StreamVideoClient({
      apiKey,
      user: { id: user.id, name: user.name || "PrepIQ member", image: user.imageUrl || undefined },
      tokenProvider: async () => {
        const result = await getCallToken(bookingId);
        return result.token;
      },
    });
    Promise.resolve().then(() => {
      if (active) setClient(videoClient);
    });

    return () => {
      active = false;
      videoClient.disconnectUser().catch(() => {});
    };
  }, [apiKey, bookingId, streamCallId, status, user.id, user.imageUrl, user.name]);

  const call = useMemo(() => client?.call("default", streamCallId), [client, streamCallId]);

  if (status !== "SCHEDULED" || error || !apiKey || !streamCallId) {
    const message = status !== "SCHEDULED"
      ? "This interview has ended. Use the session chat to follow up."
      : error || "The video session is not configured for this booking.";
    return <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300">{message}</div>;
  }

  if (!client || !call) {
    return <div className="flex min-h-80 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-sm text-gray-400">Connecting to your interview…</div>;
  }

  return (
    <StreamVideo client={client}>
      <StreamTheme as="div" className="rounded-2xl border border-white/10 bg-[#111] p-3 sm:p-5">
        <JoinedCall call={call} onLeave={() => router.push("/appointments")} />
      </StreamTheme>
    </StreamVideo>
  );
}
