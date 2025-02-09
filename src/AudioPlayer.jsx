import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Repeat } from "lucide-react";

const AudioPlayer = () => {
  // maintain audio instance across renders
  const audioRef = useRef(new Audio("/a.mp3"));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;

    // set duration when metadata is loaded
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    // update progress
    const updateProgress = () => {
      setProgress(audio.currentTime);
    };
    audio.addEventListener("timeupdate", updateProgress);

    // when song ended, repeat song if repeat is enabled
    const handleAudioEnd = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        setIsPlaying(false);
        audio.currentTime = 0;
      }
    };
    audio.addEventListener("ended", handleAudioEnd);

    // if audio already loaded, set duration
    if (audio.readyState >= 2) {
      setDuration(audio.duration);
    }

    //cleanup - pause audio when component unmounts
    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", updateProgress);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const handleAudioEnd = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        setIsPlaying(false);
        audio.currentTime = 0;
      }
    };
    audio.addEventListener("ended", handleAudioEnd);

    return () => {
      audio.removeEventListener("ended", handleAudioEnd);
    };
  }, [isRepeat]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const stopAudio = () => {
    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setProgress(0);
  };

  const toggleRepeat = () => {
    setIsRepeat(!isRepeat);
  };

  const onProgressChange = (e) => {
    const newTime = e.target.value;
    audioRef.current.currentTime = newTime;
    setProgress(newTime);
  };

  const formatTime = (time) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div>
      <div className="player-card">
        <button onClick={togglePlayPause}>
          {isPlaying ? <Pause /> : <Play />}
        </button>
        <button onClick={stopAudio}>
          <Square />
        </button>
        <button
          onClick={toggleRepeat}
          style={{
            padding: "8px",
            borderRadius: "50%",
            color: isRepeat ? "#3b82f6" : "currentColor",
          }}
          title={isRepeat ? "Repeat is on" : "Repeat is off"}
        >
          <Repeat />
        </button>
      </div>

      <div className="player-card">
        <input
          type="range"
          min="0"
          max={duration}
          value={progress}
          onChange={onProgressChange}
        />
        <div>
          <span>{formatTime(progress)}</span>/
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <a
        href="https://www.flaticon.com/free-icons/google-play-music"
        title="google play music icons"
      >
        Google play music icons created by Mayor Icons - Flaticon
      </a>
    </div>
  );
};

export default AudioPlayer;
