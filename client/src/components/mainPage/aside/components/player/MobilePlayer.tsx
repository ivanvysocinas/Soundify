import {
  CaretRightOutlined,
  PauseOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  HeartFilled,
  HeartOutlined,
  RetweetOutlined,
  SwapOutlined,
  MenuUnfoldOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, AppState } from "../../../../../store";
import { setIsPlaying } from "../../../../../state/CurrentTrack.slice";
import {
  playNextTrack,
  playPreviousTrack,
  setQueueOpen,
  toggleRepeat,
  toggleShuffle,
} from "../../../../../state/Queue.slice";
import { useCallback, useState, useEffect, useRef, memo, useMemo } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { useFormatTime } from "../../../../../hooks/useFormatTime";
import { useLike } from "../../../../../hooks/useLike";
import { Link } from "react-router-dom";
import { useGetUserQuery } from "../../../../../state/UserApi.slice";
import { UpgradeModal } from "./Player";

const MOBILE_NAV_HEIGHT = 80;

const SCREEN_BREAKPOINTS = {
  VERY_SMALL: 520,
  SMALL: 620,
  MEDIUM: 720,
} as const;

const COVER_SIZES = {
  VERY_SMALL: "240px",
  SMALL: "260px",
  MEDIUM: "320px",
  LARGE: "360px",
} as const;

const selectCurrentTrack = (state: AppState) => state.currentTrack;
const selectQueueState = (state: AppState) => state.queue;

/**
 * Progressbar component with optimized re-renders
 */

