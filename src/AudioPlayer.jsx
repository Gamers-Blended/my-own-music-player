import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Square,
  Volume2,
  Volume1,
  VolumeX,
  Repeat,
  SkipForward,
} from "lucide-react";
import supabase from "./config/supabase";

const AudioPlayer = () => {
  const audioRef = useRef(null); // maintain audio instance across renders
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);

  // for handling files
  const [audioFiles, setAudioFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBlobUrl, setCurrentBlobUrl] = useState(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);

  // define event handler functions before setupAudioEventListeners
  const updateProgress = (audio) => {
    setProgress(audio.currentTime);
  };

  const handleAudioEnd = async () => {
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      handleNext();
    }
  };

  const setupAudioEventListeners = (audio) => {
    audio.removeEventListener("timeupdate", () => updateProgress(audio));
    audio.removeEventListener("ended", () => handleAudioEnd(audio));

    audio.addEventListener("timeupdate", () => updateProgress(audio));
    audio.addEventListener("ended", () => handleAudioEnd(audio));

    // set initial volume
    audio.volume = volume;
  };

  // fetch files from Supabase
  useEffect(() => {
    async function fetchAudioFiles() {
      try {
        const { data, error } = await supabase.storage
          .from("audio")
          .list("files", {
            sortBy: { column: "name", order: "asc" },
          });

        if (error) throw error;

        console.log("Retrieved: {}", data);

        const audioFiles = data.filter((file) => file.name.endsWith(".mp3"));
        setAudioFiles(audioFiles);

        // load the first audio file
        if (audioFiles.length > 0) {
          await loadAudioFile(audioFiles[0], 0);
        }

        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    }

    fetchAudioFiles();

    // cleanup
    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      setCurrentBlobUrl(null);
    }
  };

  const loadAudioFile = async (file, index) => {
    if (!file) {
      setError("Invalid audio file");
      return;
    }

    try {
      // clean up previous audio
      cleanupAudio();

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("audio")
        .download(`files/${file.name}`);

      if (downloadError) throw downloadError;

      // create new blob URL
      const blobUrl = URL.createObjectURL(fileData);
      setCurrentBlobUrl(blobUrl);

      // create new audio instance
      const audio = new Audio(blobUrl);

      // wait for metadata to load
      await new Promise((resolve, reject) => {
        audio.addEventListener("loadedmetadata", resolve, { once: true });
        audio.addEventListener("error", reject, { once: true });
      });

      // set the audio reference
      audioRef.current = audio;
      setDuration(audio.duration);
      setCurrentSongIndex(index);

      // reset player state
      setProgress(0);
      setIsPlaying(false);
      setError(null); // clear any previous errors

      setupAudioEventListeners(audio);

      // auto-play the next song
      audio.play();
      setIsPlaying(true);
    } catch (err) {
      setError(`Error loading audio file: ${err.message}`);
      console.error("Error loading audio:", err);
    }
  };

  const handleNext = () => {
    if (audioFiles.length === 0) return;

    const nextIndex = (currentSongIndex + 1) % audioFiles.length;
    const nextFile = audioFiles[nextIndex];

    if (nextFile) {
      loadAudioFile(nextFile, nextIndex);
    } else {
      // if no next file, stop playback
      stopAudio();
    }
  };

  const handleSongSelect = (file, index) => {
    loadAudioFile(file, index);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const stopAudio = () => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setProgress(0);
  };

  const toggleRepeat = () => {
    setIsRepeat(!isRepeat);
  };

  const toggleVolume = () => {
    if (volume > 0) {
      setPreviousVolume(volume);
      setVolume(0);
    } else {
      setVolume(previousVolume);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const onProgressChange = (e) => {
    if (!audioRef.current) return;

    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setProgress(newTime);
  };

  const formatTime = (time) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX />;
    if (volume < 0.5) return <Volume1 />;
    return <Volume2 />;
  };

  // if still loading or there's an error, show appropriate message
  if (isLoading) {
    return <div>Loading audio files...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">Error: {error}</div>
        <button onClick={() => setError(null)} className="error-button">
          Clear Error
        </button>
      </div>
    );
  }

  if (audioFiles.length === 0) {
    return <div>No audio files found</div>;
  }

  return (
    <div>
      <div className="player-card">
        <button onClick={togglePlayPause}>
          {isPlaying ? <Pause /> : <Play />}
        </button>

        <button onClick={stopAudio}>
          <Square />
        </button>

        <button onClick={handleNext} title="Next song">
          <SkipForward />
        </button>

        <div className="volume-controls">
          <button
            className="volume-button"
            onClick={() => setShowVolume(!showVolume)}
            onDoubleClick={toggleVolume}
            title="Click to show volume slider, double-click to mute"
          >
            {getVolumeIcon()}
          </button>
          {showVolume && (
            <div className="volume-slider-container">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                style={{
                  width: "100px",
                  height: "100%",
                  transform: "rotate(-90deg) translateX(-34px)",
                  transformOrigin: "left",
                }}
              />
            </div>
          )}
        </div>

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

      <div className="tracklist-container">
        <table className="tracklist-table">
          <thead>
            <tr className="tracklist-table-header">
              <th className="tracklist-table-row">#</th>
              <th className="tracklist-table-row">File Name</th>
              <th className="tracklist-table-row">Size</th>
            </tr>
          </thead>
          <tbody>
            {audioFiles.map((file, index) => (
              <tr
                key={file.name}
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  cursor: "pointer",
                  backgroundColor:
                    currentSongIndex === index ? "#eff6ff" : "transparent",
                  // add hover styles via separate hover handlers
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    currentSongIndex === index ? "#eff6ff" : "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    currentSongIndex === index ? "#eff6ff" : "transparent";
                }}
                onClick={() => handleSongSelect(file, index)}
              >
                <td className="tracklist-table-row-data">{index + 1}</td>
                <td className="tracklist-table-row-data">{file.name}</td>
                <td className="tracklist-table-row-data">
                  {(file.metadata?.size / 1024 / 1024).toFixed(2)} MB
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
