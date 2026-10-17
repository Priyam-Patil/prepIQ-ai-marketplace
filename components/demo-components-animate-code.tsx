
"use client";

import { useEffect, useRef, useState } from "react";
import { Code2, Copy, Check } from "lucide-react";

const javaCode = `import java.util.*;

class Solution {
    public int search(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;

        while (left <= right) {
            int mid = left + (right - left) / 2;

            if (nums[mid] == target) {
                return mid;
            }

            if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return -1;
    }

    public int firstOccurrence(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        int answer = -1;

        while (left <= right) {
            int mid = left + (right - left) / 2;

            if (nums[mid] == target) {
                answer = mid;
                right = mid - 1;
            } else if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return answer;
    }

    public int[] searchRange(int[] nums, int target) {
        int first = firstOccurrence(nums, target);

        if (first == -1) {
            return new int[] {-1, -1};
        }

        int left = first;
        int right = nums.length - 1;
        int last = first;

        while (left <= right) {
            int mid = left + (right - left) / 2;

            if (nums[mid] == target) {
                last = mid;
                left = mid + 1;
            } else if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return new int[] {first, last};
    }
}`;

function highlightJava(line) {
  const tokenRegex =
    /(\/\/.*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:import|package|class|public|private|protected|static|final|int|void|boolean|char|long|double|float|byte|short|new|return|if|else|while|for|try|catch|throw|this|extends|implements|true|false|null)\b|\b\d+\b|\b[A-Z][A-Za-z0-9_]*\b)/g;

  return line.split(tokenRegex).filter(Boolean).map((part, index) => {
    let color = "text-slate-200";

    if (part.startsWith("//")) {
      color = "text-slate-500 italic";
    } else if (part.startsWith('"') || part.startsWith("'")) {
      color = "text-emerald-300";
    } else if (
      /^(import|package|class|public|private|protected|static|final|int|void|boolean|char|long|double|float|byte|short|new|return|if|else|while|for|try|catch|throw|this|extends|implements)$/.test(
        part
      )
    ) {
      color = "text-pink-400";
    } else if (/^(true|false|null)$/.test(part)) {
      color = "text-purple-300";
    } else if (/^\d+$/.test(part)) {
      color = "text-orange-300";
    } else if (/^[A-Z][A-Za-z0-9_]*$/.test(part)) {
      color = "text-sky-300";
    }

    return (
      <span key={index} className={color}>
        {part}
      </span>
    );
  });
}

export const CodeDemo = () => {
  const [position, setPosition] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const codeContainerRef = useRef(null);
  const copyTimerRef = useRef(null);

  // Type slowly, pause on hover, and resume from the same character.
  useEffect(() => {
    if (isHovered) return;

    if (position >= javaCode.length) {
      const restartTimer = setTimeout(() => {
        setPosition(0);
      }, 2500);

      return () => clearTimeout(restartTimer);
    }

    const typingTimer = setTimeout(() => {
      setPosition((current) => Math.min(current + 1, javaCode.length));
    }, 35);

    return () => clearTimeout(typingTimer);
  }, [position, isHovered]);

  // Keep the newest typed code visible near the bottom.
  useEffect(() => {
    const container = codeContainerRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [position]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(javaCode);
      setIsCopied(true);

      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }

      copyTimerRef.current = setTimeout(() => {
        setIsCopied(false);
      }, 1500);
    } catch {
      setIsCopied(false);
    }
  }

  const visibleCode = javaCode.slice(0, position);

  return (
    <div
      className="w-full max-w-[440px] overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1e] shadow-2xl shadow-black/40 transition-transform duration-300 hover:scale-[1.01]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex h-11 items-center justify-between border-b border-white/10 bg-[#252527] px-4">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Code2 size={15} className="text-amber-400" />
          <span>Solution.java</span>
          <span className="ml-1 rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
            Java
          </span>
        </div>

        <button
          type="button"
          onClick={copyCode}
          aria-label="Copy Java code"
          className="rounded p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          {isCopied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>

      <div
        ref={codeContainerRef}
        className="h-[480px] overflow-auto bg-[#1b1b1d] p-4"
      >
        <pre className="font-mono text-[11px] leading-[1.8] sm:text-xs">
          {visibleCode.split("\n").map((line, index) => (
            <div key={index} className="flex min-w-max">
              <span className="mr-4 inline-block w-5 shrink-0 select-none text-right text-slate-600">
                {index + 1}
              </span>

              <code className="whitespace-pre">
                {line ? highlightJava(line) : "\u00A0"}
              </code>
            </div>
          ))}

          {position < javaCode.length && (
            <span className="ml-9 inline-block h-3.5 w-1.5 animate-pulse bg-amber-400 align-middle" />
          )}
        </pre>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 bg-[#252527] px-4 py-2 text-[10px] text-slate-500">
        <span>
          {isHovered
            ? "Paused on hover"
            : position >= javaCode.length
              ? "Completed"
              : "Writing code..."}
        </span>

        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          {position >= javaCode.length ? "Ready" : "Live"}
        </span>
      </div>
    </div>
  );
};

export default CodeDemo;