const ProgressBar = memo(
  ({
    currentTime,
    duration,
    onSeek,
    isCompact = false,
    canSeek = true,
  }: {
    currentTime: number;
    duration: number;
    onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isCompact?: boolean;
    canSeek?: boolean;
  }) => {
    const progress = duration ? (currentTime / duration) * 100 : 0;

    if (isCompact) {
      return (
        <div className="relative h-0.5 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 shadow-sm shadow-purple-500/30 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      );
    }

    return (
      <div className="relative mb-2">
        <div className="w-full bg-white/20 rounded-full overflow-hidden h-2">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div
            className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 rounded-full relative overflow-hidden transition-all duration-100"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={onSeek}
          className={`absolute inset-0 w-full opacity-0 h-2 ${
            !canSeek ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        />
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";

/**
 * Mobile player component with compact and expanded views
 * Features adaptive layout, swipe gestures, and optimized rendering
 */
const MobilePlayer = () => {
  const dispatch = useDispatch<AppDispatch>();
  const currentTrack = useSelector(selectCurrentTrack);
  const queueState = useSelector(selectQueueState);

  const { data: user } = useGetUserQuery();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, _setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [likeHover, setLikeHover] = useState(false);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>(0);

  const screenMetrics = useMemo(() => {
    const availableHeight = screenHeight - MOBILE_NAV_HEIGHT;
    return {
      availableHeight,
      isVerySmallScreen: availableHeight < SCREEN_BREAKPOINTS.VERY_SMALL,
      isSmallScreen: availableHeight < SCREEN_BREAKPOINTS.SMALL,
      isMediumScreen: availableHeight < SCREEN_BREAKPOINTS.MEDIUM,
    };
  }, [screenHeight]);

  const { isVerySmallScreen, isSmallScreen, isMediumScreen } = screenMetrics;

  useEffect(() => {
    const handleResize = () => setScreenHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const currentTrackId = currentTrack.currentTrack?._id || "";
  const {
    isLiked,
    isPending: likePending,
    toggleLike,
  } = useLike(currentTrackId);

  const currentStr = useFormatTime(currentTime);
  const totalStr = useFormatTime(currentTrack.currentTrack?.duration || 0);

  useEffect(() => {
    const findAudioElement = () => {
      const audioElement = document.querySelector("audio");
      if (audioElement) {
        audioElementRef.current = audioElement;
        return true;
      }
      return false;
    };

    if (!findAudioElement()) {
      const interval = setInterval(() => {
        if (findAudioElement()) {
          clearInterval(interval);
        }
      }, 200);

      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (!currentTrack.isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const updateTime = () => {
      if (audioElementRef.current && !audioElementRef.current.paused) {
        const newTime = audioElementRef.current.currentTime;
        setCurrentTime((prev) => {
          const diff = Math.abs(newTime - prev);
          return diff > 0.1 ? newTime : prev;
        });
      }
      animationFrameRef.current = requestAnimationFrame(updateTime);
    };

    animationFrameRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentTrack.isPlaying]);

  useEffect(() => {
    setCurrentTime(0);
  }, [currentTrack.currentTrack?._id]);

  const handleTogglePlayPause = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (isLoading) return;
      dispatch(setIsPlaying(!currentTrack.isPlaying));
    },
    [dispatch, currentTrack.isPlaying, isLoading]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      dispatch(playNextTrack());
    },
    [dispatch]
  );

  const handlePrevious = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      dispatch(playPreviousTrack());
    },
    [dispatch]
  );

  const handleShuffle = useCallback(() => {
    dispatch(toggleShuffle());
  }, [dispatch]);

  const handleRepeat = useCallback(() => {
    dispatch(toggleRepeat());
  }, [dispatch]);

  const toggleQueue = useCallback(() => {
    dispatch(setQueueOpen(!queueState.isOpen));
  }, [queueState.isOpen, dispatch]);

  const handleExpand = useCallback(() => {
    if (currentTrack.currentTrack) {
      setIsExpanded(true);
    }
  }, [currentTrack.currentTrack]);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const handleDragEnd = useCallback(
    (_event: any, info: PanInfo) => {
      if (info.offset.y > 100) {
        handleCollapse();
      }
    },
    [handleCollapse]
  );

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log('working')
      if (!user || user.status == "USER") {
        setShowUpgradeModal(true);
        return;
      }
      const newTime = Number(e.target.value);
      setCurrentTime(newTime);
      if (audioElementRef.current) {
        audioElementRef.current.currentTime = newTime;
      }
    },
    [user]
  );

  const getRepeatColor = useCallback(() => {
    switch (queueState.repeat) {
      case "one":
      case "all":
        return "#a855f7";
      default:
        return "rgba(255, 255, 255, 0.4)";
    }
  }, [queueState.repeat]);

  const coverStyle = useMemo(
    () => ({
      maxWidth: isVerySmallScreen
        ? COVER_SIZES.VERY_SMALL
        : isSmallScreen
        ? COVER_SIZES.SMALL
        : isMediumScreen
        ? COVER_SIZES.MEDIUM
        : COVER_SIZES.LARGE,
      maxHeight: isVerySmallScreen
        ? COVER_SIZES.VERY_SMALL
        : isSmallScreen
        ? COVER_SIZES.SMALL
        : isMediumScreen
        ? COVER_SIZES.MEDIUM
        : COVER_SIZES.LARGE,
    }),
    [isVerySmallScreen, isSmallScreen, isMediumScreen]
  );

  const canSeek = useMemo(() => user && user.status !== "USER", [user]);

  if (!currentTrack.currentTrack) {
    return (
      <div
        className="fixed left-0 right-0 xl:hidden bg-gradient-to-r from-slate-900/80 via-purple-900/60 to-slate-900/80 border-t border-purple-500/20 p-3 z-40"
        style={{ bottom: `${MOBILE_NAV_HEIGHT}px` }}
      >
        <div className="flex items-center justify-center">
          <p className="text-white/60 text-sm">No track selected</p>
        </div>
      </div>
    );
  }

  const currentTrackData = currentTrack.currentTrack;

  return (
    <>
      <motion.div
        className="fixed left-0 right-0 xl:hidden z-40"
        style={{ bottom: `${MOBILE_NAV_HEIGHT}px` }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <ProgressBar
          currentTime={currentTime}
          duration={currentTrackData.duration}
          onSeek={handleSeek}
          isCompact={true}
          canSeek={canSeek}
        />

        <UpgradeModal
          showUpgradeModal={showUpgradeModal}
          setShowUpgradeModal={setShowUpgradeModal}
        />

        <div
          className="bg-gradient-to-r from-slate-900/98 via-purple-900/95 to-slate-900/98 border-t border-purple-500/20 p-2.5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
          onClick={handleExpand}
        >
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="relative">
                <img
                  src={currentTrackData.coverUrl}
                  alt="Album Cover"
                  className="w-10 h-10 rounded-lg object-cover shadow-md"
                />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-400/15 to-pink-400/15 pointer-events-none" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate text-sm leading-tight">
                  {currentTrackData.name}
                </h3>
                <p className="text-purple-200/60 text-xs truncate">
                  {currentTrackData.artist?.name || "Unknown Artist"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <motion.button
                onClick={handlePrevious}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors duration-150"
                whileTap={{ scale: 0.9 }}
              >
                <StepBackwardOutlined
                  className="text-base"
                  style={{ color: "rgba(255, 255, 255, 0.7)" }}
                />
              </motion.button>

              <motion.button
                onClick={handleTogglePlayPause}
                className="p-2 px-3 rounded-full bg-gradient-to-br from-purple-500/90 to-pink-500/90 hover:from-purple-500 hover:to-pink-500 shadow-md transition-all duration-150"
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.02 }}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : currentTrack.isPlaying ? (
                  <PauseOutlined
                    className="text-base"
                    style={{ color: "white" }}
                  />
                ) : (
                  <CaretRightOutlined
                    className="text-base ml-0.5"
                    style={{ color: "white" }}
                  />
                )}
              </motion.button>

              <motion.button
                onClick={handleNext}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors duration-150"
                whileTap={{ scale: 0.9 }}
              >
                <StepForwardOutlined
                  className="text-base"
                  style={{ color: "rgba(255, 255, 255, 0.7)" }}
                />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed inset-0 xl:hidden z-50 overflow-hidden"
            style={{
              background:
                "linear-gradient(to bottom right, rgb(15 23 42), rgb(88 28 135), rgb(15 23 42))",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 35,
              stiffness: 350,
              mass: 0.8,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.15 }}
            onDragEnd={handleDragEnd}
          >
            <div className="absolute inset-0 opacity-15 pointer-events-none">
              <div
                className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%)",
                }}
              />
              <div
                className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%)",
                }}
              />
            </div>

            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-white/30 rounded-full" />

            <div className="h-full overflow-hidden">
              <div
                className="flex flex-col min-h-full justify-between"
                style={{
                  padding: isVerySmallScreen
                    ? "8px 16px 16px"
                    : isSmallScreen
                    ? "12px 20px 20px"
                    : "16px 24px 24px",
                  paddingTop: isVerySmallScreen
                    ? "24px"
                    : isSmallScreen
                    ? "32px"
                    : "40px",
                }}
              >
                <div
                  className={`flex items-center mt-2 justify-between ${
                    isVerySmallScreen ? "mb-1" : isSmallScreen ? "mb-4" : "mb-6"
                  }`}
                >
                  <motion.button
                    onClick={handleCollapse}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-150"
                    whileTap={{ scale: 0.9 }}
                  >
                    <DownOutlined
                      className="text-lg"
                      style={{ color: "white" }}
                    />
                  </motion.button>

                  <div className="text-center">
                    <p className="text-white/50 text-xs">Playing from</p>
                    <p className="text-white font-medium text-sm">
                      Your Library
                    </p>
                  </div>

                  <motion.button
                    onClick={toggleQueue}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-150"
                    whileTap={{ scale: 0.9 }}
                  >
                    <MenuUnfoldOutlined
                      className="text-lg"
                      style={{ color: "white" }}
                    />
                  </motion.button>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <motion.div
                    className="relative w-full aspect-square"
                    style={coverStyle}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.05, duration: 0.25 }}
                  >
                    <img
                      src={currentTrackData.coverUrl}
                      alt="Album Cover"
                      className="w-full h-full rounded-2xl object-cover shadow-2xl"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/20 to-pink-400/20 shadow-xl shadow-purple-500/10" />

                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-3 border-purple-400 border-t-transparent" />
                          <p className="text-white/80 text-xs">Loading...</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>

                <div className="flex-shrink-0 space-y-4">
                  <motion.div
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.25 }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0 mr-3">
                        <h1
                          className={`text-white font-bold truncate mb-1 ${
                            isVerySmallScreen
                              ? "text-lg"
                              : isSmallScreen
                              ? "text-xl"
                              : "text-2xl"
                          }`}
                        >
                          {currentTrackData.name}
                        </h1>
                        <Link
                          to={`/artist/${currentTrackData.artist?._id}`}
                          className={`text-purple-200/70 hover:text-purple-200 transition-colors ${
                            isVerySmallScreen ? "text-sm" : "text-base"
                          }`}
                        >
                          {currentTrackData.artist?.name || "Unknown Artist"}
                        </Link>
                      </div>

                      {user ? (
                        <motion.button
                          className="p-1"
                          whileTap={{ scale: 0.9 }}
                          onMouseEnter={() => setLikeHover(true)}
                          onMouseLeave={() => setLikeHover(false)}
                          onClick={toggleLike}
                          disabled={likePending}
                        >
                          {likePending ? (
                            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                          ) : isLiked ? (
                            <HeartFilled
                              className={`transition-colors duration-200 ${
                                isVerySmallScreen ? "text-lg" : "text-xl"
                              }`}
                              style={{
                                color: likeHover ? "#F93822" : "#ef4444",
                              }}
                            />
                          ) : (
                            <HeartOutlined
                              className={`transition-colors duration-200 ${
                                isVerySmallScreen ? "text-lg" : "text-xl"
                              }`}
                              style={{ color: likeHover ? "#D3D3D3" : "#fff" }}
                            />
                          )}
                        </motion.button>
                      ) : (
                        <div></div>
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.25 }}
                  >
                    <ProgressBar
                      currentTime={currentTime}
                      duration={currentTrackData.duration}
                      onSeek={handleSeek}
                      canSeek={canSeek}
                    />

                    <div
                      className={`flex justify-between text-white/50 ${
                        isVerySmallScreen ? "text-xs" : "text-sm"
                      }`}
                    >
                      <span>{currentStr}</span>
                      <span>{totalStr}</span>
                    </div>
                  </motion.div>

                  <motion.div
                    className="flex items-center justify-between"
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.25 }}
                  >
                    <motion.button
                      onClick={handleShuffle}
                      className={`rounded-full hover:bg-white/10 transition-colors duration-150 ${
                        isVerySmallScreen ? "p-1.5" : "p-2"
                      }`}
                      whileTap={{ scale: 0.9 }}
                    >
                      <SwapOutlined
                        className={isVerySmallScreen ? "text-base" : "text-lg"}
                        style={{
                          color: queueState.shuffle
                            ? "#a855f7"
                            : "rgba(255, 255, 255, 0.4)",
                        }}
                      />
                    </motion.button>

                    <motion.button
                      onClick={handlePrevious}
                      className={`rounded-full hover:bg-white/10 transition-colors duration-150 ${
                        isVerySmallScreen ? "p-2" : "p-2.5"
                      }`}
                      whileTap={{ scale: 0.9 }}
                    >
                      <StepBackwardOutlined
                        className={isVerySmallScreen ? "text-xl" : "text-2xl"}
                        style={{ color: "rgba(255, 255, 255, 0.8)" }}
                      />
                    </motion.button>

                    <motion.button
                      onClick={handleTogglePlayPause}
                      className={`rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25 ${
                        isVerySmallScreen
                          ? "p-3"
                          : isSmallScreen
                          ? "p-3.5"
                          : "p-4"
                      }`}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      {isLoading ? (
                        <div
                          className={`border-3 border-white border-t-transparent rounded-full animate-spin ${
                            isVerySmallScreen ? "w-5 h-5" : "w-6 h-6"
                          }`}
                        />
                      ) : currentTrack.isPlaying ? (
                        <PauseOutlined
                          className={isVerySmallScreen ? "text-xl" : "text-2xl"}
                          style={{ color: "white" }}
                        />
                      ) : (
                        <CaretRightOutlined
                          className={`ml-0.5 ${
                            isVerySmallScreen ? "text-xl" : "text-2xl"
                          }`}
                          style={{ color: "white" }}
                        />
                      )}
                    </motion.button>

                    <motion.button
                      onClick={handleNext}
                      className={`rounded-full hover:bg-white/10 transition-colors duration-150 ${
                        isVerySmallScreen ? "p-2" : "p-2.5"
                      }`}
                      whileTap={{ scale: 0.9 }}
                    >
                      <StepForwardOutlined
                        className={isVerySmallScreen ? "text-xl" : "text-2xl"}
                        style={{ color: "rgba(255, 255, 255, 0.8)" }}
                      />
                    </motion.button>

                    <motion.button
                      onClick={handleRepeat}
                      className={`rounded-full hover:bg-white/10 transition-colors duration-150 relative ${
                        isVerySmallScreen ? "p-1.5" : "p-2"
                      }`}
                      whileTap={{ scale: 0.9 }}
                    >
                      <RetweetOutlined
                        className={isVerySmallScreen ? "text-base" : "text-lg"}
                        style={{ color: getRepeatColor() }}
                      />
                      {queueState.repeat === "one" && (
                        <div className="absolute inset-0 flex items-center justify-center mt-[-4px]">
                          <span className="text-[8px] text-white/60 font-bold">
                            1
                          </span>
                        </div>
                      )}
                    </motion.button>
                  </motion.div>
                  <div className="h-16" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default memo(MobilePlayer);
export { MobilePlayer };
